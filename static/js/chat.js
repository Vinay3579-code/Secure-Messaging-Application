/**
 * Real-Time Chat & Cryptographic Pipeline Inspector
 */

let currentUser = null;
let currentPeer = null;
let cryptoClient = null;
let pollTimer = null;
let simulateTamper = false;
let serverIdentityKey = null;
let receiveBusy = false;
let peerProfiles = {};
let sessionState = { secure: false, text: '' };
let pollTick = 0;

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser) {
        headers['X-Sim-User'] = currentUser;
    }
    return headers;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Detect if running inside iframe or standalone
    if (window.self !== window.top || new URLSearchParams(window.location.search).get('embedded') === '1') {
        document.body.classList.add('is-embedded');
        const nav = document.querySelector('nav.navbar');
        if (nav) nav.style.display = 'none';
    }

    // 2. Check Login Status / Simulation User Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');

    let identityProblem = null;
    if (userParam) {
        currentUser = userParam.trim().toLowerCase();
        let serverKey = null;
        try {
            await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, password: 'password123' })
            });
        } catch (e) {}
        try {
            const loginResp = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, password: 'password123' })
            });
            serverKey = (await loginResp.json()).public_identity_key;
        } catch (e) {}
        try {
            // RSA identity keypair is generated in this browser; only the public key goes to the server
            await SecureCryptoClient.ensureIdentity(currentUser, 'password123', serverKey);
        } catch (e) { identityProblem = e.message; }
    } else {
        const meResp = await fetch('/api/auth/me');
        const meData = await meResp.json();
        if (!meData.logged_in) {
            window.location.href = '/login';
            return;
        }
        currentUser = meData.username;
        serverIdentityKey = meData.public_identity_key;
    }

    const displayUserEl = document.getElementById('display-username');
    if (displayUserEl) displayUserEl.innerText = currentUser;
    const avatarEl = document.getElementById('nav-avatar');
    if (avatarEl) avatarEl.innerText = currentUser.charAt(0);

    cryptoClient = new SecureCryptoClient(currentUser);
    if (!userParam) {
        const normalize = (k) => (k || '').replace(/\s+/g, '');
        if (!cryptoClient.identityPrivateKey || normalize(cryptoClient.identityPublicKey) !== normalize(serverIdentityKey)) {
            cryptoClient.identityPrivateKey = null;
            identityProblem = 'This browser has no RSA identity key matching your account. Log out and log in again on /login to create one.';
        }
    }
    if (identityProblem) {
        const logDiv = document.getElementById('dh-pipeline-log');
        if (logDiv) logDiv.innerHTML = `<span style="color:#ef4444;">⚠ ${escapeHtml(identityProblem)}</span>`;
    }

    // 3. Load Peers
    await loadPeers();

    // 4. Setup Events & Cross-Frame Messages
    setupEvents();
    setupCrossFrameSync();

    // 5. Start Polling Loop
    startPolling();
});

function setupCrossFrameSync() {
    window.addEventListener('message', async (event) => {
        if (!event.data || !event.data.type) return;
        
        if (event.data.type === 'DH_INITIATED' && event.data.peer === currentUser) {
            // Other user started handshake targeting us!
            await checkPendingHandshake();
        } else if (event.data.type === 'DH_RESPONDED' && event.data.peer === currentUser) {
            // Other user responded to our handshake!
            await checkFinalizeHandshake();
        } else if (event.data.type === 'NEW_MESSAGE' && event.data.to === currentUser) {
            // New message arrived!
            await receiveMessagesFromPeer();
        } else if (event.data.type === 'RESET_CHAT') {
            onLocalReset();
        }
    });
}

async function loadPeers() {
    const resp = await fetch('/api/auth/users', { headers: getHeaders() });
    const data = await resp.json();
    registerProfiles(data.users || []);

    const preferredPeer = new URLSearchParams(window.location.search).get('peer');
    if (preferredPeer) {
        const name = preferredPeer.trim().toLowerCase();
        if (!peerProfiles[name]) peerProfiles[name] = { username: name };
        await onPeerChanged(name);
    }
    renderContacts();
    renderProfile();
}

// ---- profiles: contact list, header and profile panel ----
const AVATAR_CLASSES = 6;
function avatarClass(name) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `av-${h % AVATAR_CLASSES}`;
}

function registerProfiles(users) {
    users.forEach(u => {
        const prev = peerProfiles[u.username] || {};
        peerProfiles[u.username] = { ...prev, username: u.username, key: u.public_identity_key, created: u.created_at };
        if (u.public_identity_key && !prev.fp) {
            CNSCrypto.fingerprint(new TextEncoder().encode(u.public_identity_key)).then(fp => {
                peerProfiles[u.username].fp = fp.match(/.{1,4}/g).join(' ');
                renderProfile();
            });
        }
    });
}

async function refreshPeerList() {
    try {
        const resp = await fetch('/api/auth/users', { headers: getHeaders() });
        const data = await resp.json();
        registerProfiles(data.users || []);
        renderContacts();
    } catch (e) { /* transient network error */ }
}

function contactStateText(username) {
    if (username !== currentPeer) return 'Not connected';
    return sessionState.secure ? 'Secure session' : 'Not secured';
}

function renderContacts() {
    const list = document.getElementById('contact-list');
    if (!list) return;
    const q = ((document.getElementById('contact-search') || {}).value || '').trim().toLowerCase();
    const names = Object.keys(peerProfiles).filter(n => n.includes(q)).sort();
    if (!names.length) {
        list.innerHTML = `<div class="contact-empty">${q ? 'No profiles match your search.' : 'No other users yet. Register a second account to chat.'}</div>`;
        return;
    }
    list.innerHTML = names.map(n => {
        const on = n === currentPeer && sessionState.secure;
        return `<button type="button" class="contact ${n === currentPeer ? 'active' : ''}" data-user="${escapeHtml(n)}">
            <span class="avatar md ${avatarClass(n)}">${escapeHtml(n.charAt(0))}</span>
            <span class="contact-meta"><span class="contact-name">${escapeHtml(n)}</span><span class="contact-state">${contactStateText(n)}</span></span>
            <span class="contact-dot ${on ? 'on' : ''}"></span></button>`;
    }).join('');
    list.querySelectorAll('.contact').forEach(el => el.addEventListener('click', () => selectPeer(el.dataset.user)));
}

function selectPeer(username) {
    onPeerChanged(username);
}

function renderProfile() {
    const empty = document.getElementById('profile-empty');
    const body = document.getElementById('profile-body');
    if (!empty || !body) return;
    const p = currentPeer ? (peerProfiles[currentPeer] || { username: currentPeer }) : null;

    const avatar = document.getElementById('chat-peer-avatar');
    const nameEl = document.getElementById('chat-peer-name');
    const sub = document.getElementById('chat-peer-sub');
    if (avatar) { avatar.className = `avatar md ${p ? avatarClass(p.username) : ''}`; avatar.innerText = p ? p.username.charAt(0) : '?'; }
    if (nameEl) nameEl.innerText = p ? p.username : 'No peer selected';
    if (sub) sub.innerText = p ? (sessionState.secure ? 'end-to-end encrypted' : 'not secured yet') : 'choose a profile to start';

    empty.hidden = !!p;
    body.hidden = !p;
    if (!p) return;
    const pa = document.getElementById('profile-avatar');
    pa.className = `avatar lg ${avatarClass(p.username)}`;
    pa.innerText = p.username.charAt(0);
    document.getElementById('profile-name').innerText = p.username;
    document.getElementById('profile-since').innerText = p.created ? `Member since ${String(p.created).slice(0, 10)}` : '';
    document.getElementById('profile-fp').innerText = p.fp || (p.key ? 'Calculating...' : 'No identity key published yet');
}

function updateCta() {
    const bar = document.getElementById('session-cta');
    if (!bar) return;
    const text = document.getElementById('session-cta-text');
    const btn = document.getElementById('cta-handshake');
    if (!currentPeer) { bar.hidden = true; return; }
    bar.hidden = sessionState.secure;
    const waiting = /waiting/i.test(sessionState.text);
    text.innerText = waiting ? 'Waiting for the other party to complete the handshake.' : 'This conversation is not secured yet.';
    btn.style.display = waiting ? 'none' : '';
}

function setupEvents() {
    const btnStartDH = document.getElementById('btn-start-dh');
    if (btnStartDH) {
        btnStartDH.addEventListener('click', (e) => {
            e.preventDefault();
            initiateHandshake();
        });
    }

    const btnReset = document.getElementById('btn-reset-chat');
    if (btnReset) {
        btnReset.addEventListener('click', (e) => {
            e.preventDefault();
            resetChat();
        });
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }

    setupFileSharing();

    const search = document.getElementById('contact-search');
    if (search) search.addEventListener('input', renderContacts);

    const cta = document.getElementById('cta-handshake');
    if (cta) cta.addEventListener('click', () => initiateHandshake());

    const tamperCheckbox = document.getElementById('tamper-checkbox');
    if (tamperCheckbox) {
        tamperCheckbox.addEventListener('change', (e) => {
            simulateTamper = e.target.checked;
        });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { 
                method: 'POST',
                headers: getHeaders()
            });
            window.location.href = '/login';
        });
    }
}

async function onPeerChanged(peer) {
    if (!peer) {
        currentPeer = null;
        updateSessionBadge(false, "No peer selected");
        return;
    }
    currentPeer = peer;
    renderContacts();
    renderProfile();
    updateCta();
    document.getElementById('messages-container').innerHTML = '';

    // An established session only usable here if this page holds its keys (they live in browser memory only)
    const activeResp = await fetch(`/api/dh/active/${currentPeer}`, {
        headers: getHeaders()
    });
    const activeData = await activeResp.json();

    if (cryptoClient.isSessionEstablished && cryptoClient.peer === currentPeer &&
        activeData.has_active && activeData.session.session_id === cryptoClient.sessionId) {
        updateSessionBadge(true, "Secure session active (ratchet + " + modeLabel(cryptoClient.cipherMode) + ")");
    } else if (activeData.has_active) {
        updateSessionBadge(false, "Keys are memory-only: start a new handshake");
    } else {
        updateSessionBadge(false, "No secure session");
    }
    updateInspector();

    loadHistory();
}

async function initiateHandshake() {
    if (!currentPeer) {
        alert("Please select a peer first!");
        return;
    }

    const logStep = makeLogger(true);

    try {
        logStep(`[*] Starting Diffie-Hellman Key Exchange with ${currentPeer}...`);
        await cryptoClient.initiateDH(currentPeer, logStep);
        updateSessionBadge(false, "Waiting for peer to respond");
        updateInspector();

        // Broadcast to other iframe so peer completes handshake immediately
        try {
            window.parent.postMessage({ type: 'DH_INITIATED', from: currentUser, peer: currentPeer }, '*');
        } catch(e) {}
    } catch (err) {
        logStep(`Error: ${err.message}`, true);
        alert(err.message);
    }
}

let handshakeBusy = false;

function makeLogger(reset) {
    const logDiv = document.getElementById('dh-pipeline-log');
    if (reset) logDiv.innerHTML = '';
    return (msg, isError) => {
        const p = document.createElement('div');
        p.className = 'pipeline-step-msg';
        if (isError) p.style.color = '#ef4444';
        p.innerText = msg;
        logDiv.appendChild(p);
        logDiv.scrollTop = logDiv.scrollHeight;
    };
}

async function checkPendingHandshake() {
    if (!currentUser || handshakeBusy) return;
    const pendingResp = await fetch('/api/dh/pending', { headers: getHeaders() });
    const pendingData = await pendingResp.json();

    if (pendingData.has_pending) {
        const sess = pendingData.session;
        // If pending session is directed to us and has not been responded to yet
        if (sess.user2 === currentUser && sess.status === 'pending' && cryptoClient.sessionId !== sess.session_id) {
            handshakeBusy = true;
            const logStep = makeLogger(true);
            currentPeer = sess.user1;
            try {
                logStep(`[*] Received DH Key Exchange request from ${currentPeer}!`);
                await cryptoClient.respondDH(sess, logStep);
                updateSessionBadge(true, "Secure session active (ratchet + " + modeLabel(cryptoClient.cipherMode) + ")");
                updateInspector();

                // Broadcast back to initiator to finalize immediately
                try {
                    window.parent.postMessage({ type: 'DH_RESPONDED', from: currentUser, peer: currentPeer, sessionId: sess.session_id }, '*');
                } catch(e) {}
            } catch (err) {
                logStep(`Error: ${err.message}`, true);
                updateSessionBadge(false, "Handshake rejected");
                cryptoClient.sessionId = sess.session_id;   // do not retry this (bad) session every second
            } finally {
                handshakeBusy = false;
            }
        }
    }
}

async function checkFinalizeHandshake() {
    if (handshakeBusy) return;
    if (cryptoClient.sessionId && cryptoClient.isInitiator && !cryptoClient.isSessionEstablished && currentPeer) {
        const sessResp = await fetch(`/api/dh/session/${cryptoClient.sessionId}`, {
            headers: getHeaders()
        });
        const sessData = await sessResp.json();
        if (sessData.success && sessData.session.status === 'established' && sessData.session.pub_b) {
            handshakeBusy = true;
            const logStep = makeLogger(false);
            try {
                await cryptoClient.finalizeDH(sessData.session, logStep);
                updateSessionBadge(true, "Secure session active (ratchet + " + modeLabel(cryptoClient.cipherMode) + ")");
                updateInspector();
            } catch (err) {
                logStep(`Error: ${err.message}`, true);
                updateSessionBadge(false, "Handshake rejected (possible MITM)");
                cryptoClient.isInitiator = false;   // stop polling this session
            } finally {
                handshakeBusy = false;
            }
        }
    }
}

async function receiveMessagesFromPeer() {
    if (!currentPeer || !cryptoClient.isSessionEstablished || receiveBusy) return;
    receiveBusy = true;
    try {
        const msgResp = await fetch(`/api/messages/receive/${currentPeer}`, {
            headers: getHeaders()
        });
        const msgData = await msgResp.json();
        if (msgData.success && msgData.messages.length > 0) {
            for (const pkt of msgData.messages) {
                await handleIncomingMessage(pkt);
            }
        }
    } finally {
        receiveBusy = false;
    }
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
        if (!currentUser) return;
        // 1. Check for incoming DH requests
        await checkPendingHandshake();
        // 2. Check if peer responded to our DH request
        await checkFinalizeHandshake();
        // 3. Check for incoming messages
        await receiveMessagesFromPeer();
        if (++pollTick % 8 === 0) await refreshPeerList();
    }, 1000);
}

// Ratchets to a fresh key, encrypts, relays and renders one chat message. Returns true on success.
async function sendEncryptedText(text, tamperMessage) {
    // 1. Client-side: ratchet to a fresh one-time key, then AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC)
    const packet = await cryptoClient.encryptMessage(text);

    // Optional simulation: an active attacker modifies the ciphertext in transit
    if (tamperMessage) {
        packet.ciphertext = ('1' === packet.ciphertext[0] ? '2' : '1') + packet.ciphertext.substring(1);
    }

    // 2. Relay the encrypted packet
    const sendResp = await fetch('/api/messages/send', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...packet, sender: undefined })
    });
    const sendData = await sendResp.json();
    if (!sendData.success) {
        alert(`Send Error: ${sendData.message || sendData.error}`);
        return false;
    }

    appendMessageToUI(currentUser, text, packet, true);
    updateInspectorPacket(packet, true, true, null, tamperMessage);
    updateInspector();
    // Notify recipient frame to fetch immediately
    try {
        window.parent.postMessage({ type: 'NEW_MESSAGE', from: currentUser, to: currentPeer }, '*');
    } catch (e) {}
    return true;
}

function requireSecureSession() {
    if (!cryptoClient.isSessionEstablished || cryptoClient.peer !== currentPeer) {
        alert("Please secure the conversation first (Start secure handshake) before sending.");
        return false;
    }
    return true;
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;
    if (!requireSecureSession()) return;

    try {
        if (await sendEncryptedText(text, simulateTamper)) input.value = '';
    } catch (err) {
        alert(err.message);
    }
}

// ---------------- encrypted file sharing ----------------
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const HEX32 = /^[0-9a-f]{32}$/;
const HEX64 = /^[0-9a-f]{64}$/;

// A file message is an ordinary E2EE chat message whose plaintext is this small JSON descriptor.
function parseFilePayload(text) {
    if (typeof text !== 'string' || text.length > 2000 || text[0] !== '{') return null;
    try {
        const o = JSON.parse(text);
        if (o && o.cns === 'file' && o.v === 1 && HEX32.test(o.id) && HEX64.test(o.key) && HEX64.test(o.sha256) &&
            Number.isInteger(o.size) && o.size >= 0 && o.size <= MAX_FILE_BYTES && typeof o.name === 'string') {
            return { id: o.id, key: o.key, sha256: o.sha256, size: o.size, name: o.name.slice(0, 120) };
        }
    } catch (e) { /* plain text message */ }
    return null;
}

function humanSize(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
}

function safeFileName(name) {
    const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '').trim();
    return cleaned || 'file';
}

function progressNote(text, isError) {
    const node = document.createElement('div');
    node.className = 'message-progress' + (isError ? ' bad' : '');
    node.innerHTML = `${isError ? '' : '<span class="spinner"></span>'}<span class="pn-text"></span>`;
    node.querySelector('.pn-text').innerText = text;
    pushMessageNode(node);
    return {
        set(t, err) { node.querySelector('.pn-text').innerText = t; if (err) { node.classList.add('bad'); const sp = node.querySelector('.spinner'); if (sp) sp.remove(); } },
        remove() { node.remove(); }
    };
}

async function sendFile(file) {
    if (!requireSecureSession()) return;
    if (file.size > MAX_FILE_BYTES) {
        alert(`"${file.name}" is ${humanSize(file.size)}. The limit is ${humanSize(MAX_FILE_BYTES)}.`);
        return;
    }
    const note = progressNote(`Encrypting ${file.name}...`);
    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const fileId = CNSCrypto.bytesToHex(CNSCrypto.randomBytes(16));
        const aad = CNSCrypto.fileAad(fileId, currentUser, currentPeer);
        const { blob, key } = await CNSCrypto.encryptFile(bytes, aad);
        const sha256 = await CNSCrypto.sha256Hex(bytes);

        // Tamper simulation for files: corrupt the uploaded blob (the chat message itself stays valid)
        if (simulateTamper) blob[16] ^= 0x01;

        note.set(`Uploading ${file.name} (${humanSize(blob.length)} encrypted)...`);
        const resp = await fetch(`/api/files/upload?file_id=${fileId}&recipient=${encodeURIComponent(currentPeer)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream', 'X-Sim-User': currentUser },
            body: blob
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error === 'FILE_TOO_LARGE' ? 'The relay rejected the file as too large.' : (data.error || 'Upload failed'));

        // The key travels ONLY inside an end-to-end encrypted, ratcheted chat message
        const descriptor = JSON.stringify({ cns: 'file', v: 1, id: fileId, name: file.name.slice(0, 120), size: file.size,
                                           key: CNSCrypto.bytesToHex(key), sha256 });
        key.fill(0);
        await sendEncryptedText(descriptor, false);
        note.remove();
    } catch (err) {
        note.set(`Could not send ${file.name}: ${err.message}`, true);
    }
}

async function downloadFile(file, pkt, card) {
    const btn = card.querySelector('.file-dl');
    const status = card.querySelector('.file-status');
    const say = (t, cls) => { status.className = 'file-status' + (cls ? ' ' + cls : ''); status.innerText = t; };
    btn.disabled = true;
    say('Downloading encrypted blob...');
    try {
        const resp = await fetch(`/api/files/${file.id}`, { headers: getHeaders() });
        if (!resp.ok) throw new Error('The encrypted file is no longer on the relay (it may have been reset).');
        const blob = new Uint8Array(await resp.arrayBuffer());

        say('Decrypting and verifying in your browser...');
        const aad = CNSCrypto.fileAad(file.id, pkt.sender, pkt.receiver);
        const plain = await CNSCrypto.decryptFile(blob, CNSCrypto.hexToBytes(file.key), aad);
        if (plain.length !== file.size || (await CNSCrypto.sha256Hex(plain)) !== file.sha256) {
            throw new CNSCrypto.CNSError('integrity', 'The decrypted file does not match the fingerprint in the message.');
        }

        const url = URL.createObjectURL(new Blob([plain], { type: 'application/octet-stream' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFileName(file.name);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        say('Decrypted and verified. Saved to your downloads.', 'ok');
    } catch (err) {
        say(err.kind === 'integrity' ? `Integrity check failed: ${err.message}` : err.message, 'bad');
    } finally {
        btn.disabled = false;
    }
}

function setupFileSharing() {
    const attach = document.getElementById('btn-attach');
    const input = document.getElementById('file-input');
    const convo = document.getElementById('convo');
    const sendAll = async (files) => { for (const f of Array.from(files)) await sendFile(f); };

    if (attach && input) {
        attach.addEventListener('click', () => input.click());
        input.addEventListener('change', async () => { await sendAll(input.files); input.value = ''; });
    }
    if (convo) {
        let depth = 0;
        const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
        convo.addEventListener('dragenter', (e) => { if (hasFiles(e)) { e.preventDefault(); depth++; convo.classList.add('dragging'); } });
        convo.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
        convo.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) convo.classList.remove('dragging'); });
        convo.addEventListener('drop', async (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth = 0;
            convo.classList.remove('dragging');
            await sendAll(e.dataTransfer.files);
        });
    }
}

async function handleIncomingMessage(pkt) {
    try {
        const decryptedPlaintext = await cryptoClient.verifyAndDecrypt(pkt);
        appendMessageToUI(pkt.sender, decryptedPlaintext, pkt, false);
        updateInspectorPacket(pkt, false, true);
    } catch (err) {
        appendTamperedMessageAlert(pkt.sender, pkt, err.message, err.kind);
        updateInspectorPacket(pkt, false, false, err.kind);
    }
    updateInspector();
}

function timeLabel(ts) {
    const d = new Date(ts);
    return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function pushMessageNode(node) {
    const container = document.getElementById('messages-container');
    const empty = container.querySelector('.chat-empty-state');
    if (empty) empty.remove();
    container.appendChild(node);
    container.scrollTop = container.scrollHeight;
}

function appendMessageToUI(sender, text, pkt, isSelf) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isSelf ? 'message-sent' : 'message-received'}`;
    const file = parseFilePayload(text);
    const body = file
        ? `<div class="file-card">
               <div class="file-ic"><svg class="ic"><use href="#i-file"/></svg></div>
               <div class="file-info"><div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div><div class="file-size">${humanSize(file.size)} &middot; encrypted end to end</div></div>
               <button type="button" class="file-dl"><svg class="ic ic-sm"><use href="#i-download"/></svg>Download</button>
           </div>
           <div class="file-status"></div>`
        : `<div class="msg-text">${escapeHtml(text)}</div>`;
    bubble.innerHTML = `
        <div class="msg-head"><span class="msg-author">${escapeHtml(isSelf ? 'You' : sender)}</span><span class="msg-time">${timeLabel(pkt.timestamp)}</span></div>
        ${body}
        <div class="msg-meta">
            <span class="msg-chip">${modeLabel(pkt.cipher_mode)}</span>
            <span class="msg-chip">One-time key #${pkt.seq_no}</span>
            <span class="msg-chip msg-chip-ok">Authenticated</span>
        </div>`;
    if (file) bubble.querySelector('.file-dl').addEventListener('click', () => downloadFile(file, pkt, bubble));
    pushMessageNode(bubble);
}

function appendTamperedMessageAlert(sender, pkt, errMsg, kind) {
    const title = kind === 'replay' ? 'Replay attack detected'
                : kind === 'protocol' ? 'Message rejected'
                : 'Tampering detected';
    const bubble = document.createElement('div');
    bubble.className = 'message-alert';
    bubble.innerHTML = `
        <div class="alert-title">${title} <span class="alert-from">from ${escapeHtml(sender)}</span></div>
        <div class="alert-text">${escapeHtml(errMsg)}</div>
        <div class="alert-code">ciphertext ${escapeHtml(pkt.ciphertext.substring(0, 32))}&hellip;<br>
            HMAC tag ${escapeHtml(pkt.hmac_tag.substring(0, 32))}&hellip;</div>
        <div class="msg-meta"><span class="msg-chip msg-chip-bad">Discarded by client</span><span class="msg-chip">Seq #${pkt.seq_no}</span></div>`;
    pushMessageNode(bubble);
}

async function loadHistory() {
    if (!currentPeer) return;
    const resp = await fetch(`/api/messages/history/${currentPeer}`, {
        headers: getHeaders()
    });
    const data = await resp.json();
    if (!data.success) return;

    // Forward secrecy: each message key is erased after use, so only messages this page already
    // decrypted or sent are shown. Anything else is never displayed as raw ciphertext.
    const readable = data.history.filter(pkt => cryptoClient.plainLog.has(pkt.message_id));
    if (!readable.length) {
        document.getElementById('messages-container').innerHTML = `
            <div class="chat-empty-state">
                <div class="empty-title">No messages yet</div>
                Secure the conversation with <strong>${escapeHtml(currentPeer)}</strong>, then send your first encrypted message.
            </div>`;
        return;
    }
    for (const pkt of readable) {
        appendMessageToUI(pkt.sender, cryptoClient.plainLog.get(pkt.message_id), pkt, pkt.sender === currentUser);
    }
}

async function resetChat() {
    if (!confirm("Clear message history and reset cryptographic session for a clean demo?")) return;
    
    await fetch('/api/dh/reset', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ peer: currentPeer })
    });

    onLocalReset();

    // Broadcast reset to peer frame
    try {
        window.parent.postMessage({ type: 'RESET_CHAT' }, '*');
    } catch(e) {}
}

function onLocalReset() {
    cryptoClient.resetSession();
    packetLog.length = 0;
    document.getElementById('messages-container').innerHTML = `
        <div class="chat-empty-state">
            <div class="empty-title">Session reset</div>
            Click <strong>Start handshake</strong> to establish a fresh cryptographic session.
        </div>`;
    document.getElementById('dh-pipeline-log').innerHTML = '<span class="log-idle">Ready for a new handshake.</span>';
    updateSessionBadge(false, "No secure session");
    updateInspector();
}

function updateSessionBadge(isSecure, text) {
    const badge = document.getElementById('session-badge');
    if (!badge) return;
    badge.className = isSecure ? 'badge badge-success' : 'badge badge-warning';
    badge.innerText = text;
    sessionState = { secure: isSecure, text };
    renderContacts();
    renderProfile();
    updateCta();
}

function modeLabel(mode) {
    return 'CBC + HMAC';
}

// ---- Crypto Inspector hooks: the inspector (static/js/inspector.js) reads this read-only view ----
const packetLog = [];
window.__cns = {
    get user() { return currentUser; },
    get peer() { return currentPeer; },
    get client() { return cryptoClient; },
    get packets() { return packetLog; }
};

function updateInspector() {
    if (window.cnsInspector) window.cnsInspector.refresh();
}

function updateInspectorPacket(pkt, isSent, verified = true, kind = null, tampered = false) {
    const status = isSent ? (tampered ? 'sent-tampered' : 'sent')
                 : verified ? 'verified'
                 : kind === 'replay' ? 'replay'
                 : kind === 'protocol' ? 'rejected' : 'integrity';
    packetLog.push({
        time: Date.now(), dir: isSent ? 'sent' : 'recv', status,
        id: pkt.message_id, sender: pkt.sender || currentUser, receiver: pkt.receiver,
        seq: pkt.seq_no, mode: pkt.cipher_mode || 'cbc-hmac',
        iv: pkt.iv, ciphertext: pkt.ciphertext, tag: pkt.hmac_tag
    });
    if (packetLog.length > 40) packetLog.shift();
    updateInspector();
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
