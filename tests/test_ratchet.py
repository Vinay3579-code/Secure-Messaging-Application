"""
Tier-1 feature tests: symmetric ratchet (forward secrecy), AES-256-GCM AEAD, DH subgroup validation,
CBC padding-oracle attack + defence.
"""
import os
import unittest
from cryptography.exceptions import InvalidTag

from crypto.dh import DiffieHellman, is_valid_public_value, RFC_3526_2048_PRIME
from crypto.ratchet import SymmetricRatchet, RatchetError, kdf_chain, message_subkeys, MAX_SKIP
from crypto.aead import encrypt_gcm, decrypt_gcm, build_aad
from crypto.encryption import encrypt_message, decrypt_message
from crypto.integrity import calculate_hmac, verify_hmac
from crypto.padding_oracle import (VulnerableCBCServer, SecureCBCServer, recover_plaintext,
                                   strip_pkcs7, run_demo)


def make_pair():
    alice, bob = DiffieHellman(), DiffieHellman()
    a_hex, b_hex = alice.get_public_hex(), bob.get_public_hex()
    s_a, s_b = alice.compute_shared_secret(b_hex), bob.compute_shared_secret(a_hex)
    assert s_a == s_b
    return (SymmetricRatchet(s_a, a_hex, b_hex, True), SymmetricRatchet(s_b, a_hex, b_hex, False))


def send_gcm(r, text, ctx="ctx"):
    n, enc, _ = r.next_send_keys()
    aad = build_aad("ts", n, ctx)
    ct, iv, tag = encrypt_gcm(text, enc, aad)
    return n, ct, iv, tag, aad


def recv_gcm(r, n, ct, iv, tag, aad):
    return r.receive(n, lambda enc, mac: decrypt_gcm(ct, iv, tag, enc, aad))


class TestRatchet(unittest.TestCase):

    def test_both_directions_and_independent_chains(self):
        alice, bob = make_pair()
        for i in range(5):
            self.assertEqual(recv_gcm(bob, *send_gcm(alice, f"a->b {i}")), f"a->b {i}")
            self.assertEqual(recv_gcm(alice, *send_gcm(bob, f"b->a {i}")), f"b->a {i}")
        self.assertNotEqual(alice.send_ck, alice.recv_ck)

    def test_every_message_uses_a_distinct_key(self):
        alice, _ = make_pair()
        keys = {alice.next_send_keys()[1] for _ in range(50)}
        self.assertEqual(len(keys), 50)

    def test_forward_secrecy_state_compromise_cannot_open_past_messages(self):
        """An attacker who steals the CURRENT ratchet state cannot decrypt earlier ciphertexts."""
        alice, bob = make_pair()
        past = [send_gcm(alice, f"secret {i}") for i in range(3)]
        for p in past:
            recv_gcm(bob, *p)
        stolen_ck = bob.recv_ck                      # full state compromise of Bob
        # Walking the chain forward only ever yields FUTURE keys...
        mk, _ = kdf_chain(stolen_ck)
        _, wrong_enc_key_mac = None, message_subkeys(mk)
        n, ct, iv, tag, aad = past[0]
        with self.assertRaises(InvalidTag):
            decrypt_gcm(ct, iv, tag, wrong_enc_key_mac[0], aad)
        # ...and the real keys are gone: replaying a consumed message is refused
        with self.assertRaises(RatchetError):
            recv_gcm(bob, *past[0])

    def test_replay_of_consumed_message_is_rejected(self):
        alice, bob = make_pair()
        pkt = send_gcm(alice, "pay $100")
        self.assertEqual(recv_gcm(bob, *pkt), "pay $100")
        with self.assertRaises(RatchetError):
            recv_gcm(bob, *pkt)

    def test_out_of_order_delivery(self):
        alice, bob = make_pair()
        p1, p2, p3 = (send_gcm(alice, f"m{i}") for i in (1, 2, 3))
        self.assertEqual(recv_gcm(bob, *p3), "m3")   # 1 and 2 are skipped, keys stored
        self.assertEqual(recv_gcm(bob, *p1), "m1")
        self.assertEqual(recv_gcm(bob, *p2), "m2")
        with self.assertRaises(RatchetError):        # stored keys are deleted after use
            recv_gcm(bob, *p2)

    def test_forged_packet_does_not_burn_keys_or_desync(self):
        alice, bob = make_pair()
        p1 = send_gcm(alice, "first")
        n, ct, iv, tag, aad = p1
        forged = (n, ("0" if ct[0] != "0" else "1") + ct[1:], iv, tag, aad)
        with self.assertRaises(InvalidTag):
            recv_gcm(bob, *forged)
        self.assertEqual(bob.recv_n, 0)              # state NOT committed
        self.assertEqual(recv_gcm(bob, *p1), "first")  # the genuine packet still works

    def test_too_far_ahead_is_rejected(self):
        alice, bob = make_pair()
        with self.assertRaises(RatchetError):
            bob.receive(MAX_SKIP + 5, lambda e, m: "x")

    def test_cbc_hmac_over_ratchet_and_context_binding(self):
        alice, bob = make_pair()
        n, enc, mac = alice.next_send_keys()
        ctx = "sess|alice|bob|msg1|cbc-hmac"
        ct, iv = encrypt_message("hello bob", enc)
        tag = calculate_hmac(iv, ct, "ts", n, mac, ctx)

        def open_ok(e, m):
            if not verify_hmac(iv, ct, "ts", n, tag, m, ctx):
                raise ValueError("bad mac")
            return decrypt_message(ct, iv, e)
        self.assertEqual(bob.receive(n, open_ok), "hello bob")

        # The same packet replayed into another session/direction fails the MAC
        self.assertFalse(verify_hmac(iv, ct, "ts", n, tag, mac, "sess|bob|alice|msg1|cbc-hmac"))


class TestGCM(unittest.TestCase):

    def test_roundtrip_and_tamper_detection(self):
        key = os.urandom(32)
        aad = build_aad("2026-01-01T00:00:00Z", 7, "ctx")
        ct, iv, tag = encrypt_gcm("attack at dawn", key, aad)
        self.assertEqual(decrypt_gcm(ct, iv, tag, key, aad), "attack at dawn")
        bad_ct = ("0" if ct[0] != "0" else "1") + ct[1:]
        bad_tag = ("0" if tag[0] != "0" else "1") + tag[1:]
        for args in [(bad_ct, iv, tag, key, aad), (ct, iv, bad_tag, key, aad),
                     (ct, iv, tag, key, build_aad("2026-01-01T00:00:00Z", 8, "ctx")),   # AAD (seq) changed
                     (ct, iv, tag, key, build_aad("other", 7, "ctx"))]:                # AAD (timestamp) changed
            with self.assertRaises(InvalidTag):
                decrypt_gcm(*args)


class TestDHValidation(unittest.TestCase):

    def test_subgroup_check(self):
        self.assertTrue(is_valid_public_value(DiffieHellman().public_key))
        self.assertFalse(is_valid_public_value(1))
        self.assertFalse(is_valid_public_value(RFC_3526_2048_PRIME - 1))   # order-2 element
        self.assertFalse(is_valid_public_value(11))                         # quadratic non-residue: not in the order-q subgroup
        with self.assertRaises(ValueError):
            DiffieHellman().compute_shared_secret(format(RFC_3526_2048_PRIME - 1, 'x'))


class TestPaddingOracle(unittest.TestCase):

    def test_attack_decrypts_unauthenticated_cbc_without_the_key(self):
        server = VulnerableCBCServer()
        msg = "Wire $9,999 to acct 42"
        iv, ct = server.encrypt(msg)
        plaintext = strip_pkcs7(recover_plaintext(iv, ct, server.padding_oracle))
        self.assertEqual(plaintext.decode(), msg)
        self.assertGreater(server.queries, 500)

    def test_attack_fails_against_encrypt_then_mac(self):
        server = SecureCBCServer()
        iv, ct, tag = server.encrypt("Wire $9,999 to acct 42")
        with self.assertRaises(RuntimeError):
            recover_plaintext(iv, ct, lambda p, c: server.padding_oracle(p, c, tag))

    def test_demo_summary(self):
        r = run_demo("Meet at 5PM")
        self.assertTrue(r["vulnerable_cbc"]["attack_succeeded"])
        self.assertTrue(r["authenticated_design"]["attack_defeated"])


if __name__ == "__main__":
    unittest.main()
