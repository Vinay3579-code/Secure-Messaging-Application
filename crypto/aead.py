"""
Authenticated Encryption (AEAD): AES-256-GCM
Single-primitive alternative to AES-CBC + HMAC (Encrypt-then-MAC). GCM provides confidentiality
and integrity in one pass, and binds Associated Data (timestamp, sequence number, session context)
into the authentication tag. A forged or modified packet fails the tag check before any plaintext
is released, so it is immune to padding-oracle attacks.
"""
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

GCM_IV_SIZE_BYTES = 12   # 96-bit nonce recommended by NIST SP 800-38D
GCM_TAG_SIZE_BYTES = 16  # 128-bit authentication tag

def build_aad(timestamp: str, seq_no: int, context: str = "") -> bytes:
    """Canonical Associated Data bound into the GCM tag (must match static/js/crypto_client.js)."""
    return f"{timestamp}:{seq_no}:{context}".encode('utf-8')

def encrypt_gcm(plaintext: str, aes_key: bytes, aad: bytes = b"", iv: bytes = None) -> tuple[str, str, str]:
    """
    Encrypts with AES-256-GCM. Returns: (ciphertext_hex, iv_hex, tag_hex)
    The ciphertext and tag are returned separately so the tag can travel in the relay's auth-tag field.
    """
    if not isinstance(plaintext, str):
        raise TypeError("plaintext must be a string")
    if not isinstance(aes_key, bytes) or len(aes_key) != 32:
        raise ValueError("aes_key must be 32 bytes (256 bits)")
    if iv is None:
        iv = os.urandom(GCM_IV_SIZE_BYTES)
    elif len(iv) != GCM_IV_SIZE_BYTES:
        raise ValueError(f"IV must be exactly {GCM_IV_SIZE_BYTES} bytes")

    sealed = AESGCM(aes_key).encrypt(iv, plaintext.encode('utf-8'), aad)
    ciphertext, tag = sealed[:-GCM_TAG_SIZE_BYTES], sealed[-GCM_TAG_SIZE_BYTES:]
    return ciphertext.hex(), iv.hex(), tag.hex()

def decrypt_gcm(ciphertext_hex: str, iv_hex: str, tag_hex: str, aes_key: bytes, aad: bytes = b"") -> str:
    """
    Verifies the tag and decrypts. Raises cryptography.exceptions.InvalidTag on ANY modification of
    ciphertext, IV, tag, or associated data.
    """
    if not isinstance(aes_key, bytes) or len(aes_key) != 32:
        raise ValueError("aes_key must be 32 bytes (256 bits)")
    iv = bytes.fromhex(iv_hex)
    if len(iv) != GCM_IV_SIZE_BYTES:
        raise ValueError(f"Invalid IV length: expected {GCM_IV_SIZE_BYTES} bytes")
    sealed = bytes.fromhex(ciphertext_hex) + bytes.fromhex(tag_hex)
    return AESGCM(aes_key).decrypt(iv, sealed, aad).decode('utf-8')
