"""
Encrypted file sharing tests: the file format (AES-256-GCM, AAD-bound), the relay API access rules and
limits, the zero-knowledge guarantee for stored blobs, and Python <-> browser-JS interoperability.
"""
import hashlib
import json
import os
import shutil
import subprocess
import unittest
import uuid

from cryptography.exceptions import InvalidTag

from app import app
from database import init_db, clear_messages_and_sessions, get_db_connection, blob_path, get_file_record
from crypto.filecrypt import (encrypt_file, decrypt_file, file_aad, MAX_FILE_BYTES, MAX_BLOB_BYTES,
                              IV_SIZE, TAG_SIZE, BLOCK)

client = app.test_client()
NODE = shutil.which("node")
HELPER = os.path.join(os.path.dirname(__file__), "js_interop_helper.js")


def register(name):
    client.post('/api/auth/register', data=json.dumps({'username': name, 'password': 'password123'}),
                headers={'Content-Type': 'application/json', 'X-Sim-User': name})


def upload(user, file_id, recipient, blob):
    return client.post(f'/api/files/upload?file_id={file_id}&recipient={recipient}', data=blob,
                       headers={'Content-Type': 'application/octet-stream', 'X-Sim-User': user})


def download(user, file_id):
    return client.get(f'/api/files/{file_id}', headers={'X-Sim-User': user})


class TestFileCrypto(unittest.TestCase):

    def test_roundtrip_and_layout(self):
        data = os.urandom(5000)
        aad = file_aad("a" * 32, "alice", "bob")
        blob, key = encrypt_file(data, aad)
        padded = (len(data) // BLOCK + 1) * BLOCK   # PKCS#7 always adds 1-16 bytes
        self.assertEqual(len(blob), IV_SIZE + padded + TAG_SIZE)
        self.assertEqual(decrypt_file(blob, key, aad), data)

    def test_empty_file(self):
        aad = file_aad("b" * 32, "alice", "bob")
        blob, key = encrypt_file(b"", aad)
        self.assertEqual(decrypt_file(blob, key, aad), b"")

    def test_every_file_gets_a_fresh_key_and_nonce(self):
        aad = file_aad("c" * 32, "alice", "bob")
        (b1, k1), (b2, k2) = encrypt_file(b"same", aad), encrypt_file(b"same", aad)
        self.assertNotEqual(k1, k2)
        self.assertNotEqual(b1[:IV_SIZE], b2[:IV_SIZE])

    def test_tamper_wrong_key_and_wrong_context_are_rejected(self):
        aad = file_aad("d" * 32, "alice", "bob")
        blob, key = encrypt_file(b"top secret payroll", aad)
        flipped = bytearray(blob)
        flipped[IV_SIZE + 2] ^= 1
        with self.assertRaises(InvalidTag):
            decrypt_file(bytes(flipped), key, aad)                                    # modified ciphertext
        with self.assertRaises(InvalidTag):
            decrypt_file(blob[:-1] + bytes([blob[-1] ^ 1]), key, aad)                 # modified MAC tag
        ivflip = bytearray(blob)
        ivflip[0] ^= 1
        with self.assertRaises(InvalidTag):
            decrypt_file(bytes(ivflip), key, aad)                                      # modified IV
        with self.assertRaises(InvalidTag):
            decrypt_file(blob, os.urandom(32), aad)                                    # wrong key
        with self.assertRaises(InvalidTag):
            decrypt_file(blob, key, file_aad("e" * 32, "alice", "bob"))                # served under another id
        with self.assertRaises(InvalidTag):
            decrypt_file(blob, key, file_aad("d" * 32, "alice", "mallory"))            # other conversation

    def test_size_limit(self):
        with self.assertRaises(ValueError):
            encrypt_file(b"x" * (MAX_FILE_BYTES + 1), b"")


class TestFileRelayApi(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        for n in ('e2e_fa', 'e2e_fb', 'e2e_fc'):
            register(n)

    @classmethod
    def tearDownClass(cls):
        clear_messages_and_sessions('e2e_fa', 'e2e_fb')
        clear_messages_and_sessions('e2e_fa', 'e2e_fc')
        conn = get_db_connection()
        conn.execute("DELETE FROM users WHERE username GLOB 'e2e_*'")
        conn.commit()
        conn.close()

    def setUp(self):
        clear_messages_and_sessions('e2e_fa', 'e2e_fb')
        clear_messages_and_sessions('e2e_fa', 'e2e_fc')

    def test_upload_download_access_rules_and_zero_knowledge(self):
        plaintext = b"CONFIDENTIAL BALANCE SHEET " * 50
        file_id = uuid.uuid4().hex
        blob, key = encrypt_file(plaintext, file_aad(file_id, 'e2e_fa', 'e2e_fb'))

        r = upload('e2e_fa', file_id, 'e2e_fb', blob)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.get_json()['sha256'], hashlib.sha256(blob).hexdigest())

        # the relay only holds the opaque blob: no plaintext on disk or in the database
        with open(blob_path(file_id), 'rb') as fh:
            on_disk = fh.read()
        self.assertEqual(on_disk, blob)
        self.assertNotIn(b"CONFIDENTIAL", on_disk)
        self.assertEqual(sorted(get_file_record(file_id)), ['created_at', 'file_id', 'recipient', 'sha256', 'size', 'uploader'])

        # uploader and recipient may download; everyone else gets 404
        for user in ('e2e_fa', 'e2e_fb'):
            d = download(user, file_id)
            self.assertEqual(d.status_code, 200)
            self.assertEqual(decrypt_file(d.data, key, file_aad(file_id, 'e2e_fa', 'e2e_fb')), plaintext)
            self.assertEqual(d.headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(download('e2e_fc', file_id).status_code, 404)
        anon = app.test_client()   # no cookie, no header
        self.assertEqual(anon.get(f'/api/files/{file_id}').status_code, 401)

    def test_validation_and_limits(self):
        blob, _ = encrypt_file(b"data", b"aad")
        fid = uuid.uuid4().hex
        self.assertEqual(upload('e2e_fa', 'not-a-valid-id', 'e2e_fb', blob).status_code, 400)
        self.assertEqual(upload('e2e_fa', '../../../etc/passwd', 'e2e_fb', blob).status_code, 400)  # never reaches disk
        self.assertEqual(upload('e2e_fa', fid, 'nobody_here', blob).status_code, 404)
        self.assertEqual(upload('e2e_fa', fid, 'e2e_fb', b"short").status_code, 400)
        self.assertEqual(upload('e2e_fa', fid, 'e2e_fb', os.urandom(MAX_BLOB_BYTES + 1)).status_code, 413)
        self.assertEqual(app.test_client().post(f'/api/files/upload?file_id={fid}&recipient=e2e_fb', data=blob).status_code, 401)

        self.assertEqual(upload('e2e_fa', fid, 'e2e_fb', blob).status_code, 201)
        self.assertEqual(upload('e2e_fa', fid, 'e2e_fb', blob).status_code, 409)     # ids are never overwritten
        self.assertEqual(download('e2e_fb', 'zz' * 16).status_code, 404)
        self.assertEqual(download('e2e_fb', '0' * 32).status_code, 404)

    def test_tampered_blob_is_detected_by_the_recipient(self):
        file_id = uuid.uuid4().hex
        aad = file_aad(file_id, 'e2e_fa', 'e2e_fb')
        blob, key = encrypt_file(b"invoice #1042", aad)
        tampered = bytearray(blob)
        tampered[IV_SIZE] ^= 1                        # e.g. the relay (or an attacker) modifies the stored file
        upload('e2e_fa', file_id, 'e2e_fb', bytes(tampered))
        with self.assertRaises(InvalidTag):
            decrypt_file(download('e2e_fb', file_id).data, key, aad)

    def test_reset_removes_stored_files(self):
        file_id = uuid.uuid4().hex
        blob, _ = encrypt_file(b"temp", b"aad")
        upload('e2e_fa', file_id, 'e2e_fb', blob)
        self.assertTrue(os.path.exists(blob_path(file_id)))
        clear_messages_and_sessions('e2e_fa', 'e2e_fb')
        self.assertFalse(os.path.exists(blob_path(file_id)))
        self.assertIsNone(get_file_record(file_id))

    def test_relay_log_lists_files_without_names_or_keys(self):
        file_id = uuid.uuid4().hex
        blob, _ = encrypt_file(b"x", b"aad")
        upload('e2e_fa', file_id, 'e2e_fb', blob)
        log = client.get('/api/server/relay-log').get_json()
        entry = next(f for f in log['files'] if f['file_id'] == file_id)
        self.assertEqual(set(entry), {'file_id', 'uploader', 'recipient', 'size', 'sha256', 'created_at'})


def run_node(job):
    proc = subprocess.run([NODE, HELPER], input=json.dumps(job), capture_output=True, text=True,
                          encoding="utf-8", timeout=60)
    if proc.returncode != 0:
        raise AssertionError(f"node failed:\n{proc.stderr}")
    return json.loads(proc.stdout)


@unittest.skipUnless(NODE, "Node.js not installed")
class TestFileInterop(unittest.TestCase):

    def test_python_encrypts_js_decrypts(self):
        data = os.urandom(3000)
        fid = uuid.uuid4().hex
        blob, key = encrypt_file(data, file_aad(fid, 'alice', 'bob'))
        out = run_node(dict(op='file_decrypt', blob_hex=blob.hex(), key_hex=key.hex(), file_id=fid,
                            sender='alice', receiver='bob'))
        self.assertEqual(out['plain_hex'], data.hex())
        self.assertEqual(out['sha256'], hashlib.sha256(data).hexdigest())
        wrong = run_node(dict(op='file_decrypt', blob_hex=blob.hex(), key_hex=key.hex(), file_id=fid,
                              sender='alice', receiver='mallory'))
        self.assertEqual(wrong['error_kind'], 'integrity')

    def test_js_encrypts_python_decrypts(self):
        data = os.urandom(4096)
        fid = uuid.uuid4().hex
        out = run_node(dict(op='file_encrypt', data_hex=data.hex(), file_id=fid, sender='alice', receiver='bob'))
        plain = decrypt_file(bytes.fromhex(out['blob_hex']), bytes.fromhex(out['key_hex']), file_aad(fid, 'alice', 'bob'))
        self.assertEqual(plain, data)
        self.assertEqual(out['sha256'], hashlib.sha256(data).hexdigest())


if __name__ == "__main__":
    unittest.main()
