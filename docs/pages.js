/**
 * SecureMsg CNS Portfolio — All 9 Editorial Engineering Pages
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
    sub: '100k iterations + 16B salt',
    color: 'indigo',
    actors: 'User Browser → POST /api/auth/register & /login → SQLite (users)',
    summary: 'Accounts authenticate using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique 16-byte cryptographic salt per user. Verification uses constant-time hmac.compare_digest to eliminate timing side channels.',
    math: 'derived_key = PBKDF2-HMAC-SHA256(password_utf8, random_16B_salt, iterations=100_000, dklen=32)',
    wire: `POST /api/auth/register
{ "username": "alice", "password": "********", "public_identity_key": "-----BEGIN PUBLIC KEY-----..." }

SQLite users table stores ONLY:
{ username: "alice", password_hash: "<64-hex>", salt: "<32-hex>", public_identity_key: "<SPKI PEM>" }`,
    defense: 'Resists dictionary attacks, rainbow tables, and database leaks; plaintext passwords are never stored.'
  },
  {
    num: '02',
    title: 'Browser RSA-2048-PSS Identity',
    sub: 'Private key stays local',
    color: 'indigo',
    actors: 'Browser WebCrypto (crypto_client.js) → POST /api/auth/identity',
    summary: 'Each browser locally generates a long-term RSA-2048-PSS keypair (SHA-256, e=65537, max salt 222 bytes). The PKCS#8 private key stays in browser localStorage; only the SPKI public key is published after re-verifying the password.',
    math: 'KeyPair = WebCrypto.generateKey({ name: "RSA-PSS", modulusLength: 2048, hash: "SHA-256" })',
    wire: `POST /api/auth/identity
{ "username": "alice", "password": "********", "public_identity_key": "-----BEGIN PUBLIC KEY-----..." }`,
    defense: 'Server never sees or generates private identity keys; password re-auth prevents session-hijack key swapping.'
  },
  {
    num: '03',
    title: 'Signed DH Initiation (Alice)',
    sub: 'RFC 3526 MODP-2048, g=2',
    color: 'indigo',
    actors: 'Alice Browser → POST /api/dh/initiate → Flask Relay (dh_routes.py)',
    summary: 'Alice picks a random 256-bit exponent a, computes A = 2^a mod p over RFC 3526 Group 14, and signs the canonical role-and-peer-bound payload with RSA-2048-PSS. The relay enforces standard group, subgroup membership, and sig_a.',
    math: 'A = 2^a mod p   (RFC 3526 MODP-2048)\nsig_a = RSA-PSS-Sign(priv_alice, "cns-dh-v2|A|alice|bob|" + normHex(A))',
    wire: `POST /api/dh/initiate
{ "peer": "bob", "p_hex": "ffff...ffff", "g": 2, "pub_a": "<512-hex>", "sig_a": "<512-hex>" }
// Unsigned, forged, or relabelled values rejected with HTTP 400 SIGNATURE_INVALID`,
    defense: 'Blocks weak parameter injection, role/peer relabelling, and active MITM substitution.'
  },
  {
    num: '04',
    title: 'Subgroup Check & DH Response (Bob)',
    sub: 'A^q ≡ 1 mod p + sig_a verify',
    color: 'amber',
    actors: 'Bob Browser ← GET /api/dh/pending → POST /api/dh/respond',
    summary: 'Bob verifies RFC 3526 parameters, range (1 < A < p-1), subgroup order (A^q ≡ 1 mod p), and Alice\'s RSA-PSS signature. If valid, Bob computes (b, B), derives S = A^b mod p, erases b, and responds with signed B.',
    math: 'Verify: 1 < A < p-1  AND  A^q ≡ 1 (mod p)  where q = (p - 1)/2\nB = 2^b mod p,   S = A^b mod p,   sig_b = RSA-PSS-Sign(priv_bob, "cns-dh-v2|B|alice|bob|" + normHex(B))',
    wire: `POST /api/dh/respond
{ "session_id": "a1b2c3d4e5f6", "pub_b": "<512-hex>", "sig_b": "<512-hex>" }
// Relay verifies sig_b & subgroup check → status = "established"`,
    defense: 'Defeats small-subgroup confinement (order-2 element p-1 or non-residues) and impersonation.'
  },
  {
    num: '05',
    title: 'Transcript-Salted HKDF Seeding',
    sub: 'Directional send/recv chains',
    color: 'teal',
    actors: 'Alice & Bob Browsers independently (0 bytes over network)',
    summary: 'Alice verifies Bob\'s sig_b and subgroup check, computes S = B^a mod p, and both bind directional chain keys to the exact handshake transcript using SHA-256("A:B") as HKDF salt. Both zero a, b, and S immediately.',
    math: 'salt = SHA-256(normHex(A) + ":" + normHex(B))\nCK_i2r = HKDF-SHA256(S, salt, "cns-ratchet-v2 chain initiator->responder")\nCK_r2i = HKDF-SHA256(S, salt, "cns-ratchet-v2 chain responder->initiator")',
    wire: `Local RAM Derivation Only:
Alice: sendCK = CK_i2r, recvCK = CK_r2i
Bob:   sendCK = CK_r2i, recvCK = CK_i2r
Both:  privateDH = null; sharedSecret.fill(0);`,
    defense: 'Directional separation prevents reflection; transcript salt cryptographically binds keys to A & B.'
  },
  {
    num: '06',
    title: 'Per-Message Hash Ratchet',
    sub: 'One-time keys → erased',
    color: 'teal',
    actors: 'Sender Browser (crypto_client.js / crypto/ratchet.py)',
    summary: 'Each outgoing message advances the sending chain with two one-way HMAC-SHA256 calls, immediately overwrites old CK with zeros, expands MK via HKDF into independent encKey and macKey, and zeroes MK.',
    math: 'MK_n = HMAC-SHA256(CK_{n-1}, 0x01)   |   CK_n = HMAC-SHA256(CK_{n-1}, 0x02)\nencKey_n = HKDF(MK_n, "cns-ratchet-v2 message enc key")\nmacKey_n = HKDF(MK_n, "cns-ratchet-v2 message mac key")',
    wire: `Key Lifecycle (Msg #n):
1. Derive MK_n, CK_n → zero old CK_{n-1}
2. Derive encKey_n, macKey_n → encrypt & MAC → zero MK_n, encKey_n, macKey_n`,
    defense: 'Forward secrecy: stealing current chain key CK_n cannot invert HMAC to recover past message keys.'
  },
  {
    num: '07',
    title: 'AES-256-CBC + HMAC & Relay',
    sub: 'Encrypt-then-MAC + 409 Filter',
    color: 'cobalt',
    actors: 'Sender Browser → POST /api/messages/send → Flask Relay',
    summary: 'Plaintext is padded (PKCS#7) and encrypted with AES-256-CBC (fresh 16B IV), then tagged with HMAC-SHA256 over IV, ciphertext, timestamp, sequence number, and full session context. Relay enforces cbc-hmac and blocks duplicate message IDs (HTTP 409).',
    math: 'CT  = AES-256-CBC(encKey_n, random_16B_IV, PKCS7(plaintext))\nctx = session_id|sender|receiver|msg_id|cbc-hmac\ntag = HMAC-SHA256(macKey_n, iv_hex:ct_hex:timestamp:seq_no:ctx)',
    wire: `POST /api/messages/send
{ "message_id": "msg-1732-9a1f", "receiver": "bob", "ciphertext": "<hex>",
  "iv": "<32-hex>", "hmac_tag": "<64-hex>", "seq_no": 3, "cipher_mode": "cbc-hmac" }`,
    defense: 'Context binding prevents cross-session packet reuse; relay replay table blocks duplicate IDs.'
  },
  {
    num: '08',
    title: 'Verify-First Decrypt & E2EE Files',
    sub: 'MAC first + MAX_SKIP=100',
    color: 'teal',
    actors: 'Receiver Browser ← GET /api/messages/receive & /api/files/<id>',
    summary: 'Receiver derives candidate key for seq_no (caching up to 100 skipped keys for out-of-order packets) and verifies HMAC-SHA256 in constant time BEFORE AES decryption. Ratchet state commits ONLY if valid. Files (≤10 MB) use AAD-bound blobs.',
    math: 'if !constantTimeVerify(macKey_n, tag, canonical): DROP (do NOT advance CK)\nelse: plaintext = AES-256-CBC-Decrypt(encKey_n, IV, CT); commit CK; zero keys',
    wire: `Encrypted File Descriptor (sent inside ratcheted E2EE chat):
{ "cns": "file", "v": 1, "id": "<32-hex>", "name": "report.pdf",
  "size": 123456, "key": "<64-hex file_key>", "sha256": "<64-hex plaintext>" }`,
    defense: 'Defeats Vaudenay CBC padding-oracle attacks, prevents forged packets from desyncing keys, hides filenames.'
  }
];

window.CODE_MODULES = [
  {
    id: 'dh', file: 'crypto/dh.py', badge: 'RFC 3526 · MODP-2048', color: 'indigo',
    desc: 'Implements 2048-bit MODP Group 14 Diffie-Hellman (g = 2) with 256-bit exponents and full range + prime-order subgroup validation (y^q ≡ 1 mod p).',
    code: `RFC_3526_2048_SUBGROUP_ORDER = (RFC_3526_2048_PRIME - 1) // 2

def is_valid_public_value(y: int, p: int = RFC_3526_2048_PRIME) -> bool:
    """Range check (1 < y < p-1) plus subgroup check (y^q == 1 mod p)."""
    if not (1 < y < p - 1):
        return False
    if p == RFC_3526_2048_PRIME:
        return pow(y, RFC_3526_2048_SUBGROUP_ORDER, p) == 1
    return True`
  },
  {
    id: 'ratchet', file: 'crypto/ratchet.py', badge: 'Forward Secrecy', color: 'teal',
    desc: 'Per-direction HMAC-SHA256 hash ratchet with HKDF subkeys, out-of-order buffer (MAX_SKIP=100), and commit-after-authenticate safety.',
    code: `def kdf_chain(chain_key: bytes) -> tuple[bytes, bytes]:
    return (hmac.new(chain_key, b"\\x01", hashlib.sha256).digest(),
            hmac.new(chain_key, b"\\x02", hashlib.sha256).digest())

def receive(self, seq_no: int, open_fn):
    if seq_no <= self.recv_n:
        raise RatchetError(f"Replay/stale message: #{seq_no} already consumed")
    if seq_no - self.recv_n > MAX_SKIP:
        raise RatchetError(f"Message #{seq_no} is too far ahead")
    result = open_fn(*message_subkeys(target_mk))  # raises on forgery -> no commit!
    self.recv_ck, self.recv_n = ck, seq_no
    self.skipped.update(newly_skipped)
    return result`
  },
  {
    id: 'client', file: 'static/js/crypto_client.js', badge: 'Browser WebCrypto', color: 'cobalt',
    desc: 'Runs all live cryptography in the browser via window.crypto.subtle and BigInt modPow; zeroes shared secrets and one-time keys immediately.',
    code: `async function openMessage(mode, pkt, encKey, macKey, ctx) {
  if (mode !== 'cbc-hmac') throw new CNSError('protocol', 'Unsupported cipher mode');
  const macObj = await _webcrypto.subtle.importKey('raw', macKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await _webcrypto.subtle.verify(
    'HMAC', macObj, hexToBytes(pkt.hmac_tag),
    hmacCanonical(pkt.iv, pkt.ciphertext, pkt.timestamp, pkt.seq_no, ctx)
  );
  if (!ok) throw new CNSError('integrity', 'INTEGRITY ALERT: HMAC failed.');
  const key = await _webcrypto.subtle.importKey('raw', encKey, 'AES-CBC', false, ['decrypt']);
  return new TextDecoder('utf-8', { fatal: true }).decode(
    await _webcrypto.subtle.decrypt({ name: 'AES-CBC', iv: hexToBytes(pkt.iv) }, key, hexToBytes(pkt.ciphertext))
  );
}`
  },
  {
    id: 'filecrypt', file: 'crypto/filecrypt.py', badge: 'E2EE File Blobs', color: 'amber',
    desc: 'Encrypts files up to 10 MB with a fresh 256-bit key, HKDF subkeys, and length-prefixed AAD binding the blob to one file_id and direction.',
    code: `def file_aad(file_id: str, sender: str, receiver: str) -> bytes:
    return f"cns-file-v1|{file_id}|{sender}|{receiver}".encode('utf-8')

def _mac(mac_key: bytes, aad: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    data = len(aad).to_bytes(4, 'big') + aad + iv + ciphertext
    return hmac.new(mac_key, data, hashlib.sha256).digest()`
  },
  {
    id: 'dh_routes', file: 'routes/dh_routes.py', badge: 'Relay Enforcement', color: 'crimson',
    desc: 'Server DH directory strictly enforces RFC 3526 Group 14, subgroup membership, and RSA-2048-PSS signatures without seeing private keys.',
    code: `if (p_hex and int(p_hex, 16) != RFC_3526_2048_PRIME) or int(g) != RFC_3526_GENERATOR:
    return jsonify({"success": False, "error": "Unsupported DH group"}), 400
signed_text = dh_signed_payload('A', current_user, peer, pub_a)
if not sig_a or not verify_signature(signed_text, sig_a, sender_user['public_identity_key']):
    return jsonify({"success": False, "error": "SIGNATURE_INVALID"}), 400`
  },
  {
    id: 'oracle', file: 'crypto/padding_oracle.py', badge: 'Vaudenay 2002 Lab', color: 'crimson',
    desc: 'Demonstrates full plaintext recovery against unauthenticated CBC, then proves Encrypt-then-MAC leaks 0 bits.',
    code: `class SecureCBCServer:
    def padding_oracle(self, iv, ct, tag, timestamp="t", seq_no=1) -> bool:
        self.queries += 1
        if not verify_hmac(iv.hex(), ct.hex(), timestamp, seq_no, tag, self.mac_key):
            return False  # identical rejection -> 0 oracle signal
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
        <span class="pager-dir">← Previous</span>
        <span class="pager-title">${prev.label}</span>
      </a>` : '<div></div>'}
      ${next ? `<a class="pager-card next" href="#${next.id}" data-nav="${next.id}">
        <span class="pager-dir">Next →</span>
        <span class="pager-title">${next.label}</span>
      </a>` : '<div></div>'}
    </nav>
  `;
}

function renderAnimatedArchStage(idPrefix = 'arch') {
  return `
    <div class="stage-card" data-arch-stage="${idPrefix}">
      <div class="stage-header">
        <div>
          <div class="sec-kicker">ANIMATED WORKFLOW · 5-TIER E2EE DATAFLOW</div>
          <h3 class="font-display" style="font-size:1.05rem;">Live Packet &amp; Trust-Boundary Animation</h3>
        </div>
        <div class="stage-controls">
          <button type="button" class="stage-btn active" data-arch-mode="handshake">1. Signed DH</button>
          <button type="button" class="stage-btn" data-arch-mode="chat">2. Ratchet Chat</button>
          <button type="button" class="stage-btn" data-arch-mode="file">3. 10 MB File</button>
          <button type="button" class="stage-btn danger" data-arch-mode="attack">4. Attack Blocked</button>
          <button type="button" class="stage-btn play" data-arch-play>▶ Auto-Cycle</button>
          <button type="button" class="stage-btn" data-open-current-svg>⤢ Zoom</button>
        </div>
      </div>
      <div class="stage-canvas" data-arch-canvas></div>
      <div class="stage-ticker">
        <div><span class="ticker-badge" data-arch-badge>PHASE 1</span><span data-arch-ticker></span></div>
      </div>
    </div>
  `;
}

window.PORTFOLIO_PAGES = {
  /* ==================== 1. HOME ==================== */
  home() {
    return `
    <div class="stack-lg">
      <section class="hero-shell">
        <div class="hero-top">
          <div class="hero-split">
            <div>
              <div class="eyebrow"><span class="eyebrow-bar"></span>Cryptography &amp; Network Security · Team 04</div>
              <h1 class="display-title">
                <span class="hl">SecureMsg</span> — End-to-End Encrypted Messaging Using Hybrid Cryptography
              </h1>
              <p class="lead">
                A full-stack zero-knowledge messenger where all identity keys, Diffie-Hellman secrets,
                ratchet chains, and plaintext stay exclusively inside users' browsers via the
                <strong>WebCrypto API</strong>, while the Flask/SQLite relay stores only ciphertext and public keys.
              </p>
              <div class="btn-row">
                <a href="#demo" data-nav="demo" class="btn btn-primary">Launch Live WebCrypto Demo →</a>
                <a href="#protocol" data-nav="protocol" class="btn btn-secondary">Watch Animated Protocol</a>
                <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application" target="_blank" rel="noopener" class="btn btn-secondary">GitHub Repo ↗</a>
              </div>
            </div>

            <aside class="hero-dossier" aria-label="Cryptographic specification snapshot">
              <div class="dossier-head">
                <span>PROTOCOL SPECIFICATION</span>
                <span class="live-pill"><span class="live-dot"></span>E2EE VERIFIED</span>
              </div>
              <div class="dossier-row"><span>Key Agreement</span><strong>DH RFC 3526 (2048-bit)</strong></div>
              <div class="dossier-row"><span>Anti-MITM Identity</span><strong>RSA-2048-PSS + SHA-256</strong></div>
              <div class="dossier-row"><span>Forward Secrecy</span><strong>HMAC Hash Ratchet</strong></div>
              <div class="dossier-row"><span>Cipher Suite</span><strong>AES-256-CBC + HMAC</strong></div>
              <div class="dossier-row"><span>File Encryption</span><strong>AAD Blobs (≤ 10 MB)</strong></div>
              <div class="dossier-row"><span>Password KDF</span><strong>PBKDF2 · 100k rounds</strong></div>
            </aside>
          </div>
        </div>

        <div class="metric-ribbon" aria-label="Project metrics">
          <div class="mr-cell"><div class="mr-val indigo">2048-bit</div><div class="mr-label">MODP-14 DH &amp; RSA-PSS</div></div>
          <div class="mr-cell"><div class="mr-val cobalt">100,000</div><div class="mr-label">PBKDF2 Password Rounds</div></div>
          <div class="mr-cell"><div class="mr-val teal">47 / 47</div><div class="mr-label">Automated &amp; Py↔JS Tests</div></div>
          <div class="mr-cell"><div class="mr-val amber">5 / 5</div><div class="mr-label">Live Attacks Defeated</div></div>
          <div class="mr-cell"><div class="mr-val crimson">0 Bytes</div><div class="mr-label">Plaintext on Relay Server</div></div>
        </div>
      </section>

      <!-- Live Animated Workflow Preview on Home -->
      <section>
        ${renderAnimatedArchStage('home')}
      </section>

      <!-- 6-Stage Summary -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">End-to-End Lifecycle</div>
            <h2 class="sec-title">Six Cryptographic Layers Working Together</h2>
          </div>
          <a href="#protocol" data-nav="protocol" class="sec-meta" style="color:var(--cobalt);text-decoration:none;">Inspect All 8 Stages →</a>
        </div>
        <div class="grid-3">
          <div class="card hover">
            <div class="card-title"><span class="num-chip indigo">01</span>Browser Identity &amp; Auth</div>
            <p style="font-size:13.6px;color:var(--ink-2);">Passwords hashed with <code>PBKDF2-HMAC-SHA256</code> (100k rounds). Browser generates <code>RSA-2048-PSS</code> keys; private key never leaves the browser.</p>
          </div>
          <div class="card hover">
            <div class="card-title"><span class="num-chip indigo">02</span>RSA-Signed Diffie-Hellman</div>
            <p style="font-size:13.6px;color:var(--ink-2);">RFC 3526 MODP-2048 values signed with RSA-PSS and verified for prime-order subgroup membership (<code>y^q ≡ 1 mod p</code>).</p>
          </div>
          <div class="card hover">
            <div class="card-title"><span class="num-chip teal">03</span>Forward-Secret Ratchet</div>
            <p style="font-size:13.6px;color:var(--ink-2);">Transcript-salted <code>HKDF-SHA256</code> seeds directional chains. Every packet steps <code>HMAC(CK, 0x01/0x02)</code> and zeroes used keys.</p>
          </div>
          <div class="card hover">
            <div class="card-title"><span class="num-chip">04</span>AES-256-CBC + HMAC</div>
            <p style="font-size:13.6px;color:var(--ink-2);">Encrypt-then-MAC with fresh 16-byte IV and context binding. Constant-time MAC verification before decryption defeats padding oracles.</p>
          </div>
          <div class="card hover">
            <div class="card-title"><span class="num-chip amber">05</span>Zero-Knowledge File Blobs</div>
            <p style="font-size:13.6px;color:var(--ink-2);">Files up to <code>10 MB</code> encrypted with fresh 256-bit keys and AAD; relay serves opaque <code>uploads/*.bin</code> only to uploader/recipient.</p>
          </div>
          <div class="card hover">
            <div class="card-title"><span class="num-chip crimson">06</span>Inspector &amp; 5-Attack Lab</div>
            <p style="font-size:13.6px;color:var(--ink-2);">Read-only 5-tab <strong>Crypto Inspector</strong> + live <strong>Attack Lab</strong> (Eavesdrop, Tamper, Replay, MITM, Vaudenay Padding Oracle).</p>
          </div>
        </div>
      </section>

      <!-- Portfolio Directory -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Portfolio Sections</div>
            <h2 class="sec-title">Navigate All 9 Engineering Tabs</h2>
          </div>
          <span class="sec-meta">TEAM 04 · CNS 2026</span>
        </div>
        <div class="grid-4">
          <a href="#overview" data-nav="overview" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill indigo">02 · Overview</span>
            <h3 class="card-title" style="margin-top:10px;">Abstract &amp; Threats</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">Problem statement, 5-threat model, objectives, and honest scope.</p>
          </a>
          <a href="#architecture" data-nav="architecture" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill cobalt">03 · Architecture</span>
            <h3 class="card-title" style="margin-top:10px;">Animated 5-Tier</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">Interactive packet flow, trust wall, Who Sees What matrix.</p>
          </a>
          <a href="#protocol" data-nav="protocol" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill teal">04 · Protocol</span>
            <h3 class="card-title" style="margin-top:10px;">Animated 8-Stage</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">Auto-playing sequence diagram + interactive Hash Ratchet.</p>
          </a>
          <a href="#implementation" data-nav="implementation" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill amber">05 · Code &amp; API</span>
            <h3 class="card-title" style="margin-top:10px;">Animated Pipeline</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">API-to-SQLite animator, source explorer, 5-table ERD, 19 APIs.</p>
          </a>
          <a href="#demo" data-nav="demo" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill teal">06 · Live Demo</span>
            <h3 class="card-title" style="margin-top:10px;">WebCrypto Sandbox</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">Live RSA-PSS + DH-2048 + Ratchet + all 5 real attacks.</p>
          </a>
          <a href="#evidence" data-nav="evidence" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill amber">07 · Evidence</span>
            <h3 class="card-title" style="margin-top:10px;">Forensic Relay DB</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">Raw SQLite ciphertext dumps, X.509 cert, Py↔JS parity.</p>
          </a>
          <a href="#results" data-nav="results" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill cobalt">08 · Results</span>
            <h3 class="card-title" style="margin-top:10px;">47 Tests &amp; RFCs</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">All 6 test suites, padding-oracle benchmark, references [1]-[8].</p>
          </a>
          <a href="#team" data-nav="team" class="card hover" style="text-decoration:none;color:inherit;">
            <span class="pill crimson">09 · Team 04</span>
            <h3 class="card-title" style="margin-top:10px;">Project Roster</h3>
            <p style="font-size:12.8px;color:var(--ink-3);">Anusha, Ananya, Amogh &amp; Vinay — Roll Nos, USNs, links.</p>
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
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow indigo"><span class="eyebrow-bar"></span>Tab 02 · Project Overview</div>
          <h1 class="display-title">Abstract, Motivation &amp; <span class="hl-indigo">Threat Model</span></h1>
          <p class="lead">
            Why transport encryption (HTTPS/TLS) alone cannot protect messages from central servers,
            and how <strong>SecureMsg</strong> removes server trust using hybrid end-to-end cryptography.
          </p>
        </div>
      </section>

      <section class="card left-cobalt">
        <div class="sec-head" style="margin-bottom:10px;">
          <div>
            <div class="sec-kicker">01 · Abstract</div>
            <h2 class="sec-title">Executive Summary</h2>
          </div>
          <span class="pill teal">Presentation · Slide 03</span>
        </div>
        <p style="font-size:15px;color:var(--ink-2);line-height:1.78;">
          Conventional messaging services depend on central servers that can read, alter, or replay user messages,
          and HTTPS alone does not hide plaintext from the server once TLS terminates. This project presents
          <strong>SecureMsg</strong>, a working end-to-end encrypted messenger in which two users agree on a secret
          over an untrusted relay using <strong>RSA-PSS-signed Diffie-Hellman (RFC 3526 MODP-2048)</strong>.
          Messages and files (up to 10 MB) are protected by a <strong>forward-secret symmetric hash ratchet</strong>
          and <strong>AES-256-CBC with HMAC-SHA256 (Encrypt-then-MAC)</strong>. All private keys, session secrets,
          and plaintext stay strictly inside users' browsers, while the Flask/SQLite relay stores only ciphertext.
          A live <strong>5-Tab Crypto Inspector</strong> and an <strong>Attack Lab</strong> with five attacks,
          backed by <strong>47 automated tests</strong>, validate every defense.
        </p>

        <div class="grid-3" style="margin-top:20px;">
          <div class="card" style="text-align:center;background:var(--surface-alt);">
            <div class="mr-val teal">47</div>
            <div class="mr-label">Automated Unit, E2E &amp; Interop Tests</div>
          </div>
          <div class="card" style="text-align:center;background:var(--surface-alt);">
            <div class="mr-val amber">5</div>
            <div class="mr-label">Live Cryptographic Attack Scenarios</div>
          </div>
          <div class="card dark-panel" style="text-align:center;">
            <div class="mr-val" style="color:#34D399;">0</div>
            <div class="mr-label" style="color:#CBD5E1;">Plaintext Bytes Stored on Relay</div>
          </div>
        </div>
      </section>

      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">02 · Introduction</div>
            <h2 class="sec-title">Four Pillars Behind Hybrid E2EE</h2>
          </div>
        </div>
        <div class="grid-2">
          <div class="card"><div class="card-title"><span class="num-chip">01</span>Secure Communication</div><p style="font-size:13.8px;color:var(--ink-2);">Messaging carries personal, financial, and business data—making cryptographic confidentiality and integrity mandatory.</p></div>
          <div class="card"><div class="card-title"><span class="num-chip crimson">02</span>Eliminating Server Trust</div><p style="font-size:13.8px;color:var(--ink-2);">In conventional services the server reads plaintext after TLS terminates. End-to-end encryption removes that trust completely.</p></div>
          <div class="card"><div class="card-title"><span class="num-chip indigo">03</span>Hybrid Cryptography</div><p style="font-size:13.8px;color:var(--ink-2);">Asymmetric primitives (<code>DH-2048</code>, <code>RSA-2048-PSS</code>) establish keys and identity; symmetric primitives (<code>AES-256-CBC</code>, <code>HMAC-SHA256</code>) protect bulk traffic efficiently.</p></div>
          <div class="card"><div class="card-title"><span class="num-chip teal">04</span>Educational Transparency</div><p style="font-size:13.8px;color:var(--ink-2);">Built for CNS coursework with a live <strong>Crypto Inspector</strong> and <strong>Attack Lab</strong> that make every protocol step inspectable.</p></div>
        </div>
      </section>

      <section class="stack-md">
        <div class="card left-crimson">
          <div class="sec-kicker crimson">03 · Problem Statement</div>
          <p style="font-size:15px;color:var(--ink);font-weight:500;line-height:1.72;">
            To design and implement an end-to-end encrypted messaging system in which two users establish a shared secret
            over an untrusted relay using <strong>RSA-PSS-signed Diffie-Hellman</strong>, and exchange messages and files
            protected by a <strong>forward-secret hash ratchet</strong> and <strong>AES-256-CBC with HMAC-SHA256</strong>,
            so that the relay can neither read nor undetectably modify, replay, or impersonate any communication.
          </p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Threat Vector</th><th>Adversary Capability</th><th>Impact Without Defense</th><th>SecureMsg Countermeasure</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>1. Eavesdropping</strong></td><td>Wi-Fi sniffing or database breach</td><td>Full plaintext &amp; files exposed</td><td><span class="pill cobalt">AES-256-CBC E2EE + TLS</span></td></tr>
              <tr><td><strong>2. Tampering</strong></td><td>Bit-flipping ciphertext, IV, or seq_no</td><td>Silent command/amount alteration</td><td><span class="pill teal">HMAC-SHA256 (Encrypt-then-MAC)</span></td></tr>
              <tr><td><strong>3. MITM on DH</strong></td><td>Substituting DH public values A &amp; B</td><td>Attacker decrypts &amp; re-encrypts all chat</td><td><span class="pill indigo">RSA-2048-PSS + Subgroup Check</span></td></tr>
              <tr><td><strong>4. Replay Attack</strong></td><td>Re-transmitting valid captured packets</td><td>Duplicate actions executed</td><td><span class="pill crimson">Relay HTTP 409 + One-Time Ratchet</span></td></tr>
              <tr><td><strong>5. Padding Oracle</strong></td><td>Probing PKCS#7 padding validity</td><td>Decrypts plain CBC without key</td><td><span class="pill teal">Constant-Time MAC BEFORE Decrypt</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid-2">
        <div class="card left-teal">
          <div class="card-title">Project Objectives</div>
          <ul class="clean teal">
            <li><strong>Resilient E2EE Protocol:</strong> Defend against eavesdropping, tampering, replay, MITM, and padding oracles.</li>
            <li><strong>Identity Binding:</strong> Sign DH values with RSA-2048-PSS bound to role, initiator, and responder.</li>
            <li><strong>Zero-Knowledge Relay:</strong> Guarantee zero plaintext, filenames, or session keys on the server.</li>
            <li><strong>Empirical Validation:</strong> Prove defenses across 47 automated tests and 5 live Attack Lab scenarios.</li>
          </ul>
        </div>
        <div class="card left-amber">
          <div class="card-title">Honest Security Trade-offs</div>
          <ul class="clean amber">
            <li><strong>TOFU Identity Directory:</strong> Compare SHA-256 identity fingerprints out-of-band; safety numbers/QR planned.</li>
            <li><strong>Symmetric Ratchet Only:</strong> Forward secrecy per message, but no post-compromise healing (DH ratchet planned).</li>
            <li><strong>Demo Conveniences:</strong> Private keys in <code>localStorage</code> and <code>X-Sim-User</code> header for two-tab demos.</li>
            <li><strong>Visible Metadata:</strong> Relay sees sender, receiver, timestamps, and encrypted blob sizes (≤10 MB).</li>
          </ul>
        </div>
      </section>

      ${renderPager('overview')}
    </div>`;
  },

  /* ==================== 3. ARCHITECTURE ==================== */
  architecture() {
    const tb = window.PORTFOLIO_DIAGRAMS.trustBoundary;
    return `
    <div class="stack-lg">
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow"><span class="eyebrow-bar"></span>Tab 03 · System Architecture</div>
          <h1 class="display-title">Animated <span class="hl">5-Tier Zero-Knowledge</span> Architecture</h1>
          <p class="lead">
            Switch between live animated workflows below to watch exactly how Signed Diffie-Hellman keys,
            ratcheted chat packets, 10 MB encrypted file blobs, and blocked attacks traverse the trust boundary.
          </p>
        </div>
      </section>

      <!-- Animated 5-Tier Dataflow Stage -->
      <section>
        ${renderAnimatedArchStage('arch')}
      </section>

      <!-- Trust Boundary Diagram -->
      <section class="stage-card">
        <div class="stage-header">
          <div>
            <div class="sec-kicker crimson">TRUST BOUNDARY · CRYPTOGRAPHIC WALL</div>
            <h3 class="font-display" style="font-size:1.05rem;">${tb.title}</h3>
          </div>
          <button type="button" class="stage-btn" data-open-static-svg="trustBoundary">⤢ Zoom &amp; Inspect</button>
        </div>
        <div class="stage-canvas">${tb.svg}</div>
      </section>

      <!-- Who Sees What Matrix -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker teal">Zero-Knowledge Audit</div>
            <h2 class="sec-title">"Who Sees What" Visibility Matrix</h2>
          </div>
          <span class="sec-meta">VERIFIED BY test_attacks.py &amp; test_files.py</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Data / Cryptographic Artifact</th><th>Alice Browser</th><th>Flask / SQLite Relay</th><th>Bob Browser</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>RSA-2048 Private Identity Key</strong></td><td><span class="pill teal">Own Only (localStorage)</span></td><td><span class="pill crimson">NEVER</span></td><td><span class="pill teal">Own Only (localStorage)</span></td></tr>
              <tr><td><strong>RSA-2048 Public Identity Key</strong></td><td><span class="pill cobalt">Yes</span></td><td><span class="pill amber">Stored (users)</span></td><td><span class="pill cobalt">Yes</span></td></tr>
              <tr><td><strong>DH Private Exponents (a, b)</strong></td><td><span class="pill teal">RAM → Erased</span></td><td><span class="pill crimson">NEVER</span></td><td><span class="pill teal">RAM → Erased</span></td></tr>
              <tr><td><strong>Shared Secret S, Chain &amp; Message Keys</strong></td><td><span class="pill teal">RAM → Zeroed</span></td><td><span class="pill crimson">NEVER</span></td><td><span class="pill teal">RAM → Zeroed</span></td></tr>
              <tr><td><strong>Per-File Keys, Filenames &amp; Plaintext</strong></td><td><span class="pill teal">Yes</span></td><td><span class="pill crimson">NEVER</span></td><td><span class="pill teal">Yes</span></td></tr>
              <tr><td><strong>Ciphertext, 16B IV, 32B HMAC, .bin Blob</strong></td><td><span class="pill cobalt">Yes</span></td><td><span class="pill amber">Stored &amp; Relayed</span></td><td><span class="pill cobalt">Yes</span></td></tr>
              <tr><td><strong>Routing Metadata (Who, When, Size)</strong></td><td><span class="pill cobalt">Yes</span></td><td><span class="pill amber">Visible</span></td><td><span class="pill cobalt">Yes</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card-title"><span class="num-chip indigo">C1</span>Browser WebCrypto Engine</div>
          <ul class="clean indigo">
            <li><code>static/js/crypto_client.js</code> executes RSA-PSS, BigInt MODP-2048 DH, HKDF-SHA256, Hash Ratchet, AES-256-CBC, and HMAC-SHA256 locally.</li>
            <li><code>static/js/chat.js</code> runs 1s polling, handshake automation, drag-and-drop encrypted files, and the Tamper switch.</li>
            <li><code>static/js/inspector.js</code> powers the read-only 5-tab Crypto Inspector (fingerprints &amp; wire packets only).</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title"><span class="num-chip amber">C2</span>Untrusted Flask Relay &amp; Storage</div>
          <ul class="clean amber">
            <li>5 blueprints in <code>routes/</code> coordinate auth, DH signature enforcement, ciphertext queuing, file ACLs, and Attack Lab.</li>
            <li><code>database.py</code> manages 5 SQLite tables + <code>uploads/&lt;file_id&gt;.bin</code> cleanup on reset.</li>
            <li>Dual execution in <code>app.py</code>: HTTP (<code>:5000</code>) or HTTPS/TLS (<code>--https :5443</code>) with 11 MB body limit.</li>
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
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow teal"><span class="eyebrow-bar"></span>Tab 04 · Eight-Stage Cryptographic Protocol</div>
          <h1 class="display-title">Animated <span class="hl-teal">Protocol Sequence</span> &amp; Live Hash Ratchet</h1>
          <p class="lead">
            Click <strong>Auto-Play All 8 Stages</strong> or step manually through the animated sequence diagram
            below—every stage moves the live cryptographic packet across Alice, Relay, and Bob while updating the
            exact mathematical formulas and wire payloads in sync.
          </p>
        </div>
      </section>

      <!-- Animated 8-Stage Sequence Diagram Stage -->
      <section class="stage-card" id="proto-seq-stage">
        <div class="stage-header">
          <div>
            <div class="sec-kicker teal">ANIMATED SEQUENCE DIAGRAM · SYNCED WITH STEPPER</div>
            <h3 class="font-display" style="font-size:1.05rem;">Alice Browser ↔ Untrusted Flask Relay ↔ Bob Browser</h3>
          </div>
          <div class="stage-controls">
            <button type="button" class="stage-btn" id="proto-prev">← Prev</button>
            <button type="button" class="stage-btn play" id="proto-autoplay">▶ Auto-Play All 8</button>
            <button type="button" class="stage-btn" id="proto-next">Next →</button>
            <button type="button" class="stage-btn" data-open-current-svg>⤢ Zoom</button>
          </div>
        </div>
        <div class="stage-canvas" id="proto-seq-canvas"></div>
        <div class="stage-ticker">
          <div><span class="ticker-badge" id="proto-seq-badge">STAGE 01 / 08</span><span id="proto-seq-caption"></span></div>
        </div>
      </section>

      <!-- Synchronized 8-Step Detail Inspector -->
      <section>
        <div class="stepper-layout">
          <div class="step-list" id="protocol-step-list">
            ${steps.map((s, i) => `
              <button type="button" class="step-btn ${i === 0 ? 'active' : ''}" data-step-idx="${i}">
                <span class="step-num">${s.num}</span>
                <span><strong>${s.title}</strong><small>${s.sub}</small></span>
              </button>
            `).join('')}
          </div>
          <div class="card left-cobalt" id="protocol-detail-pane"></div>
        </div>
      </section>

      <!-- Interactive Animated Symmetric Hash Ratchet -->
      <section class="stage-card" id="ratchet-stage">
        <div class="stage-header">
          <div>
            <div class="sec-kicker teal">INTERACTIVE ANIMATION · FORWARD SECRECY</div>
            <h3 class="font-display" style="font-size:1.05rem;">Live Symmetric Hash Ratchet &amp; Key Erasure Simulator</h3>
          </div>
          <div class="stage-controls">
            <button type="button" class="stage-btn active" id="ratchet-step">+ Send Next Message</button>
            <button type="button" class="stage-btn play" id="ratchet-auto">▶ Auto-Step</button>
            <button type="button" class="stage-btn danger" id="ratchet-forge">✕ Simulate Forged Packet</button>
            <button type="button" class="stage-btn" id="ratchet-reset">Reset</button>
          </div>
        </div>
        <div class="stage-canvas" id="ratchet-canvas"></div>
        <div class="stage-ticker">
          <div><span class="ticker-badge" id="ratchet-badge">MESSAGE #1</span><span id="ratchet-caption"></span></div>
        </div>
      </section>

      ${renderPager('protocol')}
    </div>`;
  },

  /* ==================== 5. IMPLEMENTATION ==================== */
  implementation() {
    const mods = window.CODE_MODULES;
    const erd = window.PORTFOLIO_DIAGRAMS.dbSchemaErd;
    return `
    <div class="stack-lg">
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow amber"><span class="eyebrow-bar"></span>Tab 05 · Cryptography &amp; Codebase</div>
          <h1 class="display-title">Animated <span class="hl">Execution Pipeline</span>, Source &amp; REST API</h1>
          <p class="lead">
            Trace live requests flowing from <code>static/js/crypto_client.js</code> through Flask blueprints
            and Python cryptographic validators into SQLite3 tables and encrypted file blobs.
          </p>
        </div>
      </section>

      <!-- Animated Implementation Request-to-SQLite Pipeline -->
      <section class="stage-card" id="impl-pipe-stage">
        <div class="stage-header">
          <div>
            <div class="sec-kicker amber">ANIMATED EXECUTION TRACE · BROWSER → FLASK → CRYPTO → SQLITE</div>
            <h3 class="font-display" style="font-size:1.05rem;">Interactive Request-to-Database Code Flow</h3>
          </div>
          <div class="stage-controls">
            <button type="button" class="stage-btn active" data-impl-flow="dh_init">POST /dh/initiate</button>
            <button type="button" class="stage-btn" data-impl-flow="msg_send">POST /messages/send</button>
            <button type="button" class="stage-btn" data-impl-flow="msg_recv">GET /messages/receive</button>
            <button type="button" class="stage-btn" data-impl-flow="file_up">POST /files/upload</button>
            <button type="button" class="stage-btn play" id="impl-autoplay">▶ Auto-Cycle</button>
          </div>
        </div>
        <div class="stage-canvas" id="impl-pipe-canvas"></div>
        <div class="stage-ticker">
          <div><span class="ticker-badge" id="impl-pipe-badge">POST /api/dh/initiate</span><span id="impl-pipe-caption"></span></div>
        </div>
      </section>

      <!-- Master Primitives Table -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Cryptographic Primitives</div>
            <h2 class="sec-title">All Algorithms &amp; Exact Parameters</h2>
          </div>
          <span class="sec-meta">PYTHON cryptography + WEBCRYPTO</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Security Goal</th><th>Algorithm</th><th>Exact Parameters</th><th>Source Files</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Key Agreement</strong></td><td><span class="pill indigo">Diffie-Hellman</span></td><td>RFC 3526 MODP-2048, <code>g=2</code>, 256-bit exp, subgroup <code>y^q ≡ 1</code></td><td><code>crypto/dh.py</code>, <code>crypto_client.js</code></td></tr>
              <tr><td><strong>Anti-MITM Identity</strong></td><td><span class="pill indigo">RSA-2048-PSS</span></td><td>SHA-256, MGF1-SHA256, max salt 222 bytes</td><td><code>crypto/signatures.py</code></td></tr>
              <tr><td><strong>Key Derivation</strong></td><td><span class="pill teal">HKDF-SHA256</span></td><td>RFC 5869, salt <code>SHA-256("A:B")</code>, labelled info strings</td><td><code>crypto/kdf.py</code>, <code>ratchet.py</code></td></tr>
              <tr><td><strong>Forward Secrecy</strong></td><td><span class="pill teal">Hash Ratchet</span></td><td><code>MK=HMAC(CK,1)</code>, <code>CK'=HMAC(CK,2)</code>, <code>MAX_SKIP=100</code></td><td><code>crypto/ratchet.py</code></td></tr>
              <tr><td><strong>Confidentiality</strong></td><td><span class="pill cobalt">AES-256-CBC</span></td><td>256-bit 1-time key, PKCS#7, random 16B IV</td><td><code>crypto/encryption.py</code></td></tr>
              <tr><td><strong>Integrity</strong></td><td><span class="pill teal">HMAC-SHA256</span></td><td>Encrypt-then-MAC, constant-time verify before decrypt</td><td><code>crypto/integrity.py</code></td></tr>
              <tr><td><strong>File Sharing</strong></td><td><span class="pill amber">CBC + HMAC (AAD)</span></td><td>256-bit <code>file_key</code>, length-prefixed AAD, ≤10 MB</td><td><code>crypto/filecrypt.py</code></td></tr>
              <tr><td><strong>Password Storage</strong></td><td><span class="pill indigo">PBKDF2-SHA256</span></td><td>100,000 iterations, 16B random salt, 32B digest</td><td><code>crypto/auth.py</code></td></tr>
              <tr><td><strong>Transport (Opt.)</strong></td><td><span class="pill cobalt">X.509 v3 / TLS</span></td><td>Self-signed RSA-2048 + SHA-256 cert</td><td><code>generate_cert.py</code></td></tr>
              <tr><td><strong>Lab / Reference</strong></td><td><span class="pill crimson">Oracle / AES-GCM</span></td><td>Vaudenay CBC oracle demo + AES-256-GCM ref</td><td><code>padding_oracle.py</code>, <code>aead.py</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Code Explorer -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Source Inspector</div>
            <h2 class="sec-title">Verified Repository Code Excerpts</h2>
          </div>
        </div>
        <div class="seg-tabs" id="code-tabs">
          ${mods.map((m, i) => `<button type="button" class="seg-btn ${i === 0 ? 'active' : ''}" data-code-idx="${i}">${m.file}</button>`).join('')}
        </div>
        <div class="card left-indigo" id="code-viewer-pane"></div>
      </section>

      <!-- SQLite ERD -->
      <section class="stage-card">
        <div class="stage-header">
          <div>
            <div class="sec-kicker amber">PERSISTENCE LAYER · DATABASE.PY</div>
            <h3 class="font-display" style="font-size:1.05rem;">${erd.title}</h3>
          </div>
          <button type="button" class="stage-btn" data-open-static-svg="dbSchemaErd">⤢ Zoom &amp; Inspect</button>
        </div>
        <div class="stage-canvas">${erd.svg}</div>
      </section>

      <!-- REST API Reference -->
      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Flask Blueprints</div>
            <h2 class="sec-title">REST API Reference (19 Endpoints)</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Blueprint</th><th>Routes</th><th>Enforcement &amp; Behavior</th></tr></thead>
            <tbody>
              <tr><td><code>auth_routes.py</code></td><td><code>POST /api/auth/register</code>, <code>/login</code>, <code>/identity</code>, <code>/logout</code>, <code>GET /me</code>, <code>/users</code></td><td>PBKDF2 auth, password-gated RSA public key publishing, public directory.</td></tr>
              <tr><td><code>dh_routes.py</code></td><td><code>POST /api/dh/initiate</code>, <code>/respond</code>, <code>/reset</code>, <code>GET /pending</code>, <code>/session/&lt;id&gt;</code>, <code>/active/&lt;peer&gt;</code></td><td>Rejects non-MODP-2048, bad subgroup, and invalid RSA-PSS signatures (<code>400</code>).</td></tr>
              <tr><td><code>message_routes.py</code></td><td><code>POST /api/messages/send</code>, <code>GET /receive/&lt;peer&gt;</code>, <code>/history/&lt;peer&gt;</code>, <code>/api/server/relay-log</code></td><td>Enforces <code>cbc-hmac</code> only (<code>400</code>) and rejects duplicate IDs (<code>409 REPLAY_ATTACK_DETECTED</code>).</td></tr>
              <tr><td><code>file_routes.py</code></td><td><code>POST /api/files/upload</code>, <code>GET /api/files/&lt;file_id&gt;</code></td><td>Opaque binary blobs ≤10 MB (<code>413</code>), no overwrite (<code>409</code>), uploader/recipient ACL (<code>404</code>).</td></tr>
              <tr><td><code>attack_routes.py</code></td><td><code>POST /api/attacks/eavesdrop</code>, <code>/tamper</code>, <code>/replay</code>, <code>/mitm</code>, <code>/padding-oracle</code></td><td>Runs real Python cryptographic simulations for all 5 Attack Lab scenarios.</td></tr>
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
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow teal"><span class="eyebrow-bar"></span>Tab 06 · Real In-Browser WebCrypto</div>
          <h1 class="display-title">Live E2EE Sandbox &amp; <span class="hl-teal">5-Attack Lab</span></h1>
          <p class="lead">
            Powered by real <strong><code>window.crypto.subtle</code></strong> and <strong><code>BigInt</code> MODP-2048</strong>
            running directly in your browser. Execute a real signed handshake, send ratcheted messages with live
            <strong>Tamper</strong> and <strong>Replay 409</strong> attacks, and run all 5 cryptographic attacks live.
          </p>
        </div>
      </section>

      <!-- Part 1: Alice <-> Relay <-> Bob -->
      <section class="card left-teal">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker teal">Part 1 · Real Browser WebCrypto Console</div>
            <h2 class="sec-title">Alice ↔ Untrusted Relay ↔ Bob Live Session</h2>
          </div>
          <span id="demo-status-pill" class="pill amber">Session Not Established</span>
        </div>

        <div class="btn-row" style="margin-top:0;margin-bottom:14px;">
          <button type="button" class="btn btn-primary" id="btn-demo-handshake">1. Generate RSA-2048 &amp; Run Signed DH Handshake</button>
          <button type="button" class="btn btn-secondary" id="btn-demo-replay" disabled>↻ Replay Last Packet (Trigger 409)</button>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px;">
          <input type="text" id="demo-msg-input" class="sim-input" style="flex:1 1 280px;" value="Confidential: Authorize wire transfer #4821 at 5 PM" />
          <label class="toggle-label">
            <input type="checkbox" id="demo-tamper-toggle" />
            <span style="color:var(--crimson);">Simulate Tamper (flip ciphertext byte)</span>
          </label>
          <button type="button" class="btn btn-dark btn-sm" id="btn-demo-send" disabled>2. Encrypt &amp; Relay →</button>
        </div>

        <div class="sim-grid">
          <div class="sim-pane">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--indigo);">Alice (Sender)</strong>
              <span class="pill indigo" id="alice-fp-pill">No Key</span>
            </div>
            <div class="sim-log" id="demo-sender-log">Click "Generate RSA-2048 &amp; Run Signed DH Handshake" to initialize a real WebCrypto session...</div>
          </div>

          <div class="sim-pane relay">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#FBBF24;">Untrusted Relay</strong>
              <span class="pill crimson">0 Plaintext</span>
            </div>
            <div class="sim-log" id="demo-relay-log">Waiting for public keys, signed DH values, and ciphertext packets...</div>
          </div>

          <div class="sim-pane">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:var(--teal);">Bob (Receiver)</strong>
              <span class="pill teal" id="bob-fp-pill">No Key</span>
            </div>
            <div class="sim-log" id="demo-receiver-log">Waiting for handshake &amp; encrypted packets...</div>
          </div>
        </div>
      </section>

      <!-- Part 2: 5-Attack Live Lab -->
      <section class="card left-crimson">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker crimson">Part 2 · Interactive Cryptanalysis Lab</div>
            <h2 class="sec-title">Execute All 5 Live Attack &amp; Defense Scenarios</h2>
          </div>
          <span class="pill crimson">Real In-Browser Execution</span>
        </div>

        <div class="seg-tabs" id="attack-lab-tabs">
          <button type="button" class="seg-btn active" data-attack="eavesdrop">1. Eavesdropping</button>
          <button type="button" class="seg-btn" data-attack="tamper">2. Ciphertext Tampering</button>
          <button type="button" class="seg-btn" data-attack="replay">3. Replay Attack</button>
          <button type="button" class="seg-btn" data-attack="mitm">4. MITM on DH</button>
          <button type="button" class="seg-btn" data-attack="padding">5. Vaudenay Padding Oracle</button>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <input type="text" id="attack-msg-input" class="sim-input" style="flex:1 1 260px;" value="Vault code 4821" />
          <button type="button" class="btn btn-danger" id="btn-run-attack">▶ Execute Live Attack</button>
        </div>

        <div class="sim-log" id="attack-lab-output" style="max-height:340px;">Select any scenario above and click "Execute Live Attack" to run real WebCrypto operations in your browser.</div>
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card-title"><span class="num-chip">01</span>Run Full Flask Server Locally</div>
          <pre class="code-block">git clone https://github.com/Vinay3579-code/Secure-Messaging-Application.git
cd Secure-Messaging-Application
pip install -r requirements.txt
python app.py            # HTTP  → http://127.0.0.1:5000
python app.py --https    # HTTPS → https://127.0.0.1:5443</pre>
        </div>
        <div class="card">
          <div class="card-title"><span class="num-chip teal">02</span>Run Terminal Lab &amp; 47 Tests</div>
          <pre class="code-block"># All 5 attack scenarios in terminal
python attacks/attack_simulator.py

# Complete 47-test verification suite (incl. Py↔JS interop)
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
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow amber"><span class="eyebrow-bar"></span>Tab 07 · Audit &amp; Forensic Evidence</div>
          <h1 class="display-title">Zero-Knowledge <span class="hl">Forensic Verification</span></h1>
          <p class="lead">
            Exact database dumps from <code>/api/server/relay-log</code>, wire packet anatomy,
            the 5-tab Crypto Inspector design, X.509 v3 TLS cert specs, and Python ↔ JS byte-parity proof.
          </p>
        </div>
      </section>

      <section class="card left-amber">
        <div class="sec-head" style="margin-bottom:14px;">
          <div>
            <div class="sec-kicker amber">Server Database Dump · /api/server/relay-log</div>
            <h2 class="sec-title">What a Full Database Compromise Exposes</h2>
          </div>
          <span class="pill teal">0 Plaintext · 0 Private Keys</span>
        </div>

        <div class="seg-tabs" data-tab-group="forensic">
          <button type="button" class="seg-btn active" data-tab-target="ev-messages">messages (Ciphertext Only)</button>
          <button type="button" class="seg-btn" data-tab-target="ev-users">users &amp; dh_sessions (Public)</button>
          <button type="button" class="seg-btn" data-tab-target="ev-files">files &amp; uploads/*.bin</button>
        </div>

        <div data-tab-panel="forensic" id="ev-messages">
          <pre class="code-block">{
  "message_id": "msg-1732694012-9f4ab",
  "sender": "alice", "receiver": "bob",
  "cipher_mode": "cbc-hmac", "seq_no": 1,
  "timestamp": "2026-11-27T08:15:22.410Z",
  "iv": "8e4c19f02a7b63d1e5084b2c71a9f403",
  "ciphertext": "7d93a1f84c20b6e419fa730c52d8e4b1a0c9e73f641b8d209c4a7f1e6b3d8291",
  "hmac_tag": "c4f18e2b9a70d53e8146b2c9f01a7e54d38b6c2e9f41a07d5b8e3c1f6a92d407"
}
// PROOF: Zero plaintext, zero AES encKey, zero HMAC macKey, zero ratchet MK.</pre>
        </div>
        <div data-tab-panel="forensic" id="ev-users" hidden>
          <pre class="code-block">// users: PBKDF2-HMAC-SHA256 (100k rounds) + 16B salt + SPKI RSA public key ONLY
{ "username": "alice", "password_hash": "9a71c04f...", "salt": "4f82e1a9...", "public_identity_key": "-----BEGIN PUBLIC KEY-----..." }

// dh_sessions: RFC 3526 public values + verified RSA-PSS signatures ONLY
{ "session_id": "4e9a1b2c7f08", "dh_g": 2, "pub_a": "71f0e8a4...", "sig_a": "a92b41c8...", "pub_b": "3c84d291...", "sig_b": "5e17f40b...", "status": "established" }</pre>
        </div>
        <div data-tab-panel="forensic" id="ev-files" hidden>
          <pre class="code-block">// files table: NO filename, NO MIME type, NO file_key
{ "file_id": "764dcd61faf02da1b1ab3acb5af07563", "uploader": "alice", "recipient": "bob", "size": 12112, "sha256": "e3b0c442..." }

// Disk: uploads/764dcd61faf02da1b1ab3acb5af07563.bin → [ 16B IV ] [ AES-CBC PKCS#7 ] [ 32B HMAC ]
// Response headers: Cache-Control: no-store · X-Content-Type-Options: nosniff</pre>
        </div>
      </section>

      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">In-App Telemetry · static/js/inspector.js</div>
            <h2 class="sec-title">5-Tab Live Crypto Inspector</h2>
          </div>
          <span class="sec-meta">READ-ONLY · 1s REFRESH</span>
        </div>
        <div class="grid-5">
          <div class="card"><div class="card-title" style="font-size:0.96rem;">1. Overview</div><p style="font-size:12.6px;color:var(--ink-2);">Channel verdict, shared-secret fingerprint, 7-step handshake checklist.</p></div>
          <div class="card"><div class="card-title" style="font-size:0.96rem;">2. Key Exchange</div><p style="font-size:12.6px;color:var(--ink-2);">Initiator/responder role, MODP-2048 params, A/B hex, RSA sig status.</p></div>
          <div class="card"><div class="card-title" style="font-size:0.96rem;">3. Key Ratchet</div><p style="font-size:12.6px;color:var(--ink-2);">Chain positions, CK fingerprints, skipped keys, struck-through erased MKs.</p></div>
          <div class="card"><div class="card-title" style="font-size:0.96rem;">4. Packets</div><p style="font-size:12.6px;color:var(--ink-2);">Wire IV, ciphertext, HMAC tag, and verdict (Verified / Integrity Failed / Replay).</p></div>
          <div class="card"><div class="card-title" style="font-size:0.96rem;">5. Relay DB</div><p style="font-size:12.6px;color:var(--ink-2);">Live feed of <code>/api/server/relay-log</code> proving zero plaintext on disk.</p></div>
        </div>
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card-title"><span class="num-chip">TLS</span>X.509 v3 Certificate (<code>generate_cert.py</code>)</div>
          <ul class="clean">
            <li><strong>Algorithm:</strong> 2048-bit RSA private key (<code>e=65537</code>) signed with <code>SHA-256</code>.</li>
            <li><strong>Subject/Issuer:</strong> <code>O=CNS Educational Security Lab</code>, <code>CN=localhost</code>.</li>
            <li><strong>SAN:</strong> <code>DNS:localhost</code>, <code>IP:127.0.0.1</code> (365-day validity).</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title"><span class="num-chip indigo">⇄</span>Python ↔ Browser JS Byte Parity</div>
          <ul class="clean indigo">
            <li>Identical <code>cns-dh-v2</code> signed payloads and 222-byte RSA-PSS salt length.</li>
            <li>Identical <code>cns-ratchet-v2</code> HKDF labels and <code>SHA-256("A:B")</code> salt.</li>
            <li>Verified in both directions (Py→JS &amp; JS→Py) by <code>test_js_interop.py</code> and <code>test_files.py</code>.</li>
          </ul>
        </div>
      </section>

      ${renderPager('evidence')}
    </div>`;
  },

  /* ==================== 8. RESULTS ==================== */
  results() {
    const suites = [
      { file: 'tests/test_crypto.py', count: 6, color: 'indigo', items: 'PBKDF2 hashing & constant-time verify, RFC 3526 DH (256B), HKDF separation, AES-256-CBC round-trip, HMAC tamper detection, RSA-2048-PSS forgery rejection.' },
      { file: 'tests/test_attacks.py', count: 5, color: 'crimson', items: 'Ciphertext tamper rejection, IV/timestamp/seq tamper rejection, replay deduplication, DH MITM signature rejection, SQLite zero-plaintext audit.' },
      { file: 'tests/test_ratchet.py', count: 13, color: 'teal', items: 'Independent chains, 50 unique keys, forward secrecy after compromise, replay & out-of-order delivery, forged packet non-desync, MAX_SKIP, AES-GCM ref, DH subgroup check, 3 Vaudenay padding-oracle tests.' },
      { file: 'tests/test_e2e_flow.py', count: 7, color: 'cobalt', items: 'Alice/Bob Flask API handshake & CBC+HMAC relay, tamper & HTTP 409 replay, rejection of unsigned/forged/relabelled/wrong-group DH, cbc-hmac-only enforcement, 404 on removed crypto routes, password-gated identity rotation.' },
      { file: 'tests/test_files.py', count: 12, color: 'amber', items: 'Blob layout & empty file, fresh key/IV, tamper/wrong-AAD rejection, 10 MB cap, uploader/recipient ACLs (404/401/nosniff), path-traversal & overwrite (409), reset cleanup, zero-name relay log, 2 Py↔JS file interop tests.' },
      { file: 'tests/test_js_interop.py', count: 4, color: 'indigo', items: 'Byte-for-byte Python ↔ real browser JS (Node WebCrypto): chain-key derivation, Python→JS out-of-order/tampered/replayed delivery, JS→Python decryption, cross-runtime RSA-PSS & subgroup validation.' },
    ];

    return `
    <div class="stack-lg">
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow"><span class="eyebrow-bar"></span>Tab 08 · Testing, Evaluation &amp; References</div>
          <h1 class="display-title"><span class="hl-teal">47 / 47 Tests</span>, Cryptanalysis &amp; Standards</h1>
          <p class="lead">
            Automated unit, API E2E, file-sharing, padding-oracle, and Python ↔ Browser JS interoperability
            results alongside conclusions, roadmap, and primary RFC/paper citations.
          </p>
        </div>
      </section>

      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker teal">Automated Test Suite · python -m unittest discover -s tests</div>
            <h2 class="sec-title">Six Verified Test Modules (47 Passing)</h2>
          </div>
          <span class="pill teal">100% PASSING</span>
        </div>
        <div class="grid-2">
          ${suites.map((s) => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <code style="font-size:12.5px;font-weight:700;">${s.file}</code>
                <span class="pill ${s.color}">${s.count} Tests · PASS</span>
              </div>
              <p style="font-size:13.3px;color:var(--ink-2);line-height:1.6;">${s.items}</p>
              <div class="bar-track"><div class="bar-fill ${s.color}" style="width:${Math.round((s.count / 13) * 100)}%"></div></div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="grid-2">
        <div class="card left-crimson">
          <div class="card-title" style="color:var(--crimson);">Unauthenticated AES-CBC (Vulnerable)</div>
          <ul class="clean crimson">
            <li><strong>Oracle Leak:</strong> Distinguishable padding error leaks 1 bit per query.</li>
            <li><strong>Queries Required:</strong> ~128 queries/byte (~2,048/block).</li>
            <li><strong>Outcome:</strong> 100% plaintext recovered without the AES key.</li>
          </ul>
        </div>
        <div class="card left-teal">
          <div class="card-title" style="color:var(--teal);">SecureMsg Encrypt-then-MAC (Defended)</div>
          <ul class="clean teal">
            <li><strong>Check Order:</strong> Constant-time HMAC verified BEFORE AES decryption.</li>
            <li><strong>Queries Before Abort:</strong> 256 identical rejections on Block 0, Byte 15.</li>
            <li><strong>Outcome:</strong> 0 bits leaked; 0 bytes recovered.</li>
          </ul>
        </div>
      </section>

      <section class="grid-2">
        <div class="card left-teal">
          <div class="card-title">Key Conclusions</div>
          <ul class="clean teal">
            <li>Signed DH + subgroup validation closes the MITM gap of plain Diffie-Hellman.</li>
            <li>The one-way hash ratchet delivers per-message forward secrecy for chat and files.</li>
            <li>The Flask/SQLite relay is verified zero-knowledge across messages and 10 MB files.</li>
            <li>All 5 attacks are demonstrated live and verified across 47 automated tests.</li>
          </ul>
        </div>
        <div class="card left-indigo">
          <div class="card-title">Future Scope &amp; Roadmap</div>
          <ul class="clean indigo">
            <li>Out-of-band safety numbers &amp; QR fingerprint verification (beyond TOFU).</li>
            <li>Full Double Ratchet (ephemeral DH turns) for post-compromise security.</li>
            <li>TOTP 2FA, login rate limiting, non-extractable keys, and WebSocket delivery.</li>
          </ul>
        </div>
      </section>

      <section>
        <div class="sec-head">
          <div>
            <div class="sec-kicker">Primary Citations · Slide 11</div>
            <h2 class="sec-title">References</h2>
          </div>
          <span class="sec-meta">8 STANDARDS &amp; PAPERS</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th style="width:70px;">Ref</th><th>Citation</th><th style="width:150px;">Link</th></tr></thead>
            <tbody>
              <tr><td><span class="pill indigo">[1]</span></td><td>T. Kivinen, M. Kojo, <strong>"More Modular Exponential (MODP) Diffie-Hellman Groups,"</strong> RFC 3526, IETF, 2003.</td><td><a href="https://datatracker.ietf.org/doc/html/rfc3526" target="_blank" rel="noopener" class="pill cobalt" style="text-decoration:none;">RFC 3526 ↗</a></td></tr>
              <tr><td><span class="pill indigo">[2]</span></td><td>H. Krawczyk, P. Eronen, <strong>"HMAC-based Extract-and-Expand Key Derivation Function (HKDF),"</strong> RFC 5869, 2010.</td><td><a href="https://datatracker.ietf.org/doc/html/rfc5869" target="_blank" rel="noopener" class="pill cobalt" style="text-decoration:none;">RFC 5869 ↗</a></td></tr>
              <tr><td><span class="pill indigo">[3]</span></td><td>K. Moriarty et al., <strong>"PKCS #1: RSA Cryptography Specifications v2.2,"</strong> RFC 8017, 2016.</td><td><a href="https://datatracker.ietf.org/doc/html/rfc8017" target="_blank" rel="noopener" class="pill cobalt" style="text-decoration:none;">RFC 8017 ↗</a></td></tr>
              <tr><td><span class="pill indigo">[4]</span></td><td>NIST, <strong>"Advanced Encryption Standard (AES),"</strong> FIPS PUB 197, 2001.</td><td><a href="https://csrc.nist.gov/publications/detail/fips/197/final" target="_blank" rel="noopener" class="pill cobalt" style="text-decoration:none;">FIPS 197 ↗</a></td></tr>
              <tr><td><span class="pill indigo">[5]</span></td><td>S. Vaudenay, <strong>"Security Flaws Induced by CBC Padding,"</strong> EUROCRYPT 2002.</td><td><span class="pill amber">EUROCRYPT '02</span></td></tr>
              <tr><td><span class="pill indigo">[6]</span></td><td>M. Bellare, C. Namprempre, <strong>"Authenticated Encryption: Relations among Notions,"</strong> ASIACRYPT 2000.</td><td><span class="pill amber">ASIACRYPT '00</span></td></tr>
              <tr><td><span class="pill indigo">[7]</span></td><td>E. Rescorla, <strong>"The Transport Layer Security (TLS) Protocol Version 1.3,"</strong> RFC 8446, 2018.</td><td><a href="https://datatracker.ietf.org/doc/html/rfc8446" target="_blank" rel="noopener" class="pill cobalt" style="text-decoration:none;">RFC 8446 ↗</a></td></tr>
              <tr><td><span class="pill indigo">[8]</span></td><td>M. Marlinspike, T. Perrin, <strong>"The Double Ratchet Algorithm,"</strong> Signal, 2016.</td><td><a href="https://signal.org/docs/specifications/doubleratchet/" target="_blank" rel="noopener" class="pill teal" style="text-decoration:none;">Signal Spec ↗</a></td></tr>
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
      { initials: 'AS', name: 'Anusha Shigihalli', roll: '402', usn: '01FE23BCS044' },
      { initials: 'AH', name: 'Ananya Hiregoudar', roll: '443', usn: '01FE23BCS104' },
      { initials: 'AT', name: 'Amogh Talawar',     roll: '464', usn: '01FE24BCS414' },
      { initials: 'VM', name: 'Vinay Madgi',       roll: '433', usn: '01FE23BCS306' },
    ];

    return `
    <div class="stack-lg">
      <section class="hero-shell">
        <div class="hero-top">
          <div class="eyebrow"><span class="eyebrow-bar"></span>Tab 09 · Project Team &amp; Credentials</div>
          <h1 class="display-title">Team <span class="hl">04</span> — SecureMsg</h1>
          <p class="lead">
            7th Semester B.E. Computer Science &amp; Engineering team behind <strong>SecureMsg</strong> —
            End-to-End Encrypted Messaging System Using Hybrid Cryptography.
          </p>
        </div>
        <div class="metric-ribbon" style="grid-template-columns:repeat(3,minmax(0,1fr));">
          <div class="mr-cell"><div class="mr-val">Team 04</div><div class="mr-label">Project Group</div></div>
          <div class="mr-cell"><div class="mr-val cobalt">CNS · 7th Sem</div><div class="mr-label">B.E. Computer Science &amp; Engg.</div></div>
          <div class="mr-cell"><div class="mr-val teal">4 Members</div><div class="mr-label">Verified Roster</div></div>
        </div>
      </section>

      <section class="grid-2" aria-label="Team 04 Members">
        ${members.map((m, i) => `
          <article class="member-card">
            <div class="member-bar">
              <span>MEMBER · 0${i + 1}</span>
              <span class="pill teal">TEAM 04</span>
            </div>
            <div class="member-body">
              <span class="avatar" aria-hidden="true">${m.initials}</span>
              <div>
                <h2 class="font-display" style="font-size:1.18rem;line-height:1.25;">${m.name}</h2>
                <p style="font-size:12.6px;color:var(--ink-3);margin-top:2px;">Computer Science &amp; Engineering</p>
              </div>
            </div>
            <div class="member-data">
              <div class="md-cell"><small>Roll No</small><strong>${m.roll}</strong></div>
              <div class="md-cell"><small>USN</small><strong>${m.usn}</strong></div>
            </div>
          </article>
        `).join('')}
      </section>

      <section class="card left-cobalt">
        <div class="card-title">Repository &amp; Artifacts</div>
        <p style="font-size:13.8px;color:var(--ink-2);">
          Explore the complete Flask relay, browser WebCrypto client, Attack Lab, presentation deck, and 47-test suite on GitHub.
        </p>
        <div class="btn-row" style="margin-top:14px;">
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application" target="_blank" rel="noopener" class="btn btn-primary">View GitHub Repository ↗</a>
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application/blob/main/README.md" target="_blank" rel="noopener" class="btn btn-secondary">Read README.md ↗</a>
          <a href="https://github.com/Vinay3579-code/Secure-Messaging-Application/blob/main/SecureMsg_CNS_Presentation.pdf" target="_blank" rel="noopener" class="btn btn-secondary">Presentation PDF ↗</a>
        </div>
      </section>

      ${renderPager('team')}
    </div>`;
  }
};
