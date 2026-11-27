"""
End-to-end encrypted file sharing (reference implementation; the browser does the real work).

Cipher suite: AES-256-CBC + HMAC-SHA256, Encrypt-then-MAC (the same suite as chat messages).
Each file gets a fresh random 256-bit file key, split by HKDF into an independent encryption key and MAC
key. The stored blob is
    iv (16 bytes) || AES-CBC ciphertext (PKCS#7) || HMAC-SHA256 tag (32 bytes)
The tag covers a length-prefixed Associated Data string, the IV and the ciphertext, and is verified in
constant time BEFORE any decryption happens. The AAD binds the blob to one file id and one conversation
direction, so the relay cannot serve it under another file id or to a different sender/receiver pair.

The file key never touches the server: it travels only inside an ordinary ratcheted E2EE chat message
together with the file id, name, size and a SHA-256 of the plaintext. The relay stores an opaque blob.
Must stay byte-compatible with static/js/crypto_client.js (CNSCrypto.encryptFile / decryptFile).
"""
import hashlib
import hmac
import os
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

IV_SIZE    = 16
NONCE_SIZE = IV_SIZE   # alias used by file_routes.py (AES-CBC IV = nonce)
TAG_SIZE   = 32
BLOCK      = 16
MAX_FILE_BYTES = 10 * 1024 * 1024                        # plaintext limit
MIN_BLOB_BYTES = IV_SIZE + BLOCK + TAG_SIZE              # iv + one padded block + tag
MAX_BLOB_BYTES = IV_SIZE + MAX_FILE_BYTES + BLOCK + TAG_SIZE  # worst-case padding adds a full block

FILE_ENC_INFO = b"cns-file-v2 enc key"
FILE_MAC_INFO = b"cns-file-v2 mac key"

def file_aad(file_id: str, sender: str, receiver: str) -> bytes:
    return f"cns-file-v1|{file_id}|{sender}|{receiver}".encode('utf-8')

def _subkeys(file_key: bytes) -> tuple[bytes, bytes]:
    def derive(info):
        return HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=info).derive(file_key)
    return derive(FILE_ENC_INFO), derive(FILE_MAC_INFO)

def _mac(mac_key: bytes, aad: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    data = len(aad).to_bytes(4, 'big') + aad + iv + ciphertext
    return hmac.new(mac_key, data, hashlib.sha256).digest()

def encrypt_file(data: bytes, aad: bytes, key: bytes = None) -> tuple[bytes, bytes]:
    """Returns (blob, file_key). A fresh random key is generated unless one is supplied (tests only)."""
    if len(data) > MAX_FILE_BYTES:
        raise ValueError("file exceeds the maximum size")
    key = key or os.urandom(32)
    enc_key, mac_key = _subkeys(key)
    iv = os.urandom(IV_SIZE)
    padder = padding.PKCS7(128).padder()
    encryptor = Cipher(algorithms.AES(enc_key), modes.CBC(iv)).encryptor()
    ciphertext = encryptor.update(padder.update(data) + padder.finalize()) + encryptor.finalize()
    return iv + ciphertext + _mac(mac_key, aad, iv, ciphertext), key

def decrypt_file(blob: bytes, key: bytes, aad: bytes) -> bytes:
    """Verifies the MAC first; raises cryptography.exceptions.InvalidTag if the blob, key or AAD is wrong or modified."""
    if len(blob) < MIN_BLOB_BYTES:
        raise ValueError("blob too short")
    iv, ciphertext, tag = blob[:IV_SIZE], blob[IV_SIZE:-TAG_SIZE], blob[-TAG_SIZE:]
    enc_key, mac_key = _subkeys(key)
    if not hmac.compare_digest(_mac(mac_key, aad, iv, ciphertext), tag) or len(ciphertext) % BLOCK:
        raise InvalidTag()
    decryptor = Cipher(algorithms.AES(enc_key), modes.CBC(iv)).decryptor()
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(decryptor.update(ciphertext) + decryptor.finalize()) + unpadder.finalize()
