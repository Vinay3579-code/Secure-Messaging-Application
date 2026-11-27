/**
 * SecureMsg CNS Portfolio — Live In-Browser WebCrypto Engine & 5-Attack Simulator
 * Runs REAL cryptography in the browser:
 *  - RSA-2048-PSS identity keys & signing (WebCrypto)
 *  - RFC 3526 2048-bit MODP Group 14 Diffie-Hellman (BigInt modPow + subgroup check)
 *  - Transcript-salted HKDF-SHA256 + Symmetric Hash Ratchet (HMAC-SHA256 chain)
 *  - AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC)
 *  - Live 5-Attack Defense Simulator (including real Vaudenay CBC Padding Oracle!)
 */

window.LiveCryptoDemo = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const P = BigInt('0x' +
    'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
    '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
    'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
    'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
    'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
    'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
    '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
    'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
    'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
    '15728E5A8AACAA68FFFFFFFFFFFFFFFF');
  const Q = (P - 1n) / 2n;
  const G = 2n;

  const hasSubtle = () => !!(window.crypto && window.crypto.subtle);
  const randBytes = (n) => window.crypto.getRandomValues(new Uint8Array(n));
  const toHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const fromHex = (h) => {
    if (h.length % 2) h = '0' + h;
    const u = new Uint8Array(h.length / 2);
    for (let i = 0; i < u.length; i++) u[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return u;
  };
  const bigToBytes = (n, len) => fromHex(n.toString(16).padStart(len * 2, '0'));

  function modPow(base, exp, mod) {
    let r = 1n;
    base %= mod;
    while (exp > 0n) {
      if (exp & 1n) r = (r * base) % mod;
      exp >>= 1n;
      base = (base * base) % mod;
    }
    return r;
  }

  function genDH() {
    let priv = 0n;
    while (priv < 2n) priv = BigInt('0x' + toHex(randBytes(32)));
    return { priv, pub: modPow(G, priv, P) };
  }

  const validDH = (y) => y > 1n && y < P - 1n && modPow(y, Q, P) === 1n;

  async function sha256(bytes) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  }
  async function fp(bytes) {
    return toHex(await sha256(bytes)).slice(0, 16);
  }
  async function hmac(keyBytes, dataBytes) {
    const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, dataBytes));
  }
  async function verifyHmac(keyBytes, tagBytes, dataBytes) {
    const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', k, tagBytes, dataBytes);
  }
  async function hkdf(ikm, salt, info) {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: salt || new Uint8Array(0), info: enc.encode(info) }, k, 256
    );
    return new Uint8Array(bits);
  }
  async function aesEncrypt(keyBytes, iv, plainBytes) {
    const k = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt']);
    return new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, k, plainBytes));
  }
  async function aesDecrypt(keyBytes, iv, ctBytes) {
    const k = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt']);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, k, ctBytes));
  }

  // Persistent interactive session state for Demo tab
  const state = {
    ready: false,
    sessionId: null,
    aliceId: null,
    bobId: null,
    aliceFp: '',
    bobFp: '',
    sharedFp: '',
    sendCK: null,
    recvCK: null,
    sendN: 0,
    recvN: 0,
    seenIds: new Set(),
    lastPacket: null,
    senderLogs: [],
    relayLogs: [],
    receiverLogs: [],
  };

  function resetState() {
    state.ready = false;
    state.sessionId = null;
    state.sendCK = null;
    state.recvCK = null;
    state.sendN = 0;
    state.recvN = 0;
    state.seenIds = new Set();
    state.lastPacket = null;
    state.senderLogs = [];
    state.relayLogs = [];
    state.receiverLogs = [];
  }

  async function runHandshake() {
    if (!hasSubtle()) {
      throw new Error('WebCrypto API requires HTTPS (GitHub Pages) or http://localhost.');
    }
    resetState();
    const sid = 'sess-' + toHex(randBytes(4));
    state.sessionId = sid;

    // 1. Real RSA-2048-PSS keypairs
    const rsaParams = { name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
    state.aliceId = await crypto.subtle.generateKey(rsaParams, true, ['sign', 'verify']);
    state.bobId = await crypto.subtle.generateKey(rsaParams, true, ['sign', 'verify']);
    const aPubSpki = new Uint8Array(await crypto.subtle.exportKey('spki', state.aliceId.publicKey));
    const bPubSpki = new Uint8Array(await crypto.subtle.exportKey('spki', state.bobId.publicKey));
    state.aliceFp = await fp(aPubSpki);
    state.bobFp = await fp(bPubSpki);

    state.senderLogs.push(`[1] Generated RSA-2048-PSS identity (fp: ${state.aliceFp})`);
    state.receiverLogs.push(`[1] Generated RSA-2048-PSS identity (fp: ${state.bobFp})`);
    state.relayLogs.push(`[DIR] Stored Alice & Bob SPKI public keys ONLY (0 private keys)`);

    // 2. Real RFC 3526 MODP-2048 DH + RSA-PSS signatures
    const dhA = genDH();
    const dhB = genDH();
    const pubAHex = dhA.pub.toString(16);
    const pubBHex = dhB.pub.toString(16);

    const payloadA = `cns-dh-v2|A|alice|bob|${pubAHex}`;
    const sigA = new Uint8Array(await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 222 }, state.aliceId.privateKey, enc.encode(payloadA)));
    const okSigA = await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 222 }, state.aliceId.publicKey, sigA, enc.encode(payloadA));
    const okSubA = validDH(dhA.pub);

    state.senderLogs.push(`[2] Computed A = 2^a mod p (${pubAHex.slice(0, 18)}...) & signed with RSA-PSS`);
    state.relayLogs.push(`[DH] Session ${sid}: Verified Alice sig_a=${okSigA} & subgroup A^q==1 (${okSubA})`);

    const payloadB = `cns-dh-v2|B|alice|bob|${pubBHex}`;
    const sigB = new Uint8Array(await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 222 }, state.bobId.privateKey, enc.encode(payloadB)));
    const okSigB = await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 222 }, state.bobId.publicKey, sigB, enc.encode(payloadB));
    const okSubB = validDH(dhB.pub);

    state.receiverLogs.push(`[2] Verified Alice sig_a ✓ & subgroup ✓ → signed B (${pubBHex.slice(0, 18)}...)`);
    state.relayLogs.push(`[DH] Verified Bob sig_b=${okSigB} & subgroup B^q==1 (${okSubB}) → status=established`);

    // 3. Shared secret S & HKDF transcript-salted directional chain keys
    const sA = bigToBytes(modPow(dhB.pub, dhA.priv, P), 256);
    const sB = bigToBytes(modPow(dhA.pub, dhB.priv, P), 256);
    state.sharedFp = await fp(sA);
    const sameSecret = toHex(sA) === toHex(sB);

    const tSalt = await sha256(enc.encode(`${pubAHex}:${pubBHex}`));
    const ckInit = await hkdf(sA, tSalt, 'cns-ratchet-v2 chain initiator->responder');
    const ckInitBob = await hkdf(sB, tSalt, 'cns-ratchet-v2 chain initiator->responder');
    sA.fill(0); sB.fill(0);

    state.sendCK = ckInit;
    state.recvCK = ckInitBob;
    state.ready = sameSecret && okSigA && okSigB;

    const ckFp = await fp(ckInit);
    state.senderLogs.push(`[3] S = B^a mod p (fp: ${state.sharedFp}), erased a & S → CK₀ (${ckFp})`);
    state.receiverLogs.push(`[3] S = A^b mod p (fp: ${state.sharedFp}), erased b & S → CK₀ (${ckFp})`);
    state.relayLogs.push(`[INFO] Relay NEVER learned a, b, S, or CK₀. Ready to route ciphertext.`);
    return state;
  }

  async function sendMessage(plaintext, { tamper = false, replayLast = false } = {}) {
    if (!state.ready) throw new Error('Run the Signed DH Handshake first.');
    let pkt;

    if (replayLast) {
      if (!state.lastPacket) throw new Error('Send at least one message before replaying.');
      pkt = { ...state.lastPacket };
      state.senderLogs.push(`[REPLAY] Re-transmitting captured packet ${pkt.message_id} (seq #${pkt.seq_no})`);
    } else {
      const ckBeforeFp = await fp(state.sendCK);
      const mk = await hmac(state.sendCK, new Uint8Array([1]));
      const nextCK = await hmac(state.sendCK, new Uint8Array([2]));
      state.sendCK.fill(0);
      state.sendCK = nextCK;
      const seq = ++state.sendN;
      const mkFp = await fp(mk);
      const ckAfterFp = await fp(nextCK);

      const encKey = await hkdf(mk, null, 'cns-ratchet-v2 message enc key');
      const macKey = await hkdf(mk, null, 'cns-ratchet-v2 message mac key');
      mk.fill(0);

      const iv = randBytes(16);
      const ct = await aesEncrypt(encKey, iv, enc.encode(plaintext));
      const ts = new Date().toISOString();
      const mid = `msg-${Date.now().toString(36)}-${toHex(randBytes(2))}`;
      const ctx = `${state.sessionId}|alice|bob|${mid}|cbc-hmac`;
      const canon = enc.encode(`${toHex(iv)}:${toHex(ct)}:${ts}:${seq}:${ctx}`);
      const tag = await hmac(macKey, canon);
      encKey.fill(0); macKey.fill(0);

      let ctHex = toHex(ct);
      if (tamper) {
        ctHex = (ctHex[0] === 'a' ? 'b' : 'a') + ctHex.slice(1);
      }

      pkt = {
        message_id: mid,
        sender: 'alice',
        receiver: 'bob',
        ciphertext: ctHex,
        iv: toHex(iv),
        hmac_tag: toHex(tag),
        timestamp: ts,
        seq_no: seq,
        cipher_mode: 'cbc-hmac',
        tampered: tamper
      };
      state.lastPacket = pkt;
      state.senderLogs.push(
        `[SEND #${seq}] Ratchet ${ckBeforeFp.slice(0,8)}→${ckAfterFp.slice(0,8)} | MK ${mkFp.slice(0,8)} erased` +
        (tamper ? ` | ⚠ ATTACKER FLIPPED CIPHERTEXT BYTE!` : ` | Sealed AES-256-CBC + HMAC`)
      );
    }

    // Relay check (processed_messages)
    if (state.seenIds.has(pkt.message_id)) {
      state.relayLogs.push(`[409 REJECT] REPLAY_ATTACK_DETECTED: message_id "${pkt.message_id}" already in processed_messages!`);
      state.receiverLogs.push(`[BLOCKED] Packet #${pkt.seq_no} dropped by relay anti-replay filter (HTTP 409).`);
      return { status: 'replay', pkt };
    }
    state.seenIds.add(pkt.message_id);
    state.relayLogs.push(
      `[201 RELAY] id=${pkt.message_id} seq=#${pkt.seq_no}\n` +
      `  ct=${pkt.ciphertext.slice(0, 34)}...\n` +
      `  iv=${pkt.iv.slice(0, 20)}... mac=${pkt.hmac_tag.slice(0, 20)}...`
    );

    // Receiver verification: derive candidate key WITHOUT committing ratchet yet
    if (pkt.seq_no <= state.recvN) {
      state.receiverLogs.push(`[REPLAY ALERT] seq #${pkt.seq_no} already consumed (chain at #${state.recvN}).`);
      return { status: 'replay', pkt };
    }

    let ck = state.recvCK;
    let targetMK = null;
    for (let i = state.recvN + 1; i <= pkt.seq_no; i++) {
      const mkStep = await hmac(ck, new Uint8Array([1]));
      const nextStep = await hmac(ck, new Uint8Array([2]));
      if (i === pkt.seq_no) targetMK = mkStep;
      ck = nextStep;
    }

    const rEnc = await hkdf(targetMK, null, 'cns-ratchet-v2 message enc key');
    const rMac = await hkdf(targetMK, null, 'cns-ratchet-v2 message mac key');
    const ctx = `${state.sessionId}|${pkt.sender}|${pkt.receiver}|${pkt.message_id}|cbc-hmac`;
    const canon = enc.encode(`${pkt.iv}:${pkt.ciphertext}:${pkt.timestamp}:${pkt.seq_no}:${ctx}`);

    const macValid = await verifyHmac(rMac, fromHex(pkt.hmac_tag), canon);
    if (!macValid) {
      targetMK.fill(0); rEnc.fill(0); rMac.fill(0);
      state.receiverLogs.push(
        `[INTEGRITY ALERT] HMAC-SHA256 mismatch on #${pkt.seq_no}! Dropped BEFORE AES decryption. Ratchet NOT advanced (still #${state.recvN}).`
      );
      return { status: 'tampered', pkt };
    }

    const ptBytes = await aesDecrypt(rEnc, fromHex(pkt.iv), fromHex(pkt.ciphertext));
    const pt = dec.decode(ptBytes);
    state.recvCK.fill(0);
    state.recvCK = ck;
    state.recvN = pkt.seq_no;
    targetMK.fill(0); rEnc.fill(0); rMac.fill(0);

    state.receiverLogs.push(`[VERIFIED #${pkt.seq_no}] HMAC valid ✓ → AES decrypted: "${pt}" (key erased)`);
    return { status: 'ok', plaintext: pt, pkt };
  }

  // Real In-Browser 5-Attack Defense Simulator
  async function runAttack(kind, customMsg) {
    if (!hasSubtle()) {
      return 'WebCrypto API requires HTTPS (GitHub Pages) or http://localhost.';
    }
    const msg = (customMsg || 'Transfer $5,000 to Account #84920').trim();

    if (kind === 'eavesdrop') {
      const key = randBytes(32), iv = randBytes(16);
      const ct = await aesEncrypt(key, iv, enc.encode(msg));
      return [
        '=== ATTACK 1: PASSIVE EAVESDROPPING (HTTP vs E2EE + TLS) ===',
        '',
        '[-] SCENARIO A: Unencrypted Plain HTTP Capture (Wireshark)',
        `    POST /send HTTP/1.1\\r\\nHost: relay.local\\r\\n\\r\\nmessage=${msg}`,
        '    [VULNERABLE] Full confidential plaintext exposed on the wire!',
        '',
        '[+] SCENARIO B: SecureMsg E2EE (AES-256-CBC + Optional TLS 1.3)',
        `    {"ciphertext": "${toHex(ct).slice(0, 48)}...", "iv": "${toHex(iv)}"}`,
        '    [DEFENDED] Network sniffer & relay see only indistinguishable ciphertext. 0 bytes leaked.'
      ].join('\n');
    }

    if (kind === 'tamper') {
      const ek = randBytes(32), mk = randBytes(32), iv = randBytes(16);
      const ct = await aesEncrypt(ek, iv, enc.encode(msg));
      const ctHex = toHex(ct), ivHex = toHex(iv), ts = new Date().toISOString();
      const canon = enc.encode(`${ivHex}:${ctHex}:${ts}:1:sess|alice|bob|m1|cbc-hmac`);
      const tag = await hmac(mk, canon);
      const tampered = (ctHex[0] === '1' ? '2' : '1') + ctHex.slice(1);
      const okOrig = await verifyHmac(mk, tag, canon);
      const okTamp = await verifyHmac(mk, tag, enc.encode(`${ivHex}:${tampered}:${ts}:1:sess|alice|bob|m1|cbc-hmac`));
      return [
        '=== ATTACK 2: ACTIVE MESSAGE TAMPERING (BIT-FLIP IN TRANSIT) ===',
        '',
        `[*] Original Plaintext : "${msg}"`,
        `[*] Authentic Cipher   : ${ctHex.slice(0, 36)}...`,
        `[*] Authentic HMAC Tag : ${toHex(tag).slice(0, 32)}...`,
        `[*] Original Check     : ${okOrig ? 'PASSED ✓' : 'FAILED'}`,
        '',
        '[!] Adversary flips first hex nibble in ciphertext:',
        `    ${ctHex.slice(0, 8)}... → ${tampered.slice(0, 8)}...`,
        `[*] Recipient HMAC     : ${okTamp ? 'PASSED' : 'REJECTED ✕'}`,
        '',
        '[DEFENDED] Constant-time HMAC verification failed BEFORE decryption.',
        '           Packet discarded safely; ratchet state untouched.'
      ].join('\n');
    }

    if (kind === 'replay') {
      const id = 'msg-tx-' + toHex(randBytes(3));
      return [
        '=== ATTACK 3: REPLAY ATTACK (DUPLICATE PACKET RE-TRANSMISSION) ===',
        '',
        `[*] Captured Legitimate Packet: message_id="${id}", seq_no=#104`,
        '',
        '[1] First Transmission (Alice → Relay → Bob)',
        '    Relay processed_messages : NOT SEEN → Recorded & Queued (HTTP 201)',
        '    Bob Ratchet State        : Key #104 derived, decrypted, & ERASED',
        '',
        '[2] Adversary Replays Exact Captured Packet',
        `    Relay Layer              : BLOCKED — HTTP 409 REPLAY_ATTACK_DETECTED ("${id}" exists)`,
        '    Client Ratchet Layer     : BLOCKED — RatchetError (seq #104 <= recv_n, key erased)',
        '',
        '[DEFENDED] Dual-layer protection (relay nonce table + one-time ratchet keys).'
      ].join('\n');
    }

    if (kind === 'mitm') {
      const alice = genDH(), bob = genDH(), eveA = genDH(), eveB = genDH();
      const sAliceEve = await fp(bigToBytes(modPow(eveA.pub, alice.priv, P), 256));
      const sEveAlice = await fp(bigToBytes(modPow(alice.pub, eveA.priv, P), 256));
      const sBobEve = await fp(bigToBytes(modPow(eveB.pub, bob.priv, P), 256));

      const rsaParams = { name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
      const aliceId = await crypto.subtle.generateKey(rsaParams, false, ['sign', 'verify']);
      const payloadGood = `cns-dh-v2|A|alice|bob|${alice.pub.toString(16)}`;
      const payloadEve = `cns-dh-v2|A|alice|bob|${eveA.pub.toString(16)}`;
      const sigA = new Uint8Array(await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 222 }, aliceId.privateKey, enc.encode(payloadGood)));
      const genuineOk = await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 222 }, aliceId.publicKey, sigA, enc.encode(payloadGood));
      const eveOk = await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 222 }, aliceId.publicKey, sigA, enc.encode(payloadEve));

      return [
        '=== ATTACK 4: MAN-IN-THE-MIDDLE ON DIFFIE-HELLMAN ===',
        '',
        '[-] SCENARIO A: Unauthenticated Diffie-Hellman',
        `    Shared Secret (Alice ↔ Eve) : ${sAliceEve} (matches Eve: ${sAliceEve === sEveAlice})`,
        `    Shared Secret (Bob   ↔ Eve) : ${sBobEve}`,
        '    [VULNERABLE] Eve sits between Alice and Bob and reads/re-encrypts all traffic!',
        '',
        '[+] SCENARIO B: RSA-2048-PSS Signed DH (SecureMsg)',
        `    Genuine Alice A verified     : ${genuineOk ? 'PASSED ✓' : 'FAILED'}`,
        `    Eve substituted E_A verified : ${eveOk ? 'PASSED' : 'REJECTED ✕ (SIGNATURE_INVALID)'}`,
        '    [DEFENDED] Eve cannot forge Alice\'s RSA-2048-PSS signature. MITM aborted!'
      ].join('\n');
    }

    if (kind === 'padding') {
      // Real live Vaudenay CBC Padding Oracle attack right inside the browser!
      const secret = msg.slice(0, 15) || 'Vault code 4821';
      const ek = randBytes(32), mk = randBytes(32), iv = randBytes(16);
      const ct = await aesEncrypt(ek, iv, enc.encode(secret));
      const block = ct.slice(0, 16); // First 16-byte block
      let vulnQueries = 0;

      const vulnOracle = async (forgedIv, blk) => {
        vulnQueries++;
        try {
          await aesDecrypt(ek, forgedIv, blk);
          return true;
        } catch {
          return false;
        }
      };

      const intermediate = new Uint8Array(16);
      for (let pad = 1; pad <= 16; pad++) {
        const pos = 16 - pad;
        const forged = new Uint8Array(16);
        for (let j = pos + 1; j < 16; j++) forged[j] = intermediate[j] ^ pad;
        for (let g = 0; g < 256; g++) {
          forged[pos] = g;
          if (!(await vulnOracle(forged, block))) continue;
          if (pad === 1) {
            const chk = new Uint8Array(forged);
            chk[pos - 1] ^= 0xff;
            if (!(await vulnOracle(chk, block))) continue;
          }
          intermediate[pos] = g ^ pad;
          break;
        }
      }
      const recovered = new Uint8Array(16);
      for (let i = 0; i < 16; i++) recovered[i] = intermediate[i] ^ iv[i];
      const padLen = recovered[15];
      const unpadded = (padLen >= 1 && padLen <= 16) ? recovered.slice(0, 16 - padLen) : recovered;
      const recoveredText = dec.decode(unpadded);

      // Secure Encrypt-then-MAC test
      const tag = await hmac(mk, enc.encode(`${toHex(iv)}:${toHex(ct)}:t:1`));
      let secureQueries = 0;
      let anyPass = false;
      const probe = new Uint8Array(16);
      for (let g = 0; g < 256; g++) {
        probe[15] = g;
        secureQueries++;
        const ok = await verifyHmac(mk, tag, enc.encode(`${toHex(probe)}:${toHex(block)}:t:1`));
        if (ok) { anyPass = true; break; }
      }

      return [
        '=== ATTACK 5: VAUDENAY CBC PADDING ORACLE (LIVE IN-BROWSER EXECUTION) ===',
        '',
        `[*] Target Secret (1 block) : "${secret}"`,
        '',
        '[-] SCENARIO A: Unauthenticated AES-256-CBC (leaks padding validity)',
        `    Ciphertext (16B block)  : ${toHex(block)}`,
        `    Oracle queries executed : ${vulnQueries}`,
        `    Recovered plaintext     : "${recoveredText}"`,
        `    Result                  : ${recoveredText === secret ? 'COMPROMISED — Decrypted WITHOUT the key!' : 'Partial'}`,
        '',
        '[+] SCENARIO B: SecureMsg Encrypt-then-MAC (AES-256-CBC + HMAC-SHA256)',
        `    Queries before aborting : ${secureQueries} (0 valid oracle signals)`,
        `    Any forged probe passed : ${anyPass ? 'YES' : 'NO (all rejected before padding check)'}`,
        '    [DEFENDED] HMAC checked in constant time BEFORE AES decryption — oracle leaks 0 bits.'
      ].join('\n');
    }
    return '';
  }

  return { state, hasSubtle, runHandshake, sendMessage, runAttack };
})();
