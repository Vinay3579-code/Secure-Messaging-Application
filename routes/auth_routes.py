"""
Authentication Routes for CNS Secure Messaging System
Handles user registration, PBKDF2 password verification, session management,
and RSA identity key distribution.
"""
from flask import Blueprint, request, jsonify, session
from database import create_user, get_user_by_username, get_all_users, update_user_identity_key
from crypto.auth import hash_password, verify_password
from crypto.signatures import load_public_key_pem

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password are required"}), 400

    if len(username) < 3 or len(password) < 4:
        return jsonify({"success": False, "error": "Username must be >= 3 chars, password >= 4 chars"}), 400

    existing = get_user_by_username(username)
    if existing:
        return jsonify({"success": False, "error": "Username is already registered"}), 409

    # 1. Hash password with PBKDF2-HMAC-SHA256 and unique salt
    pwd_hash, salt = hash_password(password)

    # 2. The RSA-2048 identity keypair is generated in the user's browser; only the PUBLIC key is
    #    uploaded. The server never sees or returns a private identity key.
    public_key_pem = data.get('public_identity_key')
    if public_key_pem is not None and not load_public_key_pem(public_key_pem):
        return jsonify({"success": False, "error": "public_identity_key is not a valid RSA public key PEM"}), 400

    # 3. Store user in database
    created = create_user(username, pwd_hash, salt, public_key_pem)
    if not created:
        return jsonify({"success": False, "error": "Failed to create user"}), 500

    # Auto-login the newly registered user
    session['username'] = username

    return jsonify({
        "success": True,
        "username": username,
        "public_identity_key": public_key_pem,
        "message": "User registered successfully with PBKDF2-HMAC-SHA256 password protection."
    }), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"success": False, "error": "Username and password are required"}), 400

    user = get_user_by_username(username)
    if not user:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    # Verify password hash using constant-time comparison
    if not verify_password(password, user['password_hash'], user['salt']):
        return jsonify({"success": False, "error": "Invalid username or password"}), 401

    session['username'] = username

    return jsonify({
        "success": True,
        "username": username,
        "public_identity_key": user['public_identity_key'],
        "message": "Authentication successful."
    }), 200

@auth_bp.route('/api/auth/identity', methods=['POST'])
def set_identity_key():
    """
    Publishes (or rotates) the user's RSA public identity key. Re-authenticates with the password so the
    key cannot be swapped by anyone who merely holds a session cookie or spoofs a header.
    """
    data = request.get_json() or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''
    public_key_pem = data.get('public_identity_key')

    user = get_user_by_username(username) if username else None
    if not user or not verify_password(password, user['password_hash'], user['salt']):
        return jsonify({"success": False, "error": "Invalid username or password"}), 401
    if not public_key_pem or not load_public_key_pem(public_key_pem):
        return jsonify({"success": False, "error": "public_identity_key is not a valid RSA public key PEM"}), 400

    update_user_identity_key(username, public_key_pem)
    return jsonify({"success": True, "message": "Identity public key published."}), 200

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
def me():
    username = request.headers.get('X-Sim-User') or session.get('username')
    if not username:
        return jsonify({"logged_in": False, "username": None}), 200
    user = get_user_by_username(username)
    return jsonify({
        "logged_in": True,
        "username": username,
        "public_identity_key": user['public_identity_key'] if user else None
    }), 200

@auth_bp.route('/api/auth/users', methods=['GET'])
def list_users():
    current_user = request.headers.get('X-Sim-User') or session.get('username')
    users = get_all_users()
    # Filter out sensitive fields
    user_list = [
        {
            "username": u["username"],
            "public_identity_key": u["public_identity_key"],
            "created_at": u["created_at"]
        }
        for u in users if u["username"] != current_user
    ]
    return jsonify({"users": user_list}), 200
