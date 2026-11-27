"""
Diffie-Hellman Key Exchange Coordination Routes
Facilitates the exchange of public parameters (p, g, A, B) and RSA signatures.
The server acts purely as a public directory and message board. It verifies the RSA signature on every
DH public value and REJECTS unsigned or forged ones, but it NEVER learns private keys (a, b), the shared
secret, or any message key: all DH maths and encryption happen in the browser (static/js/crypto_client.js).
"""
import uuid
from flask import Blueprint, request, jsonify, session
from database import (
    create_dh_session,
    update_dh_session_bob,
    get_dh_session,
    get_active_dh_session,
    get_latest_pending_session_for,
    get_user_by_username
)
from crypto.dh import RFC_3526_2048_PRIME, RFC_3526_GENERATOR, is_valid_public_value
from crypto.signatures import verify_signature, dh_signed_payload

dh_bp = Blueprint('dh', __name__)

@dh_bp.route('/api/dh/initiate', methods=['POST'])
def initiate_session():
    current_user = request.headers.get('X-Sim-User') or session.get('username')
    if not current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.get_json() or {}
    peer = (data.get('peer') or '').strip().lower()
    pub_a = data.get('pub_a')
    sig_a = data.get('sig_a')
    p_hex = data.get('p_hex')
    g = data.get('g', 2)

    if not peer or not pub_a:
        return jsonify({"success": False, "error": "Peer and Public Key A are required"}), 400

    peer_user = get_user_by_username(peer)
    if not peer_user:
        return jsonify({"success": False, "error": "Peer user not found"}), 404

    # Only the standardised RFC 3526 group is accepted (blocks weak / attacker-chosen parameters)
    if (p_hex and int(p_hex, 16) != RFC_3526_2048_PRIME) or int(g) != RFC_3526_GENERATOR:
        return jsonify({"success": False, "error": "Unsupported DH group: only RFC 3526 MODP-2048 (g=2) is allowed"}), 400
    p_hex = format(RFC_3526_2048_PRIME, 'x')
    try:
        if not is_valid_public_value(int(pub_a, 16)):
            raise ValueError
    except ValueError:
        return jsonify({"success": False, "error": "Invalid DH public value A"}), 400

    # Enforce Alice's RSA signature on A (anti-MITM). Unsigned or forged values are rejected outright.
    sender_user = get_user_by_username(current_user)
    if not sender_user or not sender_user.get('public_identity_key'):
        return jsonify({"success": False, "error": "No identity key published for you; log in again to create one"}), 400
    signed_text = dh_signed_payload('A', current_user, peer, pub_a)
    if not sig_a or not verify_signature(signed_text, sig_a, sender_user['public_identity_key']):
        return jsonify({"success": False, "error": "SIGNATURE_INVALID: signature on public value A is missing or forged"}), 400
    sig_valid = True

    session_id = uuid.uuid4().hex[:12]

    create_dh_session(
        session_id=session_id,
        user1=current_user,
        user2=peer,
        dh_p=p_hex,
        dh_g=g,
        pub_a=pub_a,
        sig_a=sig_a
    )

    return jsonify({
        "success": True,
        "session_id": session_id,
        "status": "pending",
        "signature_valid": sig_valid,
        "message": f"DH Key Exchange initiated by {current_user} with {peer}."
    }), 201

@dh_bp.route('/api/dh/respond', methods=['POST'])
def respond_session():
    current_user = request.headers.get('X-Sim-User') or session.get('username')
    if not current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.get_json() or {}
    session_id = data.get('session_id')
    pub_b = data.get('pub_b')
    sig_b = data.get('sig_b')

    if not session_id or not pub_b:
        return jsonify({"success": False, "error": "session_id and pub_b are required"}), 400

    dh_sess = get_dh_session(session_id)
    if not dh_sess:
        return jsonify({"success": False, "error": "Session not found"}), 404

    if dh_sess['user2'] != current_user:
        return jsonify({"success": False, "error": "You are not the designated recipient for this DH handshake"}), 403

    if dh_sess['status'] != 'pending':
        return jsonify({"success": False, "error": f"Session is '{dh_sess['status']}', not awaiting a response"}), 409

    try:
        if not is_valid_public_value(int(pub_b, 16)):
            raise ValueError
    except ValueError:
        return jsonify({"success": False, "error": "Invalid DH public value B"}), 400

    # Enforce Bob's RSA signature on B (anti-MITM)
    responder_user = get_user_by_username(current_user)
    if not responder_user or not responder_user.get('public_identity_key'):
        return jsonify({"success": False, "error": "No identity key published for you; log in again to create one"}), 400
    signed_text = dh_signed_payload('B', dh_sess['user1'], current_user, pub_b)
    if not sig_b or not verify_signature(signed_text, sig_b, responder_user['public_identity_key']):
        return jsonify({"success": False, "error": "SIGNATURE_INVALID: signature on public value B is missing or forged"}), 400
    sig_valid = True

    update_dh_session_bob(session_id, pub_b, sig_b)

    return jsonify({
        "success": True,
        "session_id": session_id,
        "status": "established",
        "signature_valid": sig_valid,
        "message": "DH handshake completed. Symmetric keys can now be derived."
    }), 200

@dh_bp.route('/api/dh/session/<session_id>', methods=['GET'])
def get_session_info(session_id):
    dh_sess = get_dh_session(session_id)
    if not dh_sess:
        return jsonify({"success": False, "error": "Session not found"}), 404
    return jsonify({"success": True, "session": dict(dh_sess)}), 200

@dh_bp.route('/api/dh/pending', methods=['GET'])
def check_pending():
    current_user = request.headers.get('X-Sim-User') or session.get('username')
    if not current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    pending = get_latest_pending_session_for(current_user)
    if pending:
        return jsonify({"has_pending": True, "session": dict(pending)}), 200
    return jsonify({"has_pending": False}), 200

@dh_bp.route('/api/dh/active/<peer>', methods=['GET'])
def check_active(peer):
    current_user = request.headers.get('X-Sim-User') or session.get('username')
    if not current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    active = get_active_dh_session(current_user, peer.strip().lower())
    if active:
        return jsonify({"has_active": True, "session": dict(active)}), 200
    return jsonify({"has_active": False}), 200

@dh_bp.route('/api/dh/reset', methods=['POST'])
def reset_session():
    current_user = request.headers.get('X-Sim-User') or session.get('username')
    data = request.get_json() or {}
    peer = (data.get('peer') or '').strip().lower()
    from database import clear_messages_and_sessions
    clear_messages_and_sessions(current_user, peer if peer else None)
    return jsonify({"success": True, "message": "Session reset successfully"}), 200
