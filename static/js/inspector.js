/**
 * Crypto Inspector: a tabbed, read-only dashboard over the in-browser crypto state.
 *
 * It renders one column per "source" (a chat client exposing window.__cns), so on the dual-client
 * Alice and Bob can be compared side by side (e.g. "both derived the same shared secret"),
 * while the standalone chat page shows a single column. It only reads fingerprints and public values;
 * private keys, chain keys and message keys are never displayed and never leave the browser.
 */
(function () {
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const short = (h, n = 12) => (h ? (h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-6)}` : h) : '—');
    const MODE = { 'cbc-hmac': 'CBC + HMAC-SHA256' };
    const MODE_SHORT = { 'cbc-hmac': 'CBC + HMAC' };
    const icon = (name, cls = 'ic-sm') => `<svg class="ic ${cls}"><use href="#i-${name}"/></svg>`;
    const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const TABS = [
        { id: 'overview', label: 'Overview', icon: 'activity' },
        { id: 'kex', label: 'Key exchange', icon: 'key' },
        { id: 'ratchet', label: 'Key ratchet', icon: 'layers' },
        { id: 'packets', label: 'Packets', icon: 'send' },
        { id: 'relay', label: 'Relay database', icon: 'database' },
    ];

    class CryptoInspector {
        /** @param {HTMLElement} root  @param {Array<{name:string|Function, cls:string, ctx:Function}>} sources */
        constructor(root, sources) {
            this.root = root;
            this.sources = sources;
            this.tab = 'overview';
            this.lastHtml = '';
            this.relay = { rows: null, error: null, at: 0, busy: false };
            this.buildShell();
            this.timer = setInterval(() => this.refresh(), 800);
            this.refresh();
        }

        buildShell() {
            this.root.innerHTML = `
                <div class="inspector-head">
                    <div class="inspector-title"><span class="kpi-icon">${icon('search')}</span>Crypto Inspector</div>
                    <span class="inspector-live"><span class="dot"></span>Live view, refreshes every second</span>
                </div>
                <div class="insp-tabs" role="tablist">
                    ${TABS.map((t) => `<button class="insp-tab" role="tab" data-tab="${t.id}">${icon(t.icon)}${t.label}<span class="insp-count" data-count="${t.id}" hidden></span></button>`).join('')}
                </div>
                <div class="insp-body"></div>
                <div class="insp-foot">${icon('shield')}Read-only view of state held in this browser. Private keys and message keys are never shown and never sent to the server.</div>`;
            this.body = this.root.querySelector('.insp-body');
            this.root.querySelectorAll('.insp-tab').forEach((b) => b.addEventListener('click', () => {
                this.tab = b.dataset.tab;
                this.lastHtml = '';
                if (this.tab === 'relay') this.fetchRelay();
                this.refresh();
            }));
        }

        snapshots() {
            return this.sources.map((src) => {
                let ctx = null;
                try { ctx = src.ctx(); } catch (e) { ctx = null; }
                const c = ctx && ctx.client;
                const name = typeof src.name === 'function' ? src.name(ctx) : src.name;
                return { name, cls: src.cls, ready: !!c, c, user: ctx && ctx.user, peer: ctx && ctx.peer, packets: (ctx && ctx.packets) || [] };
            });
        }

        refresh() {
            const snaps = this.snapshots();
            this.root.querySelectorAll('.insp-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.tab));

            const pktCount = snaps.reduce((n, s) => n + s.packets.length, 0);
            const setCount = (id, n) => {
                const el = this.root.querySelector(`[data-count="${id}"]`);
                if (el) { el.hidden = !n; el.textContent = n; }
            };
            setCount('packets', pktCount);

            let html;
            switch (this.tab) {
                case 'kex': html = this.viewKex(snaps); break;
                case 'ratchet': html = this.viewRatchet(snaps); break;
                case 'packets': html = this.viewPackets(snaps); break;
                case 'relay': html = this.viewRelay(); break;
                default: html = this.viewOverview(snaps);
            }
            if (html !== this.lastHtml) { this.body.innerHTML = html; this.lastHtml = html; }
            if (this.tab === 'relay' && Date.now() - this.relay.at > 3000) this.fetchRelay();
        }

        // ---------------- Overview ----------------
        viewOverview(snaps) {
            const live = snaps.filter((s) => s.ready);
            if (!live.length) return `<div class="empty-note">Waiting for the chat clients to load…</div>`;

            const established = live.filter((s) => s.c.isSessionEstablished);
            const fps = established.map((s) => s.c.sharedSecretFingerprint);
            let verdict;
            if (established.length >= 2 && fps.every((f) => f === fps[0])) {
                verdict = { cls: 'ok', ic: 'check-circle', title: 'Secure channel established',
                    text: 'Both parties independently derived the same shared secret. It was never transmitted.', fp: fps[0] };
            } else if (established.length >= 2) {
                verdict = { cls: 'bad', ic: 'alert-triangle', title: 'Shared secrets differ',
                    text: 'The two clients derived different secrets. Something interfered with the handshake.', fp: '' };
            } else if (established.length === 1 && live.length === 1) {
                verdict = { cls: 'ok', ic: 'check-circle', title: 'Secure channel established',
                    text: `Session with ${esc(established[0].peer)} is active. Keys exist only in this browser.`, fp: fps[0] };
            } else if (established.length === 1) {
                verdict = { cls: 'warn', ic: 'activity', title: 'Handshake in progress',
                    text: 'One side has finished. Waiting for the other to complete the exchange.', fp: '' };
            } else {
                verdict = { cls: 'warn', ic: 'activity', title: 'No active session',
                    text: 'Choose a peer and click Start handshake to begin the signed Diffie-Hellman exchange.', fp: '' };
            }

            const stage = (label, test) => `<tr><td>${label}</td>${live.map((s) => `<td>${cell(test(s.c, s))}</td>`).join('')}</tr>`;
            const cell = (r) => {
                const st = r[0], text = r[1];
                const ic = st === 'done' ? 'check-circle' : st === 'fail' ? 'alert-triangle' : 'activity';
                return `<span class="cell-state ${st}">${icon(ic)}${esc(text)}</span>`;
            };
            const yes = (v, ok, no) => (v ? ['done', ok] : ['wait', no]);

            return `
                <div class="verdict ${verdict.cls}">
                    <div class="verdict-icon">${icon(verdict.ic, 'ic-lg')}</div>
                    <div><div class="verdict-title">${verdict.title}</div><div class="verdict-text">${verdict.text}</div></div>
                    ${verdict.fp ? `<div class="verdict-fp" title="SHA-256 fingerprint of the shared secret">${esc(verdict.fp)}</div>` : ''}
                </div>
                <div class="table-wrap"><table class="grid">
                    <thead><tr><th>Handshake stage</th>${live.map((s) => `<th class="th-${esc(s.cls)}">${esc(s.name)}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${stage('RSA-2048 identity key held in browser', (c) => yes(c.identityPrivateKey, 'Present', 'Missing'))}
                        ${stage('DH public value signed and published', (c) => yes(c.publicDH_hex && c.sessionId, 'Published', 'Pending'))}
                        ${stage('Peer signature verified (RSA-PSS)', (c) => yes(c.peerSigVerified, 'Verified', 'Pending'))}
                        ${stage('Shared secret derived (DH-2048, HKDF)', (c) => yes(c.sharedSecretFingerprint, 'Derived', 'Pending'))}
                        ${stage('Ratchet chains initialised', (c) => yes(c.isSessionEstablished && c.sendCKFp, 'Ready', 'Pending'))}
                        ${stage('Sending cipher', (c) => ['done', MODE[c.cipherMode] || c.cipherMode])}
                        ${stage('Messages', (c) => ['done', `${c.sendN} sent, ${c.recvN} received`])}
                    </tbody></table></div>`;
        }

        // ---------------- Key exchange ----------------
        viewKex(snaps) {
            const live = snaps.filter((s) => s.ready);
            if (!live.length) return `<div class="empty-note">Waiting for the chat clients to load…</div>`;
            return `<div class="cols">${live.map((s) => {
                const c = s.c;
                const role = !c.sessionId ? '—' : c.isInitiator ? 'Initiator (sends A)' : 'Responder (sends B)';
                return `<div class="col-card">
                    <div class="col-head ${esc(s.cls)}"><span>${esc(s.name)}</span>${c.isSessionEstablished ? '<span class="badge badge-success">Established</span>' : '<span class="badge badge-warning">Not established</span>'}</div>
                    <dl class="kv">
                        <dt>Peer</dt><dd class="plain">${esc(s.peer || '—')}</dd>
                        <dt>Role</dt><dd class="plain">${esc(role)}</dd>
                        <dt>Session ID</dt><dd>${esc(c.sessionId || '—')}</dd>
                        <dt>Group</dt><dd class="plain">RFC 3526 MODP-2048, g = 2 (subgroup checked)</dd>
                        <dt>My public value</dt><dd title="${esc(c.publicDH_hex)}">${esc(short(c.publicDH_hex))}</dd>
                        <dt>Peer public value</dt><dd title="${esc(c.peerPublicDH_hex)}">${esc(short(c.peerPublicDH_hex))}</dd>
                        <dt>Peer signature</dt><dd class="plain">${c.peerSigVerified ? '<span class="badge badge-success">RSA-PSS verified</span>' : '<span class="badge badge-neutral">Not yet verified</span>'}</dd>
                        <dt>Shared secret FP</dt><dd class="secret">${esc(c.sharedSecretFingerprint || '—')}</dd>
                    </dl></div>`;
            }).join('')}</div>`;
        }

        // ---------------- Ratchet ----------------
        viewRatchet(snaps) {
            const live = snaps.filter((s) => s.ready);
            if (!live.length) return `<div class="empty-note">Waiting for the chat clients to load…</div>`;
            return `<div class="cols">${live.map((s) => {
                const c = s.c;
                const on = c.isSessionEstablished;
                const events = (c.ratchetLog || []).slice().reverse();
                return `<div class="col-card">
                    <div class="col-head ${esc(s.cls)}"><span>${esc(s.name)}</span><span class="badge badge-info badge-plain">${esc(MODE[c.cipherMode] || c.cipherMode)}</span></div>
                    <div class="chain-heads">
                        <div class="stat"><div class="stat-label">Send chain position</div><div class="stat-value">${on ? `#${c.sendN}` : '—'}</div><div class="stat-sub">${on ? `CK ${esc(c.sendCKFp)}` : ''}</div></div>
                        <div class="stat"><div class="stat-label">Receive chain position</div><div class="stat-value">${on ? `#${c.recvN}` : '—'}</div><div class="stat-sub">${on ? `CK ${esc(c.recvCKFp)}` : ''}</div></div>
                        <div class="stat"><div class="stat-label">Skipped keys held</div><div class="stat-value">${on ? c.skipped.size : '—'}</div></div>
                    </div>
                    <div class="ratchet-list">${events.length ? events.map((e) => `
                        <div class="ratchet-row">
                            <span class="r-tag ${e.dir}">${e.dir === 'send' ? 'SEND' : 'RECV'} #${e.n}</span>
                            <span class="r-flow">${e.ckBefore ? `<span>CK ${esc(e.ckBefore)}</span><span class="r-arrow">→</span><span>CK ${esc(e.ckAfter)}</span>` : ''}${e.mk ? `<span class="r-mk" title="One-time message key fingerprint; the key itself was erased after use">MK ${esc(e.mk)}</span>` : ''}${e.note ? `<span class="r-note">${esc(e.note)}</span>` : ''}</span>
                        </div>`).join('') : '<div class="empty-note">No messages ratcheted yet. Each message advances the chain and erases its key.</div>'}</div>
                </div>`;
            }).join('')}</div>`;
        }

        // ---------------- Packets ----------------
        viewPackets(snaps) {
            const rows = [];
            snaps.forEach((s) => s.packets.forEach((p) => rows.push({ s, p })));
            rows.sort((a, b) => b.p.time - a.p.time);
            if (!rows.length) return `<div class="empty-note">No packets yet. Send a message to see the exact bytes that cross the wire.</div>`;

            const STATUS = {
                sent: ['st-sent', 'Sent to relay'], 'sent-tampered': ['st-warn', 'Sent (tampered)'],
                verified: ['st-verified', 'Verified, decrypted'], integrity: ['st-bad', 'Integrity failed'],
                replay: ['st-bad', 'Replay rejected'], rejected: ['st-warn', 'Rejected'],
            };
            return `<div class="table-wrap"><table class="grid">
                <thead><tr><th>Time</th><th>Observed by</th><th>Event</th><th>From to</th><th>Seq</th><th>Cipher</th><th>IV / nonce</th><th>Ciphertext</th><th>Auth tag</th><th>Result</th></tr></thead>
                <tbody>${rows.slice(0, 30).map(({ s, p }) => {
                    const st = STATUS[p.status] || ['', p.status];
                    return `<tr>
                        <td class="mono">${clock(p.time)}</td>
                        <td class="who-${esc(s.cls)}">${esc(s.name)}</td>
                        <td>${p.dir === 'sent' ? 'Sent' : 'Received'}</td>
                        <td>${esc(p.sender)} → ${esc(p.receiver)}</td>
                        <td class="mono">#${esc(p.seq)}</td>
                        <td>${esc(MODE_SHORT[p.mode] || p.mode)}</td>
                        <td class="mono"><span class="trunc" title="${esc(p.iv)}">${esc(p.iv)}</span></td>
                        <td class="mono"><span class="trunc" title="${esc(p.ciphertext)}">${esc(p.ciphertext)}</span></td>
                        <td class="mono"><span class="trunc" title="${esc(p.tag)}">${esc(p.tag)}</span></td>
                        <td><span class="status-chip ${st[0]}">${st[1]}</span></td></tr>`;
                }).join('')}</tbody></table></div>`;
        }

        // ---------------- Relay database (what the server can see) ----------------
        async fetchRelay() {
            if (this.relay.busy) return;
            this.relay.busy = true;
            try {
                const r = await fetch('/api/server/relay-log');
                const d = await r.json();
                this.relay.rows = d.packets || [];
                this.relay.files = d.files || [];
                this.relay.error = null;
            } catch (e) {
                this.relay.error = 'Could not reach the relay server.';
            } finally {
                this.relay.at = Date.now();
                this.relay.busy = false;
                if (this.tab === 'relay') this.refresh();
            }
        }

        viewRelay() {
            const r = this.relay;
            const head = `<div class="relay-bar"><span>${icon('server')} This is everything the relay server stores. There is no plaintext and no key material in any column.</span>
                <span class="badge badge-success">Zero-knowledge</span></div>`;
            if (r.error) return head + `<div class="empty-note">${esc(r.error)}</div>`;
            if (r.rows == null) return head + `<div class="empty-note">Loading relay database…</div>`;
            const files = r.files || [];
            const fileTable = files.length ? `<div class="subtable-title">Stored encrypted files (opaque blobs; name, type and key are never stored)</div>
                <div class="table-wrap"><table class="grid">
                <thead><tr><th>Stored</th><th>From to</th><th>Size</th><th>Blob SHA-256</th></tr></thead>
                <tbody>${files.slice(0, 15).map((f) => `<tr>
                    <td class="mono">${esc(String(f.created_at || '').slice(11, 19))}</td>
                    <td>${esc(f.uploader)} → ${esc(f.recipient)}</td>
                    <td class="mono">${esc(f.size)} bytes</td>
                    <td class="mono"><span class="trunc" title="${esc(f.sha256)}">${esc(f.sha256)}</span></td></tr>`).join('')}</tbody></table></div>` : '';
            if (!r.rows.length && !files.length) return head + `<div class="empty-note">The relay has not stored any messages yet.</div>`;
            return head + (r.rows.length ? `<div class="table-wrap"><table class="grid">
                <thead><tr><th>Stored</th><th>From to</th><th>Seq</th><th>Cipher</th><th>IV / nonce</th><th>Ciphertext</th><th>Auth tag</th></tr></thead>
                <tbody>${r.rows.slice(0, 25).map((p) => `<tr>
                    <td class="mono">${esc(String(p.created_at || '').slice(11, 19))}</td>
                    <td>${esc(p.sender)} → ${esc(p.receiver)}</td>
                    <td class="mono">#${esc(p.seq_no)}</td>
                    <td>${esc(MODE_SHORT[p.cipher_mode] || p.cipher_mode)}</td>
                    <td class="mono"><span class="trunc" title="${esc(p.iv)}">${esc(p.iv)}</span></td>
                    <td class="mono"><span class="trunc" title="${esc(p.ciphertext)}">${esc(p.ciphertext)}</span></td>
                    <td class="mono"><span class="trunc" title="${esc(p.hmac_tag)}">${esc(p.hmac_tag)}</span></td></tr>`).join('')}</tbody></table></div>` : '') + fileTable;
        }
    }

    window.CryptoInspector = CryptoInspector;
})();
