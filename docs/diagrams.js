/**
 * SecureMsg CNS Portfolio — Interactive & Animated SVG Workflow Diagrams
 * Features live <animateMotion> moving packets, flowing dashed wires, pulsing active nodes,
 * and step-synchronized visual states across Architecture, Protocol, and Implementation tabs.
 */

window.PORTFOLIO_DIAGRAMS = (() => {
  /* =====================================================================
     1. ANIMATED 5-TIER ARCHITECTURE WORKFLOW (Architecture & Home Tabs)
     Modes: 'handshake' | 'chat' | 'file' | 'attack'
     ===================================================================== */
  const ARCH_MODES = {
    handshake: {
      badge: 'PHASE 1 · SIGNED DH-2048',
      badgeCls: '',
      ticker: 'Alice signs A = 2^a mod p with RSA-2048-PSS → Relay checks MODP-2048, subgroup A^q ≡ 1, and sig_a → Bob verifies & replies with signed B.',
      aSub: 'Sign(A) with RSA-PSS',
      rSub: 'Verify sig_a, sig_b & q',
      bSub: 'S = A^b mod p → erase b',
      p1: { label: 'A + sig_a', color: '#818CF8', path: 'M 288 128 L 368 128', dur: '1.9s' },
      p2: { label: 'A + sig_a', color: '#818CF8', path: 'M 692 128 L 772 128', dur: '1.9s' },
      p3: { label: 'B + sig_b', color: '#34D399', path: 'M 772 172 L 692 172', dur: '2.2s' },
      p4: { label: 'B + sig_b', color: '#34D399', path: 'M 368 172 L 288 172', dur: '2.2s' },
      dbPath: 'M 455 248 L 455 286',
      dbLabel: 'dh_sessions',
      dbColor: '#818CF8',
      highlight: 'dh'
    },
    chat: {
      badge: 'PHASE 2 · RATCHETED E2EE CHAT',
      badgeCls: '',
      ticker: 'Alice advances hash ratchet (CK₀→CK₁, MK₁ erased), encrypts AES-256-CBC + HMAC-SHA256 → Relay checks replay filter → Bob verifies MAC FIRST, then decrypts.',
      aSub: 'AES-CBC + HMAC · zero MK',
      rSub: 'Replay Filter (409) · Queue CT',
      bSub: 'Verify MAC First → Decrypt',
      p1: { label: 'CT + IV + MAC', color: '#38BDF8', path: 'M 288 238 L 368 238', dur: '1.7s' },
      p2: { label: 'CT + IV + MAC', color: '#34D399', path: 'M 692 238 L 772 238', dur: '1.7s' },
      p3: null,
      p4: null,
      dbPath: 'M 455 248 L 455 286',
      dbLabel: 'messages (CT)',
      dbColor: '#38BDF8',
      highlight: 'chat'
    },
    file: {
      badge: 'PHASE 3 · E2EE FILE SHARING (≤10 MB)',
      badgeCls: 'warn',
      ticker: 'Browser generates random 256-bit file_key → uploads opaque IV||CBC||HMAC blob to uploads/<id>.bin → sends key + SHA-256 inside ratcheted E2EE chat.',
      aSub: 'Encrypt File + 256b file_key',
      rSub: 'Opaque .bin · ACL Uploader/Recv',
      bSub: 'Verify MAC + Plaintext SHA-256',
      p1: { label: 'blob.bin (AAD)', color: '#FBBF24', path: 'M 288 238 L 368 238', dur: '2.0s' },
      p2: { label: 'blob.bin (ACL)', color: '#FBBF24', path: 'M 692 238 L 772 238', dur: '2.0s' },
      p3: { label: 'file_key (E2EE)', color: '#34D399', path: 'M 288 278 L 368 278', dur: '2.4s' },
      p4: { label: 'file_key (E2EE)', color: '#34D399', path: 'M 692 278 L 772 278', dur: '2.4s' },
      dbPath: 'M 455 248 L 455 286',
      dbLabel: 'uploads/*.bin',
      dbColor: '#FBBF24',
      highlight: 'file'
    },
    attack: {
      badge: 'DEFENSE · TAMPER & REPLAY BLOCKED',
      badgeCls: 'err',
      ticker: 'Adversary replays a captured ID or flips a ciphertext bit → Relay rejects duplicate ID with HTTP 409; Bob rejects tampered MAC BEFORE decryption without burning keys.',
      aSub: 'Attacker Flips Cipher Byte',
      rSub: '409 REPLAY_ATTACK_DETECTED',
      bSub: 'MAC FAIL → Dropped · CK Safe',
      p1: { label: 'FORGED CT!', color: '#F87171', path: 'M 288 238 L 368 238', dur: '1.5s' },
      p2: { label: 'TAMPERED!', color: '#F87171', path: 'M 692 238 L 772 238', dur: '1.5s' },
      p3: { label: '409 BLOCK', color: '#F87171', path: 'M 368 278 L 288 278', dur: '1.8s' },
      p4: null,
      dbPath: 'M 455 248 L 455 286',
      dbLabel: 'processed_msgs',
      dbColor: '#F87171',
      highlight: 'attack'
    }
  };

  function packetPill(p) {
    if (!p) return '';
    return `
      <g>
        <rect x="-42" y="-12" width="84" height="24" rx="12" fill="#0B1320" stroke="${p.color}" stroke-width="1.8"/>
        <text x="0" y="4" text-anchor="middle" fill="${p.color}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">${p.label}</text>
        <animateMotion dur="${p.dur}" repeatCount="indefinite" path="${p.path}"/>
      </g>
    `;
  }

  function renderAnimatedArch(mode = 'handshake') {
    const m = ARCH_MODES[mode] || ARCH_MODES.handshake;
    const isDh = m.highlight === 'dh';
    const isChat = m.highlight === 'chat';
    const isFile = m.highlight === 'file';
    const isAtk = m.highlight === 'attack';

    const svg = `<svg viewBox="0 0 1060 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated 5-tier SecureMsg workflow">
      <defs>
        <marker id="maV" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="#818CF8"/></marker>
        <marker id="maC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="#38BDF8"/></marker>
        <marker id="maE" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="#34D399"/></marker>
        <marker id="maA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="#FBBF24"/></marker>
        <marker id="maR" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L10 5 L0 9 Z" fill="#F87171"/></marker>
      </defs>

      <!-- Column Headers -->
      <text x="150" y="20" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">TRUSTED CLIENT · ALICE BROWSER</text>
      <text x="530" y="20" text-anchor="middle" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">UNTRUSTED RELAY &amp; STORAGE</text>
      <text x="910" y="20" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">TRUSTED CLIENT · BOB BROWSER</text>

      <!-- ALICE BROWSER -->
      <rect x="16" y="32" width="268" height="354" rx="14" fill="#0F172A" stroke="${isAtk ? '#F87171' : '#3B82F6'}" stroke-width="1.8"/>
      <rect x="16" y="32" width="268" height="38" rx="14" fill="#172554"/>
      <rect x="16" y="54" width="268" height="16" fill="#172554"/>
      <text x="150" y="56" text-anchor="middle" fill="#EFF6FF" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700">Alice Browser (WebCrypto)</text>

      <rect x="30" y="84" width="240" height="54" rx="9" fill="#162136" stroke="${isDh ? '#818CF8' : '#263449'}" stroke-width="${isDh ? '2.2' : '1'}" class="${isDh ? 'pulse-ring' : 'node-dim'}"/>
      <text x="150" y="105" text-anchor="middle" fill="#E0E7FF" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">RSA-2048-PSS + DH MODP-2048</text>
      <text x="150" y="124" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">A = 2^a mod p · sig_a = Sign(A)</text>

      <rect x="30" y="150" width="240" height="54" rx="9" fill="#162136" stroke="${isChat || isFile ? '#34D399' : '#263449'}" stroke-width="${isChat || isFile ? '2.2' : '1'}" class="${isChat || isFile ? 'pulse-ring' : 'node-dim'}"/>
      <text x="150" y="171" text-anchor="middle" fill="#D1FAE5" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">HKDF + Symmetric Hash Ratchet</text>
      <text x="150" y="190" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">MK = HMAC(CK,1) · old CK zeroed</text>

      <rect x="30" y="216" width="240" height="62" rx="9" fill="#162136" stroke="${isChat ? '#38BDF8' : isFile ? '#FBBF24' : isAtk ? '#F87171' : '#263449'}" stroke-width="${!isDh ? '2.2' : '1'}" class="${!isDh ? 'pulse-ring' : 'node-dim'}"/>
      <text x="150" y="238" text-anchor="middle" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">AES-256-CBC + HMAC-SHA256</text>
      <text x="150" y="256" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">${m.aSub}</text>
      <text x="150" y="270" text-anchor="middle" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="9">Fresh 16B IV · Encrypt-then-MAC</text>

      <rect x="30" y="294" width="240" height="78" rx="9" fill="#0B1320" stroke="#1E2E47"/>
      <text x="150" y="316" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">BROWSER-ONLY SECRETS</text>
      <text x="150" y="336" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.4">RSA PrivKey · DH a · Secret S</text>
      <text x="150" y="354" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.4">CK_send/recv · MK · Plaintext</text>

      <!-- WIRES ALICE <-> RELAY -->
      <line x1="284" y1="128" x2="366" y2="128" stroke="${isDh ? '#818CF8' : '#263449'}" stroke-width="${isDh ? '2.4' : '1.4'}" class="${isDh ? 'wire-flow' : ''}" marker-end="${isDh ? 'url(#maV)' : ''}"/>
      <line x1="366" y1="172" x2="284" y2="172" stroke="${isDh ? '#34D399' : '#263449'}" stroke-width="${isDh ? '2.4' : '1.4'}" class="${isDh ? 'wire-flow' : ''}" marker-end="${isDh ? 'url(#maE)' : ''}"/>

      <line x1="284" y1="238" x2="366" y2="238" stroke="${isChat ? '#38BDF8' : isFile ? '#FBBF24' : isAtk ? '#F87171' : '#263449'}" stroke-width="${!isDh ? '2.4' : '1.4'}" class="${!isDh ? 'wire-flow' : ''}" marker-end="${isChat ? 'url(#maC)' : isFile ? 'url(#maA)' : isAtk ? 'url(#maR)' : ''}"/>
      <line x1="366" y1="278" x2="284" y2="278" stroke="${isFile ? '#34D399' : isAtk ? '#F87171' : '#263449'}" stroke-width="${isFile || isAtk ? '2.2' : '1.2'}" class="${isFile || isAtk ? 'wire-flow' : ''}" marker-end="${isFile ? 'url(#maE)' : isAtk ? 'url(#maR)' : ''}"/>

      <!-- CENTER RELAY -->
      <rect x="372" y="32" width="316" height="214" rx="14" fill="#111827" stroke="${isAtk ? '#F87171' : '#FBBF24'}" stroke-width="2"/>
      <rect x="372" y="32" width="316" height="38" rx="14" fill="${isAtk ? '#450A0A' : '#3B2305'}"/>
      <rect x="372" y="54" width="316" height="16" fill="${isAtk ? '#450A0A' : '#3B2305'}"/>
      <text x="530" y="56" text-anchor="middle" fill="${isAtk ? '#FECACA' : '#FEF3C7'}" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700">Flask Relay (HTTP :5000 / TLS :5443)</text>

      <rect x="388" y="84" width="284" height="50" rx="8" fill="#182235" stroke="${isDh ? '#818CF8' : '#2A3852'}" stroke-width="${isDh ? '2' : '1'}"/>
      <text x="530" y="104" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">dh_routes.py &amp; auth_routes.py</text>
      <text x="530" y="122" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="10.5">PBKDF2 100k · Enforces MODP-2048 &amp; RSA-PSS Sigs</text>

      <rect x="388" y="144" width="284" height="52" rx="8" fill="#182235" stroke="${!isDh ? (isAtk ? '#F87171' : '#38BDF8') : '#2A3852'}" stroke-width="${!isDh ? '2' : '1'}"/>
      <text x="530" y="164" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">message_routes.py &amp; file_routes.py</text>
      <text x="530" y="183" text-anchor="middle" fill="${isAtk ? '#FCA5A5' : '#34D399'}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600">${m.rSub}</text>

      <rect x="388" y="206" width="284" height="28" rx="6" fill="#2A0B12" stroke="#F87171"/>
      <text x="530" y="224" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">ZERO-KNOWLEDGE: 0 Plaintext · 0 Private Keys</text>

      <!-- DB Connector -->
      <line x1="455" y1="246" x2="455" y2="286" stroke="${m.dbColor}" stroke-width="2.2" class="wire-flow" marker-end="${isDh ? 'url(#maV)' : isChat ? 'url(#maC)' : isFile ? 'url(#maA)' : 'url(#maR)'}"/>
      <circle r="4.5" fill="${m.dbColor}"><animateMotion dur="1.4s" repeatCount="indefinite" path="${m.dbPath}"/></circle>

      <!-- Persistence & Ref Boxes -->
      <rect x="372" y="290" width="160" height="96" rx="12" fill="#0F172A" stroke="${m.dbColor}" stroke-width="1.8"/>
      <text x="452" y="312" text-anchor="middle" fill="${m.dbColor}" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">SQLite + uploads/</text>
      <text x="452" y="332" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="9.5">Active: ${m.dbLabel}</text>
      <text x="452" y="350" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">5 tables · opaque blobs</text>
      <text x="452" y="368" text-anchor="middle" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="8.8">0 plaintext rows</text>

      <rect x="542" y="290" width="146" height="96" rx="12" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
      <text x="615" y="312" text-anchor="middle" fill="#38BDF8" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">crypto/ + tests/</text>
      <text x="615" y="332" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.2">Python reference spec</text>
      <text x="615" y="350" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.2">47/47 Tests Passing</text>
      <text x="615" y="368" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">Py ↔ JS Byte Parity</text>

      <!-- WIRES RELAY <-> BOB -->
      <line x1="690" y1="128" x2="770" y2="128" stroke="${isDh ? '#818CF8' : '#263449'}" stroke-width="${isDh ? '2.4' : '1.4'}" class="${isDh ? 'wire-flow' : ''}" marker-end="${isDh ? 'url(#maV)' : ''}"/>
      <line x1="770" y1="172" x2="690" y2="172" stroke="${isDh ? '#34D399' : '#263449'}" stroke-width="${isDh ? '2.4' : '1.4'}" class="${isDh ? 'wire-flow' : ''}" marker-end="${isDh ? 'url(#maE)' : ''}"/>

      <line x1="690" y1="238" x2="770" y2="238" stroke="${isChat ? '#34D399' : isFile ? '#FBBF24' : isAtk ? '#F87171' : '#263449'}" stroke-width="${!isDh ? '2.4' : '1.4'}" class="${!isDh ? 'wire-flow' : ''}" marker-end="${isChat ? 'url(#maE)' : isFile ? 'url(#maA)' : isAtk ? 'url(#maR)' : ''}"/>
      <line x1="690" y1="278" x2="770" y2="278" stroke="${isFile ? '#34D399' : '#263449'}" stroke-width="${isFile ? '2.2' : '1.2'}" class="${isFile ? 'wire-flow' : ''}" marker-end="${isFile ? 'url(#maE)' : ''}"/>

      <!-- BOB BROWSER -->
      <rect x="776" y="32" width="268" height="354" rx="14" fill="#0F172A" stroke="${isAtk ? '#F87171' : '#10B981'}" stroke-width="1.8"/>
      <rect x="776" y="32" width="268" height="38" rx="14" fill="#064E3B"/>
      <rect x="776" y="54" width="268" height="16" fill="#064E3B"/>
      <text x="910" y="56" text-anchor="middle" fill="#ECFDF5" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700">Bob Browser (WebCrypto)</text>

      <rect x="790" y="84" width="240" height="54" rx="9" fill="#162136" stroke="${isDh ? '#34D399' : '#263449'}" stroke-width="${isDh ? '2.2' : '1'}" class="${isDh ? 'pulse-ring' : 'node-dim'}"/>
      <text x="910" y="105" text-anchor="middle" fill="#D1FAE5" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Verify Alice RSA-PSS + Subgroup</text>
      <text x="910" y="124" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">B = 2^b mod p · S = A^b mod p</text>

      <rect x="790" y="150" width="240" height="54" rx="9" fill="#162136" stroke="${!isDh ? (isAtk ? '#F87171' : '#34D399') : '#263449'}" stroke-width="${!isDh ? '2.2' : '1'}" class="${!isDh ? 'pulse-ring' : 'node-dim'}"/>
      <text x="910" y="171" text-anchor="middle" fill="${isAtk ? '#FCA5A5' : '#D1FAE5'}" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Constant-Time HMAC Check FIRST</text>
      <text x="910" y="190" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">${m.bSub}</text>

      <rect x="790" y="216" width="240" height="62" rx="9" fill="#162136" stroke="${isChat || isFile ? '#38BDF8' : '#263449'}" stroke-width="${isChat || isFile ? '2' : '1'}" class="${isChat || isFile ? '' : 'node-dim'}"/>
      <text x="910" y="238" text-anchor="middle" fill="#F8FAFC" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Decrypt &amp; Commit Ratchet</text>
      <text x="910" y="256" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">MAX_SKIP = 100 · Erase used MK</text>
      <text x="910" y="270" text-anchor="middle" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="9">Verify plaintext SHA-256 (files)</text>

      <rect x="790" y="294" width="240" height="78" rx="9" fill="#0B1320" stroke="#1E2E47"/>
      <text x="910" y="316" text-anchor="middle" fill="#38BDF8" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">VERIFIED OUTPUT</text>
      <text x="910" y="336" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.4">Authenticated Plaintext Chat</text>
      <text x="910" y="354" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.4">Verified Decrypted File Download</text>

      <!-- Moving Animated Packets on Wires -->
      ${packetPill(m.p1)}
      ${packetPill(m.p2)}
      ${packetPill(m.p3)}
      ${packetPill(m.p4)}
    </svg>`;

    return { svg, badge: m.badge, badgeCls: m.badgeCls, ticker: m.ticker };
  }

  /* =====================================================================
     2. ANIMATED 8-STAGE PROTOCOL SEQUENCE DIAGRAM (Protocol Tab)
     Synchronized 1-to-1 with activeStep (0..7)
     ===================================================================== */
  const SEQ_ROWS = [
    { y: 92,  from: 165, to: 510, color: '#818CF8', label: '01 · Register (PBKDF2 100k rounds + 16B salt)', pill: 'PBKDF2' },
    { y: 136, from: 165, to: 510, color: '#818CF8', label: '02 · Browser RSA-2048-PSS → Upload SPKI Public Key', pill: 'PUB_KEY' },
    { y: 180, from: 165, to: 510, color: '#818CF8', label: '03 · POST /api/dh/initiate (A = 2^a mod p, sig_a)', pill: 'A + sig_a' },
    { y: 226, from: 510, to: 855, color: '#FBBF24', label: '04 · Bob verifies sig_a & A^q==1 → POST signed B', pill: 'B + sig_b', rev: true },
    { y: 272, from: 510, to: 165, color: '#34D399', label: '05 · Alice verifies sig_b → S = B^a → HKDF(S, H(A:B))', pill: 'CK₀ Seed' },
    { y: 318, from: 165, to: 165, color: '#34D399', label: '06 · Ratchet Step: MK = HMAC(CK,1), CK\' = HMAC(CK,2)', pill: 'MK₁', local: 'alice' },
    { y: 364, from: 165, to: 510, color: '#38BDF8', label: '07 · AES-256-CBC + HMAC → Relay Replay Check (409)', pill: 'CT+IV+MAC' },
    { y: 410, from: 510, to: 855, color: '#34D399', label: '08 · Bob Verifies MAC First → Decrypt → Erase Key', pill: 'VERIFIED' },
  ];

  function renderAnimatedProtocolSequence(activeIdx = 0) {
    const rowsHtml = SEQ_ROWS.map((r, i) => {
      const active = i === activeIdx;
      const done = i < activeIdx;
      const op = active ? 1 : done ? 0.62 : 0.28;

      if (r.local === 'alice') {
        return `
          <g opacity="${op}">
            <rect x="40" y="${r.y - 16}" width="250" height="34" rx="8" fill="${active ? '#064E3B' : '#111C2E'}" stroke="${r.color}" stroke-width="${active ? '2.2' : '1.2'}" class="${active ? 'pulse-ring' : ''}"/>
            <text x="165" y="${r.y + 5}" text-anchor="middle" fill="#ECFDF5" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">${r.label}</text>
            ${active ? `<circle cx="54" cy="${r.y + 1}" r="5" fill="#34D399"><animate attributeName="r" values="4;7;4" dur="1.1s" repeatCount="indefinite"/></circle>` : ''}
          </g>
        `;
      }

      const x1 = r.from, x2 = r.to;
      const midX = (x1 + x2) / 2;
      const pathD = `M ${x1} ${r.y} L ${x2} ${r.y}`;
      const revPathD = `M ${x2} ${r.y} L ${x1} ${r.y}`;
      const dirArrow = x2 > x1 ? `M ${x2 - 8} ${r.y - 5} L ${x2} ${r.y} L ${x2 - 8} ${r.y + 5}` : `M ${x2 + 8} ${r.y - 5} L ${x2} ${r.y} L ${x2 + 8} ${r.y + 5}`;

      return `
        <g opacity="${op}">
          <line x1="${x1}" y1="${r.y}" x2="${x2}" y2="${r.y}" stroke="${r.color}" stroke-width="${active ? '2.8' : '1.6'}" class="${active ? 'wire-flow' : ''}"/>
          <path d="${dirArrow}" fill="none" stroke="${r.color}" stroke-width="${active ? '2.4' : '1.6'}" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="${midX}" y="${r.y - 10}" text-anchor="middle" fill="${active ? '#FFFFFF' : '#CBD5E1'}" font-family="JetBrains Mono, monospace" font-size="${active ? '10.6' : '9.8'}" font-weight="${active ? '700' : '500'}">${r.label}</text>
          ${active ? `
            <g>
              <rect x="-42" y="-11" width="84" height="22" rx="11" fill="#0B1320" stroke="${r.color}" stroke-width="1.8"/>
              <text x="0" y="3.5" text-anchor="middle" fill="${r.color}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">${r.pill}</text>
              <animateMotion dur="1.65s" repeatCount="indefinite" path="${r.rev ? revPathD : pathD}"/>
            </g>
          ` : ''}
        </g>
      `;
    }).join('');

    return `<svg viewBox="0 0 1020 455" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated 8-stage SecureMsg protocol sequence">
      <!-- Actor Boxes -->
      <rect x="65" y="14" width="200" height="40" rx="9" fill="#172554" stroke="#60A5FA" stroke-width="1.8"/>
      <text x="165" y="39" text-anchor="middle" fill="#EFF6FF" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700">Alice Browser</text>

      <rect x="410" y="14" width="200" height="40" rx="9" fill="#3B2305" stroke="#FBBF24" stroke-width="1.8"/>
      <text x="510" y="39" text-anchor="middle" fill="#FEF3C7" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700">Untrusted Flask Relay</text>

      <rect x="755" y="14" width="200" height="40" rx="9" fill="#064E3B" stroke="#34D399" stroke-width="1.8"/>
      <text x="855" y="39" text-anchor="middle" fill="#ECFDF5" font-family="Plus Jakarta Sans, sans-serif" font-size="13.5" font-weight="700">Bob Browser</text>

      <!-- Lifelines -->
      <line x1="165" y1="54" x2="165" y2="440" stroke="#263449" stroke-width="2" stroke-dasharray="5 5"/>
      <line x1="510" y1="54" x2="510" y2="440" stroke="#263449" stroke-width="2" stroke-dasharray="5 5"/>
      <line x1="855" y1="54" x2="855" y2="440" stroke="#263449" stroke-width="2" stroke-dasharray="5 5"/>

      ${rowsHtml}
    </svg>`;
  }

  /* =====================================================================
     3. INTERACTIVE ANIMATED SYMMETRIC HASH RATCHET (Protocol Tab)
     stepCount: 1..3, forgedMode: boolean
     ===================================================================== */
  function renderAnimatedRatchet(stepCount = 1, forgedMode = false) {
    const cks = [
      { id: 0, x: 224, label: 'CK₀', msg: 'Msg #1' },
      { id: 1, x: 438, label: 'CK₁', msg: 'Msg #2' },
      { id: 2, x: 652, label: 'CK₂', msg: 'Msg #3' },
    ];

    const nodes = cks.map((c, idx) => {
      const isCurrent = idx === stepCount - 1;
      const isErased = idx < stepCount - 1;
      const isFuture = idx > stepCount - 1;
      const stroke = isErased ? '#F87171' : isCurrent ? (forgedMode ? '#F87171' : '#34D399') : '#334155';
      const fill = isErased ? '#2A0B12' : isCurrent ? '#064E3B' : '#111C2E';
      const status = isErased ? 'ZEROED (0x00)' : isCurrent ? (forgedMode ? 'LOCKED · SAFE' : 'ACTIVE CHAIN') : 'PENDING';
      const mkStatus = isErased ? 'ERASED' : isCurrent ? (forgedMode ? 'MAC FAILED!' : '1-TIME → ERASED') : 'NOT DERIVED';

      return `
        <g opacity="${isFuture ? 0.35 : 1}">
          ${idx > 0 ? `
            <line x1="${cks[idx - 1].x + 148}" y1="62" x2="${c.x}" y2="62" stroke="${isFuture ? '#334155' : '#34D399'}" stroke-width="2.2" class="${isCurrent && !forgedMode ? 'wire-flow' : ''}"/>
            <text x="${(cks[idx - 1].x + 148 + c.x) / 2}" y="52" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">0x02</text>
            ${isCurrent && !forgedMode ? `<circle r="4.5" fill="#34D399"><animateMotion dur="1.2s" repeatCount="indefinite" path="M ${cks[idx - 1].x + 148} 62 L ${c.x} 62"/></circle>` : ''}
          ` : ''}

          <rect x="${c.x}" y="28" width="148" height="68" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="${isCurrent ? '2.4' : '1.4'}" class="${isCurrent ? 'pulse-ring' : ''}"/>
          <text x="${c.x + 74}" y="54" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700">${c.label}</text>
          <text x="${c.x + 74}" y="75" text-anchor="middle" fill="${isErased ? '#FCA5A5' : isCurrent ? '#6EE7B7' : '#94A3B8'}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">${status}</text>

          <!-- Down to MK -->
          <line x1="${c.x + 74}" y1="96" x2="${c.x + 74}" y2="140" stroke="${isCurrent ? (forgedMode ? '#F87171' : '#38BDF8') : '#334155'}" stroke-width="2" class="${isCurrent ? 'wire-flow' : ''}"/>
          <text x="${c.x + 102}" y="122" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">0x01</text>
          ${isCurrent ? `<circle r="4" fill="${forgedMode ? '#F87171' : '#38BDF8'}"><animateMotion dur="1.1s" repeatCount="indefinite" path="M ${c.x + 74} 96 L ${c.x + 74} 140"/></circle>` : ''}

          <rect x="${c.x}" y="144" width="148" height="46" rx="9" fill="${isErased || (isCurrent && forgedMode) ? '#2A0B12' : '#162136'}" stroke="${isErased || (isCurrent && forgedMode) ? '#F87171' : '#38BDF8'}"/>
          <text x="${c.x + 74}" y="164" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">MK_${idx + 1} (${c.msg})</text>
          <text x="${c.x + 74}" y="180" text-anchor="middle" fill="${isErased || (isCurrent && forgedMode) ? '#FCA5A5' : '#38BDF8'}" font-family="JetBrains Mono, monospace" font-size="9">${mkStatus}</text>

          <line x1="${c.x + 74}" y1="190" x2="${c.x + 74}" y2="216" stroke="${isCurrent && !forgedMode ? '#34D399' : '#334155'}" stroke-width="1.6"/>
          <rect x="${c.x - 4}" y="218" width="156" height="32" rx="7" fill="${isCurrent && !forgedMode ? '#083344' : '#0F172A'}" stroke="${isCurrent && !forgedMode ? '#38BDF8' : '#263449'}"/>
          <text x="${c.x + 74}" y="238" text-anchor="middle" fill="${isCurrent && !forgedMode ? '#67E8F9' : '#64748B'}" font-family="JetBrains Mono, monospace" font-size="9.6" font-weight="700">encKey_${idx + 1} + macKey_${idx + 1}</text>
        </g>
      `;
    }).join('');

    return `<svg viewBox="0 0 920 268" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interactive animated symmetric hash ratchet">
      <!-- Root DH Secret -->
      <rect x="14" y="28" width="154" height="68" rx="11" fill="#1E1B4B" stroke="#818CF8" stroke-width="1.8"/>
      <text x="91" y="53" text-anchor="middle" fill="#C7D2FE" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">DH SECRET (ZEROED)</text>
      <text x="91" y="75" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700">S = B^a mod p</text>

      <line x1="168" y1="62" x2="224" y2="62" stroke="#818CF8" stroke-width="2" class="wire-flow-slow"/>
      <text x="196" y="52" text-anchor="middle" fill="#C7D2FE" font-family="JetBrains Mono, monospace" font-size="9">HKDF</text>

      ${nodes}

      <!-- Right Status Panel -->
      <rect x="818" y="28" width="90" height="222" rx="10" fill="${forgedMode ? '#3B0A14' : '#0F172A'}" stroke="${forgedMode ? '#F87171' : '#34D399'}"/>
      <text x="863" y="105" text-anchor="middle" fill="${forgedMode ? '#FCA5A5' : '#34D399'}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${forgedMode ? 'FORGED' : 'FORWARD'}</text>
      <text x="863" y="125" text-anchor="middle" fill="${forgedMode ? '#FCA5A5' : '#34D399'}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">${forgedMode ? 'PACKET' : 'SECRECY'}</text>
      <text x="863" y="152" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.2">${forgedMode ? 'CK NOT' : 'Step #' + stepCount}</text>
      <text x="863" y="168" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.2">${forgedMode ? 'BURNED' : 'Active'}</text>
    </svg>`;
  }

  /* =====================================================================
     4. ANIMATED API-TO-SQLITE IMPLEMENTATION PIPELINE (Implementation Tab)
     Modes: 'dh_init' | 'msg_send' | 'msg_recv' | 'file_up'
     ===================================================================== */
  const IMPL_FLOWS = {
    dh_init: {
      route: 'POST /api/dh/initiate',
      browser: 'crypto_client.js: generateDH() + signText(RSA-PSS)',
      flask: 'routes/dh_routes.py: initiate_session()',
      crypto: 'crypto/dh.py + signatures.py: subgroup + sig_a',
      db: 'dh_sessions (INSERT pending)',
      color: '#818CF8',
      ticker: 'Browser generates 256-bit a, computes A = 2^a mod p, signs payload → dh_routes.py enforces RFC 3526 & RSA-PSS → writes public A + sig_a to dh_sessions.'
    },
    msg_send: {
      route: 'POST /api/messages/send',
      browser: 'crypto_client.js: kdfChain() → sealMessage(CBC+HMAC)',
      flask: 'routes/message_routes.py: send_message()',
      crypto: 'database.py: record_and_verify_replay() (HTTP 409)',
      db: 'processed_messages + messages (CT)',
      color: '#38BDF8',
      ticker: 'Browser ratchets MK, encrypts AES-256-CBC + HMAC-SHA256, zeroes keys → relay enforces cipher_mode=="cbc-hmac" and replay uniqueness → queues ciphertext.'
    },
    msg_recv: {
      route: 'GET /api/messages/receive/<peer>',
      browser: 'crypto_client.js: verifyAndDecrypt() (MAC FIRST)',
      flask: 'routes/message_routes.py: receive_messages()',
      crypto: 'WebCrypto HMAC verify → AES-CBC decrypt → zero MK',
      db: 'messages (SELECT unread → is_read=1)',
      color: '#34D399',
      ticker: 'Bob polls unread packets every 1s → derives candidate key (MAX_SKIP=100) → verifies HMAC in constant time BEFORE decryption → commits ratchet & erases MK.'
    },
    file_up: {
      route: 'POST /api/files/upload',
      browser: 'crypto_client.js: encryptFile() (256b key + AAD)',
      flask: 'routes/file_routes.py: upload_file() (≤10 MB)',
      crypto: 'Validate 32-hex ID, size cap (413), SHA-256 of blob',
      db: 'files table + uploads/<file_id>.bin',
      color: '#FBBF24',
      ticker: 'Browser seals IV || AES-CBC || HMAC blob → Flask validates hex ID & 10 MB limit → writes opaque .bin file to uploads/ and SHA-256 record to files table.'
    }
  };

  function renderAnimatedImplPipeline(key = 'dh_init') {
    const f = IMPL_FLOWS[key] || IMPL_FLOWS.dh_init;
    const svg = `<svg viewBox="0 0 980 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated code execution pipeline from browser to SQLite">
      <!-- 4 Stages -->
      <rect x="14" y="26" width="206" height="132" rx="12" fill="#0F172A" stroke="${f.color}" stroke-width="2" class="pulse-ring"/>
      <text x="117" y="52" text-anchor="middle" fill="${f.color}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">1 · BROWSER CLIENT</text>
      <text x="117" y="84" text-anchor="middle" fill="#FFFFFF" font-family="Plus Jakarta Sans, sans-serif" font-size="12.5" font-weight="700">WebCrypto Engine</text>
      <text x="117" y="112" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.4">${f.browser.slice(0, 32)}</text>
      <text x="117" y="130" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">${f.browser.slice(32)}</text>

      <line x1="220" y1="92" x2="264" y2="92" stroke="${f.color}" stroke-width="2.4" class="wire-flow"/>
      <circle r="5" fill="${f.color}"><animateMotion dur="1.2s" repeatCount="indefinite" path="M 220 92 L 264 92"/></circle>

      <rect x="266" y="26" width="206" height="132" rx="12" fill="#0F172A" stroke="${f.color}" stroke-width="1.8"/>
      <text x="369" y="52" text-anchor="middle" fill="${f.color}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">2 · FLASK BLUEPRINT</text>
      <text x="369" y="84" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="11.2" font-weight="700">${f.route}</text>
      <text x="369" y="114" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.3">${f.flask}</text>
      <text x="369" y="136" text-anchor="middle" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="9">app.py (11 MB limit)</text>

      <line x1="472" y1="92" x2="516" y2="92" stroke="${f.color}" stroke-width="2.4" class="wire-flow"/>
      <circle r="5" fill="${f.color}"><animateMotion dur="1.2s" begin="0.3s" repeatCount="indefinite" path="M 472 92 L 516 92"/></circle>

      <rect x="518" y="26" width="206" height="132" rx="12" fill="#0F172A" stroke="${f.color}" stroke-width="1.8"/>
      <text x="621" y="52" text-anchor="middle" fill="${f.color}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">3 · SECURITY GUARD</text>
      <text x="621" y="84" text-anchor="middle" fill="#FFFFFF" font-family="Plus Jakarta Sans, sans-serif" font-size="12.5" font-weight="700">Verification Layer</text>
      <text x="621" y="112" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.3">${f.crypto.slice(0, 32)}</text>
      <text x="621" y="130" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">${f.crypto.slice(32)}</text>

      <line x1="724" y1="92" x2="768" y2="92" stroke="${f.color}" stroke-width="2.4" class="wire-flow"/>
      <circle r="5" fill="${f.color}"><animateMotion dur="1.2s" begin="0.6s" repeatCount="indefinite" path="M 724 92 L 768 92"/></circle>

      <rect x="770" y="26" width="196" height="132" rx="12" fill="#162136" stroke="${f.color}" stroke-width="2"/>
      <text x="868" y="52" text-anchor="middle" fill="${f.color}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">4 · PERSISTENCE</text>
      <text x="868" y="84" text-anchor="middle" fill="#FFFFFF" font-family="Plus Jakarta Sans, sans-serif" font-size="12.5" font-weight="700">SQLite / Disk</text>
      <text x="868" y="114" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.6" font-weight="700">${f.db}</text>
      <text x="868" y="138" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">0 plaintext stored</text>
    </svg>`;
    return { svg, route: f.route, ticker: f.ticker };
  }

  /* =====================================================================
     5. STATIC REFERENCE DIAGRAMS (Trust Boundary & SQLite 5-Table ERD)
     ===================================================================== */
  const trustBoundary = {
    title: 'Trust Boundary & Zero-Knowledge Data Segregation Map',
    svg: `<svg viewBox="0 0 960 236" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trust boundary separating browser secrets from untrusted relay ciphertext">
      <rect x="14" y="14" width="430" height="208" rx="14" fill="#07221B" stroke="#34D399" stroke-width="1.8"/>
      <text x="229" y="40" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">TRUSTED ENDPOINT ZONE (USER BROWSER)</text>
      <rect x="32" y="58" width="190" height="68" rx="9" fill="#0F172A" stroke="#818CF8"/>
      <text x="127" y="80" text-anchor="middle" fill="#C7D2FE" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Long-Term Identity</text>
      <text x="127" y="100" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">RSA-2048 Private PEM</text>
      <rect x="236" y="58" width="190" height="68" rx="9" fill="#0F172A" stroke="#34D399"/>
      <text x="331" y="80" text-anchor="middle" fill="#6EE7B7" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Ephemeral RAM Keys</text>
      <text x="331" y="100" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">DH a/b · S · CK · 1-time MK</text>
      <rect x="32" y="140" width="394" height="64" rx="9" fill="#0F172A" stroke="#38BDF8"/>
      <text x="229" y="164" text-anchor="middle" fill="#67E8F9" font-family="Inter, sans-serif" font-size="11.8" font-weight="700">Plaintext Messages, File Names &amp; File Keys</text>
      <text x="229" y="186" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">Memory-only plainLog · Never transmitted unencrypted</text>

      <line x1="480" y1="12" x2="480" y2="224" stroke="#F87171" stroke-width="2.6" stroke-dasharray="7 5"/>
      <rect x="448" y="92" width="64" height="52" rx="9" fill="#450A0A" stroke="#F87171" stroke-width="1.6"/>
      <text x="480" y="114" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">E2EE</text>
      <text x="480" y="130" text-anchor="middle" fill="#F87171" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">WALL</text>

      <rect x="516" y="14" width="430" height="208" rx="14" fill="#1F1215" stroke="#F87171" stroke-width="1.8"/>
      <text x="731" y="40" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">UNTRUSTED NETWORK &amp; RELAY ZONE</text>
      <rect x="534" y="58" width="190" height="68" rx="9" fill="#0F172A" stroke="#FBBF24"/>
      <text x="629" y="80" text-anchor="middle" fill="#FDE68A" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Public Directory</text>
      <text x="629" y="100" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">PBKDF2 + Signed A/B</text>
      <rect x="738" y="58" width="190" height="68" rx="9" fill="#0F172A" stroke="#38BDF8"/>
      <text x="833" y="80" text-anchor="middle" fill="#67E8F9" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Opaque Ciphertext</text>
      <text x="833" y="100" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">CT · 16B IV · 32B MAC</text>
      <rect x="534" y="140" width="394" height="64" rx="9" fill="#0F172A" stroke="#F87171"/>
      <text x="731" y="164" text-anchor="middle" fill="#FCA5A5" font-family="Inter, sans-serif" font-size="11.8" font-weight="700">Full DB Compromise Exposes 0 Bytes of Plaintext</text>
      <text x="731" y="186" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">Metadata only: sender, receiver, timestamps, blob sizes</text>
    </svg>`
  };

  const dbSchemaErd = {
    title: 'SQLite3 Zero-Plaintext Schema (5 Tables) & Wire Formats',
    svg: `<svg viewBox="0 0 980 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Five SQLite tables and binary message and file wire formats">
      <rect x="10" y="12" width="182" height="128" rx="9" fill="#0F172A" stroke="#818CF8"/>
      <rect x="10" y="12" width="182" height="28" rx="9" fill="#1E1B4B"/><rect x="10" y="28" width="182" height="12" fill="#1E1B4B"/>
      <text x="101" y="31" text-anchor="middle" fill="#E0E7FF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">users</text>
      <text x="22" y="60" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">id (PK) · username</text>
      <text x="22" y="78" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">password_hash (32B)</text>
      <text x="22" y="96" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">salt (16B hex)</text>
      <text x="22" y="114" fill="#818CF8" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">public_identity_key</text>

      <rect x="204" y="12" width="182" height="128" rx="9" fill="#0F172A" stroke="#38BDF8"/>
      <rect x="204" y="12" width="182" height="28" rx="9" fill="#172554"/><rect x="204" y="28" width="182" height="12" fill="#172554"/>
      <text x="295" y="31" text-anchor="middle" fill="#DBEAFE" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">dh_sessions</text>
      <text x="216" y="60" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">session_id (PK)</text>
      <text x="216" y="78" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">user1, user2, dh_p, g</text>
      <text x="216" y="96" fill="#38BDF8" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">pub_a, pub_b, sig_a/b</text>
      <text x="216" y="114" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">status (established)</text>

      <rect x="398" y="12" width="184" height="128" rx="9" fill="#0F172A" stroke="#34D399"/>
      <rect x="398" y="12" width="184" height="28" rx="9" fill="#064E3B"/><rect x="398" y="28" width="184" height="12" fill="#064E3B"/>
      <text x="490" y="31" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">messages</text>
      <text x="410" y="60" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">message_id (UNIQUE)</text>
      <text x="410" y="78" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">sender, receiver, seq</text>
      <text x="410" y="96" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">ciphertext, iv, hmac</text>
      <text x="410" y="114" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">cipher_mode='cbc-hmac'</text>

      <rect x="594" y="12" width="182" height="128" rx="9" fill="#0F172A" stroke="#F87171"/>
      <rect x="594" y="12" width="182" height="28" rx="9" fill="#450A0A"/><rect x="594" y="28" width="182" height="12" fill="#450A0A"/>
      <text x="685" y="31" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="10.8" font-weight="700">processed_messages</text>
      <text x="606" y="60" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">message_id (PK)</text>
      <text x="606" y="78" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">sender, receiver, seq</text>
      <text x="606" y="102" fill="#F87171" font-family="Inter, sans-serif" font-size="9.8">Duplicate ID → HTTP 409</text>

      <rect x="788" y="12" width="182" height="128" rx="9" fill="#0F172A" stroke="#FBBF24"/>
      <rect x="788" y="12" width="182" height="28" rx="9" fill="#3B2305"/><rect x="788" y="28" width="182" height="12" fill="#3B2305"/>
      <text x="879" y="31" text-anchor="middle" fill="#FEF3C7" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">files</text>
      <text x="800" y="60" fill="#FDE68A" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">file_id (32 hex PK)</text>
      <text x="800" y="78" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">uploader, recipient</text>
      <text x="800" y="96" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.8">size, sha256 (blob)</text>
      <text x="800" y="114" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="9.5">uploads/&lt;id&gt;.bin</text>

      <rect x="10" y="156" width="474" height="82" rx="10" fill="#111C2E" stroke="#38BDF8"/>
      <text x="26" y="178" fill="#38BDF8" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">CHAT CANONICAL HMAC-SHA256 INPUT</text>
      <text x="26" y="200" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="10">iv_hex : ciphertext_hex : timestamp : seq_no : context</text>
      <text x="26" y="220" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">context = session_id|sender|receiver|message_id|cbc-hmac</text>

      <rect x="498" y="156" width="472" height="82" rx="10" fill="#111C2E" stroke="#FBBF24"/>
      <text x="514" y="178" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">ENCRYPTED FILE BLOB LAYOUT (≤ 10 MB)</text>
      <rect x="514" y="190" width="80" height="32" rx="6" fill="#1E293B" stroke="#94A3B8"/>
      <text x="554" y="210" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="9.8">IV (16 B)</text>
      <rect x="602" y="190" width="218" height="32" rx="6" fill="#172554" stroke="#60A5FA"/>
      <text x="711" y="210" text-anchor="middle" fill="#DBEAFE" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">AES-256-CBC (PKCS#7)</text>
      <rect x="828" y="190" width="126" height="32" rx="6" fill="#064E3B" stroke="#34D399"/>
      <text x="891" y="210" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">HMAC-SHA256 (32B)</text>
    </svg>`
  };

  /* =====================================================================
     6. DEMO TAB: STEP-BY-STEP LIVE EXECUTION STAGE (Alice <-> Relay <-> Bob)
     frame: { phase, aliceSub, relaySub, bobSub, pillLabel, pillColor,
              wireDir ('a2r'|'r2b'|'b2r'|'r2a'|'none'), alertNode,
              stepNum, totalSteps, badge, badgeCls, caption, tamperMid }
     ===================================================================== */
  function escSvg(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderDemoLiveStage(frame = {}) {
    const f = {
      aliceTitle: frame.aliceTitle || 'Alice Browser',
      aliceSub: frame.aliceSub || 'Waiting for RSA-2048 & DH',
      aliceState: frame.aliceState || 'idle', // idle | active | ok | err
      relayTitle: frame.relayTitle || 'Untrusted Relay',
      relaySub: frame.relaySub || '0 Plaintext · 0 Private Keys',
      relayState: frame.relayState || 'idle',
      bobTitle: frame.bobTitle || 'Bob Browser',
      bobSub: frame.bobSub || 'Waiting for signed handshake',
      bobState: frame.bobState || 'idle',
      wireDir: frame.wireDir || 'none', // a2r | r2b | b2r | r2a | both_in | replay_bounce | none
      pillLabel: frame.pillLabel || '',
      pillColor: frame.pillColor || '#38BDF8',
      tamperMid: !!frame.tamperMid,
      stepNum: frame.stepNum || 0,
      totalSteps: frame.totalSteps || 0
    };

    const borderFor = (st, def) =>
      st === 'active' ? '#60A5FA' : st === 'ok' ? '#34D399' : st === 'err' ? '#F87171' : st === 'warn' ? '#FBBF24' : def;
    const clsFor = (st) => (st === 'active' || st === 'err' ? 'pulse-ring' : '');

    let packetSvg = '';
    if (f.wireDir === 'a2r') {
      packetSvg = `<g><rect x="-54" y="-13" width="108" height="26" rx="13" fill="#0B1320" stroke="${f.pillColor}" stroke-width="2"/><text x="0" y="4" text-anchor="middle" fill="${f.pillColor}" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">${escSvg(f.pillLabel)}</text><animateMotion dur="0.9s" repeatCount="indefinite" path="M 278 104 L 382 104"/></g>`;
    } else if (f.wireDir === 'r2b') {
      packetSvg = `<g><rect x="-54" y="-13" width="108" height="26" rx="13" fill="#0B1320" stroke="${f.pillColor}" stroke-width="2"/><text x="0" y="4" text-anchor="middle" fill="${f.pillColor}" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">${escSvg(f.pillLabel)}</text><animateMotion dur="0.9s" repeatCount="indefinite" path="M 608 104 L 712 104"/></g>`;
    } else if (f.wireDir === 'b2r') {
      packetSvg = `<g><rect x="-54" y="-13" width="108" height="26" rx="13" fill="#0B1320" stroke="${f.pillColor}" stroke-width="2"/><text x="0" y="4" text-anchor="middle" fill="${f.pillColor}" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">${escSvg(f.pillLabel)}</text><animateMotion dur="0.9s" repeatCount="indefinite" path="M 712 104 L 608 104"/></g>`;
    } else if (f.wireDir === 'r2a') {
      packetSvg = `<g><rect x="-54" y="-13" width="108" height="26" rx="13" fill="#0B1320" stroke="${f.pillColor}" stroke-width="2"/><text x="0" y="4" text-anchor="middle" fill="${f.pillColor}" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">${escSvg(f.pillLabel)}</text><animateMotion dur="0.9s" repeatCount="indefinite" path="M 382 104 L 278 104"/></g>`;
    } else if (f.wireDir === 'replay_bounce') {
      packetSvg = `<g><rect x="-52" y="-13" width="104" height="26" rx="13" fill="#2A0B12" stroke="#F87171" stroke-width="2"/><text x="0" y="4" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.6" font-weight="700">${escSvg(f.pillLabel)}</text><animateMotion dur="1.0s" repeatCount="indefinite" path="M 278 104 L 382 104 L 278 104"/></g>`;
    }

    const leftActive = f.wireDir === 'a2r' || f.wireDir === 'r2a' || f.wireDir === 'replay_bounce';
    const rightActive = f.wireDir === 'r2b' || f.wireDir === 'b2r';
    const leftCol = leftActive ? f.pillColor : '#263449';
    const rightCol = rightActive ? f.pillColor : '#263449';

    // Step progress dots at top
    let dotsSvg = '';
    if (f.totalSteps > 0) {
      const startX = 495 - ((f.totalSteps - 1) * 34) / 2;
      for (let i = 1; i <= f.totalSteps; i++) {
        const cx = startX + (i - 1) * 34;
        const done = i < f.stepNum;
        const cur = i === f.stepNum;
        dotsSvg += `<circle cx="${cx}" cy="20" r="${cur ? 6 : 4.5}" fill="${cur ? f.pillColor : done ? '#34D399' : '#263449'}"/>`;
        if (i < f.totalSteps) {
          dotsSvg += `<line x1="${cx + 7}" y1="20" x2="${cx + 27}" y2="20" stroke="${done ? '#34D399' : '#263449'}" stroke-width="2"/>`;
        }
      }
    }

    return `<svg viewBox="0 0 990 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Live WebCrypto step-by-step execution visualizer">
      ${dotsSvg}

      <!-- Alice Node -->
      <rect x="18" y="42" width="256" height="128" rx="12" fill="#0F172A" stroke="${borderFor(f.aliceState, '#334155')}" stroke-width="${f.aliceState !== 'idle' ? '2.4' : '1.4'}" class="${clsFor(f.aliceState)}"/>
      <rect x="18" y="42" width="256" height="34" rx="12" fill="#172554"/><rect x="18" y="62" width="256" height="14" fill="#172554"/>
      <text x="146" y="64" text-anchor="middle" fill="#EFF6FF" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="700">${escSvg(f.aliceTitle)}</text>
      <text x="146" y="106" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="600">${escSvg(f.aliceSub.slice(0, 34))}</text>
      <text x="146" y="126" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">${escSvg(f.aliceSub.slice(34, 72))}</text>
      <text x="146" y="152" text-anchor="middle" fill="${f.aliceState === 'ok' ? '#34D399' : f.aliceState === 'active' ? '#60A5FA' : '#64748B'}" font-family="JetBrains Mono, monospace" font-size="9.2" font-weight="700">${f.aliceState === 'ok' ? '● READY / SEALED' : f.aliceState === 'active' ? '● COMPUTING...' : '○ IDLE'}</text>

      <!-- Left Wire -->
      <line x1="274" y1="104" x2="386" y2="104" stroke="${leftCol}" stroke-width="${leftActive ? '2.8' : '1.6'}" class="${leftActive ? (f.wireDir === 'r2a' ? 'wire-flow-rev' : 'wire-flow') : ''}"/>
      ${f.tamperMid ? `
        <rect x="292" y="126" width="76" height="24" rx="6" fill="#450A0A" stroke="#F87171"/>
        <text x="330" y="142" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700">⚡ BIT FLIP!</text>
      ` : ''}

      <!-- Relay Node -->
      <rect x="386" y="42" width="218" height="128" rx="12" fill="#111827" stroke="${borderFor(f.relayState, '#334155')}" stroke-width="${f.relayState !== 'idle' ? '2.4' : '1.4'}" class="${clsFor(f.relayState)}"/>
      <rect x="386" y="42" width="218" height="34" rx="12" fill="${f.relayState === 'err' ? '#450A0A' : '#3B2305'}"/><rect x="386" y="62" width="218" height="14" fill="${f.relayState === 'err' ? '#450A0A' : '#3B2305'}"/>
      <text x="495" y="64" text-anchor="middle" fill="${f.relayState === 'err' ? '#FECACA' : '#FEF3C7'}" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="700">${escSvg(f.relayTitle)}</text>
      <text x="495" y="106" text-anchor="middle" fill="${f.relayState === 'err' ? '#FCA5A5' : '#FDE68A'}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">${escSvg(f.relaySub.slice(0, 30))}</text>
      <text x="495" y="126" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.2">${escSvg(f.relaySub.slice(30, 64))}</text>
      <text x="495" y="152" text-anchor="middle" fill="${f.relayState === 'err' ? '#F87171' : '#FBBF24'}" font-family="JetBrains Mono, monospace" font-size="9.2" font-weight="700">${f.relayState === 'err' ? '✕ REJECTED (HTTP 409)' : 'ZERO-KNOWLEDGE'}</text>

      <!-- Right Wire -->
      <line x1="604" y1="104" x2="716" y2="104" stroke="${rightCol}" stroke-width="${rightActive ? '2.8' : '1.6'}" class="${rightActive ? (f.wireDir === 'b2r' ? 'wire-flow-rev' : 'wire-flow') : ''}"/>

      <!-- Bob Node -->
      <rect x="716" y="42" width="256" height="128" rx="12" fill="#0F172A" stroke="${borderFor(f.bobState, '#334155')}" stroke-width="${f.bobState !== 'idle' ? '2.4' : '1.4'}" class="${clsFor(f.bobState)}"/>
      <rect x="716" y="42" width="256" height="34" rx="12" fill="${f.bobState === 'err' ? '#450A0A' : '#064E3B'}"/><rect x="716" y="62" width="256" height="14" fill="${f.bobState === 'err' ? '#450A0A' : '#064E3B'}"/>
      <text x="844" y="64" text-anchor="middle" fill="${f.bobState === 'err' ? '#FECACA' : '#ECFDF5'}" font-family="Plus Jakarta Sans, sans-serif" font-size="13" font-weight="700">${escSvg(f.bobTitle)}</text>
      <text x="844" y="106" text-anchor="middle" fill="${f.bobState === 'err' ? '#FCA5A5' : '#F8FAFC'}" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="600">${escSvg(f.bobSub.slice(0, 34))}</text>
      <text x="844" y="126" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">${escSvg(f.bobSub.slice(34, 72))}</text>
      <text x="844" y="152" text-anchor="middle" fill="${f.bobState === 'ok' ? '#34D399' : f.bobState === 'err' ? '#F87171' : f.bobState === 'active' ? '#60A5FA' : '#64748B'}" font-family="JetBrains Mono, monospace" font-size="9.2" font-weight="700">${f.bobState === 'ok' ? '✓ VERIFIED &amp; DECRYPTED' : f.bobState === 'err' ? '✕ DROPPED · CK SAFE' : f.bobState === 'active' ? '● VERIFYING...' : '○ IDLE'}</text>

      ${packetSvg}
    </svg>`;
  }

  /* =====================================================================
     7. DEMO TAB PART 2: LIVE ANIMATED 5-ATTACK DEFENSE VISUALIZER
     kind: 'eavesdrop' | 'tamper' | 'replay' | 'mitm' | 'padding'
     phase: 'idle' | 'running' | 'done'
     ===================================================================== */
  function renderAttackStage(kind = 'eavesdrop', phase = 'idle', meta = {}) {
    const running = phase === 'running';
    const done = phase === 'done';
    const msg = escSvg((meta.msg || 'Vault code 4821').slice(0, 22));

    if (kind === 'eavesdrop') {
      return `<svg viewBox="0 0 960 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Eavesdropping HTTP versus E2EE animation">
        <!-- Row 1: Vulnerable Plain HTTP -->
        <rect x="14" y="16" width="170" height="68" rx="10" fill="#1F1215" stroke="#F87171"/>
        <text x="99" y="44" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">PLAIN HTTP</text>
        <text x="99" y="65" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="9.5">"${msg}"</text>
        <line x1="184" y1="50" x2="774" y2="50" stroke="#F87171" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
        <rect x="380" y="24" width="200" height="52" rx="9" fill="#450A0A" stroke="#F87171" class="${running ? 'pulse-ring' : ''}"/>
        <text x="480" y="46" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">SNIFFER SEES PLAINTEXT</text>
        <text x="480" y="64" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.2">${done ? 'EXPOSED: "' + msg + '"' : 'Wireshark capture...'}</text>
        ${running || done ? `<g><rect x="-48" y="-11" width="96" height="22" rx="11" fill="#450A0A" stroke="#F87171"/><text x="0" y="4" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="9">PLAINTEXT</text><animateMotion dur="2.1s" repeatCount="indefinite" path="M 190 50 L 765 50"/></g>` : ''}
        <rect x="774" y="16" width="172" height="68" rx="10" fill="#1F1215" stroke="#F87171"/>
        <text x="860" y="55" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">COMPROMISED ✕</text>

        <!-- Row 2: SecureMsg E2EE -->
        <rect x="14" y="106" width="170" height="68" rx="10" fill="#07221B" stroke="#34D399"/>
        <text x="99" y="134" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">SECUREMSG E2EE</text>
        <text x="99" y="155" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">AES-256-CBC + IV</text>
        <line x1="184" y1="140" x2="774" y2="140" stroke="#34D399" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
        <rect x="380" y="114" width="200" height="52" rx="9" fill="#0F172A" stroke="#34D399"/>
        <text x="480" y="136" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">SNIFFER SEES HEX ONLY</text>
        <text x="480" y="154" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.2">7d93a1f84c20b6e4...</text>
        ${running || done ? `<g><rect x="-50" y="-11" width="100" height="22" rx="11" fill="#064E3B" stroke="#34D399"/><text x="0" y="4" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="9">0x7d93a1...</text><animateMotion dur="2.1s" repeatCount="indefinite" path="M 190 140 L 765 140"/></g>` : ''}
        <rect x="774" y="106" width="172" height="68" rx="10" fill="#064E3B" stroke="#34D399"/>
        <text x="860" y="145" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">DEFENDED · 0B LEAK</text>
      </svg>`;
    }

    if (kind === 'tamper') {
      return `<svg viewBox="0 0 960 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Message tampering bit flip intercepted by HMAC">
        <rect x="16" y="34" width="190" height="102" rx="11" fill="#0F172A" stroke="#38BDF8" stroke-width="1.8"/>
        <text x="111" y="68" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">1. ALICE SEALS</text>
        <text x="111" y="94" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="9.5">AES-CBC + HMAC Tag</text>
        <text x="111" y="114" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.2">Authentic Tag ✓</text>

        <line x1="206" y1="85" x2="354" y2="85" stroke="#38BDF8" stroke-width="2.4" class="${running || done ? 'wire-flow' : ''}"/>
        ${running || done ? `<g><rect x="-36" y="-11" width="72" height="22" rx="11" fill="#083344" stroke="#38BDF8"/><text x="0" y="4" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="9">CT + MAC</text><animateMotion dur="1.3s" repeatCount="indefinite" path="M 212 85 L 348 85"/></g>` : ''}

        <rect x="354" y="34" width="212" height="102" rx="11" fill="#450A0A" stroke="#F87171" stroke-width="2" class="${running ? 'pulse-ring' : ''}"/>
        <text x="460" y="66" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">2. ATTACKER FLIPS BIT</text>
        <text x="460" y="94" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10">ct[0]: 1a3f... → 2a3f...</text>
        <text x="460" y="114" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">Old HMAC tag kept</text>

        <line x1="566" y1="85" x2="714" y2="85" stroke="#F87171" stroke-width="2.4" class="${running || done ? 'wire-flow' : ''}"/>
        ${running || done ? `<g><rect x="-42" y="-11" width="84" height="22" rx="11" fill="#450A0A" stroke="#F87171"/><text x="0" y="4" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9">TAMPERED!</text><animateMotion dur="1.3s" repeatCount="indefinite" path="M 572 85 L 708 85"/></g>` : ''}

        <rect x="714" y="34" width="230" height="102" rx="11" fill="#064E3B" stroke="#34D399" stroke-width="2" class="${done ? 'pulse-ring' : ''}"/>
        <text x="829" y="66" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">3. BOB HMAC GATE</text>
        <text x="829" y="94" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">${done ? 'TAG MISMATCH → DROPPED' : 'Constant-Time Verify'}</text>
        <text x="829" y="114" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9.2">Never reaches AES Decrypt</text>
      </svg>`;
    }

    if (kind === 'replay') {
      return `<svg viewBox="0 0 960 185" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Replay attack blocked by relay HTTP 409 and ratchet">
        <rect x="16" y="18" width="200" height="62" rx="10" fill="#07221B" stroke="#34D399"/>
        <text x="116" y="44" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">TX #1 (LEGITIMATE)</text>
        <text x="116" y="64" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">id=msg-tx-.. seq=#104</text>
        <line x1="216" y1="49" x2="720" y2="49" stroke="#34D399" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
        ${running || done ? `<g><rect x="-42" y="-10" width="84" height="20" rx="10" fill="#064E3B" stroke="#34D399"/><text x="0" y="3.5" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="9">FRESH #104</text><animateMotion dur="1.8s" repeatCount="indefinite" path="M 222 49 L 714 49"/></g>` : ''}
        <rect x="720" y="18" width="224" height="62" rx="10" fill="#064E3B" stroke="#34D399"/>
        <text x="832" y="44" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">ACCEPTED (HTTP 201)</text>
        <text x="832" y="64" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9.2">ID recorded · Key #104 erased</text>

        <rect x="16" y="106" width="200" height="62" rx="10" fill="#450A0A" stroke="#F87171"/>
        <text x="116" y="132" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">TX #2 (REPLAYED)</text>
        <text x="116" y="152" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.5">Exact clone of #104</text>
        <line x1="216" y1="137" x2="450" y2="137" stroke="#F87171" stroke-width="2.4" class="${running || done ? 'wire-flow' : ''}"/>
        ${running || done ? `<g><rect x="-44" y="-10" width="88" height="20" rx="10" fill="#450A0A" stroke="#F87171"/><text x="0" y="3.5" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="9">REPLAY #104</text><animateMotion dur="1.4s" repeatCount="indefinite" path="M 222 137 L 444 137 L 222 137"/></g>` : ''}
        <rect x="450" y="106" width="248" height="62" rx="10" fill="#450A0A" stroke="#F87171" stroke-width="2" class="${done ? 'pulse-ring' : ''}"/>
        <text x="574" y="132" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">RELAY BLOCKS (HTTP 409)</text>
        <text x="574" y="152" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.2">processed_messages duplicate</text>
        <rect x="720" y="106" width="224" height="62" rx="10" fill="#111C2E" stroke="#34D399"/>
        <text x="832" y="134" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">BOB PROTECTED</text>
        <text x="832" y="152" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">Ratchet also rejects #104</text>
      </svg>`;
    }

    if (kind === 'mitm') {
      return `<svg viewBox="0 0 960 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MITM on unauthenticated DH versus RSA-PSS signed DH">
        <!-- Top: Unauthenticated DH -->
        <rect x="16" y="16" width="180" height="68" rx="10" fill="#1F1215" stroke="#F87171"/>
        <text x="106" y="44" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">PLAIN DH (NO SIG)</text>
        <text x="106" y="64" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">Alice sends A</text>
        <line x1="196" y1="50" x2="764" y2="50" stroke="#F87171" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
        <rect x="366" y="22" width="228" height="56" rx="10" fill="#450A0A" stroke="#F87171"/>
        <text x="480" y="46" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">EVE SWAPS A → E_A</text>
        <text x="480" y="65" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.2">Eve splits secrets · MITM OK!</text>
        <rect x="764" y="16" width="180" height="68" rx="10" fill="#1F1215" stroke="#F87171"/>
        <text x="854" y="54" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">COMPROMISED ✕</text>

        <!-- Bottom: Signed DH -->
        <rect x="16" y="106" width="180" height="68" rx="10" fill="#1E1B4B" stroke="#818CF8"/>
        <text x="106" y="134" text-anchor="middle" fill="#E0E7FF" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">RSA-PSS SIGNED DH</text>
        <text x="106" y="154" text-anchor="middle" fill="#C7D2FE" font-family="JetBrains Mono, monospace" font-size="9.5">A + RSA-PSS(A)</text>
        <line x1="196" y1="140" x2="764" y2="140" stroke="#818CF8" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
        ${running || done ? `<g><rect x="-46" y="-11" width="92" height="22" rx="11" fill="#450A0A" stroke="#F87171"/><text x="0" y="4" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="9">E_A + sig_a</text><animateMotion dur="1.7s" repeatCount="indefinite" path="M 594 140 L 758 140"/></g>` : ''}
        <rect x="366" y="112" width="228" height="56" rx="10" fill="#182235" stroke="#F87171"/>
        <text x="480" y="136" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">EVE SUBSTITUTES E_A</text>
        <text x="480" y="155" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.2">Cannot forge Alice privKey</text>
        <rect x="764" y="106" width="180" height="68" rx="10" fill="#064E3B" stroke="#34D399" stroke-width="2" class="${done ? 'pulse-ring' : ''}"/>
        <text x="854" y="135" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">SIGNATURE_INVALID</text>
        <text x="854" y="154" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9.2">MITM ABORTED ✓</text>
      </svg>`;
    }

    // Default / padding oracle
    const queries = meta.queries || (done ? '~2,000' : '0');
    const recovered = escSvg(meta.recovered || (done ? msg : 'Probing bytes 15..0...'));
    return `<svg viewBox="0 0 960 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vaudenay CBC padding oracle attack versus Encrypt-then-MAC">
      <!-- Left: Vulnerable Plain CBC -->
      <rect x="14" y="14" width="452" height="162" rx="12" fill="#1F1215" stroke="#F87171" stroke-width="1.8" class="${running ? 'pulse-ring' : ''}"/>
      <text x="240" y="40" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">VULNERABLE: UNAUTHENTICATED AES-CBC</text>
      <rect x="34" y="56" width="160" height="44" rx="8" fill="#450A0A" stroke="#F87171"/>
      <text x="114" y="75" text-anchor="middle" fill="#FECACA" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">FORGED IV PROBES</text>
      <text x="114" y="91" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9">Queries: ${escSvg(queries)}</text>
      <line x1="194" y1="78" x2="280" y2="78" stroke="#F87171" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
      ${running ? `<circle r="4.5" fill="#F87171"><animateMotion dur="0.6s" repeatCount="indefinite" path="M 196 78 L 278 78 L 196 78"/></circle>` : ''}
      <rect x="282" y="56" width="164" height="44" rx="8" fill="#0F172A" stroke="#F87171"/>
      <text x="364" y="75" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">PADDING ORACLE</text>
      <text x="364" y="91" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">Leaks True / False</text>
      <rect x="34" y="114" width="412" height="46" rx="8" fill="#0B1320" stroke="#F87171"/>
      <text x="240" y="133" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.5">CRACKED WITHOUT AES KEY:</text>
      <text x="240" y="150" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">${done ? '"' + recovered + '"' : (running ? 'Recovering plaintext byte-by-byte...' : 'Click Execute to run live attack')}</text>

      <!-- Right: SecureMsg Encrypt-then-MAC -->
      <rect x="494" y="14" width="452" height="162" rx="12" fill="#07221B" stroke="#34D399" stroke-width="1.8" class="${done ? 'pulse-ring' : ''}"/>
      <text x="720" y="40" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">SECUREMSG: ENCRYPT-THEN-MAC (CBC + HMAC)</text>
      <rect x="514" y="56" width="150" height="44" rx="8" fill="#182235" stroke="#F87171"/>
      <text x="589" y="75" text-anchor="middle" fill="#FCA5A5" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">256 FORGED PROBES</text>
      <text x="589" y="91" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9">Reused invalid tag</text>
      <line x1="664" y1="78" x2="736" y2="78" stroke="#34D399" stroke-width="2.2" class="${running || done ? 'wire-flow' : ''}"/>
      <rect x="738" y="56" width="188" height="44" rx="8" fill="#064E3B" stroke="#34D399"/>
      <text x="832" y="75" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">HMAC CHECK FIRST</text>
      <text x="832" y="91" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9">Blocks BEFORE unpad</text>
      <rect x="514" y="114" width="412" height="46" rx="8" fill="#0B1320" stroke="#34D399"/>
      <text x="720" y="133" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9.5">RESULT:</text>
      <text x="720" y="150" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">${done ? 'DEFEATED · 0 BITS LEAKED · ABORTED AT 256 PROBES' : 'All forged queries return identical rejection'}</text>
    </svg>`;
  }

  return {
    renderAnimatedArch,
    renderAnimatedProtocolSequence,
    renderAnimatedRatchet,
    renderAnimatedImplPipeline,
    renderDemoLiveStage,
    renderAttackStage,
    trustBoundary,
    dbSchemaErd,
    ARCH_MODES,
    IMPL_FLOWS
  };
})();
