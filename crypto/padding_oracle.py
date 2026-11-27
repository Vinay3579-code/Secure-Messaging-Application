"""
CBC Padding-Oracle Attack (Vaudenay, 2002) - educational demonstration.

Against AES-CBC that is NOT authenticated, a server that reveals whether the padding of a decrypted
message was valid (an "oracle") lets an attacker decrypt any ciphertext WITHOUT the key, ~128 queries
per byte. This module contains:
  * VulnerableCBCServer  - unauthenticated CBC that leaks padding validity (the oracle)
  * SecureCBCServer      - our design: HMAC verified first, so every forged query gets the same answer
  * recover_plaintext()  - the attack, driven only by oracle answers
"""
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from crypto.integrity import calculate_hmac, verify_hmac

BLOCK = 16

def _aes_cbc_encrypt(key: bytes, iv: bytes, data: bytes) -> bytes:
    padder = padding.PKCS7(128).padder()
    enc = Cipher(algorithms.AES(key), modes.CBC(iv)).encryptor()
    return enc.update(padder.update(data) + padder.finalize()) + enc.finalize()

def _aes_cbc_decrypt_unpad(key: bytes, iv: bytes, ct: bytes) -> bytes:
    dec = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    padded = dec.update(ct) + dec.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(padded) + unpadder.finalize()  # raises ValueError on bad padding

class VulnerableCBCServer:
    """AES-CBC + PKCS#7 with NO integrity check; answers 'padding valid?' for any ciphertext."""

    def __init__(self, key: bytes = None):
        self.key = key or os.urandom(32)
        self.queries = 0

    def encrypt(self, plaintext: str) -> tuple[bytes, bytes]:
        iv = os.urandom(BLOCK)
        return iv, _aes_cbc_encrypt(self.key, iv, plaintext.encode('utf-8'))

    def padding_oracle(self, iv: bytes, ct: bytes) -> bool:
        self.queries += 1
        try:
            _aes_cbc_decrypt_unpad(self.key, iv, ct)
            return True
        except ValueError:
            return False

class SecureCBCServer:
    """
    Our design (AES-CBC + HMAC, Encrypt-then-MAC). The MAC is checked BEFORE the padding is touched, so
    forged ciphertexts are all rejected with the identical answer and the oracle carries no information.
    """

    def __init__(self, enc_key: bytes = None, mac_key: bytes = None):
        self.enc_key = enc_key or os.urandom(32)
        self.mac_key = mac_key or os.urandom(32)
        self.queries = 0

    def encrypt(self, plaintext: str, timestamp: str = "t", seq_no: int = 1) -> tuple[bytes, bytes, str]:
        iv = os.urandom(BLOCK)
        ct = _aes_cbc_encrypt(self.enc_key, iv, plaintext.encode('utf-8'))
        return iv, ct, calculate_hmac(iv.hex(), ct.hex(), timestamp, seq_no, self.mac_key)

    def padding_oracle(self, iv: bytes, ct: bytes, tag: str, timestamp: str = "t", seq_no: int = 1) -> bool:
        self.queries += 1
        if not verify_hmac(iv.hex(), ct.hex(), timestamp, seq_no, tag, self.mac_key):
            return False  # "invalid" - indistinguishable from bad padding
        try:
            _aes_cbc_decrypt_unpad(self.enc_key, iv, ct)
            return True
        except ValueError:
            return False

def recover_plaintext(iv: bytes, ct: bytes, oracle, trace=None) -> bytes:
    """
    Decrypts `ct` using only oracle(iv', ct_block) -> bool answers. For each block C_i with predecessor P:
    find intermediate I = D_k(C_i) byte by byte by forging P' until padding 0x01, 0x02 0x02, ... is valid;
    then plaintext = I xor P. Returns the plaintext WITH its PKCS#7 padding still attached.
    `oracle(prev_block, block)` must return True iff padding is valid. Raises RuntimeError if the oracle
    gives no usable signal for a byte (e.g. against the authenticated design).
    """
    blocks = [ct[i:i + BLOCK] for i in range(0, len(ct), BLOCK)]
    prev_blocks = [iv] + blocks[:-1]
    recovered = b""

    for bi, (prev, block) in enumerate(zip(prev_blocks, blocks)):
        intermediate = bytearray(BLOCK)
        for pad in range(1, BLOCK + 1):
            pos = BLOCK - pad
            forged = bytearray(BLOCK)
            for j in range(pos + 1, BLOCK):
                forged[j] = intermediate[j] ^ pad
            found = False
            for guess in range(256):
                forged[pos] = guess
                if not oracle(bytes(forged), block):
                    continue
                if pad == 1:
                    # Rule out a false positive (e.g. ...0x02 0x02 also validates): perturb the byte before.
                    check = bytearray(forged)
                    check[pos - 1] ^= 0xFF
                    if not oracle(bytes(check), block):
                        continue
                intermediate[pos] = guess ^ pad
                found = True
                break
            if not found:
                raise RuntimeError(f"Oracle gave no signal for block {bi}, byte {pos}: attack failed")
            if trace:
                trace(bi, pos, intermediate[pos] ^ prev[pos])
        recovered += bytes(i ^ p for i, p in zip(intermediate, prev))
    return recovered

def strip_pkcs7(data: bytes) -> bytes:
    n = data[-1]
    return data[:-n] if 1 <= n <= BLOCK and data.endswith(bytes([n]) * n) else data

def run_demo(message: str) -> dict:
    """Runs the attack against the vulnerable design and (with a hard query cap) the authenticated one."""
    vuln = VulnerableCBCServer()
    iv, ct = vuln.encrypt(message)
    recovered = recover_plaintext(iv, ct, vuln.padding_oracle)
    vulnerable = {
        "ciphertext_hex": ct.hex(),
        "iv_hex": iv.hex(),
        "blocks": len(ct) // BLOCK,
        "oracle_queries": vuln.queries,
        "recovered_plaintext": strip_pkcs7(recovered).decode('utf-8', errors='replace'),
        "attack_succeeded": strip_pkcs7(recovered).decode('utf-8', errors='replace') == message,
    }

    secure = SecureCBCServer()
    s_iv, s_ct, s_tag = secure.encrypt(message)
    error = None
    try:
        # Attacker must reuse the (now invalid) tag for forged blocks; it can't compute a valid one.
        recover_plaintext(s_iv, s_ct, lambda p, c: secure.padding_oracle(p, c, s_tag))
        defended = False
    except RuntimeError as exc:
        defended, error = True, str(exc)
    return {
        "message_length": len(message.encode('utf-8')),
        "vulnerable_cbc": vulnerable,
        "authenticated_design": {
            "oracle_queries_before_giving_up": secure.queries,
            "attack_defeated": defended,
            "detail": error,
        },
    }
