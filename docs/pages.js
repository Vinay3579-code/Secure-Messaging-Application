/**
 * SecureMsg CNS Portfolio — All 9 In-Depth Page Renderers
 * Exact 9 tabs: home, overview, architecture, protocol, implementation, demo, evidence, results, team
 */

window.PORTFOLIO_ROUTES = [
  { id: 'home',           label: 'Home',                  short: 'Home',           title: 'SecureMsg — Hybrid Cryptography Portfolio' },
  { id: 'overview',       label: 'Project Overview',      short: 'Overview',       title: 'Project Overview — SecureMsg' },
  { id: 'architecture',   label: 'System Architecture',   short: 'Architecture',   title: 'System Architecture — SecureMsg' },
  { id: 'protocol',       label: 'Eight-Stage Protocol',  short: 'Protocol',       title: 'Eight-Stage Protocol — SecureMsg' },
  { id: 'implementation', label: 'Cryptography & Code',   short: 'Implementation', title: 'Implementation & Code — SecureMsg' },
  { id: 'demo',           label: 'Interactive Demo',      short: 'Demo',           title: 'Interactive Demo & Attack Lab — SecureMsg' },
  { id: 'evidence',       label: 'Audit & Evidence',      short: 'Evidence',       title: 'Audit & Forensic Evidence — SecureMsg' },
  { id: 'results',        label: 'Testing & Results',     short: 'Results',        title: 'Testing, Results & References — SecureMsg' },
  { id: 'team',           label: 'Team 04',               short: 'Team',           title: 'Team 04 — SecureMsg' },
];

window.PROTOCOL_STEPS = [
  {
    num: '01',
    title: 'Registration & PBKDF2 Auth',
    sub: 'Password hashing & session',
    color: 'violet',
    actors: 'User Browser → POST /api/auth/register & /login → Flask + SQLite (users)',
    summary: 'Accounts authenticate using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique 16-byte cryptographic salt per user. Passwords are verified using constant-time hmac.compare_digest to prevent timing side-channel leaks.',
    math: 'derived_key = PBKDF2-HMAC-SHA256(password_utf8, random_16B_salt, iterations=100_000, dklen=32)',
    wire: `POST /api/auth/register
{ "username": "alice", "password": "********", "public_identity_key": "-----BEGIN PUBLIC KEY-----..." }

SQLite users row stored:
{ username: "alice", password_hash: "<64-char hex>", salt: "<32-char hex>", public_identity_key: "<SPKI PEM>" }`,
    defense: 'Resists dictionary attacks, rainbow tables, and database leaks. Plaintext passwords are never persisted.'
  },
  {
    num: '02',
    title: 'Browser RSA-2048-PSS Identity',
    sub: 'Client-only private keys',
    color: 'violet',
    actors: 'Browser WebCrypto (crypto_client.js) → POST /api/auth/identity',
    summary: 'Each browser locally generates a long-term RSA-2048-PSS keypair (SHA-256, public exponent 65537, max salt 222 bytes). The PKCS#8 private key stays exclusively in browser localStorage; only the SPKI public key is published after re-authenticating with the account password.',
    math: 'KeyPair = WebCrypto.generateKey({ name: "RSA-PSS", modulusLength: 2048, hash: "SHA-256" })',
    wire: `POST /api/auth/identity
{
  "username": "alice",
  "password": "********",
  "public_identity_key": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkq...\\n-----END PUBLIC KEY-----"
}`,
    defense: 'Server never sees or generates private identity keys; password re-check prevents session-hijack key swapping.'
  },
  {
    num: '03',
    title: 'Signed DH Initiation (Alice)',
    sub: 'RFC 3526 MODP-2048',
    color: 'violet',
    actors: 'Alice Browser → POST /api/dh/initiate → Flask Relay (dh_routes.py)',
    summary: 'Alice generates a 256-bit random private exponent a, computes A = 2^a mod p using RFC 3526 2048-bit MODP Group 14, and signs the canonical role-and-peer-bound payload with her RSA-2048-PSS private key. The server validates the standard group, subgroup membership, and Alice\'s signature before storing.',
    math: 'A = g^a mod p  (g = 2, p = RFC3526_2048_PRIME)\nsig_a = RSA-PSS-Sign(priv_alice, "cns-dh-v2|A|alice|bob|" + hex(A))',
    wire: `POST /api/dh/initiate
{
  "peer": "bob",
  "p_hex": "ffffffffffffffffc90fdaa2...ffffffffffffffff",
  "g": 2,
  "pub_a": "<512-char lowercase hex>",
  "sig_a": "<512-char RSA-PSS hex signature>"
}
// Rejected with HTTP 400 SIGNATURE_INVALID if unsigned, forged, or relabelled`,
    defense: 'Eliminates weak/custom DH parameter injection, role confusion, and unauthenticated MITM substitution.'
  },
  {
    num: '04',
    title: 'Subgroup Check & DH Response (Bob)',
    sub: 'Anti-MITM verification',
    color: 'emerald',
    actors: 'Bob Browser ← GET /api/dh/pending → POST /api/dh/respond',
    summary: 'Bob fetches Alice\'s pending session and her public identity key from the directory. Bob verifies group parameters, range (1 < A < p-1), prime-order subgroup membership (A^q ≡ 1 mod p), and sig_a. Only if all checks pass does Bob compute (b, B), derive S = A^b mod p, erase b, and publish signed B.',
    math: 'Check: 1 < A < p-1  AND  A^q ≡ 1 (mod p)  where q = (p - 1) / 2\nB = 2^b mod p,   S = A^b mod p,   sig_b = RSA-PSS-Sign(priv_bob, "cns-dh-v2|B|alice|bob|" + hex(B))',
    wire: `POST /api/dh/respond
{
  "session_id": "a1b2c3d4e5f6",
  "pub_b": "<512-char lowercase hex>",
  "sig_b": "<512-char RSA-PSS hex signature>"
}
// Relay verifies sig_b & subgroup check → status = "established"`,
    defense: 'Blocks small-subgroup confinement attacks (order-2 elements like p-1 or non-residues like 11) and MITM impersonation.'
  },
  {
    num: '05',
    title: 'Transcript-Salted HKDF Seeding',
    sub: 'Directional chain keys',
    color: 'emerald',
    actors: 'Alice & Bob Browsers independently (zero network transmission)',
    summary: 'Alice verifies Bob\'s sig_b and subgroup check, computes S = B^a mod p, and both peers bind their derived session keys to the exact handshake transcript using SHA-256("A:B") as the HKDF-SHA256 salt. Both immediately zero a, b, and S from RAM.',
    math: 'salt = SHA-256(normHex(A) + ":" + normHex(B))\nCK_init->resp = HKDF-SHA256(S, salt, "cns-ratchet-v2 chain initiator->responder")\nCK_resp->init = HKDF-SHA256(S, salt, "cns-ratchet-v2 chain responder->initiator")',
    wire: `No bytes sent over the network!
Alice: sendCK = CK_init->resp, recvCK = CK_resp->init
Bob:   sendCK = CK_resp->init, recvCK = CK_init->resp
Both:  privateDH = null; sharedSecret.fill(0);`,
    defense: 'Separate directional chains prevent reflection attacks; transcript salt binds keys strictly to A and B.'
  },
  {
    num: '06',
    title: 'Per-Message Symmetric Hash Ratchet',
    sub: 'Forward secrecy per packet',
    color: 'emerald',
    actors: 'Sender Browser (crypto_client.js / crypto/ratchet.py)',
    summary: 'Before encrypting each message, the sender advances the directional send chain via two one-way HMAC-SHA256 calls, immediately overwrites the old chain key with zeros, splits the ephemeral message key MK via HKDF into independent encKey and macKey, and erases MK.',
    math: 'MK_n = HMAC-SHA256(CK_{n-1}, 0x01)\nCK_n = HMAC-SHA256(CK_{n-1}, 0x02)\nencKey_n = HKDF(MK_n, "cns-ratchet-v2 message enc key")\nmacKey_n = HKDF(MK_n, "cns-ratchet-v2 message mac key")',
    wire: `Memory Lifecycle per Message #n:
1. Derive MK_n and CK_n
2. Zero old CK_{n-1} (cannot invert HMAC to recover MK_1..MK_{n-1})
3. Derive encKey_n, macKey_n → encrypt + MAC → zero MK_n, encKey_n, macKey_n`,
    defense: 'Forward secrecy: compromising current chain state CK_n cannot decrypt any previously sent or received messages.'
  },
  {
    num: '07',
    title: 'AES-256-CBC + HMAC-SHA256 & Relay',
    sub: 'Encrypt-then-MAC + Replay 409',
    color: 'cyan',
    actors: 'Sender Browser → POST /api/messages/send → Flask Relay (SQLite)',
    summary: 'The browser encrypts UTF-8 plaintext with AES-256-CBC (PKCS#7 padding, fresh random 16-byte IV) and computes HMAC-SHA256 over the IV, ciphertext, timestamp, sequence number, and full conversation context. The relay checks processed_messages for duplicate message_id (HTTP 409) and queues only ciphertext.',
    math: 'CT  = AES-256-CBC(encKey_n, random_16B_IV, PKCS7(plaintext))\nctx = session_id + "|" + sender + "|" + receiver + "|" + msg_id + "|cbc-hmac"\ntag = HMAC-SHA256(macKey_n, iv_hex + ":" + ct_hex + ":" + ts + ":" + seq + ":" + ctx)',
    wire: `POST /api/messages/send
{
  "message_id": "msg-173269-a4f1b",
  "receiver": "bob",
  "ciphertext": "<hex>",
  "iv": "<32-char hex (16B)>",
  "hmac_tag": "<64-char hex (32B)>",
  "timestamp": "2026-11-27T08:15:00.000Z",
  "seq_no": 3,
  "cipher_mode": "cbc-hmac"
}`,
    defense: 'Context binding prevents cross-session or cross-direction packet transplantation; relay enforces cbc-hmac & blocks replays.'
  },
  {
    num: '08',
    title: 'Verify-First Decrypt & E2EE Files',
    sub: 'Out-of-order MAX_SKIP=100',
    color: 'cyan',
    actors: 'Receiver Browser ← GET /api/messages/receive/<peer> & /api/files/<id>',
    summary: 'The receiver derives the candidate key for seq_no (caching up to 100 skipped keys for out-of-order delivery) and verifies HMAC-SHA256 in constant time BEFORE touching AES decryption. Ratchet state is committed ONLY on valid authentication. Encrypted files (≤10 MB) use the same Encrypt-then-MAC suite with per-file keys delivered inside chat.',
    math: 'If !constantTimeVerify(macKey_n, tag, canonical): ABORT (do NOT commit CK_n)\nElse: plaintext = AES-256-CBC-Decrypt(encKey_n, IV, CT); commit CK_n; zero keys\nFile Blob = IV(16B) || AES-CBC(file) || HMAC(len(aad) || aad || IV || CT)',
    wire: `File Descriptor (sent inside an ordinary E2EE chat message):
{
  "cns": "file", "v": 1, "id": "<32 hex>",
  "name": "report.pdf", "size": 123456,
  "key": "<64 hex 256-bit file_key>",
  "sha256": "<64 hex SHA-256 of plaintext>"
}`,
    defense: 'Defeats Vaudenay CBC padding-oracle attacks, prevents forged packets from desyncing the ratchet, and hides file names/types from the relay.'
  }
];

window.CODE_MODULES = [
  {
    id: 'dh',
    file: 'crypto/dh.py',
    badge: 'Asymmetric · RFC 3526',
    color: 'violet',
    desc: 'Implements 2048-bit MODP Group 14 Diffie-Hellman (g = 2) with 256-bit private exponents and full range + prime-order subgroup validation (y^q ≡ 1 mod p) to block small-subgroup confinement.',
    code: `RFC_3526_2048_SUBGROUP_ORDER = (RFC_3526_2048_PRIME - 1) // 2

def is_valid_public_value(y: int, p: int = RFC_3526_2048_PRIME) -> bool:
    """Range check (1 < y < p-1) plus subgroup check (y^q == 1 mod p)."""
    if not (1 < y < p - 1):
        return False
    if p == RFC_3526_2048_PRIME:
        return pow(y, RFC_3526_2048_SUBGROUP_ORDER, p) == 1
    return True

class DiffieHellman:
    def compute_shared_secret(self, peer_public_hex: str) -> bytes:
        peer_public_int = int(peer_public_hex, 16)
        if not is_valid_public_value(peer_public_int, self.p):
            raise ValueError("Invalid peer public key: outside subgroup bounds")
        shared_int = pow(peer_public_int, self.private_key, self.p)
        return shared_int.to_bytes((self.p.bit_length() + 7) // 8, "big")`
  },
  {
    id: 'ratchet',
    file: 'crypto/ratchet.py',
    badge: 'Forward Secrecy',
    color: 'emerald',
    desc: 'Per-direction HMAC-SHA256 hash ratchet with HKDF subkey separation, out-of-order tolerance up to MAX_SKIP = 100, and commit-after-authenticate safety so forged packets cannot burn keys.',
    code: `def kdf_chain(chain_key: bytes) -> tuple[bytes, bytes]:
    """One ratchet step. Returns (message_key, next_chain_key)."""
    return (hmac.new(chain_key, b"\\x01", hashlib.sha256).digest(),
            hmac.new(chain_key, b"\\x02", hashlib.sha256).digest())

def receive(self, seq_no: int, open_fn):
    if seq_no in self.skipped:
        result = open_fn(*message_subkeys(self.skipped[seq_no]))
        del self.skipped[seq_no]
        return result
    if seq_no <= self.recv_n:
        raise RatchetError(f"Replay/stale message: #{seq_no} already consumed")
    if seq_no - self.recv_n > MAX_SKIP:
        raise RatchetError(f"Message #{seq_no} is too far ahead")
    # Derive keys speculatively; commit ONLY if open_fn (MAC verify) succeeds!
    result = open_fn(*message_subkeys(target_mk))
    self.recv_ck, self.recv_n = ck, seq_no
    self.skipped.update(newly_skipped)
    return result`
  },
  {
    id: 'client',
    file: 'static/js/crypto_client.js',
    badge: 'Browser WebCrypto',
    color: 'cyan',
    desc: 'Real client-side cryptography running in the browser. Zeroes shared secrets, chain keys, message keys, and AES/MAC subkeys immediately after use; byte-identical to the Python reference.',
    code: `async function openMessage(mode, pkt, encKey, macKey, ctx) {
  if (mode !== 'cbc-hmac')
    throw new CNSError('protocol', \`Unsupported cipher mode '\${mode}'\`);
  // Encrypt-then-MAC: verify HMAC in constant time BEFORE touching AES-CBC
  const macObj = await _webcrypto.subtle.importKey(
    'raw', macKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const ok = await _webcrypto.subtle.verify(
    'HMAC', macObj, hexToBytes(pkt.hmac_tag),
    hmacCanonical(pkt.iv, pkt.ciphertext, pkt.timestamp, pkt.seq_no, ctx)
  );
  if (!ok) throw new CNSError('integrity', 'INTEGRITY ALERT: HMAC failed.');
  const key = await _webcrypto.subtle.importKey('raw', encKey, 'AES-CBC', false, ['decrypt']);
  const pt = await _webcrypto.subtle.decrypt({ name: 'AES-CBC', iv: hexToBytes(pkt.iv) }, key, hexToBytes(pkt.ciphertext));
  return new TextDecoder('utf-8', { fatal: true }).decode(pt);
}`
  },
  {
    id: 'filecrypt',
    file: 'crypto/filecrypt.py',
    badge: 'E2EE File Sharing',
    color: 'amber',
    desc: 'Encrypts files up to 10 MB with a fresh random 256-bit file key, HKDF-derived encryption & MAC keys, and length-prefixed AAD binding the blob to one file_id and conversation direction.',
    code: `def file_aad(file_id: str, sender: str, receiver: str) -> bytes:
    return f"cns-file-v1|{file_id}|{sender}|{receiver}".encode('utf-8')

def _mac(mac_key: bytes, aad: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    data = len(aad).to_bytes(4, 'big') + aad + iv + ciphertext
    return hmac.new(mac_key, data, hashlib.sha256).digest()

def decrypt_file(blob: bytes, key: bytes, aad: bytes) -> bytes:
    iv, ciphertext, tag = blob[:16], blob[16:-32], blob[-32:]
    enc_key, mac_key = _subkeys(key)
    if not hmac.compare_digest(_mac(mac_key, aad, iv, ciphertext), tag):
        raise InvalidTag()
    decryptor = Cipher(algorithms.AES(enc_key), modes.CBC(iv)).decryptor()
    unpadder = padding.PKCS7(128).unpadder()
    return unpadder.update(decryptor.update(ciphertext) + decryptor.finalize()) + unpadder.finalize()`
  },
  {
    id: 'dh_routes',
    file: 'routes/dh_routes.py',
    badge: 'Server Enforcement',
    color: 'rose',
    desc: 'Relay-side DH handshake directory. Enforces RFC 3526 MODP-2048 (g=2), subgroup validity, and RSA-2048-PSS signatures on both A and B while never learning private exponents or shared secrets.',
    code: `# Only the standardised RFC 3526 group is accepted
if (p_hex and int(p_hex, 16) != RFC_3526_2048_PRIME) or int(g) != RFC_3526_GENERATOR:
    return jsonify({"success": False, "error": "Unsupported DH group"}), 400
if not is_valid_public_value(int(pub_a, 16)):
    return jsonify({"success": False, "error": "Invalid DH public value A"}), 400

# Enforce Alice's RSA-PSS signature on A (anti-MITM)
signed_text = dh_signed_payload('A', current_user, peer, pub_a)
if not sig_a or not verify_signature(signed_text, sig_a, sender_user['public_identity_key']):
    return jsonify({"success": False, "error": "SIGNATURE_INVALID"}), 400`
  },
  {
    id: 'oracle',
    file: 'crypto/padding_oracle.py',
    badge: 'Vaudenay 2002 Lab',
    color: 'rose',
    desc: 'Demonstrates a real Vaudenay CBC padding-oracle attack recovering arbitrary AES-CBC plaintext byte-by-byte without the key (~128 queries/byte), then proves Encrypt-then-MAC completely defeats it.',
    code: `class SecureCBCServer:
    """Our design: HMAC checked BEFORE padding is touched."""
    def padding_oracle(self, iv, ct, tag, timestamp="t", seq_no=1) -> bool:
        self.queries += 1
        if not verify_hmac(iv.hex(), ct.hex(), timestamp, seq_no, tag, self.mac_key):
            return False  # indistinguishable from bad padding -> 0 bits leaked
        try:
            _aes_cbc_decrypt_unpad(self.enc_key, iv, ct)
            return True
        except ValueError:
            return False`
  }
];

function renderPager(currentId) {
  const routes = window.PORTFOLIO_ROUTES;
  const idx = routes.findIndex((r) => r.id === currentId);
  const prev = idx > 0 ? routes[idx - 1] : null;
  const next = idx < routes.length - 1 ? routes[idx + 1] : null;
  return `
    <nav class="pager" aria-label="Page pagination">
      ${prev ? `<a class="pager-card" href="#${prev.id}" data-nav="${prev.id}">
        <span class="pager-dir">← Previous Tab</span>
        <span class="pager-title">${prev.label}</span>
      </a>` : '<div></div>'}
      ${next ? `<a class="pager-card next" href="#${next.id}" data-nav="${next.id}">
        <span class="pager-dir">Next Tab →</span>
        <span class="pager-title">${next.label}</span>
      </a>` : '<div></div>'}
    </nav>
  `;
}

function renderDiagramBox(key, subtitle, caption) {
  const d = window.PORTFOLIO_DIAGRAMS[key];
  return `
    <div class="diagram-box">
      <div class="diagram-bar">
        <div>
          <div class="sec-kicker">${subtitle}</div>
          <h3 class="font-display" style="font-size:1.08rem;">${d.title}</h3>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-open-diagram="${key}">
          ⤢ Zoom &amp; Inspect
        </button>
      </div>
      <div class="diagram-canvas">${d.svg}</div>
      <div class="diagram-note"><span>${caption}</span><span class="font-mono">Click "Zoom &amp; Inspect" for interactive pan/zoom</span></div>
    </div>
  `;
}

window.PORTFOLIO_PAGES = {
  /* ==================== 1. HOME ==================== */
  home() {
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker">● Cryptography &amp; Network Security · Team 04 Portfolio</div>
        <h1 class="display-title">
          <span class="grad-text">SecureMsg</span> — End-to-End Encrypted Messaging Using Hybrid Cryptography
        </h1>
        <p class="lead">
          A full-stack, zero-knowledge end-to-end encrypted messenger built with <strong>Browser WebCrypto</strong> and
          a <strong>Flask/SQLite untrusted relay</strong>. Peers establish authenticated secrets with
          <strong>RSA-2048-PSS signed Diffie-Hellman (RFC 3526)</strong>, protect every message and 10 MB file with a
          <strong>forward-secret symmetric hash ratchet</strong> and <strong>AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC)</strong>,
          and prove every defense live via a <strong>Crypto Inspector</strong>, <strong>5-Attack Lab</strong>, and <strong>47 automated tests</strong>.
        </p>

        <div class="pills" style="margin-top:18px;">
          <span class="pill violet">RFC 3526 MODP-2048 DH</span>
          <span class="pill violet">RSA-2048-PSS Anti-MITM</span>
          <span class="pill emerald">HMAC Hash Ratchet (Forward Secrecy)</span>
          <span class="pill cyan">AES-256-CBC + HMAC-SHA256</span>
          <span class="pill amber">10 MB E2EE File Blobs</span>
          <span class="pill rose">0 Plaintext on Relay</span>
        </div>

        <div class="btn-row">
          <a href="#demo" data-nav="demo" class="btn btn-primary">⚡ Launch Live WebCrypto Demo</a>
          <a href="#protocol" data-nav="protocol" class="btn btn-secondary">Explore 8-Stage Protocol →</a>
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application" target="_blank" rel="noopener" class="btn btn-secondary">GitHub Repository ↗</a>
        </div>
      </section>

      <!-- 5 Executive Metrics -->
      <section class="grid-5" aria-label="Core project metrics">
        <div class="stat-card">
          <div class="stat-val violet">2048-bit</div>
          <div class="stat-label">MODP Group 14 DH &amp; RSA-PSS Keys</div>
        </div>
        <div class="stat-card">
          <div class="stat-val cyan">100,000</div>
          <div class="stat-label">PBKDF2-HMAC-SHA256 Rounds</div>
        </div>
        <div class="stat-card">
          <div class="stat-val emerald">47 / 47</div>
          <div class="stat-label">Automated Tests &amp; Py↔JS Interop</div>
        </div>
        <div class="stat-card">
          <div class="stat-val amber">5 / 5</div>
          <div class="stat-label">Live Attack Scenarios Defeated</div>
        </div>
        <div class="stat-card">
          <div class="stat-val rose">0 Bytes</div>
          <div class="stat-label">Plaintext or Private Keys on Server</div>
        </div>
      </section>

      <!-- 6-Stage End-to-End Security Journey -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Protocol Lifecycle</div>
            <h2 class="sec-title">Follow a Message From Identity to Verified Delivery</h2>
          </div>
          <a href="#protocol" data-nav="protocol" class="sec-meta" style="color:var(--cyan);text-decoration:none;">Full Step-by-Step Walkthrough →</a>
        </div>
        <div class="grid-3">
          <div class="card hover accent-violet">
            <div class="card-title"><span class="icon-badge violet">01</span>Browser Identity &amp; Auth</div>
            <p style="font-size:13.8px;color:var(--ink-2);">Passwords hashed with <code>PBKDF2-HMAC-SHA256</code> (100k rounds). Browser generates <code>RSA-2048-PSS</code> keys; private key never leaves the browser.</p>
          </div>
          <div class="card hover accent-violet">
            <div class="card-title"><span class="icon-badge violet">02</span>RSA-Signed Diffie-Hellman</div>
            <p style="font-size:13.8px;color:var(--ink-2);">Peers exchange <code>RFC 3526 MODP-2048</code> values signed with RSA-PSS and checked for subgroup membership (<code>y^q ≡ 1 mod p</code>), closing MITM.</p>
          </div>
          <div class="card hover accent-emerald">
            <div class="card-title"><span class="icon-badge emerald">03</span>Forward-Secret Hash Ratchet</div>
            <p style="font-size:13.8px;color:var(--ink-2);">Transcript-salted <code>HKDF-SHA256</code> seeds directional chains. Every message steps <code>HMAC(CK, 0x01/0x02)</code> and zeroes used keys.</p>
          </div>
          <div class="card hover accent-cyan">
            <div class="card-title"><span class="icon-badge cyan">04</span>AES-256-CBC + HMAC-SHA256</div>
            <p style="font-size:13.8px;color:var(--ink-2);">Encrypt-then-MAC with fresh 16-byte IV and context-bound tags. Verifies MAC in constant time before decryption, defeating padding oracles.</p>
          </div>
          <div class="card hover accent-amber">
            <div class="card-title"><span class="icon-badge amber">05</span>Zero-Knowledge Relay &amp; Files</div>
            <p style="font-size:13.8px;color:var(--ink-2);">Flask/SQLite relay filters replays (HTTP <code>409</code>) and stores opaque blobs up to <code>10 MB</code> without seeing file names, keys, or plaintext.</p>
          </div>
          <div class="card hover accent-rose">
            <div class="card-title"><span class="icon-badge rose">06</span>Inspector &amp; 5-Attack Lab</div>
            <p style="font-size:13.8px;color:var(--ink-2);">Real-time 5-tab <strong>Crypto Inspector</strong> + live <strong>Attack Lab</strong> validating Eavesdrop, Tamper, Replay, MITM, and Vaudenay Padding Oracle.</p>
          </div>
        </div>
      </section>

      <!-- Architecture Preview -->
      <section>
        ${renderDiagramBox(
          'arch5Tier',
          'SYSTEM BLUEPRINT PREVIEW',
          'Complete separation between browser-resident cryptographic secrets (Alice & Bob) and the untrusted Flask + SQLite relay.'
        )}
      </section>

      <!-- Portfolio Navigation Hub -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Portfolio Directory</div>
            <h2 class="sec-title">Explore All 9 Engineering Sections</h2>
          </div>
          <span class="sec-meta">TEAM 04 · CNS 2026</span>
        </div>
        <div class="grid-4">
          <a href="#overview" data-nav="overview" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill violet">01 · Overview</span>
            <h3 class="card-title" style="margin-top:10px;">Abstract &amp; Threat Model</h3>
            <p style="font-size:13px;color:var(--ink-3);">Motivation, problem statement, 5 threats, objectives, and honest scope.</p>
          </a>
          <a href="#architecture" data-nav="architecture" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill cyan">02 · Architecture</span>
            <h3 class="card-title" style="margin-top:10px;">5-Tier Zero-Knowledge</h3>
            <p style="font-size:13px;color:var(--ink-3);">Interactive diagrams, trust boundaries, Who Sees What matrix, file architecture.</p>
          </a>
          <a href="#protocol" data-nav="protocol" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill emerald">03 · Protocol</span>
            <h3 class="card-title" style="margin-top:10px;">8-Stage Stepper</h3>
            <p style="font-size:13px;color:var(--ink-3);">Interactive math, signed payloads, sequence diagram, and hash ratchet.</p>
          </a>
          <a href="#implementation" data-nav="implementation" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill amber">04 · Implementation</span>
            <h3 class="card-title" style="margin-top:10px;">Primitives, Code &amp; API</h3>
            <p style="font-size:13px;color:var(--ink-3);">10 algorithms, source explorer, SQLite 5-table ERD, and 19 REST endpoints.</p>
          </a>
          <a href="#demo" data-nav="demo" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill emerald">05 · Live Demo</span>
            <h3 class="card-title" style="margin-top:10px;">In-Browser WebCrypto</h3>
            <p style="font-size:13px;color:var(--ink-3);">Run real RSA-PSS + DH-2048 + Ratchet + all 5 live attacks right here!</p>
          </a>
          <a href="#evidence" data-nav="evidence" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill amber">06 · Evidence</span>
            <h3 class="card-title" style="margin-top:10px;">Forensic Relay Proof</h3>
            <p style="font-size:13px;color:var(--ink-3);">Raw SQLite ciphertext inspection, wire formats, X.509 cert, Py↔JS parity.</p>
          </a>
          <a href="#results" data-nav="results" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill cyan">07 · Results</span>
            <h3 class="card-title" style="margin-top:10px;">47 Tests &amp; References</h3>
            <p style="font-size:13px;color:var(--ink-3);">All 6 test suites, evaluation matrix, padding-oracle metrics, RFCs [1]-[8].</p>
          </a>
          <a href="#team" data-nav="team" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill rose">08 · Team 04</span>
            <h3 class="card-title" style="margin-top:10px;">Authors &amp; Credentials</h3>
            <p style="font-size:13px;color:var(--ink-3);">Anusha, Ananya, Amogh &amp; Vinay — Roll Nos, USNs, and repository links.</p>
          </a>
        </div>
      </section>

      ${renderPager('home')}
    </div>`;
  },

  /* ==================== 2. OVERVIEW ==================== */
  overview() {
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker violet">Tab 02 · Project Overview</div>
        <h1 class="display-title">Abstract, Motivation &amp; <span class="grad-text">Threat Model</span></h1>
        <p class="lead">
          Why transport encryption (HTTPS/TLS) alone leaves messages exposed to central servers, and how
          <strong>SecureMsg</strong> removes server trust using end-to-end hybrid cryptography.
        </p>
      </section>

      <!-- Abstract + Signature 47 / 5 / 0 Cards -->
      <section class="card accent-cyan">
        <div class="sec-head" style="margin-bottom:12px;">
          <div>
            <div class="sec-kicker">01 · Abstract</div>
            <h2 class="sec-title">Executive Summary</h2>
          </div>
          <span class="pill emerald">CNS Presentation · Slide 03</span>
        </div>
        <p style="font-size:15px;color:var(--ink-2);line-height:1.78;">
          Conventional messaging services depend on central servers that can read, alter, or replay user messages,
          and HTTPS alone does not hide plaintext from the server once TLS terminates. This project presents
          <strong>SecureMsg</strong>, a working end-to-end encrypted messenger in which two users agree on a secret
          over an untrusted relay using <strong>RSA-PSS-signed Diffie-Hellman (RFC 3526 MODP-2048)</strong>.
          Messages and files (up to 10 MB) are protected by a <strong>forward-secret symmetric hash ratchet</strong>
          and <strong>AES-256-CBC with HMAC-SHA256 (Encrypt-then-MAC)</strong>. All private keys, session secrets,
          and plaintext stay strictly inside the users' browsers, while the Flask/SQLite relay stores only ciphertext
          and public keys. A live <strong>5-Tab Crypto Inspector</strong> and an <strong>Attack Lab</strong> with five
          real attacks—backed by <strong>47 automated tests</strong>—empirically validate every defense.
        </p>

        <div class="grid-3" style="margin-top:20px;">
          <div class="stat-card" style="text-align:center;">
            <div class="stat-val emerald">47</div>
            <div class="stat-label">Automated Unit, E2E &amp; Py↔JS Interop Tests</div>
          </div>
          <div class="stat-card" style="text-align:center;">
            <div class="stat-val amber">5</div>
            <div class="stat-label">Live Cryptographic Attack Simulations</div>
          </div>
          <div class="stat-card" style="text-align:center;border-color:rgba(251,113,133,0.4);">
            <div class="stat-val rose">0</div>
            <div class="stat-label">Plaintext Bytes Stored on the Relay</div>
          </div>
        </div>
      </section>

      <!-- Introduction 4 Pillars -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">02 · Introduction</div>
            <h2 class="sec-title">Foundations of Hybrid E2EE Communication</h2>
          </div>
        </div>
        <div class="grid-2">
          <div class="card accent-cyan">
            <div class="card-title"><span class="icon-badge cyan">1</span>Secure Communication</div>
            <p style="font-size:14px;color:var(--ink-2);">Modern messaging carries personal, financial, and business data. Confidentiality against eavesdroppers and cryptographic integrity against active tampering are non-negotiable.</p>
          </div>
          <div class="card accent-rose">
            <div class="card-title"><span class="icon-badge rose">2</span>Removing Server Trust</div>
            <p style="font-size:14px;color:var(--ink-2);">In conventional web apps, TLS stops at the load balancer or server—meaning database breaches or malicious admins expose all messages. E2EE eliminates server trust completely.</p>
          </div>
          <div class="card accent-violet">
            <div class="card-title"><span class="icon-badge violet">3</span>Hybrid Cryptography</div>
            <p style="font-size:14px;color:var(--ink-2);">Asymmetric primitives (<code>DH-2048</code>, <code>RSA-2048-PSS</code>) handle identity authentication and key agreement, while symmetric primitives (<code>AES-256-CBC</code>, <code>HMAC-SHA256</code>) protect bulk messages and files efficiently.</p>
          </div>
          <div class="card accent-emerald">
            <div class="card-title"><span class="icon-badge emerald">4</span>Transparent Educational Platform</div>
            <p style="font-size:14px;color:var(--ink-2);">Built for CNS coursework with a live <strong>Crypto Inspector</strong> and interactive <strong>Attack Lab</strong> so students and examiners can observe real keys, ratchet steps, wire packets, and blocked attacks.</p>
          </div>
        </div>
      </section>

      <!-- Problem Statement + 5-Threat Model -->
      <section class="stack-md">
        <div class="card accent-rose">
          <div class="sec-kicker" style="color:var(--rose);">03 · Problem Statement</div>
          <p style="font-size:15px;color:var(--ink);font-weight:500;line-height:1.7;">
            To design and implement an end-to-end encrypted messaging system in which two users establish a shared secret
            over an untrusted relay using <strong>RSA-PSS-signed Diffie-Hellman</strong>, and exchange messages and files
            protected by a <strong>forward-secret hash ratchet</strong> and <strong>AES-256-CBC with HMAC-SHA256</strong>,
            so that the relay can neither read nor undetectably modify, replay, or impersonate any communication.
          </p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Threat Vector</th>
                <th>Adversary Capability</th>
                <th>Impact Without Defense</th>
                <th>SecureMsg Defense</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Passive Eavesdropping</strong></td>
                <td>Packet sniffing on Wi-Fi / LAN or compromising the relay DB</td>
                <td>Full plaintext &amp; attachments exposed immediately</td>
                <td><span class="pill cyan">AES-256-CBC (E2EE) + Optional TLS</span></td>
              </tr>
              <tr>
                <td><strong>2. Active Message Tampering</strong></td>
                <td>Bit-flipping ciphertext, IV, timestamp, or sequence number in transit</td>
                <td>Silent financial/command manipulation (e.g., $100 → $900)</td>
                <td><span class="pill emerald">HMAC-SHA256 (Encrypt-then-MAC)</span></td>
              </tr>
              <tr>
                <td><strong>3. Man-in-the-Middle (DH)</strong></td>
                <td>Intercepting and replacing DH public values <code>A</code> and <code>B</code></td>
                <td>Attacker negotiates separate keys with Alice &amp; Bob and reads all chat</td>
                <td><span class="pill violet">RSA-2048-PSS Signed DH + Subgroup Check</span></td>
              </tr>
              <tr>
                <td><strong>4. Replay Attack</strong></td>
                <td>Capturing a valid authenticated ciphertext packet and re-sending it</td>
                <td>Duplicate actions executed without breaking encryption</td>
                <td><span class="pill rose">Relay processed_messages (409) + One-Time Ratchet Keys</span></td>
              </tr>
              <tr>
                <td><strong>5. CBC Padding Oracle</strong></td>
                <td>Probing forged CBC blocks to learn whether PKCS#7 padding was valid</td>
                <td>Decrypts arbitrary CBC ciphertext WITHOUT the key (~128 queries/byte)</td>
                <td><span class="pill emerald">Verify Constant-Time HMAC BEFORE Decryption</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Objectives + Honest Scope & Limitations -->
      <section class="grid-2">
        <div class="card accent-emerald">
          <div class="card-title"><span class="icon-badge emerald">✓</span>Four Core Objectives</div>
          <ul class="clean emerald">
            <li><strong>Resilient E2EE Protocol:</strong> Defend against eavesdropping, tampering, replay, MITM, and CBC padding-oracle attacks.</li>
            <li><strong>Cryptographic Identity Binding:</strong> Bind every DH public value to role, initiator, and responder using RSA-2048-PSS signatures.</li>
            <li><strong>Zero-Knowledge Relay:</strong> Guarantee the server never learns plaintext, file names, private keys, or any session/message key.</li>
            <li><strong>Empirical Validation:</strong> Verify every guarantee across 47 automated tests (including Python ↔ Browser JS interop) and 5 live attack demos.</li>
          </ul>
        </div>

        <div class="card accent-amber">
          <div class="card-title"><span class="icon-badge amber">!</span>Honest Security Boundaries &amp; Trade-offs</div>
          <ul class="clean amber">
            <li><strong>TOFU Identity Keys:</strong> Clients fetch peer public keys from the relay; compare the SHA-256 fingerprint out-of-band to thwart a malicious directory.</li>
            <li><strong>Symmetric Ratchet Only:</strong> Delivers per-message forward secrecy, but does not provide post-compromise healing (DH Double Ratchet is planned).</li>
            <li><strong>Browser Keystore &amp; Demo Header:</strong> Private RSA keys live in <code>localStorage</code> and <code>X-Sim-User</code> supports two-tab demos (remove for production).</li>
            <li><strong>Visible Metadata:</strong> Relay sees who talks to whom, timestamps, and encrypted packet/blob sizes (up to 10 MB per file).</li>
          </ul>
        </div>
      </section>

      ${renderPager('overview')}
    </div>`;
  },

  /* ==================== 3. ARCHITECTURE ==================== */
  architecture() {
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker cyan">Tab 03 · System Architecture</div>
        <h1 class="display-title">Zero-Knowledge <span class="grad-text">5-Tier Architecture</span></h1>
        <p class="lead">
          All cryptographic computation happens inside the clients' browsers via the <strong>WebCrypto API</strong>.
          The Flask server and SQLite database operate strictly as an untrusted public-key directory, replay filter,
          and opaque ciphertext relay.
        </p>
      </section>

      <!-- Interactive Architecture Diagram Switcher -->
      <section>
        <div class="seg-tabs" data-tab-group="arch-diagrams">
          <button type="button" class="seg-btn active" data-tab-target="arch-d1">1. 5-Tier System Architecture</button>
          <button type="button" class="seg-btn" data-tab-target="arch-d2">2. Trust Boundary &amp; Data Wall</button>
          <button type="button" class="seg-btn" data-tab-target="arch-d3">3. E2EE File Sharing Architecture</button>
        </div>

        <div data-tab-panel="arch-diagrams" id="arch-d1">
          ${renderDiagramBox(
            'arch5Tier',
            'DIAGRAM 1 · SYSTEM TOPOLOGY',
            'Alice and Bob run identical WebCrypto engines in their browsers; Flask relays ciphertext and enforces RSA-PSS signatures and replay protection.'
          )}
        </div>
        <div data-tab-panel="arch-diagrams" id="arch-d2" hidden>
          ${renderDiagramBox(
            'trustBoundary',
            'DIAGRAM 2 · ZERO-KNOWLEDGE WALL',
            'Strict cryptographic boundary: even a total database dump or server compromise exposes zero plaintext and zero private/session keys.'
          )}
        </div>
        <div data-tab-panel="arch-diagrams" id="arch-d3" hidden>
          ${renderDiagramBox(
            'fileSharingFlow',
            'DIAGRAM 3 · OPAQUE FILE BLOBS (≤ 10 MB)',
            'Each file gets a fresh 256-bit key encrypted inside a ratcheted chat message; the server only holds IV || AES-CBC || HMAC in uploads/<file_id>.bin.'
          )}
        </div>
      </section>

      <!-- Who Sees What Matrix -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Cryptographic Visibility Audit</div>
            <h2 class="sec-title">"Who Sees What" Zero-Knowledge Matrix</h2>
          </div>
          <span class="sec-meta">VERIFIED BY test_attacks.py &amp; test_files.py</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cryptographic Material / Data</th>
                <th>Alice's Browser</th>
                <th>Flask / SQLite Relay</th>
                <th>Bob's Browser</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>RSA-2048 Private Identity Key</strong></td>
                <td><span class="pill emerald">Yes (Own · localStorage)</span></td>
                <td><span class="pill rose">NEVER</span></td>
                <td><span class="pill emerald">Yes (Own · localStorage)</span></td>
              </tr>
              <tr>
                <td><strong>RSA-2048 Public Identity Key (SPKI)</strong></td>
                <td><span class="pill cyan">Yes</span></td>
                <td><span class="pill amber">Stored (users table)</span></td>
                <td><span class="pill cyan">Yes</span></td>
              </tr>
              <tr>
                <td><strong>DH Private Exponents (<code>a, b</code>)</strong></td>
                <td><span class="pill emerald">Ephemeral → Erased</span></td>
                <td><span class="pill rose">NEVER</span></td>
                <td><span class="pill emerald">Ephemeral → Erased</span></td>
              </tr>
              <tr>
                <td><strong>DH Public Values (<code>A, B</code>) &amp; RSA Signatures</strong></td>
                <td><span class="pill cyan">Yes</span></td>
                <td><span class="pill amber">Verified &amp; Relayed</span></td>
                <td><span class="pill cyan">Yes</span></td>
              </tr>
              <tr>
                <td><strong>Shared Secret <code>S</code>, Chain Keys, Message Keys</strong></td>
                <td><span class="pill emerald">RAM Only → Zeroed</span></td>
                <td><span class="pill rose">NEVER</span></td>
                <td><span class="pill emerald">RAM Only → Zeroed</span></td>
              </tr>
              <tr>
                <td><strong>Per-File 256-bit Keys, File Names &amp; Contents</strong></td>
                <td><span class="pill emerald">Yes</span></td>
                <td><span class="pill rose">NEVER</span></td>
                <td><span class="pill emerald">Yes</span></td>
              </tr>
              <tr>
                <td><strong>Ciphertext, 16B IV, 32B HMAC Tag, Opaque <code>.bin</code></strong></td>
                <td><span class="pill cyan">Yes</span></td>
                <td><span class="pill amber">Stored &amp; Queued</span></td>
                <td><span class="pill cyan">Yes</span></td>
              </tr>
              <tr>
                <td><strong>Metadata (Sender, Receiver, Timestamp, Size)</strong></td>
                <td><span class="pill cyan">Yes</span></td>
                <td><span class="pill amber">Visible (Routing)</span></td>
                <td><span class="pill cyan">Yes</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 4 Component Deep-Dives -->
      <section class="grid-2">
        <div class="card accent-violet">
          <div class="card-title"><span class="icon-badge violet">C1</span>Browser Cryptographic Engine</div>
          <ul class="clean violet">
            <li><code>static/js/crypto_client.js</code> runs all RSA-PSS, BigInt MODP-2048 DH, HKDF-SHA256, Hash Ratchet, AES-256-CBC, and HMAC-SHA256 operations natively via <code>window.crypto.subtle</code>.</li>
            <li><code>static/js/chat.js</code> handles 1-second polling, handshake automation, drag-and-drop file encryption, and the live in-chat <strong>Tamper</strong> toggle.</li>
            <li><code>static/js/inspector.js</code> renders the read-only 5-tab live <strong>Crypto Inspector</strong> (fingerprints and wire packets only—never raw secrets).</li>
          </ul>
        </div>
        <div class="card accent-amber">
          <div class="card-title"><span class="icon-badge amber">C2</span>Untrusted Flask Relay &amp; Persistence</div>
          <ul class="clean amber">
            <li>5 modular blueprints in <code>routes/</code> coordinate auth, DH signature enforcement, ciphertext queuing, file ACL downloads, and Attack Lab execution.</li>
            <li><code>database.py</code> manages 5 SQLite tables with automatic schema migration and cleans up <code>uploads/&lt;file_id&gt;.bin</code> blobs on conversation reset.</li>
            <li>Enforces strict <code>11 MB</code> request body cap (HTTP <code>413</code>), <code>cbc-hmac</code>-only cipher mode, and HTTP <code>409</code> replay blocking.</li>
          </ul>
        </div>
        <div class="card accent-cyan">
          <div class="card-title"><span class="icon-badge cyan">C3</span>Dual Transport Layer (HTTP / HTTPS)</div>
          <ul class="clean">
            <li><strong>HTTP Relay Mode (<code>:5000</code>):</strong> Proves application-layer E2EE confidentiality holds even without transport TLS.</li>
            <li><strong>HTTPS/TLS Mode (<code>--https :5443</code>):</strong> Defense-in-depth transport encryption using an auto-generated X.509 v3 RSA-2048 / SHA-256 certificate (<code>generate_cert.py</code>).</li>
          </ul>
        </div>
        <div class="card accent-emerald">
          <div class="card-title"><span class="icon-badge emerald">C4</span>Python Reference &amp; Verification Plane</div>
          <ul class="clean emerald">
            <li><code>crypto/</code> provides byte-compatible Python implementations for every primitive plus <code>padding_oracle.py</code> (Vaudenay 2002) and <code>aead.py</code> (AES-GCM reference).</li>
            <li><code>tests/</code> validates every primitive, relay rule, attack defense, and Python ↔ Browser JS byte interoperability via Node.js.</li>
          </ul>
        </div>
      </section>

      ${renderPager('architecture')}
    </div>`;
  },

  /* ==================== 4. PROTOCOL ==================== */
  protocol() {
    const steps = window.PROTOCOL_STEPS;
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker emerald">Tab 04 · Eight-Stage Cryptographic Protocol</div>
        <h1 class="display-title">End-to-End <span class="grad-text">Protocol Mechanics</span></h1>
        <p class="lead">
          Step through all eight stages of the SecureMsg protocol—from salted PBKDF2 authentication and
          RSA-signed Diffie-Hellman to per-message symmetric ratcheting, Encrypt-then-MAC verification,
          and AAD-bound encrypted file sharing.
        </p>
      </section>

      <!-- Interactive 8-Step Protocol Stepper -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Interactive Walkthrough</div>
            <h2 class="sec-title">Click Any Stage to Inspect Math, Wire Format &amp; Defenses</h2>
          </div>
          <span class="sec-meta">8 STAGES · BYTE-COMPATIBLE SPEC</span>
        </div>

        <div class="stepper-layout">
          <div class="step-list" id="protocol-step-list">
            ${steps.map((s, i) => `
              <button type="button" class="step-btn ${i === 0 ? 'active' : ''}" data-step-idx="${i}">
                <span class="step-num">${s.num}</span>
                <span>
                  <strong>${s.title}</strong>
                  <small>${s.sub}</small>
                </span>
              </button>
            `).join('')}
          </div>

          <div class="card accent-cyan" id="protocol-detail-pane"></div>
        </div>
      </section>

      <!-- Sequence Diagram -->
      <section>
        ${renderDiagramBox(
          'sequence8Step',
          'SEQUENCE DIAGRAM · ALICE ↔ RELAY ↔ BOB',
          'End-to-end message flow across registration, authenticated DH exchange, transcript-bound HKDF seeding, ratcheted encryption, and anti-replay delivery.'
        )}
      </section>

      <!-- Ratchet Chain Diagram -->
      <section>
        ${renderDiagramBox(
          'ratchetChain',
          'FORWARD SECRECY ENGINE · SYMMETRIC HASH RATCHET',
          'One-way HMAC-SHA256 chaining guarantees each message uses a unique erased key while tolerating up to MAX_SKIP = 100 out-of-order packets.'
        )}
      </section>

      ${renderPager('protocol')}
    </div>`;
  },

  /* ==================== 5. IMPLEMENTATION ==================== */
  implementation() {
    const mods = window.CODE_MODULES;
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker amber">Tab 05 · Cryptography &amp; Codebase</div>
        <h1 class="display-title">Algorithms, Source Modules &amp; <span class="grad-text">REST API</span></h1>
        <p class="lead">
          Complete technical specification of every cryptographic primitive, real verified excerpts from the
          Python and WebCrypto codebase, the 5-table SQLite schema, and all 19 Flask API endpoints.
        </p>
      </section>

      <!-- Master Cryptographic Primitives Table -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Cryptographic Specification</div>
            <h2 class="sec-title">All Algorithms &amp; Exact Parameters</h2>
          </div>
          <span class="sec-meta">PYTHON cryptography + BROWSER WEBCRYPTO</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Security Goal</th>
                <th>Algorithm / Primitive</th>
                <th>Exact Parameters</th>
                <th>Implementation File(s)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Key Agreement</strong></td>
                <td><span class="pill violet">Diffie-Hellman</span></td>
                <td>RFC 3526 MODP-2048 (Group 14), <code>g=2</code>, 256-bit private exponent, subgroup check <code>y^q ≡ 1</code></td>
                <td><code>crypto/dh.py</code>, <code>crypto_client.js</code></td>
              </tr>
              <tr>
                <td><strong>Identity &amp; Anti-MITM</strong></td>
                <td><span class="pill violet">RSA-2048-PSS</span></td>
                <td>2048-bit modulus, <code>e=65537</code>, SHA-256, MGF1-SHA256, max salt (222 bytes)</td>
                <td><code>crypto/signatures.py</code>, <code>crypto_client.js</code></td>
              </tr>
              <tr>
                <td><strong>Key Derivation</strong></td>
                <td><span class="pill emerald">HKDF-SHA256</span></td>
                <td>RFC 5869, transcript salt <code>SHA-256("A:B")</code>, domain-separated info labels</td>
                <td><code>crypto/kdf.py</code>, <code>crypto/ratchet.py</code></td>
              </tr>
              <tr>
                <td><strong>Forward Secrecy</strong></td>
                <td><span class="pill emerald">Symmetric Hash Ratchet</span></td>
                <td><code>MK = HMAC(CK, 0x01)</code>, <code>CK' = HMAC(CK, 0x02)</code>, <code>MAX_SKIP = 100</code></td>
                <td><code>crypto/ratchet.py</code>, <code>crypto_client.js</code></td>
              </tr>
              <tr>
                <td><strong>Confidentiality</strong></td>
                <td><span class="pill cyan">AES-256-CBC</span></td>
                <td>256-bit one-time key, PKCS#7 padding (128-bit blocks), fresh random 16-byte IV</td>
                <td><code>crypto/encryption.py</code>, <code>crypto_client.js</code></td>
              </tr>
              <tr>
                <td><strong>Integrity &amp; Auth</strong></td>
                <td><span class="pill emerald">HMAC-SHA256</span></td>
                <td>Encrypt-then-MAC, independent 256-bit MAC key, constant-time verify before decrypt</td>
                <td><code>crypto/integrity.py</code>, <code>crypto_client.js</code></td>
              </tr>
              <tr>
                <td><strong>Encrypted Files</strong></td>
                <td><span class="pill amber">AES-CBC + HMAC (AAD)</span></td>
                <td>Fresh 256-bit <code>file_key</code>, HKDF subkeys, length-prefixed AAD, max <code>10 MB</code></td>
                <td><code>crypto/filecrypt.py</code>, <code>routes/file_routes.py</code></td>
              </tr>
              <tr>
                <td><strong>Password Storage</strong></td>
                <td><span class="pill violet">PBKDF2-HMAC-SHA256</span></td>
                <td>100,000 iterations, 16-byte random salt, 32-byte digest, constant-time compare</td>
                <td><code>crypto/auth.py</code>, <code>routes/auth_routes.py</code></td>
              </tr>
              <tr>
                <td><strong>Transport (Optional)</strong></td>
                <td><span class="pill cyan">X.509 v3 / TLS</span></td>
                <td>Self-signed RSA-2048 + SHA-256 cert, SAN <code>localhost</code> &amp; <code>127.0.0.1</code></td>
                <td><code>generate_cert.py</code>, <code>app.py --https</code></td>
              </tr>
              <tr>
                <td><strong>Lab &amp; Reference</strong></td>
                <td><span class="pill rose">Vaudenay Oracle / AES-GCM</span></td>
                <td>Live CBC padding-oracle attack demo + AES-256-GCM (96-bit nonce) reference module</td>
                <td><code>crypto/padding_oracle.py</code>, <code>crypto/aead.py</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Interactive Codebase Explorer -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Verified Source Excerpts</div>
            <h2 class="sec-title">Interactive Codebase Explorer</h2>
          </div>
          <span class="sec-meta">ACTUAL CODE FROM REPOSITORY</span>
        </div>

        <div class="seg-tabs" id="code-tabs">
          ${mods.map((m, i) => `
            <button type="button" class="seg-btn ${i === 0 ? 'active' : ''}" data-code-idx="${i}">${m.file}</button>
          `).join('')}
        </div>
        <div class="card accent-violet" id="code-viewer-pane"></div>
      </section>

      <!-- SQLite Schema ERD -->
      <section>
        ${renderDiagramBox(
          'dbSchemaErd',
          'PERSISTENCE & WIRE LAYER · DATABASE.PY',
          'Five SQLite tables plus binary file blobs in uploads/<file_id>.bin. Zero plaintext columns and zero private key fields exist anywhere in the schema.'
        )}
      </section>

      <!-- Complete REST API Reference -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Flask Blueprints</div>
            <h2 class="sec-title">Complete REST API Reference (19 Endpoints)</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Blueprint</th>
                <th>Method &amp; Route</th>
                <th>Purpose &amp; Enforcement Rules</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>auth_routes.py</code></td>
                <td><code>POST /api/auth/register</code> · <code>/login</code> · <code>/logout</code></td>
                <td>PBKDF2-HMAC-SHA256 account creation, constant-time login, session management.</td>
              </tr>
              <tr>
                <td><code>auth_routes.py</code></td>
                <td><code>POST /api/auth/identity</code> · <code>GET /me</code> · <code>/users</code></td>
                <td>Publish/rotate RSA SPKI public key (re-verifies password); public key directory.</td>
              </tr>
              <tr>
                <td><code>dh_routes.py</code></td>
                <td><code>POST /api/dh/initiate</code> · <code>/respond</code></td>
                <td>Enforces RFC 3526 MODP-2048, subgroup validity, and RSA-PSS signatures (<code>400 SIGNATURE_INVALID</code>).</td>
              </tr>
              <tr>
                <td><code>dh_routes.py</code></td>
                <td><code>GET /api/dh/pending</code> · <code>/session/&lt;id&gt;</code> · <code>/active/&lt;peer&gt;</code> · <code>POST /reset</code></td>
                <td>Handshake polling, established session lookup, and full conversation + file cleanup.</td>
              </tr>
              <tr>
                <td><code>message_routes.py</code></td>
                <td><code>POST /api/messages/send</code> · <code>GET /receive/&lt;peer&gt;</code> · <code>/history/&lt;peer&gt;</code></td>
                <td>Rejects non-<code>cbc-hmac</code> modes (<code>400</code>) and duplicate <code>message_id</code> (<code>409 REPLAY_ATTACK_DETECTED</code>).</td>
              </tr>
              <tr>
                <td><code>message_routes.py</code></td>
                <td><code>GET /api/server/relay-log</code></td>
                <td>Examiner inspection endpoint exposing raw stored ciphertext packets &amp; file metadata.</td>
              </tr>
              <tr>
                <td><code>file_routes.py</code></td>
                <td><code>POST /api/files/upload</code> · <code>GET /api/files/&lt;file_id&gt;</code></td>
                <td>Raw binary blob upload (≤10 MB, <code>409</code> no overwrite); uploader/recipient-only download (<code>404</code> otherwise, <code>nosniff</code>).</td>
              </tr>
              <tr>
                <td><code>attack_routes.py</code></td>
                <td><code>POST /api/attacks/eavesdrop</code> · <code>/tamper</code> · <code>/replay</code> · <code>/mitm</code> · <code>/padding-oracle</code></td>
                <td>Executes real Python cryptographic attack-and-defense telemetry for the Attack Lab UI.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      ${renderPager('implementation')}
    </div>`;
  },

  /* ==================== 6. DEMO ==================== */
  demo() {
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker emerald">Tab 06 · Live Interactive WebCrypto Demo</div>
        <h1 class="display-title">Live E2EE Sandbox &amp; <span class="grad-text">5-Attack Lab</span></h1>
        <p class="lead">
          Run <strong>real browser WebCrypto</strong> right inside this portfolio—no server required!
          Generate live <strong>RSA-2048-PSS</strong> keys, execute a <strong>Signed RFC 3526 MODP-2048 Diffie-Hellman handshake</strong>,
          send ratcheted encrypted messages with live <strong>Tamper</strong> &amp; <strong>Replay</strong> toggles,
          and trigger all 5 cryptographic attacks including a real in-browser <strong>Vaudenay CBC Padding Oracle</strong>.
        </p>
      </section>

      <!-- PART A: Live Alice <-> Relay <-> Bob WebCrypto Sandbox -->
      <section class="card accent-emerald">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker">Interactive E2EE Console · Real window.crypto.subtle</div>
            <h2 class="sec-title">Part 1: Live Alice ↔ Untrusted Relay ↔ Bob Simulator</h2>
          </div>
          <span id="demo-status-pill" class="pill amber">Session Not Established</span>
        </div>

        <div class="btn-row" style="margin-top:0;margin-bottom:16px;">
          <button type="button" class="btn btn-primary" id="btn-demo-handshake">1. Generate RSA-2048 &amp; Run Signed DH Handshake</button>
          <button type="button" class="btn btn-secondary" id="btn-demo-replay" disabled>↻ Replay Last Packet (Trigger 409)</button>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px;">
          <input type="text" id="demo-msg-input" class="sim-input" style="flex:1 1 280px;" value="Confidential: Authorize wire transfer #4821 at 5 PM" placeholder="Type any confidential message to encrypt..." />
          <label class="toggle-label">
            <input type="checkbox" id="demo-tamper-toggle" />
            <span style="color:var(--rose);">Simulate Tamper (flip ciphertext byte)</span>
          </label>
          <button type="button" class="btn btn-primary btn-sm" id="btn-demo-send" disabled>2. Encrypt &amp; Relay →</button>
        </div>

        <div class="sim-grid">
          <div class="sim-pane">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--violet);">Alice (Sender Browser)</strong>
              <span class="pill violet" id="alice-fp-pill">No Key</span>
            </div>
            <div class="sim-log" id="demo-sender-log">Click "Generate RSA-2048 &amp; Run Signed DH Handshake" to start a real WebCrypto session...</div>
          </div>

          <div class="sim-pane relay">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--amber);">Untrusted Relay Server</strong>
              <span class="pill rose">0 Plaintext</span>
            </div>
            <div class="sim-log" id="demo-relay-log">Waiting for public keys, signed DH values, and ciphertext packets...</div>
          </div>

          <div class="sim-pane">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--emerald);">Bob (Receiver Browser)</strong>
              <span class="pill emerald" id="bob-fp-pill">No Key</span>
            </div>
            <div class="sim-log" id="demo-receiver-log">Waiting for handshake &amp; encrypted packets...</div>
          </div>
        </div>
      </section>

      <!-- PART B: Live 5-Attack Lab Simulator -->
      <section class="card accent-rose">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker" style="color:var(--rose);">Interactive Security Lab · Real Cryptography</div>
            <h2 class="sec-title">Part 2: Run All 5 Live Attack &amp; Defense Scenarios</h2>
          </div>
          <span class="pill rose">5 Live Attacks</span>
        </div>

        <div class="seg-tabs" id="attack-lab-tabs">
          <button type="button" class="seg-btn active" data-attack="eavesdrop">1. Eavesdropping</button>
          <button type="button" class="seg-btn" data-attack="tamper">2. Ciphertext Tampering</button>
          <button type="button" class="seg-btn" data-attack="replay">3. Replay Attack</button>
          <button type="button" class="seg-btn" data-attack="mitm">4. MITM on DH</button>
          <button type="button" class="seg-btn" data-attack="padding">5. Vaudenay Padding Oracle</button>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <input type="text" id="attack-msg-input" class="sim-input" style="flex:1 1 260px;" value="Vault code 4821" placeholder="Target message for attack simulation" />
          <button type="button" class="btn btn-danger" id="btn-run-attack">▶ Execute Live Attack Simulation</button>
        </div>

        <div class="sim-log" id="attack-lab-output" style="max-height:340px;">Select any of the 5 attacks above and click "Execute Live Attack Simulation" to run real cryptographic verification in your browser.</div>
      </section>

      <!-- PART C: Run Full Flask App Locally -->
      <section class="grid-2">
        <div class="card accent-cyan">
          <div class="card-title"><span class="icon-badge cyan">▶</span>Run Full Flask Application Locally</div>
          <pre class="code-block">git clone https://github.com/Vinay3579-code/Secure-Messaging-Application.git
cd Secure-Messaging-Application
pip install -r requirements.txt

python app.py            # HTTP mode  → http://127.0.0.1:5000
python app.py --https    # HTTPS mode → https://127.0.0.1:5443</pre>
        </div>
        <div class="card accent-violet">
          <div class="card-title"><span class="icon-badge violet">✓</span>Run Terminal Attack Runner &amp; 47 Tests</div>
          <pre class="code-block"># Execute all 5 attacks in the terminal
python attacks/attack_simulator.py

# Run all 47 automated unit, E2E, file &amp; Py↔JS interop tests
python -m unittest discover -s tests</pre>
        </div>
      </section>

      ${renderPager('demo')}
    </div>`;
  },

  /* ==================== 7. EVIDENCE ==================== */
  evidence() {
    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker amber">Tab 07 · Audit &amp; Forensic Evidence</div>
        <h1 class="display-title">Zero-Knowledge <span class="grad-text">Forensic Evidence</span></h1>
        <p class="lead">
          Direct inspection of what the untrusted relay server stores in <code>messaging.db</code> and
          <code>uploads/</code>, exact wire packet layouts, the 5-tab live <strong>Crypto Inspector</strong>,
          X.509 v3 TLS certificate telemetry, and Python ↔ Browser JS byte-compatibility proof.
        </p>
      </section>

      <!-- Interactive Relay Forensic Inspector -->
      <section class="card accent-amber">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker" style="color:var(--amber);">Server-Side Forensic Dump · /api/server/relay-log</div>
            <h2 class="sec-title">What an Attacker Sees If They Steal the Entire Server Database</h2>
          </div>
          <span class="pill emerald">0 Plaintext · 0 Private Keys</span>
        </div>

        <div class="seg-tabs" data-tab-group="forensic">
          <button type="button" class="seg-btn active" data-tab-target="ev-messages">messages Table (Ciphertext Only)</button>
          <button type="button" class="seg-btn" data-tab-target="ev-users">users &amp; dh_sessions (Public Only)</button>
          <button type="button" class="seg-btn" data-tab-target="ev-files">files &amp; uploads/*.bin (Opaque Blobs)</button>
        </div>

        <div data-tab-panel="forensic" id="ev-messages">
          <pre class="code-block">// GET /api/server/relay-log — Real Packet Structure Stored in SQLite (messages table)
{
  "description": "Server-side relay log. Notice all messages are encrypted hex strings. Plaintext is inaccessible to server.",
  "packets": [
    {
      "message_id": "msg-1732694012-9f4ab",
      "sender": "alice",
      "receiver": "bob",
      "cipher_mode": "cbc-hmac",
      "seq_no": 1,
      "timestamp": "2026-11-27T08:15:22.410Z",
      "iv": "8e4c19f02a7b63d1e5084b2c71a9f403",
      "ciphertext": "7d93a1f84c20b6e419fa730c52d8e4b1a0c9e73f641b8d209c4a7f1e6b3d8291",
      "hmac_tag": "c4f18e2b9a70d53e8146b2c9f01a7e54d38b6c2e9f41a07d5b8e3c1f6a92d407"
    }
  ]
}
// PROOF: Plaintext message, AES encKey, HMAC macKey, and ratchet MK are completely absent.</pre>
        </div>

        <div data-tab-panel="forensic" id="ev-users" hidden>
          <pre class="code-block">// SQLite users table — Salted PBKDF2 digests + SPKI Public Keys ONLY
{
  "username": "alice",
  "password_hash": "9a71c04f8b2d... (32-byte PBKDF2-HMAC-SHA256, 100,000 iterations)",
  "salt": "4f82e1a90c3b7d6512e4f09a8b7c6d5e",
  "public_identity_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
}

// SQLite dh_sessions table — Verified Public Parameters & RSA-PSS Signatures ONLY
{
  "session_id": "4e9a1b2c7f08",
  "user1": "alice", "user2": "bob",
  "dh_g": 2, "dh_p": "ffffffffffffffffc90fdaa2...ffffffffffffffff",
  "pub_a": "71f0e8a4...", "sig_a": "a92b41c8...",
  "pub_b": "3c84d291...", "sig_b": "5e17f40b...",
  "status": "established"
}
// PROOF: Private exponents (a, b), RSA private key, and shared secret S NEVER touch the server.</pre>
        </div>

        <div data-tab-panel="forensic" id="ev-files" hidden>
          <pre class="code-block">// SQLite files table — Metadata ONLY (NO filename, NO MIME type, NO file_key)
{
  "file_id": "764dcd61faf02da1b1ab3acb5af07563",
  "uploader": "alice",
  "recipient": "bob",
  "size": 12112,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}

// Disk storage: uploads/764dcd61faf02da1b1ab3acb5af07563.bin
// Binary layout: [ 16B random IV ] [ AES-256-CBC PKCS#7 ciphertext ] [ 32B HMAC-SHA256 tag ]
// HTTP Headers on GET /api/files/&lt;id&gt;:
//   Cache-Control: no-store | X-Content-Type-Options: nosniff | Content-Disposition: attachment; filename="encrypted.bin"</pre>
        </div>
      </section>

      <!-- Live 5-Tab Crypto Inspector Blueprint -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">In-App Telemetry · static/js/inspector.js</div>
            <h2 class="sec-title">Live 5-Tab Crypto Inspector Architecture</h2>
          </div>
          <span class="sec-meta">READ-ONLY · 1s REFRESH · FINGERPRINTS ONLY</span>
        </div>
        <div class="grid-5">
          <div class="card accent-emerald">
            <div class="card-title" style="font-size:0.98rem;">1. Overview</div>
            <p style="font-size:12.8px;color:var(--ink-2);">Channel verdict banner, shared-secret fingerprint, and 7-point handshake checklist.</p>
          </div>
          <div class="card accent-violet">
            <div class="card-title" style="font-size:0.98rem;">2. Key Exchange</div>
            <p style="font-size:12.8px;color:var(--ink-2);">Role (initiator/responder), session ID, MODP-2048 params, A/B hex, RSA sig status.</p>
          </div>
          <div class="card accent-cyan">
            <div class="card-title" style="font-size:0.98rem;">3. Key Ratchet</div>
            <p style="font-size:12.8px;color:var(--ink-2);">Send/recv chain positions, chain-key fingerprints, skipped keys, and struck-through erased MKs.</p>
          </div>
          <div class="card accent-amber">
            <div class="card-title" style="font-size:0.98rem;">4. Packets</div>
            <p style="font-size:12.8px;color:var(--ink-2);">Every wire packet's IV, ciphertext, MAC tag, and verdict (Verified / Integrity Failed / Replay).</p>
          </div>
          <div class="card accent-rose">
            <div class="card-title" style="font-size:0.98rem;">5. Relay DB</div>
            <p style="font-size:12.8px;color:var(--ink-2);">Live feed of <code>/api/server/relay-log</code> proving zero plaintext across messages and files.</p>
          </div>
        </div>
      </section>

      <!-- X.509 Certificate + Py<->JS Interop Parity -->
      <section class="grid-2">
        <div class="card accent-cyan">
          <div class="card-title"><span class="icon-badge cyan">X509</span>Transport TLS Certificate Evidence (<code>generate_cert.py</code>)</div>
          <ul class="clean">
            <li><strong>Standard:</strong> X.509 v3 self-signed certificate generated programmatically via Python <code>cryptography.x509</code> (no OpenSSL CLI required).</li>
            <li><strong>Key &amp; Signature:</strong> 2048-bit RSA private key (<code>e = 65537</code>) signed with <code>SHA-256</code>.</li>
            <li><strong>Subject / Issuer:</strong> <code>O=CNS Educational Security Lab</code>, <code>CN=localhost</code>.</li>
            <li><strong>Subject Alternative Names:</strong> <code>DNS:localhost</code> and <code>IP:127.0.0.1</code> (valid 365 days).</li>
          </ul>
        </div>

        <div class="card accent-violet">
          <div class="card-title"><span class="icon-badge violet">⇄</span>Python ↔ Browser JS Wire-Parity Proof</div>
          <ul class="clean violet">
            <li><strong>DH Signed Payload:</strong> Exact match <code>cns-dh-v2|role|initiator|responder|hex</code> + 222-byte PSS salt.</li>
            <li><strong>Ratchet KDF Labels:</strong> Identical <code>cns-ratchet-v2</code> HKDF info strings and <code>SHA-256("A:B")</code> transcript salt.</li>
            <li><strong>Message Canonical MAC:</strong> Exact colon-delimited <code>iv:ct:ts:seq:context</code> verified in both directions by <code>test_js_interop.py</code>.</li>
            <li><strong>File Blob Parity:</strong> Python encrypts → Node WebCrypto decrypts, and JS encrypts → Python decrypts byte-for-byte.</li>
          </ul>
        </div>
      </section>

      ${renderPager('evidence')}
    </div>`;
  },

  /* ==================== 8. RESULTS ==================== */
  results() {
    const suites = [
      { file: 'tests/test_crypto.py', count: 6, color: 'violet', items: 'PBKDF2 hashing & timing check, RFC 3526 DH agreement (256B), HKDF key separation & fingerprints, AES-256-CBC round-trip, HMAC bit-flip/seq tamper detection, RSA-2048-PSS signing & forgery rejection.' },
      { file: 'tests/test_attacks.py', count: 5, color: 'rose', items: 'Ciphertext tamper rejection, IV/timestamp/seq tamper rejection, replay nonce deduplication, DH MITM signature substitution defense, SQLite zero-plaintext leakage audit.' },
      { file: 'tests/test_ratchet.py', count: 13, color: 'emerald', items: 'Bi-directional independent chains, 50 unique keys, forward secrecy after state compromise, replay rejection, out-of-order delivery, forged packet non-desync, MAX_SKIP limit, context-bound CBC+HMAC, AES-GCM AAD reference, DH subgroup check (1, p-1, 11), and 3 Vaudenay padding-oracle tests.' },
      { file: 'tests/test_e2e_flow.py', count: 7, color: 'cyan', items: 'Full Alice/Bob Flask API signed handshake + CBC+HMAC relay, tamper & replay HTTP 409, server rejection of unsigned/forged/relabelled/wrong-group DH values, cbc-hmac-only enforcement, 404 on removed server-side crypto endpoints, password-gated identity rotation, and padding-oracle API.' },
      { file: 'tests/test_files.py', count: 12, color: 'amber', items: 'File blob layout & PKCS#7 round-trip, empty file, fresh key & IV per file, tamper/wrong-key/wrong-AAD rejection, 10 MB size cap, uploader/recipient ACLs (404/401/nosniff), path-traversal & overwrite (409) checks, reset cleanup, zero-name relay log, and 2 Py↔JS file interop tests.' },
      { file: 'tests/test_js_interop.py', count: 4, color: 'violet', items: 'Byte-for-byte Python ↔ real browser JS (static/js/crypto_client.js under Node WebCrypto): chain-key derivation, Python encrypts → JS decrypts (out-of-order + tampered + replayed), JS encrypts → Python decrypts, and cross-platform RSA-PSS + DH subgroup validation.' },
    ];

    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker cyan">Tab 08 · Testing, Evaluation &amp; References</div>
        <h1 class="display-title">47 Automated Tests &amp; <span class="grad-text">Security Results</span></h1>
        <p class="lead">
          Comprehensive empirical validation across six automated test suites, quantitative padding-oracle
          evaluation, project conclusions, honest future roadmap, and primary cryptographic standards.
        </p>
      </section>

      <!-- 47 Test Suites Breakdown -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Automated Verification · python -m unittest discover -s tests</div>
            <h2 class="sec-title">47 / 47 Passing Tests Across 6 Test Suites</h2>
          </div>
          <span class="pill emerald">100% PASSING</span>
        </div>

        <div class="grid-2">
          ${suites.map((s) => `
            <div class="card accent-${s.color}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <code style="font-size:12.5px;font-weight:700;">${s.file}</code>
                <span class="pill ${s.color}">${s.count} Tests · PASS</span>
              </div>
              <p style="font-size:13.3px;color:var(--ink-2);line-height:1.6;">${s.items}</p>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round((s.count / 13) * 100)}%"></div></div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Quantitative Padding Oracle + Defense Evaluation -->
      <section class="card accent-rose">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker" style="color:var(--rose);">Quantitative Cryptanalysis Result</div>
            <h2 class="sec-title">Vaudenay CBC Padding Oracle: Plain CBC vs Encrypt-then-MAC</h2>
          </div>
          <span class="pill emerald">0 Bits Leaked</span>
        </div>
        <div class="grid-2">
          <div class="card" style="background:var(--rose-soft);border-color:rgba(251,113,133,0.35);">
            <div class="card-title" style="color:var(--rose);">Vulnerable: Unauthenticated AES-CBC</div>
            <ul class="clean rose">
              <li><strong>Oracle Signal:</strong> Distinct padding error vs valid decryption leaks 1 bit per query.</li>
              <li><strong>Complexity:</strong> ~128 queries/byte (~2,048 queries per 16-byte block; &gt;500–4,000 queries for typical message).</li>
              <li><strong>Outcome:</strong> <strong>100% plaintext recovered byte-by-byte without the AES key.</strong></li>
            </ul>
          </div>
          <div class="card" style="background:var(--emerald-soft);border-color:rgba(52,211,153,0.35);">
            <div class="card-title" style="color:var(--emerald);">SecureMsg: Encrypt-then-MAC (AES-CBC + HMAC)</div>
            <ul class="clean emerald">
              <li><strong>Verification Order:</strong> Constant-time HMAC-SHA256 verified <em>before</em> AES decryption or unpadding runs.</li>
              <li><strong>Oracle Signal:</strong> Every forged probe fails MAC identically — zero side-channel information.</li>
              <li><strong>Outcome:</strong> <strong>Attack aborted on Block 0, Byte 15 after 256 rejections (0 bytes recovered).</strong></li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Conclusion & Future Roadmap -->
      <section class="grid-2">
        <div class="card accent-emerald">
          <div class="card-title"><span class="icon-badge emerald">✓</span>Key Conclusions</div>
          <ul class="clean emerald">
            <li><strong>MITM Closed:</strong> RSA-2048-PSS signatures + RFC 3526 subgroup checks eliminate the classic unauthenticated Diffie-Hellman weakness.</li>
            <li><strong>Per-Message Forward Secrecy:</strong> The one-way HMAC hash ratchet ensures compromising current keys cannot decrypt past chat or files.</li>
            <li><strong>Proven Zero-Knowledge Relay:</strong> Server database and file blob store hold strictly ciphertext, public keys, and routing metadata.</li>
            <li><strong>Cross-Runtime Integrity:</strong> Byte-compatible Python and WebCrypto implementations verified end-to-end across 47 automated tests.</li>
          </ul>
        </div>
        <div class="card accent-violet">
          <div class="card-title"><span class="icon-badge violet">→</span>Limitations &amp; Future Roadmap</div>
          <ul class="clean violet">
            <li><strong>Out-of-Band Key Verification:</strong> Replace TOFU directory trust with Signal-style safety numbers and QR code fingerprint scanning.</li>
            <li><strong>Post-Compromise Security:</strong> Upgrade from symmetric-only hash ratchet to a full Double Ratchet (ephemeral DH ratchet turns).</li>
            <li><strong>Production Hardening:</strong> Add TOTP 2FA, login rate limiting, non-extractable WebCrypto keys, WebSocket real-time push, and hash-chained audit logs.</li>
          </ul>
        </div>
      </section>

      <!-- Academic & Standards References [1]-[8] -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Standards &amp; Literature · Slide 11</div>
            <h2 class="sec-title">References</h2>
          </div>
          <span class="sec-meta">8 PRIMARY CITATIONS</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:70px;">Ref</th>
                <th>Citation</th>
                <th style="width:150px;">Standard / Link</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="pill violet">[1]</span></td>
                <td>T. Kivinen, M. Kojo, <strong>"More Modular Exponential (MODP) Diffie-Hellman Groups,"</strong> RFC 3526, IETF, 2003.</td>
                <td><a href="https://datatracker.ietf.org/doc/html/rfc3526" target="_blank" rel="noopener" class="pill cyan" style="text-decoration:none;">RFC 3526 ↗</a></td>
              </tr>
              <tr>
                <td><span class="pill violet">[2]</span></td>
                <td>H. Krawczyk, P. Eronen, <strong>"HMAC-based Extract-and-Expand Key Derivation Function (HKDF),"</strong> RFC 5869, 2010.</td>
                <td><a href="https://datatracker.ietf.org/doc/html/rfc5869" target="_blank" rel="noopener" class="pill cyan" style="text-decoration:none;">RFC 5869 ↗</a></td>
              </tr>
              <tr>
                <td><span class="pill violet">[3]</span></td>
                <td>K. Moriarty et al., <strong>"PKCS #1: RSA Cryptography Specifications v2.2,"</strong> RFC 8017, 2016.</td>
                <td><a href="https://datatracker.ietf.org/doc/html/rfc8017" target="_blank" rel="noopener" class="pill cyan" style="text-decoration:none;">RFC 8017 ↗</a></td>
              </tr>
              <tr>
                <td><span class="pill violet">[4]</span></td>
                <td>NIST, <strong>"Advanced Encryption Standard (AES),"</strong> FIPS PUB 197, 2001.</td>
                <td><a href="https://csrc.nist.gov/publications/detail/fips/197/final" target="_blank" rel="noopener" class="pill cyan" style="text-decoration:none;">FIPS 197 ↗</a></td>
              </tr>
              <tr>
                <td><span class="pill violet">[5]</span></td>
                <td>S. Vaudenay, <strong>"Security Flaws Induced by CBC Padding,"</strong> EUROCRYPT 2002.</td>
                <td><span class="pill amber">EUROCRYPT '02</span></td>
              </tr>
              <tr>
                <td><span class="pill violet">[6]</span></td>
                <td>M. Bellare, C. Namprempre, <strong>"Authenticated Encryption: Relations among Notions,"</strong> ASIACRYPT 2000.</td>
                <td><span class="pill amber">ASIACRYPT '00</span></td>
              </tr>
              <tr>
                <td><span class="pill violet">[7]</span></td>
                <td>E. Rescorla, <strong>"The Transport Layer Security (TLS) Protocol Version 1.3,"</strong> RFC 8446, 2018.</td>
                <td><a href="https://datatracker.ietf.org/doc/html/rfc8446" target="_blank" rel="noopener" class="pill cyan" style="text-decoration:none;">RFC 8446 ↗</a></td>
              </tr>
              <tr>
                <td><span class="pill violet">[8]</span></td>
                <td>M. Marlinspike, T. Perrin, <strong>"The Double Ratchet Algorithm,"</strong> Signal, 2016.</td>
                <td><a href="https://signal.org/docs/specifications/doubleratchet/" target="_blank" rel="noopener" class="pill emerald" style="text-decoration:none;">Signal Spec ↗</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      ${renderPager('results')}
    </div>`;
  },

  /* ==================== 9. TEAM ==================== */
  team() {
    const members = [
      { initials: 'AS', name: 'Anusha Shigihalli', roll: '402', usn: '01FE23BCS044', grad: 'linear-gradient(135deg,#06B6D4,#0F766E)', color: 'cyan' },
      { initials: 'AH', name: 'Ananya Hiregoudar', roll: '443', usn: '01FE23BCS104', grad: 'linear-gradient(135deg,#3B82F6,#4F46E5)', color: 'blue' },
      { initials: 'AT', name: 'Amogh Talawar',     roll: '464', usn: '01FE24BCS414', grad: 'linear-gradient(135deg,#8B5CF6,#EC4899)', color: 'violet' },
      { initials: 'VM', name: 'Vinay Madgi',       roll: '433', usn: '01FE23BCS306', grad: 'linear-gradient(135deg,#10B981,#0EA5E9)', color: 'emerald' },
    ];

    return `
    <div class="stack-lg">
      <section class="page-hero">
        <div class="kicker violet">Tab 09 · Project Team &amp; Credentials</div>
        <h1 class="display-title">Meet <span class="grad-text">Team 04</span></h1>
        <p class="lead">
          7th Semester B.E. Computer Science &amp; Engineering team behind <strong>SecureMsg</strong> —
          End-to-End Encrypted Messaging System Using Hybrid Cryptography.
        </p>

        <div class="pills" style="margin-top:18px;">
          <span class="pill cyan">Team Number: Team 04</span>
          <span class="pill violet">Course: Cryptography &amp; Network Security (CNS)</span>
          <span class="pill emerald">7th Semester · B.E. CSE</span>
          <span class="pill amber">Academic Year 2026</span>
        </div>
      </section>

      <section class="grid-2" aria-label="Team 04 Members">
        ${members.map((m, idx) => `
          <article class="member-card">
            <div class="member-ribbon" style="background:${m.grad};"></div>
            <div class="member-body">
              <div class="member-top">
                <span class="avatar" style="background:${m.grad};">${m.initials}</span>
                <div>
                  <span class="pill ${m.color}" style="margin-bottom:6px;">Member 0${idx + 1} · Team 04</span>
                  <h2 class="font-display" style="font-size:1.25rem;line-height:1.2;">${m.name}</h2>
                  <p style="font-size:12.8px;color:var(--ink-3);margin-top:2px;">B.E. Computer Science &amp; Engineering</p>
                </div>
              </div>
              <div class="member-meta">
                <div class="meta-box">
                  <small>Roll Number</small>
                  <strong>${m.roll}</strong>
                </div>
                <div class="meta-box">
                  <small>University Seat No (USN)</small>
                  <strong>${m.usn}</strong>
                </div>
              </div>
            </div>
          </article>
        `).join('')}
      </section>

      <section class="card accent-cyan">
        <div class="sec-head" style="margin-bottom:12px;">
          <div>
            <div class="sec-kicker">Project Artifacts &amp; Source</div>
            <h2 class="sec-title">Repository &amp; Documentation Links</h2>
          </div>
        </div>
        <p style="font-size:14px;color:var(--ink-2);margin-bottom:16px;">
          The complete Python Flask relay, browser WebCrypto client, Attack Lab, presentation deck
          (<code>SecureMsg_CNS_Presentation.pdf</code>), and 47-test automated suite are hosted in our GitHub repository.
        </p>
        <div class="btn-row" style="margin-top:0;">
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application" target="_blank" rel="noopener" class="btn btn-primary">View GitHub Repository ↗</a>
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application/blob/main/README.md" target="_blank" rel="noopener" class="btn btn-secondary">Read Full README ↗</a>
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application/blob/main/SecureMsg_CNS_Presentation.pdf" target="_blank" rel="noopener" class="btn btn-secondary">Presentation PDF ↗</a>
        </div>
      </section>

      ${renderPager('team')}
    </div>`;
  }
};
