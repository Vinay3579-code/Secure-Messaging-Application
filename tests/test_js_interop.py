"""
Python <-> JavaScript interoperability. Runs the REAL browser crypto (static/js/crypto_client.js) under
Node's WebCrypto and checks it agrees byte-for-byte with the Python reference on: chain-key derivation,
ratchet, AES-256-CBC + HMAC (incl. context binding), RSA-PSS signatures and DH validation.
Skipped automatically if Node.js (>= 18) is not installed.
"""
import json
import os
import shutil
import subprocess
import unittest

from crypto.dh import DiffieHellman
from crypto.ratchet import SymmetricRatchet, derive_chain_keys, fingerprint
from crypto.aead import encrypt_gcm, decrypt_gcm, build_aad
from crypto.encryption import encrypt_message, decrypt_message
from crypto.integrity import calculate_hmac, verify_hmac
from crypto.signatures import generate_identity_keypair, sign_data, verify_signature, dh_signed_payload

NODE = shutil.which("node")
HELPER = os.path.join(os.path.dirname(__file__), "js_interop_helper.js")


def run_node(job):
    proc = subprocess.run([NODE, HELPER], input=json.dumps(job), capture_output=True, text=True, encoding="utf-8", timeout=60)
    if proc.returncode != 0:
        raise AssertionError(f"node failed:\n{proc.stderr}")
    return json.loads(proc.stdout)


@unittest.skipUnless(NODE, "Node.js not installed")
class TestJsPythonInterop(unittest.TestCase):

    def setUp(self):
        alice, bob = DiffieHellman(), DiffieHellman()
        self.a_hex, self.b_hex = alice.get_public_hex(), bob.get_public_hex()
        self.secret = alice.compute_shared_secret(self.b_hex)
        self.session = "sess123"

    def job(self, is_initiator, **extra):
        return dict(op="session", username="alice" if is_initiator else "bob",
                    peer="bob" if is_initiator else "alice", session_id=self.session,
                    shared_secret_hex=self.secret.hex(), pub_a=self.a_hex, pub_b=self.b_hex,
                    is_initiator=is_initiator, **extra)

    def ctx(self, sender, receiver, mid, mode):
        return "|".join([self.session, sender, receiver, mid, mode])

    def test_chain_keys_match(self):
        init_ck, resp_ck = derive_chain_keys(self.secret, self.a_hex, self.b_hex)
        out = run_node(self.job(True))
        self.assertEqual(out["send_ck_fp"], fingerprint(init_ck))
        self.assertEqual(out["recv_ck_fp"], fingerprint(resp_ck))

    def test_python_encrypts_js_decrypts(self):
        py = SymmetricRatchet(self.secret, self.a_hex, self.b_hex, True)   # Python = Alice
        packets = []
        for i, mode in enumerate(["cbc-hmac", "cbc-hmac", "cbc-hmac"]):
            n, enc, mac = py.next_send_keys()
            mid, ts = f"m{i}", "2026-09-30T10:00:00.000Z"
            ctx = self.ctx("alice", "bob", mid, mode)
            if mode == "gcm":
                ct, iv, tag = encrypt_gcm(f"héllo #{i} ✓", enc, build_aad(ts, n, ctx))
            else:
                ct, iv = encrypt_message(f"héllo #{i} ✓", enc)
                tag = calculate_hmac(iv, ct, ts, n, mac, ctx)
            packets.append(dict(message_id=mid, sender="alice", receiver="bob", ciphertext=ct, iv=iv,
                                hmac_tag=tag, timestamp=ts, seq_no=n, cipher_mode=mode))
        tampered = dict(packets[0]); tampered["ciphertext"] = ("0" if tampered["ciphertext"][0] != "0" else "1") + tampered["ciphertext"][1:]
        # deliver out of order: #3, tampered #1 (rejected, no state burn), #1, #2, then replay #1
        out = run_node(self.job(False, incoming=[packets[2], tampered, packets[0], packets[1], packets[0]]))["decrypted"]
        self.assertEqual([d["ok"] for d in out], [True, False, True, True, False])
        self.assertEqual(out[0]["plaintext"], "héllo #2 ✓")
        self.assertEqual(out[1]["kind"], "integrity")
        self.assertEqual(out[2]["plaintext"], "héllo #0 ✓")
        self.assertEqual(out[3]["plaintext"], "héllo #1 ✓")
        self.assertEqual(out[4]["kind"], "replay")

    def test_js_encrypts_python_decrypts(self):
        sent = run_node(self.job(True, to_send=[dict(mode="cbc-hmac", text="from js one ✓"),
                                                dict(mode="cbc-hmac", text="from js two ✓")]))["encrypted"]
        py = SymmetricRatchet(self.secret, self.a_hex, self.b_hex, False)   # Python = Bob
        results = []
        for pkt in sent:
            ctx = self.ctx(pkt["sender"], pkt["receiver"], pkt["message_id"], pkt["cipher_mode"])

            def opener(enc, mac, pkt=pkt, ctx=ctx):
                if pkt["cipher_mode"] == "gcm":
                    return decrypt_gcm(pkt["ciphertext"], pkt["iv"], pkt["hmac_tag"], enc,
                                       build_aad(pkt["timestamp"], pkt["seq_no"], ctx))
                assert verify_hmac(pkt["iv"], pkt["ciphertext"], pkt["timestamp"], pkt["seq_no"], pkt["hmac_tag"], mac, ctx)
                return decrypt_message(pkt["ciphertext"], pkt["iv"], enc)
            results.append(py.receive(pkt["seq_no"], opener))
        self.assertEqual(results, ["from js one ✓", "from js two ✓"])

    def test_signatures_and_dh_validation(self):
        priv, pub = generate_identity_keypair()
        text = dh_signed_payload("A", "alice", "bob", self.a_hex)
        out = run_node(dict(op="dh", public_pem=pub, text=text, signature=sign_data(text, priv),
                            valid_pub=self.a_hex))
        self.assertTrue(out["py_sig_ok"], "JS failed to verify a Python RSA-PSS signature")
        self.assertTrue(verify_signature(text, out["js_sig"], out["js_pub"]), "Python failed to verify a JS signature")
        self.assertTrue(out["subgroup_ok"])
        self.assertFalse(out["subgroup_accepts_p_minus_1"])
        self.assertFalse(out["subgroup_accepts_nonresidue"])
        # A JS-generated DH value is accepted by Python and yields a usable shared secret
        self.assertEqual(len(DiffieHellman().compute_shared_secret(out["js_dh_pub"])), 256)


if __name__ == "__main__":
    unittest.main()
