"""
Asymmetric Digital Signatures: RSA-2048 with PSS & SHA-256
Provides identity authentication, non-repudiation, and defense against Man-in-the-Middle (MITM)
attacks during Diffie-Hellman public key exchange.
"""
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

def dh_signed_payload(role: str, initiator: str, responder: str, pub_hex: str) -> str:
    """
    Canonical string signed for a DH public value (must match static/js/crypto_client.js).
    Binds the value to its role (A/B), both identities and the direction of the handshake, so a
    signature on Alice's A cannot be replayed as a different value, role, or peer pairing.
    """
    return f"cns-dh-v2|{role}|{initiator}|{responder}|{format(int(pub_hex, 16), 'x')}"

def load_public_key_pem(public_key_pem: str) -> bool:
    """Returns True if the string is a valid RSA public key PEM."""
    try:
        key = serialization.load_pem_public_key(public_key_pem.encode('utf-8'))
        return isinstance(key, rsa.RSAPublicKey)
    except Exception:
        return False

def generate_identity_keypair() -> tuple[str, str]:
    """
    Generates a long-term RSA-2048 keypair for a user.
    Returns: (private_key_pem, public_key_pem) as strings.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return private_pem, public_pem

def sign_data(data_str: str, private_key_pem: str) -> str:
    """
    Signs arbitrary string data using the user's RSA private key with PSS padding and SHA-256.
    Returns: hexadecimal signature string.
    """
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None
    )
    signature = private_key.sign(
        data_str.encode('utf-8'),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return signature.hex()

def verify_signature(data_str: str, signature_hex: str, public_key_pem: str) -> bool:
    """
    Verifies an RSA PSS signature against the sender's public key.
    Returns True if authentic, False if forged or tampered.
    """
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8')
        )
        signature = bytes.fromhex(signature_hex)
        public_key.verify(
            signature,
            data_str.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False
