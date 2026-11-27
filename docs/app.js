/**
 * SecureMsg CNS Portfolio — Router, Theme Engine, Workflow Animators & Interactive Controllers
 */
(() => {
  const mainEl = document.getElementById('main-content');
  const mobileNav = document.getElementById('nav-mobile');
  const mobileBtn = document.getElementById('mobile-toggle');

  // Track active animation timers so they always clean up cleanly on tab switch
  let activeIntervals = [];
  function clearTimers() {
    activeIntervals.forEach((id) => clearInterval(id));
    activeIntervals = [];
  }

  // ---------- Theme Switcher (Studio Light / Carbon Dark) ----------
  function applyTheme(id) {
    const valid = id === 'carbon' ? 'carbon' : 'studio';
    document.documentElement.setAttribute('data-theme', valid);
    try { localStorage.setItem('securemsg_portfolio_theme_v2', valid); } catch {}
    document.querySelectorAll('[data-set-theme]').forEach((b) => {
      b.classList.toggle('active', b.dataset.setTheme === valid);
    });
  }

  document.querySelectorAll('[data-set-theme]').forEach((b) => {
    b.addEventListener('click', () => applyTheme(b.dataset.setTheme));
  });

  try {
    applyTheme(localStorage.getItem('securemsg_portfolio_theme_v2') || 'studio');
  } catch {
    applyTheme('studio');
  }

  // ---------- Mobile Drawer ----------
  mobileBtn?.addEventListener('click', () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    mobileBtn.setAttribute('aria-expanded', String(open));
  });

  // ---------- Zoomable Diagram Modal ----------
  const modal = document.getElementById('diagram-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalCanvas = document.getElementById('modal-canvas');
  const zoomReadout = document.getElementById('zoom-readout');
  let modalZoom = 1;

  function setModalZoom(val) {
    modalZoom = Math.max(0.6, Math.min(2.2, val));
    zoomReadout.textContent = `${Math.round(modalZoom * 100)}%`;
    const svg = modalCanvas.querySelector('svg');
    if (svg) svg.style.transform = `scale(${modalZoom})`;
  }

  function openSvgModal(title, svgMarkup) {
    modalTitle.textContent = title;
    modalCanvas.innerHTML = svgMarkup;
    setModalZoom(1);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('zoom-in')?.addEventListener('click', () => setModalZoom(modalZoom + 0.2));
  document.getElementById('zoom-out')?.addEventListener('click', () => setModalZoom(modalZoom - 0.2));
  document.getElementById('zoom-reset')?.addEventListener('click', () => setModalZoom(1));
  modal?.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------- Hydrator 1: Animated 5-Tier Architecture Stage (Home & Architecture) ----------
  function hydrateArchStages() {
    const modes = ['handshake', 'chat', 'file', 'attack'];
    mainEl.querySelectorAll('[data-arch-stage]').forEach((stage) => {
      const canvas = stage.querySelector('[data-arch-canvas]');
      const badge = stage.querySelector('[data-arch-badge]');
      const ticker = stage.querySelector('[data-arch-ticker]');
      const modeBtns = stage.querySelectorAll('[data-arch-mode]');
      const playBtn = stage.querySelector('[data-arch-play]');
      const zoomBtn = stage.querySelector('[data-open-current-svg]');
      let curIdx = 0;
      let timer = null;

      function renderMode(modeKey) {
        curIdx = Math.max(0, modes.indexOf(modeKey));
        const res = window.PORTFOLIO_DIAGRAMS.renderAnimatedArch(modeKey);
        canvas.innerHTML = res.svg;
        badge.className = 'ticker-badge' + (res.badgeCls ? ' ' + res.badgeCls : '');
        badge.textContent = res.badge;
        ticker.textContent = res.ticker;
        modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.archMode === modeKey));
      }

      function stopAuto() {
        if (timer) { clearInterval(timer); timer = null; }
        if (playBtn) playBtn.textContent = '▶ Auto-Cycle';
      }

      modeBtns.forEach((b) => {
        b.addEventListener('click', () => {
          stopAuto();
          renderMode(b.dataset.archMode);
        });
      });

      playBtn?.addEventListener('click', () => {
        if (timer) {
          stopAuto();
        } else {
          playBtn.textContent = '⏸ Pause';
          timer = setInterval(() => {
            curIdx = (curIdx + 1) % modes.length;
            renderMode(modes[curIdx]);
          }, 3600);
          activeIntervals.push(timer);
        }
      });

      zoomBtn?.addEventListener('click', () => {
        openSvgModal('Animated 5-Tier SecureMsg Architecture', canvas.innerHTML);
      });

      renderMode('handshake');
    });
  }

  // ---------- Hydrator 2: Animated 8-Stage Protocol Sequence + Stepper + Live Ratchet ----------
  function hydrateProtocolTab() {
    const list = document.getElementById('protocol-step-list');
    const pane = document.getElementById('protocol-detail-pane');
    const seqCanvas = document.getElementById('proto-seq-canvas');
    const seqBadge = document.getElementById('proto-seq-badge');
    const seqCaption = document.getElementById('proto-seq-caption');
    const prevBtn = document.getElementById('proto-prev');
    const nextBtn = document.getElementById('proto-next');
    const autoBtn = document.getElementById('proto-autoplay');
    const zoomBtn = document.querySelector('#proto-seq-stage [data-open-current-svg]');

    if (list && pane && seqCanvas) {
      let curStep = 0;
      let seqTimer = null;

      function selectStep(idx) {
        curStep = (idx + window.PROTOCOL_STEPS.length) % window.PROTOCOL_STEPS.length;
        const s = window.PROTOCOL_STEPS[curStep];
        list.querySelectorAll('.step-btn').forEach((b, i) => b.classList.toggle('active', i === curStep));
        seqCanvas.innerHTML = window.PORTFOLIO_DIAGRAMS.renderAnimatedProtocolSequence(curStep);
        seqBadge.textContent = `STAGE ${s.num} / 08`;
        seqCaption.textContent = `${s.title} — ${s.actors}`;
        pane.className = `card left-${s.color}`;
        pane.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            <span class="pill ${s.color}">STAGE ${s.num} / 08</span>
            <span class="font-mono" style="font-size:11.2px;color:var(--ink-3);">${s.actors}</span>
          </div>
          <h3 class="font-display" style="font-size:1.25rem;margin-bottom:8px;">${s.title}</h3>
          <p style="font-size:14px;color:var(--ink-2);line-height:1.68;margin-bottom:14px;">${s.summary}</p>
          <div class="stack-sm">
            <div><div class="sec-kicker">Cryptographic Formula</div><pre class="code-block">${escapeHtml(s.math)}</pre></div>
            <div><div class="sec-kicker teal">Wire Payload / State</div><pre class="code-block">${escapeHtml(s.wire)}</pre></div>
            <div style="padding:11px 14px;border-radius:9px;background:var(--teal-soft);border:1px solid var(--teal-border);font-size:13.2px;">
              <strong style="color:var(--teal);">Security Property:</strong> ${s.defense}
            </div>
          </div>
        `;
      }

      function stopSeqAuto() {
        if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
        if (autoBtn) autoBtn.textContent = '▶ Auto-Play All 8';
      }

      list.querySelectorAll('.step-btn').forEach((b) => {
        b.addEventListener('click', () => { stopSeqAuto(); selectStep(Number(b.dataset.stepIdx)); });
      });
      prevBtn?.addEventListener('click', () => { stopSeqAuto(); selectStep(curStep - 1); });
      nextBtn?.addEventListener('click', () => { stopSeqAuto(); selectStep(curStep + 1); });
      autoBtn?.addEventListener('click', () => {
        if (seqTimer) {
          stopSeqAuto();
        } else {
          autoBtn.textContent = '⏸ Pause Sequence';
          seqTimer = setInterval(() => selectStep(curStep + 1), 2800);
          activeIntervals.push(seqTimer);
        }
      });
      zoomBtn?.addEventListener('click', () => {
        openSvgModal('Eight-Stage Cryptographic Protocol Sequence', seqCanvas.innerHTML);
      });

      selectStep(0);
    }

    // Interactive Animated Symmetric Hash Ratchet
    const rCanvas = document.getElementById('ratchet-canvas');
    const rBadge = document.getElementById('ratchet-badge');
    const rCap = document.getElementById('ratchet-caption');
    const rStepBtn = document.getElementById('ratchet-step');
    const rAutoBtn = document.getElementById('ratchet-auto');
    const rForgeBtn = document.getElementById('ratchet-forge');
    const rResetBtn = document.getElementById('ratchet-reset');

    if (rCanvas) {
      let stepCount = 1;
      let forged = false;
      let rTimer = null;

      function renderRatchet() {
        rCanvas.innerHTML = window.PORTFOLIO_DIAGRAMS.renderAnimatedRatchet(stepCount, forged);
        if (forged) {
          rBadge.className = 'ticker-badge err';
          rBadge.textContent = 'FORGED PACKET REJECTED';
          rCap.textContent = `Constant-time HMAC failed on Msg #${stepCount} — packet dropped BEFORE decryption; CK_${stepCount - 1} stays safely locked and unburned.`;
        } else {
          rBadge.className = 'ticker-badge';
          rBadge.textContent = `RATCHET STEP #${stepCount}`;
          rCap.textContent = stepCount === 1
            ? 'Initial CK₀ derives one-time MK₁ → encKey₁ + macKey₁. Click "+ Send Next Message" to watch CK₀ get zeroed.'
            : `CK_${stepCount - 2} & MK_${stepCount - 1} permanently ZEROED (0x00). Even stealing CK_${stepCount - 1} cannot invert HMAC to read earlier messages.`;
        }
      }

      function stopRAuto() {
        if (rTimer) { clearInterval(rTimer); rTimer = null; }
        if (rAutoBtn) rAutoBtn.textContent = '▶ Auto-Step';
      }

      rStepBtn?.addEventListener('click', () => {
        stopRAuto();
        forged = false;
        stepCount = stepCount >= 3 ? 1 : stepCount + 1;
        renderRatchet();
      });

      rForgeBtn?.addEventListener('click', () => {
        stopRAuto();
        forged = !forged;
        renderRatchet();
      });

      rResetBtn?.addEventListener('click', () => {
        stopRAuto();
        forged = false;
        stepCount = 1;
        renderRatchet();
      });

      rAutoBtn?.addEventListener('click', () => {
        if (rTimer) {
          stopRAuto();
        } else {
          rAutoBtn.textContent = '⏸ Pause';
          rTimer = setInterval(() => {
            forged = false;
            stepCount = stepCount >= 3 ? 1 : stepCount + 1;
            renderRatchet();
          }, 2400);
          activeIntervals.push(rTimer);
        }
      });

      renderRatchet();
    }
  }

  // ---------- Hydrator 3: Animated Implementation Pipeline + Code Explorer ----------
  function hydrateImplementationTab() {
    const canvas = document.getElementById('impl-pipe-canvas');
    const badge = document.getElementById('impl-pipe-badge');
    const caption = document.getElementById('impl-pipe-caption');
    const btns = mainEl.querySelectorAll('[data-impl-flow]');
    const playBtn = document.getElementById('impl-autoplay');
    const keys = ['dh_init', 'msg_send', 'msg_recv', 'file_up'];

    if (canvas) {
      let cur = 0;
      let timer = null;

      function selectFlow(k) {
        cur = Math.max(0, keys.indexOf(k));
        const res = window.PORTFOLIO_DIAGRAMS.renderAnimatedImplPipeline(k);
        canvas.innerHTML = res.svg;
        badge.textContent = res.route;
        caption.textContent = res.ticker;
        btns.forEach((b) => b.classList.toggle('active', b.dataset.implFlow === k));
      }

      function stopAuto() {
        if (timer) { clearInterval(timer); timer = null; }
        if (playBtn) playBtn.textContent = '▶ Auto-Cycle';
      }

      btns.forEach((b) => b.addEventListener('click', () => { stopAuto(); selectFlow(b.dataset.implFlow); }));
      playBtn?.addEventListener('click', () => {
        if (timer) {
          stopAuto();
        } else {
          playBtn.textContent = '⏸ Pause';
          timer = setInterval(() => { cur = (cur + 1) % keys.length; selectFlow(keys[cur]); }, 3200);
          activeIntervals.push(timer);
        }
      });
      selectFlow('dh_init');
    }

    // Code Explorer
    const tabs = document.getElementById('code-tabs');
    const pane = document.getElementById('code-viewer-pane');
    if (tabs && pane) {
      function selectMod(idx) {
        const m = window.CODE_MODULES[idx];
        tabs.querySelectorAll('.seg-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
        pane.className = `card left-${m.color}`;
        pane.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <strong class="font-mono" style="font-size:13.8px;">${m.file}</strong>
            <span class="pill ${m.color}">${m.badge}</span>
          </div>
          <p style="font-size:13.6px;color:var(--ink-2);margin-bottom:12px;">${m.desc}</p>
          <pre class="code-block">${escapeHtml(m.code)}</pre>
        `;
      }
      tabs.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => selectMod(Number(b.dataset.codeIdx))));
      selectMod(0);
    }
  }

  // ---------- Hydrator 4: Segmented Tabs (Evidence) ----------
  function hydrateSegmentedTabs() {
    mainEl.querySelectorAll('[data-tab-group]').forEach((bar) => {
      const group = bar.dataset.tabGroup;
      const btns = bar.querySelectorAll('[data-tab-target]');
      const panels = mainEl.querySelectorAll(`[data-tab-panel="${group}"]`);
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          btns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          panels.forEach((p) => { p.hidden = p.id !== btn.dataset.tabTarget; });
        });
      });
    });
  }

  // ---------- Hydrator 5: Live WebCrypto Demo & 5-Attack Lab (Step-by-Step Animated) ----------
  function hydrateDemo() {
    const hsBtn = document.getElementById('btn-demo-handshake');
    if (!hsBtn) return;

    const sendBtn = document.getElementById('btn-demo-send');
    const replayBtn = document.getElementById('btn-demo-replay');
    const msgInput = document.getElementById('demo-msg-input');
    const tamperChk = document.getElementById('demo-tamper-toggle');
    const statusPill = document.getElementById('demo-status-pill');
    const aliceFp = document.getElementById('alice-fp-pill');
    const bobFp = document.getElementById('bob-fp-pill');
    const sLog = document.getElementById('demo-sender-log');
    const rLog = document.getElementById('demo-relay-log');
    const bLog = document.getElementById('demo-receiver-log');
    const liveCanvas = document.getElementById('demo-live-canvas');
    const liveBadge = document.getElementById('demo-live-badge');
    const liveCap = document.getElementById('demo-live-caption');

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let busy = false;

    function drawLiveFrame(frame) {
      if (!liveCanvas) return;
      liveCanvas.innerHTML = window.PORTFOLIO_DIAGRAMS.renderDemoLiveStage(frame);
      if (liveBadge && frame.badge) {
        liveBadge.className = 'ticker-badge' + (frame.badgeCls ? ' ' + frame.badgeCls : '');
        liveBadge.textContent = frame.badge;
      }
      if (liveCap && frame.caption) liveCap.textContent = frame.caption;
    }

    const renderLogs = () => {
      const st = window.LiveCryptoDemo.state;
      if (st.ready) {
        statusPill.className = 'pill teal';
        statusPill.textContent = `Established · S=${st.sharedFp}`;
        aliceFp.textContent = `fp: ${st.aliceFp.slice(0, 8)}`;
        bobFp.textContent = `fp: ${st.bobFp.slice(0, 8)}`;
        sendBtn.disabled = false;
        replayBtn.disabled = !st.lastPacket;
      }
      if (st.senderLogs.length) sLog.textContent = st.senderLogs.join('\n\n');
      if (st.relayLogs.length) rLog.textContent = st.relayLogs.join('\n\n');
      if (st.receiverLogs.length) bLog.textContent = st.receiverLogs.join('\n\n');
      sLog.scrollTop = sLog.scrollHeight;
      rLog.scrollTop = rLog.scrollHeight;
      bLog.scrollTop = bLog.scrollHeight;
    };

    renderLogs();
    const stInit = window.LiveCryptoDemo.state;
    drawLiveFrame(stInit.ready ? {
      aliceSub: `RSA fp:${stInit.aliceFp.slice(0, 8)} · CK active`,
      aliceState: 'ok',
      relaySub: '0 Plaintext · Replay Filter Armed',
      bobSub: `RSA fp:${stInit.bobFp.slice(0, 8)} · S=${stInit.sharedFp.slice(0, 8)}`,
      bobState: 'ok',
      badge: 'ESTABLISHED',
      caption: 'Secure channel ready. Type a message and click "2. Encrypt & Relay" to watch step-by-step delivery.'
    } : {
      badge: 'IDLE',
      caption: 'Click "1. Generate RSA-2048 & Run Signed DH Handshake" to watch every step animate live.'
    });

    hsBtn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      hsBtn.disabled = true; sendBtn.disabled = true; replayBtn.disabled = true;
      hsBtn.textContent = 'Running 4-Step Signed DH...';

      try {
        // Step 1: RSA-2048 Identity Keygen
        drawLiveFrame({
          aliceSub: 'Generating RSA-2048-PSS...', aliceState: 'active',
          relaySub: 'Waiting for public SPKI keys', relayState: 'idle',
          bobSub: 'Generating RSA-2048-PSS...', bobState: 'active',
          stepNum: 1, totalSteps: 4, pillColor: '#818CF8',
          badge: 'STEP 1 / 4 · IDENTITY',
          caption: 'Alice & Bob browsers generate RSA-2048-PSS keypairs locally via WebCrypto (private keys stay in browser).'
        });

        await window.LiveCryptoDemo.runHandshake();
        const st = window.LiveCryptoDemo.state;
        await sleep(550);

        // Step 2: Alice sends signed A -> Relay -> Bob
        drawLiveFrame({
          aliceSub: `fp:${st.aliceFp.slice(0,8)} · A=2^a mod p`, aliceState: 'ok',
          relaySub: 'Verifying MODP-2048, A^q==1, sig_a', relayState: 'active',
          bobSub: `fp:${st.bobFp.slice(0,8)} · Waiting for A`, bobState: 'idle',
          wireDir: 'a2r', pillLabel: 'A + sig_a', pillColor: '#818CF8',
          stepNum: 2, totalSteps: 4,
          badge: 'STEP 2 / 4 · INITIATE DH',
          caption: 'Alice signs A with RSA-2048-PSS and posts to Relay; Relay enforces RFC 3526 subgroup & signature.'
        });
        await sleep(950);

        // Step 3: Bob verifies & replies with signed B -> Relay -> Alice
        drawLiveFrame({
          aliceSub: `Waiting for Bob signed B...`, aliceState: 'idle',
          relaySub: 'Verified sig_b & subgroup B^q==1 ✓', relayState: 'ok',
          bobSub: `sig_a ✓ → S=A^b → erase b`, bobState: 'active',
          wireDir: 'b2r', pillLabel: 'B + sig_b', pillColor: '#34D399',
          stepNum: 3, totalSteps: 4,
          badge: 'STEP 3 / 4 · RESPOND DH',
          caption: 'Bob verifies Alice\'s signature, computes S = A^b mod p, erases b, and responds with RSA-signed B.'
        });
        await sleep(950);

        // Step 4: Both establish HKDF + Hash Ratchet
        drawLiveFrame({
          aliceSub: `S=${st.sharedFp.slice(0,10)} · CK₀ Ready`, aliceState: 'ok',
          relaySub: 'status=established (0 secrets)', relayState: 'warn',
          bobSub: `S=${st.sharedFp.slice(0,10)} · CK₀ Ready`, bobState: 'ok',
          wireDir: 'r2a', pillLabel: 'B + sig_b', pillColor: '#34D399',
          stepNum: 4, totalSteps: 4,
          badge: 'STEP 4 / 4 · RATCHET SEEDED',
          caption: `Handshake complete! Both derived identical S (${st.sharedFp}), seeded HKDF chain keys, and zeroed a, b & S.`
        });
        renderLogs();
      } catch (e) {
        sLog.textContent = 'Error: ' + e.message;
      } finally {
        busy = false;
        hsBtn.disabled = false;
        hsBtn.textContent = '↻ Reset & Run New Signed DH Handshake';
      }
    });

    sendBtn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      sendBtn.disabled = true; replayBtn.disabled = true;
      const text = msgInput.value.trim() || 'Hello Bob!';
      const tamper = tamperChk.checked;

      try {
        // Step 1: Ratchet & Seal
        drawLiveFrame({
          aliceSub: 'Ratchet CK→MK · AES-CBC + HMAC', aliceState: 'active',
          relaySub: 'Listening on /api/messages/send', relayState: 'idle',
          bobSub: 'Polling /receive/alice (1s)', bobState: 'idle',
          stepNum: 1, totalSteps: 3, pillColor: '#38BDF8',
          badge: 'STEP 1 / 3 · RATCHET & SEAL',
          caption: 'Alice advances hash ratchet (old CK zeroed), encrypts AES-256-CBC (16B IV), computes HMAC-SHA256, zeroes MK.'
        });
        const res = await window.LiveCryptoDemo.sendMessage(text, { tamper });
        const pkt = res.pkt;
        await sleep(650);

        // Step 2: Alice -> Relay (with optional mid-wire tamper!)
        drawLiveFrame({
          aliceSub: `Sent #${pkt.seq_no} · MK erased`, aliceState: 'ok',
          relaySub: `201 Queued · ct=${pkt.ciphertext.slice(0, 12)}...`, relayState: tamper ? 'warn' : 'active',
          bobSub: 'Waiting for packet...', bobState: 'idle',
          wireDir: 'a2r', pillLabel: tamper ? 'TAMPERED!' : `CT+MAC #${pkt.seq_no}`,
          pillColor: tamper ? '#F87171' : '#38BDF8', tamperMid: tamper,
          stepNum: 2, totalSteps: 3,
          badge: tamper ? 'STEP 2 / 3 · ATTACKER BIT-FLIP!' : 'STEP 2 / 3 · RELAY QUEUE',
          badgeCls: tamper ? 'err' : '',
          caption: tamper
            ? 'Attacker flips a byte in ciphertext mid-transit! Relay cannot detect content change because it has no MAC key.'
            : `Relay checks processed_messages (fresh), stores ciphertext packet ${pkt.message_id}, and queues for Bob.`
        });
        await sleep(950);

        // Step 3: Relay -> Bob (Verify MAC First)
        if (res.status === 'tampered') {
          drawLiveFrame({
            aliceSub: `Sent #${pkt.seq_no} · MK erased`, aliceState: 'ok',
            relaySub: 'Forwarded opaque ciphertext', relayState: 'warn',
            bobSub: `HMAC FAIL ✕ · CK UNCHANGED`, bobState: 'err',
            wireDir: 'r2b', pillLabel: 'BAD MAC ✕', pillColor: '#F87171',
            stepNum: 3, totalSteps: 3,
            badge: 'STEP 3 / 3 · TAMPER BLOCKED', badgeCls: 'err',
            caption: 'Bob checked constant-time HMAC BEFORE decryption → MISMATCH! Packet dropped & ratchet NOT burned.'
          });
        } else {
          drawLiveFrame({
            aliceSub: `Sent #${pkt.seq_no} · MK erased`, aliceState: 'ok',
            relaySub: '0 Plaintext · Marked read', relayState: 'ok',
            bobSub: `MAC ✓ → "${text.slice(0, 20)}${text.length > 20 ? '…' : ''}"`, bobState: 'ok',
            wireDir: 'r2b', pillLabel: `VERIFIED #${pkt.seq_no}`, pillColor: '#34D399',
            stepNum: 3, totalSteps: 3,
            badge: 'STEP 3 / 3 · VERIFIED & DECRYPTED',
            caption: `Bob verified HMAC in constant time ✓, decrypted AES-256-CBC, committed ratchet #${pkt.seq_no}, and erased MK.`
          });
        }
        renderLogs();
      } catch (e) {
        sLog.textContent += '\n[ERROR] ' + e.message;
      } finally {
        busy = false;
        sendBtn.disabled = false;
        replayBtn.disabled = !window.LiveCryptoDemo.state.lastPacket;
      }
    });

    replayBtn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      replayBtn.disabled = true;
      try {
        const last = window.LiveCryptoDemo.state.lastPacket;
        drawLiveFrame({
          aliceSub: `Re-sending ${last ? last.message_id : 'packet'}`, aliceState: 'err',
          relaySub: 'Checking processed_messages...', relayState: 'active',
          bobSub: 'Protected · Never reached', bobState: 'ok',
          wireDir: 'a2r', pillLabel: `REPLAY #${last ? last.seq_no : ''}`, pillColor: '#F87171',
          stepNum: 1, totalSteps: 2,
          badge: 'STEP 1 / 2 · REPLAY ATTEMPT', badgeCls: 'warn',
          caption: 'Adversary re-transmits the exact previously captured encrypted packet to trigger a duplicate action.'
        });
        await sleep(750);

        await window.LiveCryptoDemo.sendMessage('', { replayLast: true });
        drawLiveFrame({
          aliceSub: 'Replay packet bounced back', aliceState: 'err',
          relaySub: 'HTTP 409 REPLAY_ATTACK_DETECTED', relayState: 'err',
          bobSub: 'Protected · Key already erased', bobState: 'ok',
          wireDir: 'replay_bounce', pillLabel: '409 BLOCKED', pillColor: '#F87171',
          stepNum: 2, totalSteps: 2,
          badge: 'STEP 2 / 2 · REPLAY BLOCKED (409)', badgeCls: 'err',
          caption: 'Relay found duplicate message_id in processed_messages and rejected with HTTP 409; Bob\'s ratchet also blocks reuse.'
        });
        renderLogs();
      } catch (e) {
        rLog.textContent += '\n[ERROR] ' + e.message;
      } finally {
        busy = false;
        replayBtn.disabled = false;
      }
    });

    // Part 2: Animated 5-Attack Lab
    const labTabs = document.getElementById('attack-lab-tabs');
    const runAttackBtn = document.getElementById('btn-run-attack');
    const attackInput = document.getElementById('attack-msg-input');
    const attackOut = document.getElementById('attack-lab-output');
    const atkCanvas = document.getElementById('attack-visual-canvas');
    const atkBadge = document.getElementById('attack-visual-badge');
    const atkCap = document.getElementById('attack-visual-caption');
    let selectedAttack = 'eavesdrop';

    const ATK_CAPTIONS = {
      eavesdrop: 'Compares plain HTTP sniffing (full plaintext exposed) against SecureMsg AES-256-CBC E2EE (0 bytes leaked).',
      tamper: 'Flips one byte of ciphertext in transit and shows Bob\'s constant-time HMAC check dropping it before decryption.',
      replay: 'Re-transmits a valid captured packet and shows Relay HTTP 409 + Ratchet one-time key rejection.',
      mitm: 'Substitutes DH public keys: compromises plain DH completely, but fails RSA-2048-PSS verification in SecureMsg.',
      padding: 'Executes a real Vaudenay CBC padding-oracle attack against plain CBC (~2,000 queries) vs Encrypt-then-MAC (0 bits leaked).'
    };

    function drawAttackVisual(phase, meta = {}) {
      if (!atkCanvas) return;
      atkCanvas.innerHTML = window.PORTFOLIO_DIAGRAMS.renderAttackStage(selectedAttack, phase, {
        msg: attackInput?.value || 'Vault code 4821',
        ...meta
      });
      if (atkBadge) {
        atkBadge.className = 'ticker-badge' + (phase === 'running' ? ' warn' : phase === 'done' ? '' : ' warn');
        atkBadge.textContent = phase === 'running' ? 'EXECUTING LIVE...' : phase === 'done' ? 'DEFENSE VERIFIED ✓' : 'READY';
      }
      if (atkCap) atkCap.textContent = ATK_CAPTIONS[selectedAttack] || '';
    }

    drawAttackVisual('idle');

    labTabs?.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        labTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedAttack = btn.dataset.attack;
        drawAttackVisual('idle');
      });
    });

    runAttackBtn?.addEventListener('click', async () => {
      runAttackBtn.disabled = true;
      drawAttackVisual('running');
      attackOut.textContent = 'Executing real cryptographic simulation in WebCrypto...';
      try {
        await sleep(450);
        const out = await window.LiveCryptoDemo.runAttack(selectedAttack, attackInput.value);
        attackOut.textContent = out;
        const qMatch = out.match(/Oracle queries executed\s*:\s*(\d+)/);
        const rMatch = out.match(/Recovered plaintext\s*:\s*"([^"]*)"/);
        drawAttackVisual('done', {
          queries: qMatch ? qMatch[1] : undefined,
          recovered: rMatch ? rMatch[1] : undefined
        });
      } catch (e) {
        attackOut.textContent = 'Simulation error: ' + e.message;
      } finally {
        runAttackBtn.disabled = false;
      }
    });
  }

  // ---------- Hash Router ----------
  function currentRouteId() {
    const raw = (window.location.hash || '#home').replace(/^#\/?/, '').toLowerCase();
    return window.PORTFOLIO_PAGES[raw] ? raw : 'home';
  }

  function renderRoute() {
    clearTimers();
    const id = currentRouteId();
    const meta = window.PORTFOLIO_ROUTES.find((r) => r.id === id);
    document.title = meta ? meta.title : 'SecureMsg — CNS Portfolio';

    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.classList.toggle('active', el.dataset.nav === id);
    });

    mainEl.innerHTML = window.PORTFOLIO_PAGES[id]();
    mobileNav.hidden = true;
    mobileBtn?.setAttribute('aria-expanded', 'false');

    mainEl.querySelectorAll('[data-open-static-svg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = window.PORTFOLIO_DIAGRAMS[btn.dataset.openStaticSvg];
        if (d) openSvgModal(d.title, d.svg);
      });
    });

    hydrateArchStages();
    hydrateProtocolTab();
    hydrateImplementationTab();
    hydrateSegmentedTabs();
    hydrateDemo();

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
