/**
 * SecureMsg CNS Portfolio — Router, Theme Engine, Interactive Widgets & Modal Controller
 */
(() => {
  const THEMES = [
    { id: 'aurora', label: 'Aurora' },
    { id: 'ocean',  label: 'Ocean' },
    { id: 'light',  label: 'Light' },
  ];

  const mainEl = document.getElementById('main-content');
  const mobileNav = document.getElementById('nav-mobile');
  const mobileBtn = document.getElementById('mobile-toggle');
  const themeCycleBtn = document.getElementById('theme-cycle');
  const themeLabelEl = document.getElementById('theme-label');

  // ---------- Theme Engine ----------
  function applyTheme(id) {
    const valid = THEMES.find((t) => t.id === id) ? id : 'aurora';
    document.documentElement.setAttribute('data-theme', valid);
    try { localStorage.setItem('securemsg_portfolio_theme', valid); } catch {}
    const meta = THEMES.find((t) => t.id === valid);
    if (themeLabelEl) themeLabelEl.textContent = meta.label;
    document.querySelectorAll('.ft-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.setTheme === valid);
    });
  }

  themeCycleBtn?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'aurora';
    const next = THEMES[(THEMES.findIndex((t) => t.id === cur) + 1) % THEMES.length];
    applyTheme(next.id);
  });

  document.querySelectorAll('.ft-btn').forEach((b) => {
    b.addEventListener('click', () => applyTheme(b.dataset.setTheme));
  });

  try {
    applyTheme(localStorage.getItem('securemsg_portfolio_theme') || 'aurora');
  } catch {
    applyTheme('aurora');
  }

  // ---------- Mobile Menu ----------
  mobileBtn?.addEventListener('click', () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    mobileBtn.setAttribute('aria-expanded', String(open));
  });

  // ---------- Diagram Zoom Modal ----------
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

  function openDiagramModal(key) {
    const d = window.PORTFOLIO_DIAGRAMS[key];
    if (!d) return;
    modalTitle.textContent = d.title;
    modalCanvas.innerHTML = d.svg;
    setModalZoom(1);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDiagramModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('zoom-in')?.addEventListener('click', () => setModalZoom(modalZoom + 0.2));
  document.getElementById('zoom-out')?.addEventListener('click', () => setModalZoom(modalZoom - 0.2));
  document.getElementById('zoom-reset')?.addEventListener('click', () => setModalZoom(1));
  modal?.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeDiagramModal));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeDiagramModal();
  });

  // ---------- Per-Page Interactive Hydrators ----------
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

  function hydrateProtocolStepper() {
    const list = document.getElementById('protocol-step-list');
    const pane = document.getElementById('protocol-detail-pane');
    if (!list || !pane) return;

    function selectStep(idx) {
      const s = window.PROTOCOL_STEPS[idx];
      list.querySelectorAll('.step-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
      pane.className = `card accent-${s.color}`;
      pane.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <span class="pill ${s.color}">STAGE ${s.num} / 08</span>
          <span class="font-mono" style="font-size:11.5px;color:var(--ink-3);">${s.actors}</span>
        </div>
        <h3 class="font-display" style="font-size:1.35rem;margin-bottom:10px;">${s.title}</h3>
        <p style="font-size:14.2px;color:var(--ink-2);line-height:1.7;margin-bottom:16px;">${s.summary}</p>
        <div class="stack-sm">
          <div>
            <div class="sec-kicker">Cryptographic Formula</div>
            <pre class="code-block">${escapeHtml(s.math)}</pre>
          </div>
          <div>
            <div class="sec-kicker" style="color:var(--cyan);">Wire Payload / Memory State</div>
            <pre class="code-block">${escapeHtml(s.wire)}</pre>
          </div>
          <div style="padding:12px 14px;border-radius:10px;background:var(--emerald-soft);border:1px solid rgba(52,211,153,0.3);font-size:13.3px;">
            <strong style="color:var(--emerald);">Security Guarantee:</strong> <span style="color:var(--ink);">${s.defense}</span>
          </div>
        </div>
      `;
    }

    list.querySelectorAll('.step-btn').forEach((b) => {
      b.addEventListener('click', () => selectStep(Number(b.dataset.stepIdx)));
    });
    selectStep(0);
  }

  function hydrateCodeExplorer() {
    const tabs = document.getElementById('code-tabs');
    const pane = document.getElementById('code-viewer-pane');
    if (!tabs || !pane) return;

    function selectMod(idx) {
      const m = window.CODE_MODULES[idx];
      tabs.querySelectorAll('.seg-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
      pane.className = `card accent-${m.color}`;
      pane.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <strong class="font-mono" style="font-size:14px;color:var(--ink);">${m.file}</strong>
          <span class="pill ${m.color}">${m.badge}</span>
        </div>
        <p style="font-size:13.8px;color:var(--ink-2);margin-bottom:14px;">${m.desc}</p>
        <pre class="code-block">${escapeHtml(m.code)}</pre>
      `;
    }

    tabs.querySelectorAll('.seg-btn').forEach((b) => {
      b.addEventListener('click', () => selectMod(Number(b.dataset.codeIdx)));
    });
    selectMod(0);
  }

  function hydrateDemo() {
    const hsBtn = document.getElementById('btn-demo-handshake');
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

    if (!hsBtn) return;

    const renderDemoLogs = () => {
      const st = window.LiveCryptoDemo.state;
      if (st.ready) {
        statusPill.className = 'pill emerald';
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

    renderDemoLogs();

    hsBtn.addEventListener('click', async () => {
      hsBtn.disabled = true;
      hsBtn.textContent = 'Generating RSA-2048 & Computing DH-2048...';
      try {
        await window.LiveCryptoDemo.runHandshake();
        renderDemoLogs();
      } catch (e) {
        sLog.textContent = 'Error: ' + e.message;
      } finally {
        hsBtn.disabled = false;
        hsBtn.textContent = '↻ Reset & Run New Signed DH Handshake';
      }
    });

    sendBtn.addEventListener('click', async () => {
      const text = msgInput.value.trim() || 'Hello Bob!';
      sendBtn.disabled = true;
      try {
        await window.LiveCryptoDemo.sendMessage(text, { tamper: tamperChk.checked });
        renderDemoLogs();
      } catch (e) {
        sLog.textContent += '\n[ERROR] ' + e.message;
      } finally {
        sendBtn.disabled = false;
      }
    });

    replayBtn.addEventListener('click', async () => {
      try {
        await window.LiveCryptoDemo.sendMessage('', { replayLast: true });
        renderDemoLogs();
      } catch (e) {
        rLog.textContent += '\n[ERROR] ' + e.message;
      }
    });

    // Attack Lab
    const labTabs = document.getElementById('attack-lab-tabs');
    const runAttackBtn = document.getElementById('btn-run-attack');
    const attackInput = document.getElementById('attack-msg-input');
    const attackOut = document.getElementById('attack-lab-output');
    let selectedAttack = 'eavesdrop';

    labTabs?.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        labTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedAttack = btn.dataset.attack;
      });
    });

    runAttackBtn?.addEventListener('click', async () => {
      runAttackBtn.disabled = true;
      attackOut.textContent = 'Executing real cryptographic simulation in WebCrypto...';
      try {
        attackOut.textContent = await window.LiveCryptoDemo.runAttack(selectedAttack, attackInput.value);
      } catch (e) {
        attackOut.textContent = 'Simulation error: ' + e.message;
      } finally {
        runAttackBtn.disabled = false;
      }
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---------- Hash Router ----------
  function currentRouteId() {
    const raw = (window.location.hash || '#home').replace(/^#\/?/, '').toLowerCase();
    return window.PORTFOLIO_PAGES[raw] ? raw : 'home';
  }

  function renderRoute() {
    const id = currentRouteId();
    const meta = window.PORTFOLIO_ROUTES.find((r) => r.id === id);
    document.title = meta ? meta.title : 'SecureMsg — CNS Portfolio';

    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.classList.toggle('active', el.dataset.nav === id);
    });

    mainEl.innerHTML = window.PORTFOLIO_PAGES[id]();
    mobileNav.hidden = true;
    mobileBtn?.setAttribute('aria-expanded', 'false');

    // Bind diagram lightbox buttons
    mainEl.querySelectorAll('[data-open-diagram]').forEach((btn) => {
      btn.addEventListener('click', () => openDiagramModal(btn.dataset.openDiagram));
    });

    hydrateSegmentedTabs();
    hydrateProtocolStepper();
    hydrateCodeExplorer();
    hydrateDemo();

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
