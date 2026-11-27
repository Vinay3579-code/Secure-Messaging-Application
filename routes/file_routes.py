"""
Encrypted File Relay Routes
The server stores and serves ONLY opaque CBC + HMAC-SHA256 blobs (iv || ciphertext || tag) that were
encrypted in the sender's browser. It never sees file names, types, contents, or keys: those travel
inside an end-to-end encrypted chat message.
"""
import re
import hashlib
from flask import Blueprint, request, jsonify, session, Response
from database import (
    get_user_by_username,
    save_file_record,
    get_file_record,
    blob_path,
    UPLOAD_DIR,
)
from crypto.filecrypt import MAX_BLOB_BYTES, MIN_BLOB_BYTES

file_bp = Blueprint('files', __name__)

FILE_ID_RE = re.compile(r'^[0-9a-f]{32}$')

def _current_user():
    return request.headers.get('X-Sim-User') or session.get('username')

@file_bp.route('/api/files/upload', methods=['POST'])
def upload_file():
    current_user = _current_user()
    if not current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    file_id = request.args.get('file_id', '')
    recipient = (request.args.get('recipient') or '').strip().lower()
    if not FILE_ID_RE.match(file_id):
        return jsonify({"success": False, "error": "file_id must be 32 lowercase hex characters"}), 400
    if not get_user_by_username(recipient):
        return jsonify({"success": False, "error": "Recipient not found"}), 404
    if request.content_length is not None and request.content_length > MAX_BLOB_BYTES:
        return jsonify({"success": False, "error": "FILE_TOO_LARGE"}), 413

    blob = request.get_data(cache=False)
    if len(blob) > MAX_BLOB_BYTES:
        return jsonify({"success": False, "error": "FILE_TOO_LARGE"}), 413
    if len(blob) < MIN_BLOB_BYTES:
        return jsonify({"success": False, "error": "Not a valid encrypted blob"}), 400
    if get_file_record(file_id):
        return jsonify({"success": False, "error": "file_id already exists"}), 409

    UPLOAD_DIR.mkdir(exist_ok=True)
    with open(blob_path(file_id), 'xb') as fh:
        fh.write(blob)
    digest = hashlib.sha256(blob).hexdigest()
    save_file_record(file_id, current_user, recipient, len(blob), digest)

    return jsonify({"success": True, "file_id": file_id, "size": len(blob), "sha256": digest}), 201

@file_bp.route('/api/files/<file_id>', methods=['GET'])
def download_file(file_id):
    current_user = _current_user()
    if not current_user:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    if not FILE_ID_RE.match(file_id):
        return jsonify({"success": False, "error": "Not found"}), 404

    record = get_file_record(file_id)
    # Only the uploader and the intended recipient may fetch a blob; everyone else gets a plain 404
    if not record or current_user not in (record['uploader'], record['recipient']):
        return jsonify({"success": False, "error": "Not found"}), 404
    try:
        with open(blob_path(file_id), 'rb') as fh:
            data = fh.read()
    except FileNotFoundError:
        return jsonify({"success": False, "error": "Not found"}), 404

    return Response(data, mimetype='application/octet-stream', headers={
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'attachment; filename="encrypted.bin"',
    })
