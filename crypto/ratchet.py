"""
Symmetric-Key Ratchet (forward secrecy per message)
After the authenticated DH handshake, the shared secret is expanded into two directional chain keys
(initiator->responder and responder->initiator). Every message advances its chain:

    message_key = HMAC(chain_key, 0x01)      chain_key' = HMAC(chain_key, 0x02)

The old chain key is discarded, and HMAC is one-way, so compromising the current state does NOT reveal
keys of messages already sent or received (forward secrecy). Each message key is then split by HKDF into
an independent encryption key and MAC key. Must stay byte-compatible with static/js/crypto_client.js.
Note: this is a symmetric ratchet only; it does not give post-compromise security (no DH ratchet).
"""
import hashlib
import hmac
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

CHAIN_INFO_INIT_TO_RESP = b"cns-ratchet-v2 chain initiator->responder"
CHAIN_INFO_RESP_TO_INIT = b"cns-ratchet-v2 chain responder->initiator"
MSG_ENC_INFO = b"cns-ratchet-v2 message enc key"
MSG_MAC_INFO = b"cns-ratchet-v2 message mac key"
MAX_SKIP = 100  # max out-of-order / lost messages tolerated per chain

class RatchetError(Exception):
    """Raised for replayed, stale, or too-far-ahead messages."""

def _hkdf(ikm: bytes, salt: bytes | None, info: bytes) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=info).derive(ikm)

def transcript_salt(pub_a_hex: str, pub_b_hex: str) -> bytes:
    """Binds derived keys to the exact DH public values exchanged (handshake transcript)."""
    a = format(int(pub_a_hex, 16), 'x')
    b = format(int(pub_b_hex, 16), 'x')
    return hashlib.sha256(f"{a}:{b}".encode('utf-8')).digest()

def derive_chain_keys(shared_secret: bytes, pub_a_hex: str, pub_b_hex: str) -> tuple[bytes, bytes]:
    """Returns (initiator_to_responder_chain_key, responder_to_initiator_chain_key)."""
    salt = transcript_salt(pub_a_hex, pub_b_hex)
    return (_hkdf(shared_secret, salt, CHAIN_INFO_INIT_TO_RESP),
            _hkdf(shared_secret, salt, CHAIN_INFO_RESP_TO_INIT))

def kdf_chain(chain_key: bytes) -> tuple[bytes, bytes]:
    """One ratchet step. Returns (message_key, next_chain_key)."""
    return (hmac.new(chain_key, b"\x01", hashlib.sha256).digest(),
            hmac.new(chain_key, b"\x02", hashlib.sha256).digest())

def message_subkeys(message_key: bytes) -> tuple[bytes, bytes]:
    """Splits a one-time message key into (enc_key, mac_key)."""
    return _hkdf(message_key, None, MSG_ENC_INFO), _hkdf(message_key, None, MSG_MAC_INFO)

def fingerprint(key: bytes) -> str:
    return hashlib.sha256(key).hexdigest()[:16]

class SymmetricRatchet:
    """Per-session ratchet state for one participant."""

    def __init__(self, shared_secret: bytes, pub_a_hex: str, pub_b_hex: str, is_initiator: bool):
        init_ck, resp_ck = derive_chain_keys(shared_secret, pub_a_hex, pub_b_hex)
        self.send_ck, self.recv_ck = (init_ck, resp_ck) if is_initiator else (resp_ck, init_ck)
        self.send_n = 0
        self.recv_n = 0
        self.skipped: dict[int, bytes] = {}

    def next_send_keys(self) -> tuple[int, bytes, bytes]:
        """Advances the sending chain. Returns (seq_no, enc_key, mac_key); the message key is not kept."""
        mk, self.send_ck = kdf_chain(self.send_ck)
        self.send_n += 1
        enc_key, mac_key = message_subkeys(mk)
        return self.send_n, enc_key, mac_key

    def receive(self, seq_no: int, open_fn):
        """
        Derives the keys for message `seq_no` and calls open_fn(enc_key, mac_key), which must raise if
        authentication fails. Ratchet state is committed ONLY if open_fn succeeds, so a forged packet
        cannot burn keys or desynchronise the chain.
        """
        if seq_no in self.skipped:
            result = open_fn(*message_subkeys(self.skipped[seq_no]))
            del self.skipped[seq_no]
            return result
        if seq_no <= self.recv_n:
            raise RatchetError(f"Replay/stale message: #{seq_no} already consumed (chain at #{self.recv_n})")
        if seq_no - self.recv_n > MAX_SKIP:
            raise RatchetError(f"Message #{seq_no} is too far ahead of chain position #{self.recv_n}")

        ck, newly_skipped, target_mk = self.recv_ck, {}, None
        for i in range(self.recv_n + 1, seq_no + 1):
            mk, ck = kdf_chain(ck)
            if i == seq_no:
                target_mk = mk
            else:
                newly_skipped[i] = mk
        result = open_fn(*message_subkeys(target_mk))

        self.recv_ck, self.recv_n = ck, seq_no
        self.skipped.update(newly_skipped)
        while len(self.skipped) > MAX_SKIP:
            del self.skipped[min(self.skipped)]
        return result
