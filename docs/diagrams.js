/**
 * SecureMsg CNS Portfolio — High-Resolution Color-Coded SVG Diagrams
 * Semantic palette:
 *   Violet (#A78BFA): Asymmetric Key Agreement & Identity (DH-2048, RSA-PSS, HKDF)
 *   Cyan   (#22D3EE): Symmetric Cipher & Encrypted Blobs (AES-256-CBC, TLS)
 *   Emerald(#34D399): Verified Integrity & Forward Secrecy (HMAC, Ratchet)
 *   Amber  (#FBBF24): Forensic Evidence, SQLite Schema & Wire Formats
 *   Rose   (#FB7185): Zero-Knowledge Prohibitions & Blocked Attacks
 */

window.PORTFOLIO_DIAGRAMS = {
  arch5Tier: {
    title: '5-Tier Zero-Knowledge Hybrid E2EE System Architecture',
    svg: `<svg viewBox="0 0 1060 410" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Five-tier SecureMsg system architecture">
      <defs>
        <marker id="arrC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L10 5 L0 9 Z" fill="#22D3EE"/>
        </marker>
        <marker id="arrE" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L10 5 L0 9 Z" fill="#34D399"/>
        </marker>
        <marker id="arrV" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L10 5 L0 9 Z" fill="#A78BFA"/>
        </marker>
        <marker id="arrA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L10 5 L0 9 Z" fill="#FBBF24"/>
        </marker>
      </defs>

      <!-- Tier Labels -->
      <text x="148" y="22" text-anchor="middle" fill="#A78BFA" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">TIER 1 · ALICE BROWSER</text>
      <text x="530" y="22" text-anchor="middle" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">TIER 2 &amp; 3 · UNTRUSTED RELAY &amp; STORAGE</text>
      <text x="912" y="22" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">TIER 1 · BOB BROWSER</text>

      <!-- ALICE BROWSER -->
      <rect x="14" y="34" width="268" height="360" rx="14" fill="#0D162B" stroke="#A78BFA" stroke-width="2"/>
      <rect x="14" y="34" width="268" height="38" rx="14" fill="#2E1065"/>
      <rect x="14" y="56" width="268" height="16" fill="#2E1065"/>
      <text x="148" y="58" text-anchor="middle" fill="#EDE9FE" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">Alice WebCrypto Client</text>

      <rect x="28" y="84" width="240" height="52" rx="9" fill="#131F3A" stroke="#7C3AED"/>
      <text x="148" y="104" text-anchor="middle" fill="#C4B5FD" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">RSA-2048-PSS Identity Keypair</text>
      <text x="148" y="122" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">Private key: localStorage only</text>

      <rect x="28" y="146" width="240" height="54" rx="9" fill="#131F3A" stroke="#7C3AED"/>
      <text x="148" y="166" text-anchor="middle" fill="#C4B5FD" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Signed DH (RFC 3526 MODP-2048)</text>
      <text x="148" y="184" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">A = 2^a mod p · sig_a = Sign(A)</text>

      <rect x="28" y="210" width="240" height="54" rx="9" fill="#131F3A" stroke="#10B981"/>
      <text x="148" y="230" text-anchor="middle" fill="#6EE7B7" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">HKDF + Symmetric Hash Ratchet</text>
      <text x="148" y="248" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">MK=HMAC(CK,1) · CK'=HMAC(CK,2)</text>

      <rect x="28" y="274" width="240" height="54" rx="9" fill="#131F3A" stroke="#06B6D4"/>
      <text x="148" y="294" text-anchor="middle" fill="#67E8F9" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">AES-256-CBC + HMAC-SHA256</text>
      <text x="148" y="312" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">Encrypt-then-MAC · 10 MB E2EE Files</text>

      <rect x="28" y="338" width="240" height="42" rx="9" fill="#0B2A24" stroke="#34D399"/>
      <text x="148" y="363" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">5-Tab Live Crypto Inspector</text>

      <!-- Arrows Alice <-> Relay -->
      <line x1="286" y1="138" x2="356" y2="138" stroke="#A78BFA" stroke-width="2" marker-end="url(#arrV)"/>
      <line x1="356" y1="168" x2="286" y2="168" stroke="#A78BFA" stroke-width="2" marker-end="url(#arrV)"/>
      <text x="321" y="128" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="9">Pub A,B+Sig</text>

      <line x1="286" y1="262" x2="356" y2="262" stroke="#22D3EE" stroke-width="2" marker-end="url(#arrC)"/>
      <line x1="356" y1="292" x2="286" y2="292" stroke="#34D399" stroke-width="2" marker-end="url(#arrE)"/>
      <text x="321" y="252" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="9">CT+IV+MAC</text>
      <text x="321" y="308" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9">HTTP/TLS</text>

      <!-- CENTER: UNTRUSTED FLASK RELAY + SQLITE + REFERENCE CRYPTO -->
      <rect x="362" y="34" width="336" height="214" rx="14" fill="#101827" stroke="#FBBF24" stroke-width="2"/>
      <rect x="362" y="34" width="336" height="38" rx="14" fill="#451A03"/>
      <rect x="362" y="56" width="336" height="16" fill="#451A03"/>
      <text x="530" y="58" text-anchor="middle" fill="#FDE68A" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">Flask REST Relay (HTTP :5000 / TLS :5443)</text>

      <rect x="378" y="84" width="148" height="58" rx="8" fill="#172033" stroke="#334155"/>
      <text x="452" y="103" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">auth &amp; dh_routes</text>
      <text x="452" y="119" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="9.8">PBKDF2 100k rounds</text>
      <text x="452" y="133" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="9.8">Enforces RSA sig + q</text>

      <rect x="534" y="84" width="148" height="58" rx="8" fill="#172033" stroke="#334155"/>
      <text x="608" y="103" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">msg &amp; file_routes</text>
      <text x="608" y="119" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="9.8">Replay filter (HTTP 409)</text>
      <text x="608" y="133" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="9.8">ACL file blob relay</text>

      <rect x="378" y="152" width="148" height="44" rx="8" fill="#172033" stroke="#FB7185"/>
      <text x="452" y="171" text-anchor="middle" fill="#FDA4AF" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">attack_routes.py</text>
      <text x="452" y="186" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="9.8">5 Live Attack Lab APIs</text>

      <rect x="534" y="152" width="148" height="44" rx="8" fill="#3F0A14" stroke="#FB7185"/>
      <text x="608" y="171" text-anchor="middle" fill="#FB7185" font-family="Inter, sans-serif" font-size="10.5" font-weight="700">ZERO-KNOWLEDGE</text>
      <text x="608" y="186" text-anchor="middle" fill="#FECDD3" font-family="JetBrains Mono, monospace" font-size="9.5">0 Plaintext · 0 Keys</text>

      <text x="530" y="232" text-anchor="middle" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10">X.509 v3 RSA-2048 Self-Signed TLS Cert (generate_cert.py)</text>

      <!-- Down arrow to Persistence & Python Ref -->
      <line x1="452" y1="248" x2="452" y2="278" stroke="#FBBF24" stroke-width="2" marker-end="url(#arrA)"/>
      <line x1="608" y1="248" x2="608" y2="278" stroke="#22D3EE" stroke-width="2" marker-end="url(#arrC)"/>

      <!-- Persistence Tier -->
      <rect x="362" y="284" width="164" height="110" rx="12" fill="#0F172A" stroke="#FBBF24" stroke-width="1.6"/>
      <text x="444" y="306" text-anchor="middle" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">SQLite (messaging.db)</text>
      <text x="444" y="325" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">users · dh_sessions</text>
      <text x="444" y="341" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">messages · files</text>
      <text x="444" y="357" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">processed_messages</text>
      <text x="444" y="379" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.5">uploads/&lt;id&gt;.bin</text>

      <!-- Python Reference + Tests Tier -->
      <rect x="536" y="284" width="162" height="110" rx="12" fill="#0F172A" stroke="#22D3EE" stroke-width="1.6"/>
      <text x="617" y="306" text-anchor="middle" fill="#22D3EE" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">Python crypto/ + tests/</text>
      <text x="617" y="325" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">Byte-compatible spec</text>
      <text x="617" y="341" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">Vaudenay Oracle Demo</text>
      <text x="617" y="357" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="9.5">47 Automated Tests</text>
      <text x="617" y="379" text-anchor="middle" fill="#A78BFA" font-family="JetBrains Mono, monospace" font-size="9.5">Py ↔ Node JS Interop</text>

      <!-- Arrows Relay <-> Bob -->
      <line x1="702" y1="138" x2="772" y2="138" stroke="#A78BFA" stroke-width="2" marker-end="url(#arrV)"/>
      <line x1="772" y1="168" x2="702" y2="168" stroke="#A78BFA" stroke-width="2" marker-end="url(#arrV)"/>
      <text x="737" y="128" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="9">Pub A,B+Sig</text>

      <line x1="702" y1="262" x2="772" y2="262" stroke="#22D3EE" stroke-width="2" marker-end="url(#arrC)"/>
      <line x1="772" y1="292" x2="702" y2="292" stroke="#34D399" stroke-width="2" marker-end="url(#arrE)"/>
      <text x="737" y="252" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="9">CT+IV+MAC</text>
      <text x="737" y="308" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9">Poll (1s)</text>

      <!-- BOB BROWSER -->
      <rect x="778" y="34" width="268" height="360" rx="14" fill="#0D162B" stroke="#34D399" stroke-width="2"/>
      <rect x="778" y="34" width="268" height="38" rx="14" fill="#064E3B"/>
      <rect x="778" y="56" width="268" height="16" fill="#064E3B"/>
      <text x="912" y="58" text-anchor="middle" fill="#D1FAE5" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">Bob WebCrypto Client</text>

      <rect x="792" y="84" width="240" height="52" rx="9" fill="#131F3A" stroke="#7C3AED"/>
      <text x="912" y="104" text-anchor="middle" fill="#C4B5FD" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Verify Alice RSA-PSS Signature</text>
      <text x="912" y="122" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">Abort with MITM Alert if invalid</text>

      <rect x="792" y="146" width="240" height="54" rx="9" fill="#131F3A" stroke="#7C3AED"/>
      <text x="912" y="166" text-anchor="middle" fill="#C4B5FD" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Subgroup Check + S = A^b mod p</text>
      <text x="912" y="184" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">Check A^q == 1 · erase b &amp; S</text>

      <rect x="792" y="210" width="240" height="54" rx="9" fill="#131F3A" stroke="#10B981"/>
      <text x="912" y="230" text-anchor="middle" fill="#6EE7B7" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Constant-Time MAC Check FIRST</text>
      <text x="912" y="248" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">Rejects tamper &amp; padding oracle</text>

      <rect x="792" y="274" width="240" height="54" rx="9" fill="#131F3A" stroke="#06B6D4"/>
      <text x="912" y="294" text-anchor="middle" fill="#67E8F9" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Commit Ratchet &amp; AES Decrypt</text>
      <text x="912" y="312" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">MAX_SKIP=100 · Erase used MK</text>

      <rect x="792" y="338" width="240" height="42" rx="9" fill="#0B2A24" stroke="#34D399"/>
      <text x="912" y="363" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">Plaintext &amp; Verified Files</text>
    </svg>`
  },

  sequence8Step: {
    title: 'Eight-Stage Cryptographic Protocol Sequence (Alice ↔ Relay ↔ Bob)',
    svg: `<svg viewBox="0 0 1020 470" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Eight-stage SecureMsg cryptographic sequence diagram">
      <defs>
        <marker id="seqC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#22D3EE"/>
        </marker>
        <marker id="seqV" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#A78BFA"/>
        </marker>
        <marker id="seqE" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#34D399"/>
        </marker>
        <marker id="seqA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#FBBF24"/>
        </marker>
      </defs>

      <!-- Actor Headers -->
      <rect x="65" y="14" width="190" height="40" rx="10" fill="#2E1065" stroke="#A78BFA" stroke-width="1.8"/>
      <text x="160" y="39" text-anchor="middle" fill="#F5F3FF" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">Alice (Browser)</text>

      <rect x="415" y="14" width="190" height="40" rx="10" fill="#451A03" stroke="#FBBF24" stroke-width="1.8"/>
      <text x="510" y="39" text-anchor="middle" fill="#FEF3C7" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">Untrusted Relay</text>

      <rect x="765" y="14" width="190" height="40" rx="10" fill="#064E3B" stroke="#34D399" stroke-width="1.8"/>
      <text x="860" y="39" text-anchor="middle" fill="#D1FAE5" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">Bob (Browser)</text>

      <!-- Lifelines -->
      <line x1="160" y1="54" x2="160" y2="452" stroke="#334155" stroke-width="2" stroke-dasharray="6 5"/>
      <line x1="510" y1="54" x2="510" y2="452" stroke="#334155" stroke-width="2" stroke-dasharray="6 5"/>
      <line x1="860" y1="54" x2="860" y2="452" stroke="#334155" stroke-width="2" stroke-dasharray="6 5"/>

      <!-- Step 1 & 2 -->
      <line x1="160" y1="88" x2="502" y2="88" stroke="#A78BFA" stroke-width="2" marker-end="url(#seqV)"/>
      <text x="331" y="80" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="10.5">1-2. Register (PBKDF2 100k) + Upload RSA-2048 Public Key</text>

      <line x1="860" y1="108" x2="518" y2="108" stroke="#A78BFA" stroke-width="2" marker-end="url(#seqV)"/>
      <text x="689" y="100" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="10.5">1-2. Register + Publish Bob RSA-2048 Public Key</text>

      <!-- Step 3 -->
      <line x1="160" y1="150" x2="502" y2="150" stroke="#A78BFA" stroke-width="2" marker-end="url(#seqV)"/>
      <text x="331" y="142" text-anchor="middle" fill="#E9D5FF" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">3. POST /api/dh/initiate (A = 2^a mod p, sig_a)</text>
      <rect x="405" y="160" width="210" height="24" rx="5" fill="#1E293B" stroke="#FBBF24"/>
      <text x="510" y="176" text-anchor="middle" fill="#FDE68A" font-family="JetBrains Mono, monospace" font-size="9.5">Verify MODP-2048, A^q==1, sig_a</text>

      <!-- Step 4 -->
      <line x1="510" y1="204" x2="852" y2="204" stroke="#FBBF24" stroke-width="2" marker-end="url(#seqA)"/>
      <text x="681" y="196" text-anchor="middle" fill="#FDE68A" font-family="JetBrains Mono, monospace" font-size="10.2">4. GET /api/dh/pending → A, sig_a (Bob verifies sig_a)</text>

      <line x1="860" y1="238" x2="518" y2="238" stroke="#34D399" stroke-width="2" marker-end="url(#seqE)"/>
      <text x="689" y="230" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">4. POST /api/dh/respond (B = 2^b mod p, sig_b) · S = A^b</text>

      <!-- Step 5 -->
      <line x1="510" y1="272" x2="168" y2="272" stroke="#34D399" stroke-width="2" marker-end="url(#seqE)"/>
      <text x="339" y="264" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10.2">5. GET /api/dh/session/&lt;id&gt; → Verify sig_b, S = B^a mod p</text>

      <rect x="35" y="286" width="250" height="26" rx="6" fill="#0B2A24" stroke="#34D399"/>
      <text x="160" y="303" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">HKDF(S, SHA256(A:B)) → CK_send/recv</text>

      <rect x="735" y="286" width="250" height="26" rx="6" fill="#0B2A24" stroke="#34D399"/>
      <text x="860" y="303" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">HKDF(S, SHA256(A:B)) → CK_recv/send</text>

      <!-- Step 6 & 7 -->
      <line x1="160" y1="352" x2="502" y2="352" stroke="#22D3EE" stroke-width="2.2" marker-end="url(#seqC)"/>
      <text x="331" y="343" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">6-7. Ratchet MK → AES-CBC + HMAC → POST /api/messages/send</text>

      <rect x="392" y="362" width="236" height="26" rx="6" fill="#3F0A14" stroke="#FB7185"/>
      <text x="510" y="379" text-anchor="middle" fill="#FDA4AF" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">Replay Check (409 if seen) · Queue CT</text>

      <!-- Step 8 -->
      <line x1="510" y1="414" x2="852" y2="414" stroke="#22D3EE" stroke-width="2.2" marker-end="url(#seqC)"/>
      <text x="681" y="405" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="10.2">8. GET /api/messages/receive/alice → Ciphertext Packet</text>

      <rect x="718" y="424" width="284" height="28" rx="6" fill="#064E3B" stroke="#34D399"/>
      <text x="860" y="442" text-anchor="middle" fill="#A7F3D0" font-family="JetBrains Mono, monospace" font-size="9.8" font-weight="700">Verify MAC First → Decrypt → Commit &amp; Erase MK</text>
    </svg>`
  },

  ratchetChain: {
    title: 'Per-Message Symmetric Hash Ratchet & Key Erasure (Forward Secrecy)',
    svg: `<svg viewBox="0 0 960 275" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Symmetric hash ratchet deriving one-time encryption and MAC keys">
      <defs>
        <marker id="rArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#34D399"/>
        </marker>
        <marker id="rArrV" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#A78BFA"/>
        </marker>
      </defs>

      <!-- Shared Secret -->
      <rect x="14" y="28" width="160" height="68" rx="12" fill="#2E1065" stroke="#A78BFA" stroke-width="2"/>
      <text x="94" y="53" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">DH SHARED SECRET</text>
      <text x="94" y="75" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="12.5" font-weight="700">S = B^a mod p</text>

      <line x1="174" y1="62" x2="232" y2="62" stroke="#A78BFA" stroke-width="2.2" marker-end="url(#rArrV)"/>
      <text x="203" y="48" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="9.5">HKDF-SHA256</text>
      <text x="203" y="80" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="8.8">salt=H(A:B)</text>

      <!-- CK0 -->
      <rect x="238" y="28" width="150" height="68" rx="12" fill="#064E3B" stroke="#34D399" stroke-width="2"/>
      <text x="313" y="53" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700">CK₀ (Zeroed)</text>
      <text x="313" y="74" text-anchor="middle" fill="#D1FAE5" font-family="Inter, sans-serif" font-size="11">Initial Chain Key</text>

      <line x1="388" y1="62" x2="452" y2="62" stroke="#34D399" stroke-width="2.2" marker-end="url(#rArr)"/>
      <text x="420" y="52" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.5">HMAC(0x02)</text>

      <!-- CK1 -->
      <rect x="458" y="28" width="150" height="68" rx="12" fill="#064E3B" stroke="#34D399" stroke-width="2"/>
      <text x="533" y="53" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700">CK₁ (Zeroed)</text>
      <text x="533" y="74" text-anchor="middle" fill="#D1FAE5" font-family="Inter, sans-serif" font-size="11">After Msg #1</text>

      <line x1="608" y1="62" x2="672" y2="62" stroke="#34D399" stroke-width="2.2" marker-end="url(#rArr)"/>
      <text x="640" y="52" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.5">HMAC(0x02)</text>

      <!-- CK2 -->
      <rect x="678" y="28" width="150" height="68" rx="12" fill="#0D2235" stroke="#22D3EE" stroke-width="2"/>
      <text x="753" y="53" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700">CK₂ (Active)</text>
      <text x="753" y="74" text-anchor="middle" fill="#BAE6FD" font-family="Inter, sans-serif" font-size="11">Current Chain State</text>

      <line x1="828" y1="62" x2="876" y2="62" stroke="#64748B" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#rArr)"/>
      <text x="915" y="66" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="12">CK₃...</text>

      <!-- Down arrows to MK1, MK2 -->
      <line x1="313" y1="96" x2="313" y2="136" stroke="#34D399" stroke-width="2" marker-end="url(#rArr)"/>
      <text x="352" y="121" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.5">HMAC(0x01)</text>

      <rect x="238" y="142" width="150" height="44" rx="9" fill="#1E293B" stroke="#FB7185"/>
      <text x="313" y="161" text-anchor="middle" fill="#FDA4AF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">MK₁ (Erased)</text>
      <text x="313" y="177" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="10">Used once for Msg #1</text>

      <line x1="313" y1="186" x2="313" y2="212" stroke="#22D3EE" stroke-width="1.8" marker-end="url(#rArr)"/>
      <rect x="224" y="218" width="178" height="36" rx="8" fill="#083344" stroke="#22D3EE"/>
      <text x="313" y="240" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">HKDF → encKey₁ + macKey₁</text>

      <line x1="533" y1="96" x2="533" y2="136" stroke="#34D399" stroke-width="2" marker-end="url(#rArr)"/>
      <text x="572" y="121" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="9.5">HMAC(0x01)</text>

      <rect x="458" y="142" width="150" height="44" rx="9" fill="#1E293B" stroke="#FB7185"/>
      <text x="533" y="161" text-anchor="middle" fill="#FDA4AF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">MK₂ (Erased)</text>
      <text x="533" y="177" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="10">Used once for Msg #2</text>

      <line x1="533" y1="186" x2="533" y2="212" stroke="#22D3EE" stroke-width="1.8" marker-end="url(#rArr)"/>
      <rect x="444" y="218" width="178" height="36" rx="8" fill="#083344" stroke="#22D3EE"/>
      <text x="533" y="240" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">HKDF → encKey₂ + macKey₂</text>

      <!-- Out of order box -->
      <rect x="664" y="142" width="276" height="112" rx="12" fill="#172033" stroke="#FBBF24" stroke-width="1.5"/>
      <text x="802" y="166" text-anchor="middle" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">OUT-OF-ORDER &amp; REPLAY SAFETY</text>
      <text x="802" y="188" text-anchor="middle" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="11">• Skipped keys cached up to MAX_SKIP = 100</text>
      <text x="802" y="207" text-anchor="middle" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="11">• Compromising CK₂ cannot invert to MK₁</text>
      <text x="802" y="226" text-anchor="middle" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="11">• Forged packets NEVER commit ratchet</text>
      <text x="802" y="244" text-anchor="middle" fill="#FB7185" font-family="JetBrains Mono, monospace" font-size="10">seq_no &lt;= recv_n → RatchetError (Replay)</text>
    </svg>`
  },

  fileSharingFlow: {
    title: 'End-to-End Encrypted File Sharing Architecture (Max 10 MB Opaque Blobs)',
    svg: `<svg viewBox="0 0 980 255" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Encrypted file sharing blob encryption and ratcheted key delivery flow">
      <defs>
        <marker id="fArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#22D3EE"/>
        </marker>
        <marker id="fArrE" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L10 5 L0 9 Z" fill="#34D399"/>
        </marker>
      </defs>

      <!-- Sender -->
      <rect x="14" y="16" width="286" height="224" rx="12" fill="#0D162B" stroke="#22D3EE" stroke-width="1.8"/>
      <text x="157" y="42" text-anchor="middle" fill="#67E8F9" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">1. Sender Browser (Encrypt)</text>
      <text x="30" y="70" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.2">• file_key = random(32 bytes)</text>
      <text x="30" y="92" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.2">• enc, mac = HKDF(file_key)</text>
      <text x="30" y="114" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10.2">• file_id  = random(16B hex)</text>
      <text x="30" y="136" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10.2">• aad = "cns-file-v1|id|a|b"</text>
      <rect x="28" y="154" width="258" height="34" rx="7" fill="#083344" stroke="#22D3EE"/>
      <text x="157" y="175" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="9.6">IV(16B) || AES-CBC || HMAC(32B)</text>
      <text x="157" y="218" text-anchor="middle" fill="#A78BFA" font-family="Inter, sans-serif" font-size="11">Descriptor + file_key sent via E2EE chat</text>

      <!-- Arrows to Relay -->
      <line x1="300" y1="95" x2="362" y2="95" stroke="#22D3EE" stroke-width="2.2" marker-end="url(#fArr)"/>
      <text x="331" y="85" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="9">POST blob</text>

      <line x1="300" y1="190" x2="362" y2="190" stroke="#34D399" stroke-width="2.2" marker-end="url(#fArrE)"/>
      <text x="331" y="180" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9">E2EE msg</text>

      <!-- Relay -->
      <rect x="368" y="16" width="244" height="224" rx="12" fill="#101827" stroke="#FBBF24" stroke-width="1.8"/>
      <text x="490" y="42" text-anchor="middle" fill="#FDE68A" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">2. Untrusted Relay Store</text>
      <rect x="384" y="60" width="212" height="58" rx="8" fill="#172033" stroke="#334155"/>
      <text x="490" y="80" text-anchor="middle" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">uploads/&lt;file_id&gt;.bin</text>
      <text x="490" y="98" text-anchor="middle" fill="#94A3B8" font-family="Inter, sans-serif" font-size="10.5">Opaque ciphertext blob (≤10 MB)</text>
      <text x="490" y="112" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">No filename, MIME, or key</text>

      <rect x="384" y="128" width="212" height="44" rx="8" fill="#172033" stroke="#334155"/>
      <text x="490" y="147" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="10">ACL: Uploader / Recipient Only</text>
      <text x="490" y="163" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.5">Others get 404 · nosniff</text>

      <rect x="384" y="182" width="212" height="42" rx="8" fill="#172033" stroke="#A78BFA"/>
      <text x="490" y="200" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="9.8">messages table queues encrypted</text>
      <text x="490" y="215" text-anchor="middle" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="9.8">JSON descriptor {id,name,key,sha}</text>

      <!-- Arrows to Receiver -->
      <line x1="612" y1="95" x2="674" y2="95" stroke="#22D3EE" stroke-width="2.2" marker-end="url(#fArr)"/>
      <text x="643" y="85" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="9">GET blob</text>

      <line x1="612" y1="190" x2="674" y2="190" stroke="#34D399" stroke-width="2.2" marker-end="url(#fArrE)"/>
      <text x="643" y="180" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="9">Key+SHA</text>

      <!-- Receiver -->
      <rect x="680" y="16" width="286" height="224" rx="12" fill="#0D162B" stroke="#34D399" stroke-width="1.8"/>
      <text x="823" y="42" text-anchor="middle" fill="#6EE7B7" font-family="Space Grotesk, sans-serif" font-size="13.5" font-weight="700">3. Receiver Browser (Verify)</text>
      <text x="696" y="72" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="11.2">1. Decrypt ratcheted chat descriptor</text>
      <text x="696" y="96" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="11.2">2. Fetch opaque blob via /api/files/&lt;id&gt;</text>
      <text x="696" y="120" fill="#34D399" font-family="Inter, sans-serif" font-size="11.2" font-weight="700">3. Verify HMAC(len(aad)||aad||iv||ct)</text>
      <text x="696" y="144" fill="#E2E8F0" font-family="Inter, sans-serif" font-size="11.2">4. Decrypt AES-256-CBC in browser</text>
      <text x="696" y="168" fill="#67E8F9" font-family="Inter, sans-serif" font-size="11.2" font-weight="700">5. Validate plaintext SHA-256 &amp; size</text>
      <rect x="696" y="186" width="254" height="38" rx="8" fill="#064E3B" stroke="#34D399"/>
      <text x="823" y="209" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="10.2" font-weight="700">Tampered blob → Dropped, 0B saved</text>
    </svg>`
  },

  dbSchemaErd: {
    title: 'SQLite3 Zero-Plaintext Schema (5 Tables) & Wire Byte Layouts',
    svg: `<svg viewBox="0 0 980 265" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Five SQLite tables and binary message and file wire layouts">
      <!-- Table 1: users -->
      <rect x="10" y="14" width="182" height="132" rx="10" fill="#0F172A" stroke="#A78BFA" stroke-width="1.6"/>
      <rect x="10" y="14" width="182" height="30" rx="10" fill="#2E1065"/>
      <rect x="10" y="30" width="182" height="14" fill="#2E1065"/>
      <text x="101" y="34" text-anchor="middle" fill="#EDE9FE" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">users</text>
      <text x="22" y="64" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">id (PK) · username</text>
      <text x="22" y="82" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">password_hash (32B)</text>
      <text x="22" y="100" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">salt (16B hex)</text>
      <text x="22" y="118" fill="#C4B5FD" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">public_identity_key</text>
      <text x="22" y="135" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="9.5">created_at</text>

      <!-- Table 2: dh_sessions -->
      <rect x="204" y="14" width="182" height="132" rx="10" fill="#0F172A" stroke="#22D3EE" stroke-width="1.6"/>
      <rect x="204" y="14" width="182" height="30" rx="10" fill="#083344"/>
      <rect x="204" y="30" width="182" height="14" fill="#083344"/>
      <text x="295" y="34" text-anchor="middle" fill="#CFFAFE" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">dh_sessions</text>
      <text x="216" y="64" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">session_id (PK)</text>
      <text x="216" y="82" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">user1, user2</text>
      <text x="216" y="100" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">dh_p, dh_g (2048, 2)</text>
      <text x="216" y="118" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">pub_a, pub_b, sig_a/b</text>
      <text x="216" y="135" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="9.5">status (established)</text>

      <!-- Table 3: messages -->
      <rect x="398" y="14" width="184" height="132" rx="10" fill="#0F172A" stroke="#34D399" stroke-width="1.6"/>
      <rect x="398" y="14" width="184" height="30" rx="10" fill="#064E3B"/>
      <rect x="398" y="30" width="184" height="14" fill="#064E3B"/>
      <text x="490" y="34" text-anchor="middle" fill="#D1FAE5" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">messages</text>
      <text x="410" y="64" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">message_id (UNIQUE)</text>
      <text x="410" y="82" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">sender, receiver</text>
      <text x="410" y="100" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">ciphertext, iv, hmac</text>
      <text x="410" y="118" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">seq_no, timestamp</text>
      <text x="410" y="135" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="9.5">cipher_mode='cbc-hmac'</text>

      <!-- Table 4: processed_messages -->
      <rect x="594" y="14" width="182" height="132" rx="10" fill="#0F172A" stroke="#FB7185" stroke-width="1.6"/>
      <rect x="594" y="14" width="182" height="30" rx="10" fill="#4C0519"/>
      <rect x="594" y="30" width="182" height="14" fill="#4C0519"/>
      <text x="685" y="34" text-anchor="middle" fill="#FFE4E6" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">processed_messages</text>
      <text x="606" y="64" fill="#FDA4AF" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">message_id (PK)</text>
      <text x="606" y="82" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">sender, receiver</text>
      <text x="606" y="100" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">seq_no, received_at</text>
      <text x="606" y="124" fill="#FB7185" font-family="Inter, sans-serif" font-size="10">Duplicate ID → HTTP 409</text>

      <!-- Table 5: files -->
      <rect x="788" y="14" width="182" height="132" rx="10" fill="#0F172A" stroke="#FBBF24" stroke-width="1.6"/>
      <rect x="788" y="14" width="182" height="30" rx="10" fill="#451A03"/>
      <rect x="788" y="30" width="182" height="14" fill="#451A03"/>
      <text x="879" y="34" text-anchor="middle" fill="#FEF3C7" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">files</text>
      <text x="800" y="64" fill="#FDE68A" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">file_id (32 hex PK)</text>
      <text x="800" y="82" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">uploader, recipient</text>
      <text x="800" y="100" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">size, sha256 (blob)</text>
      <text x="800" y="124" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="9.5">uploads/&lt;id&gt;.bin</text>

      <!-- Wire Format Bottom Strips -->
      <rect x="10" y="164" width="474" height="86" rx="11" fill="#0D162B" stroke="#22D3EE" stroke-width="1.5"/>
      <text x="26" y="186" fill="#22D3EE" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">CHAT MESSAGE CANONICAL HMAC INPUT</text>
      <text x="26" y="210" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="10.2">iv_hex : ciphertext_hex : timestamp : seq_no : context</text>
      <text x="26" y="232" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.8">context = session_id|sender|receiver|message_id|cbc-hmac</text>

      <rect x="498" y="164" width="472" height="86" rx="11" fill="#0D162B" stroke="#FBBF24" stroke-width="1.5"/>
      <text x="514" y="186" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">BINARY FILE BLOB LAYOUT (MAX 10 MB PLAINTEXT)</text>
      <rect x="514" y="198" width="82" height="32" rx="6" fill="#1E293B" stroke="#94A3B8"/>
      <text x="555" y="218" text-anchor="middle" fill="#E2E8F0" font-family="JetBrains Mono, monospace" font-size="10">IV (16 B)</text>
      <rect x="604" y="198" width="218" height="32" rx="6" fill="#083344" stroke="#22D3EE"/>
      <text x="713" y="218" text-anchor="middle" fill="#67E8F9" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">AES-256-CBC (PKCS#7)</text>
      <rect x="830" y="198" width="124" height="32" rx="6" fill="#064E3B" stroke="#34D399"/>
      <text x="892" y="218" text-anchor="middle" fill="#6EE7B7" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700">HMAC-SHA256 (32B)</text>
    </svg>`
  },

  trustBoundary: {
    title: 'Trust Boundary & Zero-Knowledge Data Segregation Map',
    svg: `<svg viewBox="0 0 960 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trust boundary separating browser secrets from untrusted relay ciphertext">
      <!-- Trusted Zone Left -->
      <rect x="14" y="18" width="430" height="214" rx="14" fill="#07221B" stroke="#34D399" stroke-width="2"/>
      <text x="229" y="45" text-anchor="middle" fill="#34D399" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">TRUSTED ENDPOINT ZONE (USER BROWSER ONLY)</text>

      <rect x="32" y="64" width="190" height="72" rx="9" fill="#0F172A" stroke="#A78BFA"/>
      <text x="127" y="86" text-anchor="middle" fill="#C4B5FD" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Long-Term Identity</text>
      <text x="127" y="105" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">RSA-2048 Private PEM</text>
      <text x="127" y="121" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">(localStorage)</text>

      <rect x="236" y="64" width="190" height="72" rx="9" fill="#0F172A" stroke="#34D399"/>
      <text x="331" y="86" text-anchor="middle" fill="#6EE7B7" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Ephemeral RAM Keys</text>
      <text x="331" y="105" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">DH a/b · Shared S (zeroed)</text>
      <text x="331" y="121" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">CK_send/recv · 1-time MK</text>

      <rect x="32" y="148" width="394" height="66" rx="9" fill="#0F172A" stroke="#22D3EE"/>
      <text x="229" y="172" text-anchor="middle" fill="#67E8F9" font-family="Inter, sans-serif" font-size="12" font-weight="700">Plaintext Messages, File Names, MIME Types &amp; File Keys</text>
      <text x="229" y="194" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">Memory-only plainLog · Erased on page reload for forward secrecy</text>

      <!-- Wall -->
      <line x1="480" y1="14" x2="480" y2="236" stroke="#FB7185" stroke-width="3" stroke-dasharray="8 6"/>
      <rect x="448" y="96" width="64" height="56" rx="10" fill="#4C0519" stroke="#FB7185" stroke-width="1.8"/>
      <text x="480" y="121" text-anchor="middle" fill="#FECDD3" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">CRYPTO</text>
      <text x="480" y="137" text-anchor="middle" fill="#FB7185" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">WALL</text>

      <!-- Untrusted Zone Right -->
      <rect x="516" y="18" width="430" height="214" rx="14" fill="#1F1215" stroke="#FB7185" stroke-width="2"/>
      <text x="731" y="45" text-anchor="middle" fill="#FB7185" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700">UNTRUSTED NETWORK &amp; RELAY SERVER ZONE</text>

      <rect x="534" y="64" width="190" height="72" rx="9" fill="#0F172A" stroke="#FBBF24"/>
      <text x="629" y="86" text-anchor="middle" fill="#FDE68A" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Public Directory</text>
      <text x="629" y="105" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">PBKDF2 Salted Hashes</text>
      <text x="629" y="121" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">RSA Pub + Signed A/B</text>

      <rect x="738" y="64" width="190" height="72" rx="9" fill="#0F172A" stroke="#22D3EE"/>
      <text x="833" y="86" text-anchor="middle" fill="#67E8F9" font-family="Inter, sans-serif" font-size="11.5" font-weight="700">Opaque Ciphertext</text>
      <text x="833" y="105" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">Hex CT · 16B IV · 32B MAC</text>
      <text x="833" y="121" text-anchor="middle" fill="#94A3B8" font-family="JetBrains Mono, monospace" font-size="9.6">uploads/&lt;file_id&gt;.bin</text>

      <rect x="534" y="148" width="394" height="66" rx="9" fill="#0F172A" stroke="#FB7185"/>
      <text x="731" y="172" text-anchor="middle" fill="#FDA4AF" font-family="Inter, sans-serif" font-size="12" font-weight="700">Even Full Server / DB Compromise Reveals 0 Plaintext</text>
      <text x="731" y="194" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="10">Visible metadata only: sender, receiver, timestamps, packet sizes</text>
    </svg>`
  }
};
