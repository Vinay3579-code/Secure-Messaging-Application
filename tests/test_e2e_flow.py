"""
Full End-to-End Simulation Test: Alice & Bob through the real Flask API.
All key material is generated and used CLIENT-SIDE (here: in the test, like the browser does); the server
only ever sees public keys, signatures and ciphertext. Validates:
1. Identity keys uploaded (public only), signed DH handshake, and REJECTION of unsigned/forged/foreign values
2. Ratchet key agreement, CBC + HMAC-SHA256 message relay, tamper + replay rejection
3. Removed server-side crypto endpoints (the server can no longer see private/session keys)
4. Attack Lab padding-oracle endpoint
"""
import unittest
import json
import uuid
from cryptography.exceptions import InvalidTag

from app import app
from database import init_db, clear_messages_and_sessions, get_db_connection
from crypto.dh import DiffieHellman, RFC_3526_2048_PRIME
from crypto.ratchet import SymmetricRatchet, RatchetError
from crypto.aead import encrypt_gcm, decrypt_gcm, build_aad
from crypto.encryption import encrypt_message, decrypt_message
from crypto.integrity import calculate_hmac, verify_hmac
from crypto.signatures import generate_identity_keypair, sign_data, dh_signed_payload

client = app.test_client()
P_HEX = format(RFC_3526_2048_PRIME, 'x')


def post(path, data, user, expect=None):
    response = client.post(path, data=json.dumps(data),
                           headers={'Content-Type': 'application/json', 'X-Sim-User': user})
    if expect is not None:
        assert response.status_code == expect, (path, response.status_code, response.data)
    return json.loads(response.data.decode('utf-8'))


def get(path, user):
    response = client.get(path, headers={'X-Sim-User': user})
    return json.loads(response.data.decode('utf-8'))


class Party:
    """A client device: owns the RSA identity private key and all session state."""

    def __init__(self, name):
        self.name = name
        self.priv, self.pub = generate_identity_keypair()
        self.dh = DiffieHellman()

    def register(self):
        r = post('/api/auth/register', {'username': self.name, 'password': 'password123',
                                        'public_identity_key': self.pub}, self.name)
        if not r.get('success'):   # already exists from an earlier run: rotate the key (password re-auth)
            post('/api/auth/identity', {'username': self.name, 'password': 'password123',
                                        'public_identity_key': self.pub}, self.name, expect=200)
        return r


class TestE2EFlow(unittest.TestCase):

    def setUp(self):
        init_db()
        clear_messages_and_sessions('e2e_alice', 'e2e_bob')
        self.alice, self.bob = Party('e2e_alice'), Party('e2e_bob')
        self.alice.register()
        self.bob.register()

    @classmethod
    def tearDownClass(cls):
        # keep the shared dev database clean: remove the throw-away e2e_* accounts and their data
        conn = get_db_connection()
        conn.execute("DELETE FROM users WHERE username GLOB 'e2e_*'")
        for table, cols in (('messages', ('sender', 'receiver')), ('dh_sessions', ('user1', 'user2')),
                            ('processed_messages', ('sender', 'receiver'))):
            conn.execute(f"DELETE FROM {table} WHERE {cols[0]} GLOB 'e2e_*' OR {cols[1]} GLOB 'e2e_*'")
        conn.commit()
        conn.close()

    def handshake(self):
        a, b = self.alice, self.bob
        sig_a = sign_data(dh_signed_payload('A', a.name, b.name, a.dh.get_public_hex()), a.priv)
        sess = post('/api/dh/initiate', {'peer': b.name, 'p_hex': P_HEX, 'g': 2,
                                         'pub_a': a.dh.get_public_hex(), 'sig_a': sig_a}, a.name, expect=201)
        sid = sess['session_id']
        pending = get('/api/dh/pending', b.name)['session']
        sig_b = sign_data(dh_signed_payload('B', a.name, b.name, b.dh.get_public_hex()), b.priv)
        post('/api/dh/respond', {'session_id': sid, 'pub_b': b.dh.get_public_hex(), 'sig_b': sig_b}, b.name, expect=200)
        final = get(f'/api/dh/session/{sid}', a.name)['session']
        s_a = a.dh.compute_shared_secret(final['pub_b'])
        s_b = b.dh.compute_shared_secret(pending['pub_a'])
        self.assertEqual(s_a, s_b)
        ra = SymmetricRatchet(s_a, final['pub_a'], final['pub_b'], True)
        rb = SymmetricRatchet(s_b, final['pub_a'], final['pub_b'], False)
        return sid, ra, rb

    # ---- helpers mirroring static/js/crypto_client.js ----
    def send(self, sid, ratchet, sender, receiver, text, mode):
        n, enc, mac = ratchet.next_send_keys()
        mid, ts = f"e2e-{uuid.uuid4().hex[:8]}", "2026-09-30T10:00:00.000Z"
        ctx = "|".join([sid, sender, receiver, mid, mode])
        if mode == 'gcm':
            ct, iv, tag = encrypt_gcm(text, enc, build_aad(ts, n, ctx))
        else:
            ct, iv = encrypt_message(text, enc)
            tag = calculate_hmac(iv, ct, ts, n, mac, ctx)
        res = post('/api/messages/send', {'message_id': mid, 'receiver': receiver, 'ciphertext': ct, 'iv': iv,
                                          'hmac_tag': tag, 'timestamp': ts, 'seq_no': n, 'cipher_mode': mode},
                   sender)
        return res, mid

    def open(self, sid, ratchet, pkt, me):
        ctx = "|".join([sid, pkt['sender'], me, pkt['message_id'], pkt['cipher_mode']])

        def opener(enc, mac):
            if pkt['cipher_mode'] == 'gcm':
                return decrypt_gcm(pkt['ciphertext'], pkt['iv'], pkt['hmac_tag'], enc,
                                   build_aad(pkt['timestamp'], pkt['seq_no'], ctx))
            if not verify_hmac(pkt['iv'], pkt['ciphertext'], pkt['timestamp'], pkt['seq_no'], pkt['hmac_tag'], mac, ctx):
                raise InvalidTag()
            return decrypt_message(pkt['ciphertext'], pkt['iv'], enc)
        return ratchet.receive(pkt['seq_no'], opener)

    def test_signed_handshake_and_cbc_hmac_relay(self):
        sid, ra, rb = self.handshake()
        for mode in ('cbc-hmac',):
            text = f"The secret meeting is at 5 PM. ({mode})"
            res, mid = self.send(sid, ra, self.alice.name, self.bob.name, text, mode)
            self.assertTrue(res['success'])
            pkts = get(f'/api/messages/receive/{self.alice.name}', self.bob.name)['messages']
            self.assertEqual(len(pkts), 1)
            self.assertEqual(pkts[0]['cipher_mode'], mode)
            self.assertEqual(self.open(sid, rb, pkts[0], self.bob.name), text)

        # Server rows contain only ciphertext material - never the plaintext
        conn = get_db_connection()
        rows = [dict(r) for r in conn.execute("SELECT * FROM messages WHERE sender = ?", (self.alice.name,))]
        conn.close()
        self.assertTrue(rows)
        for row in rows:
            self.assertNotIn("secret meeting", json.dumps(row))

    def test_tamper_and_replay_rejected(self):
        sid, ra, rb = self.handshake()
        _, mid = self.send(sid, ra, self.alice.name, self.bob.name, "Authorize transfer", 'cbc-hmac')
        pkt = get(f'/api/messages/receive/{self.alice.name}', self.bob.name)['messages'][0]

        bad = dict(pkt, ciphertext=('0' if pkt['ciphertext'][0] != '0' else '1') + pkt['ciphertext'][1:])
        with self.assertRaises(InvalidTag):
            self.open(sid, rb, bad, self.bob.name)
        self.assertEqual(self.open(sid, rb, pkt, self.bob.name), "Authorize transfer")   # genuine still OK

        # client-side ratchet refuses the replay; the relay refuses a re-sent message_id (HTTP 409)
        with self.assertRaises(RatchetError):
            self.open(sid, rb, pkt, self.bob.name)
        again = post('/api/messages/send', {'message_id': mid, 'receiver': self.bob.name,
                                            'ciphertext': pkt['ciphertext'], 'iv': pkt['iv'],
                                            'hmac_tag': pkt['hmac_tag'], 'cipher_mode': 'cbc-hmac',
                                            'seq_no': pkt['seq_no']}, self.alice.name)
        self.assertEqual(again['error'], 'REPLAY_ATTACK_DETECTED')

    def test_server_rejects_unsigned_forged_and_foreign_dh_values(self):
        a, b = self.alice, self.bob
        eve_priv, _ = generate_identity_keypair()
        pub_a = a.dh.get_public_hex()
        base = {'peer': b.name, 'p_hex': P_HEX, 'g': 2, 'pub_a': pub_a}
        good = sign_data(dh_signed_payload('A', a.name, b.name, pub_a), a.priv)

        # unsigned
        r = post('/api/dh/initiate', base, a.name)
        self.assertFalse(r['success'])
        self.assertIn('SIGNATURE_INVALID', r['error'])
        # signed by Eve's key, claiming to be Alice
        forged = sign_data(dh_signed_payload('A', a.name, b.name, pub_a), eve_priv)
        self.assertIn('SIGNATURE_INVALID', post('/api/dh/initiate', dict(base, sig_a=forged), a.name)['error'])
        # valid signature but for a DIFFERENT DH value (Eve swaps A for E_A, keeps Alice's signature)
        eve_dh = DiffieHellman().get_public_hex()
        self.assertIn('SIGNATURE_INVALID', post('/api/dh/initiate', dict(base, pub_a=eve_dh, sig_a=good), a.name)['error'])
        # valid signature re-labelled for another peer pairing
        relabelled = sign_data(dh_signed_payload('A', a.name, 'someone_else', pub_a), a.priv)
        self.assertIn('SIGNATURE_INVALID', post('/api/dh/initiate', dict(base, sig_a=relabelled), a.name)['error'])
        # non-standard DH group / invalid subgroup element
        self.assertIn('Unsupported DH group', post('/api/dh/initiate', dict(base, g=5, sig_a=good), a.name)['error'])
        self.assertIn('Invalid DH public value', post('/api/dh/initiate', dict(base, pub_a='1', sig_a=good), a.name)['error'])
        # nothing was stored
        self.assertFalse(get('/api/dh/pending', b.name)['has_pending'])

        # Bob's response is also enforced
        sid = post('/api/dh/initiate', dict(base, sig_a=good), a.name, expect=201)['session_id']
        r = post('/api/dh/respond', {'session_id': sid, 'pub_b': b.dh.get_public_hex(), 'sig_b': good}, b.name)
        self.assertIn('SIGNATURE_INVALID', r['error'])

    def test_relay_accepts_only_cbc_hmac(self):
        sid, ra, rb = self.handshake()
        res, _ = self.send(sid, ra, self.alice.name, self.bob.name, "other cipher", 'gcm')
        self.assertFalse(res['success'])
        self.assertIn("cbc-hmac", res['error'])

    def test_server_no_longer_exposes_key_handling_endpoints(self):
        for path in ('/api/dh/client/keygen', '/api/dh/client/compute', '/api/client/encrypt', '/api/client/decrypt'):
            self.assertEqual(client.post(path, json={}).status_code, 404, path)
        r = post('/api/auth/register', {'username': 'e2e_carol', 'password': 'password123'}, 'e2e_carol')
        self.assertNotIn('private_identity_key', r)

    def test_identity_upload_requires_password(self):
        r = post('/api/auth/identity', {'username': self.alice.name, 'password': 'wrong',
                                        'public_identity_key': self.alice.pub}, self.alice.name)
        self.assertFalse(r['success'])
        r = post('/api/auth/identity', {'username': self.alice.name, 'password': 'password123',
                                        'public_identity_key': 'not a pem'}, self.alice.name)
        self.assertFalse(r['success'])

    def test_padding_oracle_endpoint(self):
        r = post('/api/attacks/padding-oracle', {'message': 'Meet at 5PM'}, 'anyone', expect=200)
        self.assertTrue(r['vulnerable_cbc']['attack_succeeded'])
        self.assertEqual(r['vulnerable_cbc']['recovered_plaintext'], 'Meet at 5PM')
        self.assertTrue(r['authenticated_design']['attack_defeated'])


if __name__ == "__main__":
    unittest.main()
