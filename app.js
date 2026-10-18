(() => {
  'use strict';

  // ---------- Data ----------
  const QUESTIONS = window.QUESTIONS || [];
  const BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
  const DOMAINS = [
    { key: 'sdlc', name: 'SDLC Automation', weight: 22 },
    { key: 'iac', name: 'Configuration Management & IaC', weight: 17 },
    { key: 'resilience', name: 'Resilient Cloud Solutions', weight: 15 },
    { key: 'monitoring', name: 'Monitoring & Logging', weight: 15 },
    { key: 'incident', name: 'Incident & Event Response', weight: 14 },
    { key: 'security', name: 'Security & Compliance', weight: 17 },
  ];
  const DOMAIN = Object.fromEntries(DOMAINS.map(d => [d.key, d]));
  // Days until the next review for each Leitner box.
  const INTERVALS = [0, 1, 3, 7, 16, 35];
  const MASTERED_BOX = 4;
  const EXAM_SIZE = 75;
  const EXAM_MINUTES = 180;
  const PASS_PCT = 75;
  const STORE_KEY = 'dop-c02-prep:v1';
  const LETTERS = 'ABCDEF';

  // ---------- State ----------
  const defaults = () => ({ examDate: '', dailyGoal: 30, theme: 'auto', cards: {}, days: {}, exams: [], session: null, exam: null, lastExam: null });
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    return defaults();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  // ---------- Utils ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('#app');
  const pad = n => String(n).padStart(2, '0');
  const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dayStr();
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dayStr(new Date(y, m - 1, d + n)); };
  const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 86400000);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function highlightAsk(q) {
    let h = fmt(q.question);
    if (q.qualifier) {
      const p = esc(q.qualifier).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      h = h.replace(new RegExp(p, 'i'), m => `<mark>${m}</mark>`);
    }
    h = h.replace(/\(?\b(Select (?:TWO|THREE|FOUR))\b\.?\)?/i, '<span class="select-badge">$1</span>');
    if (q.select > 1 && !/select-badge/.test(h)) h += ` <span class="select-badge">Select ${['', 'ONE', 'TWO', 'THREE', 'FOUR'][q.select]}</span>`;
    return h;
  }

  const ICON = {
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/><path d="M8.5 8.5l7 7m0-7l-7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 012-2h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14m-5-6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    party: '<svg viewBox="0 0 24 24"><path d="M4 20l5-14 9 9-14 5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 4l1 2m4 1l-2 1m1 5l2 1M12 3v0m8 6v0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  // ---------- Spaced repetition ----------
  function getCard(id) { return state.cards[id]; }
  function ensureCard(id) {
    return state.cards[id] || (state.cards[id] = { box: 0, due: null, seen: 0, right: 0, wrong: 0, flagged: false, note: '', hist: [] });
  }
  function record(id, ok, guessed) {
    const c = ensureCard(id);
    const t = today();
    const isNew = c.seen === 0;
    c.seen++;
    c.last = Date.now();
    if (ok && !guessed) {
      c.right++;
      c.box = isNew ? 2 : Math.min(c.box + 1, INTERVALS.length - 1);
    } else {
      if (ok) c.right++; else c.wrong++;
      if (guessed) c.guessed = (c.guessed || 0) + 1;
      c.box = 1;
    }
    c.due = addDays(t, INTERVALS[c.box]);
    c.hist = (c.hist || []).concat(ok && !guessed ? 1 : 0).slice(-8);
    const d = state.days[t] || (state.days[t] = { n: 0, ok: 0 });
    d.n++;
    if (ok) d.ok++;
    save();
  }
  const isDue = (id, t = today()) => { const c = getCard(id); return !!(c && c.seen && c.due && c.due <= t); };
  const isMistake = id => { const c = getCard(id); return !!(c && c.seen && c.hist && c.hist[c.hist.length - 1] === 0); };

  function pickBalanced(pool, n) {
    // Round-robin across domains, weighted by exam weight.
    const byDomain = {};
    for (const q of shuffle(pool)) (byDomain[q.domain] = byDomain[q.domain] || []).push(q);
    const taken = Object.fromEntries(DOMAINS.map(d => [d.key, 0]));
    const out = [];
    while (out.length < n) {
      const open = DOMAINS.filter(d => byDomain[d.key] && byDomain[d.key].length);
      if (!open.length) break;
      open.sort((a, b) => taken[a.key] / a.weight - taken[b.key] / b.weight);
      const d = open[0];
      out.push(byDomain[d.key].shift());
      taken[d.key]++;
    }
    return out;
  }

  function dailyPlan() {
    const t = today();
    const due = QUESTIONS.filter(q => isDue(q.id, t))
      .sort((a, b) => getCard(a.id).due.localeCompare(getCard(b.id).due) || getCard(a.id).box - getCard(b.id).box);
    const unseen = QUESTIONS.filter(q => !getCard(q.id) || !getCard(q.id).seen);
    const goal = state.dailyGoal;
    const ids = due.slice(0, goal).map(q => q.id);
    const fresh = pickBalanced(unseen, Math.max(0, goal - ids.length)).map(q => q.id);
    return { due: due.length, fresh: fresh.length, ids: shuffle(ids.concat(fresh)) };
  }

  // ---------- Stats ----------
  function domainStats(key) {
    const qs = QUESTIONS.filter(q => q.domain === key);
    let seen = 0, mastered = 0, recentRight = 0, recentTotal = 0;
    for (const q of qs) {
      const c = getCard(q.id);
      if (!c || !c.seen) continue;
      seen++;
      if (c.box >= MASTERED_BOX) mastered++;
      const h = c.hist || [];
      recentRight += h.slice(-3).reduce((a, b) => a + b, 0);
      recentTotal += h.slice(-3).length;
    }
    return { total: qs.length, seen, mastered, accuracy: recentTotal ? recentRight / recentTotal : 0 };
  }
  function overall() {
    let seen = 0, right = 0, wrong = 0, mastered = 0;
    for (const c of Object.values(state.cards)) {
      if (!c.seen) continue;
      seen++; right += c.right; wrong += c.wrong;
      if (c.box >= MASTERED_BOX) mastered++;
    }
    let readiness = 0, wsum = 0;
    for (const d of DOMAINS) {
      const s = domainStats(d.key);
      if (!s.total) continue;
      readiness += d.weight * s.accuracy * Math.min(1, s.seen / s.total);
      wsum += d.weight;
    }
    return { seen, right, wrong, mastered, accuracy: right + wrong ? right / (right + wrong) : 0, readiness: wsum ? readiness / wsum : 0 };
  }
  function streak() {
    let n = 0;
    let d = today();
    if (!(state.days[d] && state.days[d].n)) d = addDays(d, -1);
    while (state.days[d] && state.days[d].n) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- Router ----------
  let keyHandler = null;
  let timer = null;
  const routes = { '': viewHome, practice: viewPractice, study: viewStudy, exam: viewExam, review: viewReview, settings: viewSettings };

  function go(route) { location.hash = '#/' + route; }
  function render() {
    clearInterval(timer);
    keyHandler = null;
    const route = location.hash.replace(/^#\/?/, '').split('?')[0];
    document.querySelectorAll('.nav a').forEach(a => {
      const r = a.dataset.route;
      a.classList.toggle('active', r === route || (r === '' && route === 'study'));
    });
    document.body.classList.toggle('focus-mode', route === 'study' || (route === 'exam' && !!state.exam));
    (routes[route] || viewHome)();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  // Delegated click actions.
  const actions = {};
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key === '?') { actions.shortcuts(); return; }
    if (keyHandler) keyHandler(e);
  });

  function toast(msg) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }
  function dialog(html) {
    const d = $('#dialog');
    d.innerHTML = html;
    d.showModal();
    return d;
  }
  function confirmDialog(title, body, okLabel, onOk, danger) {
    const d = dialog(`<h2>${title}</h2><p class="muted">${body}</p>
      <div class="row"><button class="btn" data-act="closeDialog">Cancel</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" id="dlg-ok">${okLabel}</button></div>`);
    $('#dlg-ok', d).onclick = () => { d.close(); onOk(); };
  }
  actions.closeDialog = () => $('#dialog').close();
  actions.shortcuts = () => dialog(`<h2>Keyboard shortcuts</h2>
    <div class="shortcuts">
      <span class="kbd">A–F</span><span>Choose an option (or 1–6)</span>
      <span class="kbd">Enter</span><span>Submit / next question</span>
      <span class="kbd">G</span><span>Mark "I guessed" before submitting</span>
      <span class="kbd">F</span><span>Flag the question for later</span>
      <span class="kbd">N</span><span>Write a note (after answering)</span>
      <span class="kbd">← →</span><span>Previous / next (exam mode)</span>
      <span class="kbd">Esc</span><span>Leave a text field</span>
    </div>
    <div class="row"><button class="btn primary" data-act="closeDialog">Got it</button></div>`);

  // ---------- Home ----------
  function viewHome() {
    const t = today();
    const o = overall();
    const plan = dailyPlan();
    const doneToday = (state.days[t] || {}).n || 0;
    const goal = state.dailyGoal;
    const ringPct = Math.min(1, doneToday / goal);
    const C = 2 * Math.PI * 46;
    const daysLeft = state.examDate ? daysBetween(t, state.examDate) : null;
    const unseen = QUESTIONS.length - o.seen;
    const s = state.session;
    const sessionLeft = s && s.i < s.ids.length ? s.ids.length - s.i : 0;

    let countdown;
    if (daysLeft === null) countdown = `<div class="date-prompt"><span class="muted">When is your exam?</span><input type="date" id="exam-date" min="${t}"></div>`;
    else if (daysLeft > 0) countdown = `<p class="sub"><b>${plural(daysLeft, 'day', 'days')}</b> until your exam · ${new Date(state.examDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' })}${unseen > 0 ? ` · about ${Math.ceil(unseen / daysLeft)} new questions a day covers the rest of the bank` : ''}</p>`;
    else if (daysLeft === 0) countdown = `<p class="sub"><b>Exam day.</b> Light review only — read your notes and trust your preparation.</p>`;
    else countdown = `<p class="sub">Your exam date has passed. <a href="#/settings">Set a new one</a>.</p>`;

    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const title = doneToday >= goal ? 'Daily goal done. Nice work.' : doneToday ? 'Keep going.' : `${greet}.`;

    const heat = [];
    const start = addDays(t, -34);
    for (let i = 0; i < 35; i++) {
      const d = addDays(start, i);
      const n = (state.days[d] || {}).n || 0;
      const lvl = n === 0 ? '' : n < goal / 2 ? 'l1' : n < goal ? 'l2' : 'l3';
      heat.push(`<i class="${lvl} ${d === t ? 'today' : ''}" title="${d}: ${n} answered"></i>`);
    }

    const mistakes = QUESTIONS.filter(q => isMistake(q.id)).length;
    const flagged = QUESTIONS.filter(q => getCard(q.id) && getCard(q.id).flagged).length;

    app.innerHTML = `
      <section class="hero enter">
        <div>
          <p class="eyebrow">AWS DevOps Engineer – Professional · DOP-C02</p>
          <h1>${title}</h1>
          ${countdown}
        </div>
        <div class="ring ${ringPct >= 1 ? 'done' : ''}" title="Today: ${doneToday} of ${goal}">
          <svg viewBox="0 0 112 112"><circle class="track" cx="56" cy="56" r="46"/><circle class="fill" cx="56" cy="56" r="46" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-offset="${C * (1 - ringPct)}"/></svg>
          <div class="ring-label"><b>${doneToday}</b><span>of ${goal} today</span></div>
        </div>
      </section>

      <div class="cta enter">
        ${sessionLeft
          ? `<button class="btn primary big" data-act="resume">Continue session · ${plural(sessionLeft, 'question', 'questions')} left ${ICON.arrow}</button>`
          : plan.ids.length
            ? `<button class="btn primary big" data-act="daily">Start today's session · ${plural(plan.ids.length, 'question', 'questions')} ${ICON.arrow}</button>`
            : `<button class="btn big" disabled>Nothing due — every question is scheduled for later</button>`}
      </div>
      ${!sessionLeft && plan.ids.length ? `<p class="faint" style="margin:-10px 0 20px;font-size:13.5px">${plan.due ? `${plan.due} due for review` : 'No reviews due'}${plan.fresh ? ` · ${plan.fresh} new` : ''} · wrong answers come back at the end of the session</p>` : ''}

      <div class="grid stats enter">
        <div class="card stat"><b>${streak()}</b><span>day streak</span></div>
        <div class="card stat"><b>${o.seen}<span class="faint" style="font-size:16px;font-weight:600"> / ${QUESTIONS.length}</span></b><span>questions seen</span></div>
        <div class="card stat"><b>${o.seen ? pct(o.right, o.right + o.wrong) + '%' : '—'}</b><span>accuracy</span></div>
        <div class="card stat"><b>${o.seen ? Math.round(o.readiness * 100) + '%' : '—'}</b><span>readiness <span title="Weighted by exam domain: recent accuracy × coverage. Aim for 80%+." style="cursor:help">ⓘ</span></span></div>
      </div>

      <section class="card enter" style="margin-top:12px">
        <div class="spread"><h2>Domains</h2><span class="faint" style="font-size:13px">bar = recent accuracy · faded = coverage</span></div>
        <div class="domains">
          ${DOMAINS.map(d => {
            const st = domainStats(d.key);
            return `<button class="domain-row" style="--dc:var(--d-${d.key})" data-act="practiceDomain" data-domain="${d.key}" title="Practice ${esc(d.name)}">
              <span class="domain-name"><span class="dot"></span>${esc(d.name)} <small>${d.weight}%</small></span>
              <span class="bar"><i class="seen" style="width:${pct(st.seen, st.total)}%"></i><i style="width:${Math.round(st.accuracy * pct(st.seen, st.total))}%"></i></span>
              <span class="domain-pct">${st.seen ? Math.round(st.accuracy * 100) + '%' : '—'}<small>${st.seen}/${st.total} seen</small></span>
            </button>`;
          }).join('')}
        </div>
      </section>

      <div class="grid modes enter" style="margin-top:12px">
        <button class="card mode" data-act="nav" data-to="exam"><span class="ico">${ICON.clock}</span><span><h3>Exam simulation</h3><p>${Math.min(EXAM_SIZE, QUESTIONS.length)} questions, timed, no feedback until the end.${state.exams.length ? ` Last: ${state.exams[state.exams.length - 1].pct}%` : ''}</p></span></button>
        <button class="card mode" data-act="startList" data-list="mistakes" ${mistakes ? '' : 'disabled style="opacity:.55;cursor:default"'}><span class="ico">${ICON.redo}</span><span><h3>Redo mistakes</h3><p>${mistakes ? `${plural(mistakes, 'question', 'questions')} you last got wrong or guessed.` : 'No mistakes to redo yet.'}</p></span></button>
        <button class="card mode" data-act="nav" data-to="practice"><span class="ico">${ICON.target}</span><span><h3>Practice by domain</h3><p>Drill one domain, weakest questions first.</p></span></button>
        <button class="card mode" data-act="nav" data-to="review"><span class="ico">${ICON.book}</span><span><h3>Review & notes</h3><p>${flagged ? `${flagged} flagged · ` : ''}Browse every question, your notes and traps.</p></span></button>
      </div>

      <section class="card enter" style="margin-top:12px">
        <div class="spread"><h2>Last 5 weeks</h2><span class="faint" style="font-size:13px">${Object.values(state.days).reduce((a, d) => a + d.n, 0)} answers total</span></div>
        <div class="heat">${heat.join('')}</div>
        <div class="legend"><span>Light: started</span><span>Medium: half the goal</span><span>Full: goal met</span></div>
      </section>`;

    requestAnimationFrame(() => {
      const f = $('.ring .fill');
      if (f) f.style.strokeDashoffset = f.dataset.offset;
    });
    const dateInput = $('#exam-date');
    if (dateInput) dateInput.onchange = () => { state.examDate = dateInput.value; save(); render(); };
    keyHandler = e => { if (e.key === 'Enter') (sessionLeft ? actions.resume : actions.daily)(); };
  }

  actions.nav = el => go(el.dataset.to);
  actions.daily = () => {
    const plan = dailyPlan();
    if (!plan.ids.length) return toast('Nothing due right now.');
    startSession('daily', "Today's session", plan.ids);
  };
  actions.resume = () => go('study');
  actions.practiceDomain = el => startDomain(el.dataset.domain, 15);
  actions.startList = el => {
    const ids = listIds(el.dataset.list);
    if (!ids.length) return toast('Nothing in this list yet.');
    startSession(el.dataset.list, el.dataset.list === 'mistakes' ? 'Redo mistakes' : 'Flagged questions', shuffle(ids));
  };

  function startDomain(key, n) {
    const qs = QUESTIONS.filter(q => q.domain === key);
    // Weakest first: unseen and mistakes, then lowest box.
    const score = q => { const c = getCard(q.id); if (!c || !c.seen) return 0; return isMistake(q.id) ? -1 : c.box; };
    const ids = shuffle(qs).sort((a, b) => score(a) - score(b)).slice(0, n).map(q => q.id);
    startSession('domain', DOMAIN[key].name, shuffle(ids));
  }

  function startSession(mode, title, ids) {
    state.session = { mode, title, ids, i: 0, orders: {}, results: {}, requeued: {}, chosen: [], revealed: false, guessed: false };
    save();
    go('study');
    if (location.hash === '#/study') render();
  }

  // ---------- Question rendering ----------
  function optionOrder(store, key, q) {
    if (!store[key] || store[key].length !== q.options.length) store[key] = shuffle(q.options.map((_, i) => i));
    return store[key];
  }

  function questionHtml(q, order, chosen, revealed) {
    const c = getCard(q.id);
    const multi = q.select > 1;
    return `
      <div class="q-meta">
        <span class="chip domain" style="--dc:var(--d-${q.domain})">${esc(DOMAIN[q.domain].name)}</span>
        <span class="chip">${esc(q.topic)}</span>
        ${q.difficulty === 'hard' ? '<span class="chip hard">Hard</span>' : ''}
        ${!c || !c.seen ? '<span class="chip new">New</span>' : ''}
      </div>
      <p class="scenario">${fmt(q.scenario)}</p>
      <p class="ask">${highlightAsk(q)}</p>
      <div class="options" role="${multi ? 'group' : 'radiogroup'}">
        ${order.map((oi, pos) => {
          const o = q.options[oi];
          const isChosen = chosen.includes(oi);
          let cls = '';
          if (revealed) cls = o.correct ? (isChosen ? 'right' : 'missed') : (isChosen ? 'wrong' : 'dim');
          else if (isChosen) cls = 'chosen';
          const label = revealed ? (o.correct ? (isChosen ? 'Correct.' : 'Also correct — you missed this.') : (isChosen ? 'Wrong.' : 'Not correct.')) : '';
          return `<button class="opt ${multi ? 'multi' : ''} ${cls}" data-act="choose" data-oi="${oi}" ${revealed ? 'disabled' : ''} aria-pressed="${isChosen}">
            <span class="key">${LETTERS[pos]}</span>
            <span>${fmt(o.text)}</span>
            ${revealed ? `<span class="why"><b>${label}</b> ${fmt(o.why)}</span>` : ''}
          </button>`;
        }).join('')}
      </div>`;
  }

  const isCorrect = (q, chosen) => {
    const right = q.options.map((o, i) => (o.correct ? i : -1)).filter(i => i >= 0);
    return chosen.length === right.length && right.every(i => chosen.includes(i));
  };

  // ---------- Study session ----------
  function viewStudy() {
    const s = state.session;
    if (!s) return go('');
    if (s.i >= s.ids.length) return viewSummary();
    const id = s.ids[s.i];
    const q = BY_ID[id];
    if (!q) { s.i++; save(); return viewStudy(); }

    const order = optionOrder(s.orders, String(s.i), q);
    const c = getCard(id) || {};
    const firstTotal = s.ids.length - Object.keys(s.requeued).length;
    const answered = Object.keys(s.results).length;
    const ok = s.revealed && isCorrect(q, s.chosen);
    const isRetry = !!s.requeued[id] && s.ids.indexOf(id) !== s.i;

    app.innerHTML = `
      <div class="study-top">
        <a href="#/" class="icon-btn" aria-label="Leave session (progress is saved)" title="Leave (progress is saved)">${ICON.close}</a>
        <div class="progress" aria-hidden="true"><i style="width:${pct(s.i, s.ids.length)}%"></i></div>
        <span class="counter">${s.i + 1} / ${s.ids.length}</span>
        <button class="icon-btn ${c.flagged ? 'on' : ''}" data-act="flag" aria-label="Flag question" title="Flag (F)">${ICON.flag}</button>
      </div>
      ${isRetry ? '<p class="chip new" style="margin:0 0 12px">Second try — you missed this earlier in the session</p>' : ''}
      <article class="enter">
        ${questionHtml(q, order, s.chosen, s.revealed)}
        ${s.revealed ? `
          <div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? ICON.check : ICON.x}
            <span>${ok ? (s.guessed ? 'Correct — but you guessed, so it comes back tomorrow.' : 'Correct.') : 'Not quite.'}
            <small>${ok ? (s.guessed ? 'Read why each option is right or wrong.' : `Next review in ${plural(INTERVALS[(getCard(id) || {}).box || 1], 'day', 'days')}.`) : 'It comes back at the end of this session and again tomorrow.'}</small></span>
          </div>
          <div class="takeaway"><p class="eyebrow">Remember</p><p>${fmt(q.takeaway)}</p></div>
          ${q.trap ? `<p class="trap"><b>Trap:</b> ${fmt(q.trap)}</p>` : ''}
          <div class="note"><label for="note">Your note — the trap in your own words</label>
            <textarea id="note" placeholder="e.g. Parameter Store has no native rotation → Secrets Manager">${esc(c.note || '')}</textarea></div>
        ` : ''}
      </article>
      <div class="actionbar"><div class="actionbar-inner">
        ${s.revealed
          ? `<span class="hint grow">${answered} of ${firstTotal} answered · ${Object.values(s.results).filter(Boolean).length} correct</span>
             <button class="btn primary" data-act="next" id="next-btn">${s.i + 1 >= s.ids.length ? 'Finish' : 'Next'} <span class="kbd">Enter</span></button>`
          : `<label class="toggle grow"><input type="checkbox" id="guessed" ${s.guessed ? 'checked' : ''}> I guessed <span class="kbd">G</span></label>
             <button class="btn primary" data-act="submit" id="submit-btn" ${s.chosen.length === q.select ? '' : 'disabled'}>${q.select > 1 && s.chosen.length !== q.select ? `Choose ${q.select} (${s.chosen.length})` : 'Check answer'} <span class="kbd">Enter</span></button>`}
      </div></div>`;

    const g = $('#guessed');
    if (g) g.onchange = () => { s.guessed = g.checked; save(); };
    const note = $('#note');
    if (note) note.oninput = () => { ensureCard(id).note = note.value; save(); };

    keyHandler = e => {
      const k = e.key.toUpperCase();
      if (!s.revealed) {
        let pos = LETTERS.indexOf(k);
        if (/^[1-6]$/.test(e.key)) pos = Number(e.key) - 1;
        if (pos >= 0 && pos < order.length) { e.preventDefault(); toggleChoice(s, q, order[pos]); return; }
        if (k === 'G') { s.guessed = !s.guessed; save(); viewStudy(); return; }
        if (e.key === 'Enter' && s.chosen.length === q.select) { e.preventDefault(); actions.submit(); return; }
      } else {
        if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); actions.next(); return; }
        if (k === 'N' && note) { e.preventDefault(); note.focus(); return; }
      }
      if (k === 'F') actions.flag();
    };
  }

  function toggleChoice(s, q, oi) {
    if (q.select === 1) s.chosen = [oi];
    else if (s.chosen.includes(oi)) s.chosen = s.chosen.filter(x => x !== oi);
    else if (s.chosen.length < q.select) s.chosen = s.chosen.concat(oi);
    else { toast(`Choose exactly ${q.select} — unselect one first`); return; }
    save();
    viewStudy();
  }

  actions.choose = el => {
    if (location.hash.startsWith('#/exam')) return examChoose(Number(el.dataset.oi));
    const s = state.session;
    toggleChoice(s, BY_ID[s.ids[s.i]], Number(el.dataset.oi));
  };
  actions.submit = () => {
    const s = state.session;
    const id = s.ids[s.i];
    const q = BY_ID[id];
    if (s.chosen.length !== q.select) return;
    const ok = isCorrect(q, s.chosen);
    const firstAttempt = !(id in s.results);
    if (firstAttempt) {
      s.results[id] = ok && !s.guessed;
      record(id, ok, s.guessed);
    }
    if ((!ok || s.guessed) && !s.requeued[id] && firstAttempt) {
      s.requeued[id] = true;
      s.ids.push(id);
    }
    s.revealed = true;
    save();
    viewStudy();
  };
  actions.next = () => {
    const s = state.session;
    s.i++;
    s.chosen = [];
    s.revealed = false;
    s.guessed = false;
    save();
    viewStudy();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  actions.flag = () => {
    const s = state.session;
    const c = ensureCard(s.ids[s.i]);
    c.flagged = !c.flagged;
    save();
    toast(c.flagged ? 'Flagged for review' : 'Flag removed');
    viewStudy();
  };

  function viewSummary() {
    const s = state.session;
    const ids = Object.keys(s.results);
    const right = ids.filter(id => s.results[id]).length;
    const missed = ids.filter(id => !s.results[id]);
    const p = pct(right, ids.length);
    const t = today();
    const doneToday = (state.days[t] || {}).n || 0;
    app.innerHTML = `
      <div class="stack">
        <section class="card enter" style="text-align:center;padding:32px 20px">
          <p class="eyebrow">${esc(s.title)} · complete</p>
          <div class="summary-score ${p >= 80 ? 'pass' : p < 60 ? 'fail' : ''}">${p}<small>%</small></div>
          <p class="muted" style="margin:10px 0 0">${right} of ${ids.length} right on the first try · ${doneToday} answered today${doneToday >= state.dailyGoal ? ' — daily goal met 🎯' : ''}</p>
          <div class="row" style="justify-content:center;margin-top:20px">
            <a href="#/" class="btn">Back to today</a>
            ${missed.length ? `<button class="btn primary" data-act="redoMissed">Redo the ${plural(missed.length, 'miss', 'misses')}</button>` : ''}
          </div>
        </section>
        ${missed.length ? `<section class="enter"><h2 style="margin-bottom:10px">Missed or guessed</h2><div class="list">${missed.map(listItem).join('')}</div></section>` : ''}
      </div>`;
    actions.redoMissed = () => startSession('mistakes', 'Redo the misses', shuffle(missed));
    keyHandler = e => { if (e.key === 'Enter') go(''); };
  }

  function listItem(id) {
    const q = BY_ID[id];
    const c = getCard(id);
    let st = '';
    if (c && c.seen) st = c.box >= MASTERED_BOX ? 'mastered' : isMistake(id) ? 'bad' : 'ok';
    return `<button class="list-item" data-act="openOne" data-id="${id}">
      <span class="status ${st}" title="${st || 'unseen'}"></span>
      <span><span class="title">${esc(q.topic)}</span> <span class="faint" style="font-size:12.5px">· ${esc(DOMAIN[q.domain].name)}${c && c.flagged ? ' · flagged' : ''}</span>
        <span class="sub">${esc(c && c.note ? '✎ ' + c.note : q.scenario)}</span></span>
      <span class="faint">${ICON.arrow}</span>
    </button>`;
  }
  actions.openOne = el => startSession('single', 'Single question', [el.dataset.id]);

  // ---------- Practice ----------
  function viewPractice() {
    app.innerHTML = `
      <div class="stack">
        <div class="enter"><p class="eyebrow">Practice</p><h1>Drill a domain</h1>
          <p class="muted" style="margin:8px 0 0">Sessions of 15. Unseen questions and recent mistakes come first.</p></div>
        <div class="grid modes">
          ${DOMAINS.map(d => {
            const st = domainStats(d.key);
            return `<button class="card mode enter" style="--dc:var(--d-${d.key})" data-act="practiceDomain" data-domain="${d.key}">
              <span class="ico" style="background:color-mix(in srgb,var(--dc) 15%,transparent);color:var(--dc)"><b>${d.weight}%</b></span>
              <span style="flex:1"><h3>${esc(d.name)}</h3>
                <p>${st.seen}/${st.total} seen · ${st.mastered} mastered${st.seen ? ` · ${Math.round(st.accuracy * 100)}% recent` : ''}</p>
                <span class="bar" style="margin-top:10px;display:block"><i class="seen" style="width:${pct(st.seen, st.total)}%"></i><i style="width:${pct(st.mastered, st.total)}%"></i></span></span>
            </button>`;
          }).join('')}
        </div>
        <div class="card enter spread">
          <div><h2>Mixed set</h2><p class="muted" style="margin:4px 0 0">15 questions across all domains, weighted like the real exam.</p></div>
          <button class="btn primary" data-act="mixed">Start mixed ${ICON.arrow}</button>
        </div>
      </div>`;
  }
  actions.mixed = () => startSession('mixed', 'Mixed set', pickBalanced(QUESTIONS, 15).map(q => q.id));

  // ---------- Exam simulation ----------
  function viewExam() {
    if (state.exam) return state.exam.submitted ? viewExamResults(state.exam) : viewExamQuestion();
    const size = Math.min(EXAM_SIZE, QUESTIONS.length);
    const minutes = Math.round(EXAM_MINUTES * size / EXAM_SIZE);
    const past = state.exams.slice(-6).reverse();
    app.innerHTML = `
      <div class="stack">
        <div class="enter"><p class="eyebrow">Exam simulation</p><h1>Full practice exam</h1>
          <p class="muted" style="margin:8px 0 0">${size} questions in ${minutes} minutes, weighted by domain like DOP-C02. No feedback until you submit. Flag anything that takes more than 3 minutes and come back to it.</p></div>
        <div class="card enter spread">
          <div class="row" style="gap:22px">
            <div><b style="font-size:22px">${size}</b><br><span class="faint">questions</span></div>
            <div><b style="font-size:22px">${minutes}m</b><br><span class="faint">time limit</span></div>
            <div><b style="font-size:22px">${PASS_PCT}%</b><br><span class="faint">pass mark ≈</span></div>
          </div>
          <button class="btn primary big" data-act="startExam">Start exam ${ICON.arrow}</button>
        </div>
        ${state.lastExam ? `<div class="card enter spread"><div><h2>Last exam</h2><p class="muted" style="margin:4px 0 0">Review every answer with explanations.</p></div><button class="btn" data-act="reviewLast">Review last exam</button></div>` : ''}
        ${past.length ? `<section class="card enter"><h2>History</h2><div class="list" style="margin-top:12px">${past.map(x => `
          <div class="list-item" style="cursor:default;grid-template-columns:1fr auto">
            <span><span class="title">${x.date}</span> <span class="faint">· ${x.right}/${x.total} · ${Math.round(x.secs / 60)} min</span></span>
            <b class="${x.pct >= PASS_PCT ? 'pass' : 'fail'}">${x.pct}%</b></div>`).join('')}</div></section>` : ''}
      </div>`;
    keyHandler = e => { if (e.key === 'Enter') actions.startExam(); };
  }

  actions.startExam = () => {
    const size = Math.min(EXAM_SIZE, QUESTIONS.length);
    const ids = shuffle(pickBalanced(QUESTIONS, size).map(q => q.id));
    const secs = Math.round(EXAM_MINUTES * 60 * size / EXAM_SIZE);
    state.exam = { ids, i: 0, answers: {}, flags: {}, orders: {}, start: Date.now(), endsAt: Date.now() + secs * 1000, submitted: false };
    save();
    render();
  };
  actions.reviewLast = () => { state.exam = Object.assign({}, state.lastExam, { reviewing: true }); save(); render(); };

  function examTimeLeft(ex) { return Math.max(0, Math.round((ex.endsAt - Date.now()) / 1000)); }
  const clock = s => `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

  function viewExamQuestion(showGrid) {
    const ex = state.exam;
    const id = ex.ids[ex.i];
    const q = BY_ID[id];
    if (!q) { state.exam = null; save(); return viewExam(); }
    const order = optionOrder(ex.orders, id, q);
    const chosen = ex.answers[id] || [];
    const answeredN = Object.values(ex.answers).filter(a => a.length).length;
    const left = examTimeLeft(ex);

    app.innerHTML = `
      <div class="study-top">
        <button class="icon-btn" data-act="examQuit" aria-label="Quit exam" title="Quit exam">${ICON.close}</button>
        <span class="timer ${left < 600 ? 'low' : ''}" id="timer">${clock(left)}</span>
        <div class="progress" aria-hidden="true"><i style="width:${pct(answeredN, ex.ids.length)}%"></i></div>
        <button class="counter linkish" data-act="examGrid" style="text-decoration:none">${ex.i + 1} / ${ex.ids.length} ▾</button>
        <button class="icon-btn ${ex.flags[id] ? 'on' : ''}" data-act="examFlag" aria-label="Flag for review" title="Flag (F)">${ICON.flag}</button>
      </div>
      ${showGrid ? navGrid(ex) : ''}
      <article class="enter">${questionHtml(q, order, chosen, false)}</article>
      <div class="actionbar"><div class="actionbar-inner">
        <button class="btn" data-act="examPrev" ${ex.i === 0 ? 'disabled' : ''}>← Prev</button>
        <span class="hint grow" style="text-align:center">${answeredN} of ${ex.ids.length} answered${Object.values(ex.flags).filter(Boolean).length ? ` · ${Object.values(ex.flags).filter(Boolean).length} flagged` : ''}</span>
        ${ex.i + 1 < ex.ids.length
          ? `<button class="btn primary" data-act="examNext">Next → </button>`
          : `<button class="btn primary" data-act="examReview">Review & submit</button>`}
      </div></div>`;

    timer = setInterval(() => {
      const l = examTimeLeft(ex);
      const el = $('#timer');
      if (el) { el.textContent = clock(l); el.classList.toggle('low', l < 600); }
      if (l <= 0) { clearInterval(timer); toast("Time's up — exam submitted"); submitExam(); }
    }, 1000);

    keyHandler = e => {
      const k = e.key.toUpperCase();
      let pos = LETTERS.indexOf(k);
      if (/^[1-6]$/.test(e.key)) pos = Number(e.key) - 1;
      if (pos >= 0 && pos < order.length) { e.preventDefault(); examChoose(order[pos]); return; }
      if (k === 'F') actions.examFlag();
      if (e.key === 'ArrowLeft') actions.examPrev();
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); ex.i + 1 < ex.ids.length ? actions.examNext() : actions.examReview(); }
    };
  }

  function navGrid(ex, results) {
    return `<div class="card" style="margin-bottom:16px"><div class="navgrid">${ex.ids.map((id, i) => {
      let cls = '';
      if (results) cls = results[id] ? 'right' : 'wrong';
      else cls = (ex.answers[id] || []).length ? 'answered' : '';
      return `<button class="${cls} ${i === ex.i && !results ? 'current' : ''} ${ex.flags[id] ? 'flagged' : ''}" data-act="examJump" data-i="${i}">${i + 1}</button>`;
    }).join('')}</div>
    <div class="legend"><span>Filled: answered</span><span>Dot: flagged</span>${results ? '<span>Green / red: right / wrong</span>' : ''}</div></div>`;
  }

  function examChoose(oi) {
    const ex = state.exam;
    if (!ex || ex.submitted) return;
    const id = ex.ids[ex.i];
    const q = BY_ID[id];
    let a = ex.answers[id] || [];
    if (q.select === 1) a = [oi];
    else if (a.includes(oi)) a = a.filter(x => x !== oi);
    else if (a.length < q.select) a = a.concat(oi);
    else { toast(`Choose exactly ${q.select} — unselect one first`); return; }
    ex.answers[id] = a;
    save();
    viewExamQuestion();
  }
  actions.examNext = () => { const ex = state.exam; if (ex.i + 1 < ex.ids.length) { ex.i++; save(); viewExamQuestion(); window.scrollTo(0, 0); } };
  actions.examPrev = () => { const ex = state.exam; if (ex.i > 0) { ex.i--; save(); viewExamQuestion(); window.scrollTo(0, 0); } };
  actions.examFlag = () => { const ex = state.exam; const id = ex.ids[ex.i]; ex.flags[id] = !ex.flags[id]; save(); viewExamQuestion(); };
  actions.examGrid = () => viewExamQuestion(!$('#app .navgrid'));
  actions.examJump = el => {
    const ex = state.exam;
    ex.i = Number(el.dataset.i);
    save();
    if (ex.submitted) viewExamResults(ex, true); else viewExamQuestion();
    window.scrollTo(0, 0);
  };
  actions.examQuit = () => confirmDialog('Quit this exam?', 'Your answers will be discarded and nothing is recorded.', 'Quit exam', () => { state.exam = null; save(); render(); }, true);
  actions.examReview = () => {
    const ex = state.exam;
    const unanswered = ex.ids.filter(id => !(ex.answers[id] || []).length).length;
    const flagged = Object.values(ex.flags).filter(Boolean).length;
    const d = dialog(`<h2>Submit exam?</h2>
      <p class="muted">${unanswered ? `<b>${plural(unanswered, 'question is', 'questions are')} unanswered</b> — unanswered questions count as wrong. ` : 'Every question is answered. '}${flagged ? `${plural(flagged, 'question is', 'questions are')} flagged.` : ''}</p>
      ${navGrid(ex)}
      <div class="row"><button class="btn" data-act="closeDialog">Keep working</button><button class="btn primary" id="dlg-ok">Submit</button></div>`);
    d.querySelectorAll('[data-act="examJump"]').forEach(b => b.addEventListener('click', () => d.close()));
    $('#dlg-ok', d).onclick = () => { d.close(); submitExam(); };
  };

  function submitExam() {
    const ex = state.exam;
    if (!ex || ex.submitted) return;
    clearInterval(timer);
    const results = {};
    for (const id of ex.ids) {
      const ok = isCorrect(BY_ID[id], ex.answers[id] || []);
      results[id] = ok;
      record(id, ok, false);
    }
    const right = Object.values(results).filter(Boolean).length;
    ex.submitted = true;
    ex.results = results;
    ex.secs = Math.round((Math.min(Date.now(), ex.endsAt) - ex.start) / 1000);
    ex.i = 0;
    state.exams.push({ date: today(), right, total: ex.ids.length, pct: pct(right, ex.ids.length), secs: ex.secs });
    state.lastExam = ex;
    save();
    go('exam');
    render();
  }

  function viewExamResults(ex, detail) {
    const results = ex.results;
    const right = Object.values(results).filter(Boolean).length;
    const p = pct(right, ex.ids.length);
    if (detail) {
      const id = ex.ids[ex.i];
      const q = BY_ID[id];
      app.innerHTML = `
        <div class="study-top">
          <button class="icon-btn" data-act="examBackToResults" aria-label="Back to results">${ICON.close}</button>
          <div class="progress"><i style="width:${pct(ex.i + 1, ex.ids.length)}%"></i></div>
          <span class="counter">${ex.i + 1} / ${ex.ids.length}</span>
        </div>
        <article class="enter">
          ${questionHtml(q, optionOrder(ex.orders, id, q), ex.answers[id] || [], true)}
          <div class="verdict ${results[id] ? 'ok' : 'bad'}">${results[id] ? ICON.check : ICON.x}<span>${results[id] ? 'Correct' : (ex.answers[id] || []).length ? 'Wrong' : 'Not answered'}</span></div>
          <div class="takeaway"><p class="eyebrow">Remember</p><p>${fmt(q.takeaway)}</p></div>
          ${q.trap ? `<p class="trap"><b>Trap:</b> ${fmt(q.trap)}</p>` : ''}
        </article>
        <div class="actionbar"><div class="actionbar-inner">
          <button class="btn" data-act="resPrev" ${ex.i === 0 ? 'disabled' : ''}>← Prev</button>
          <label class="toggle grow" style="justify-content:center"><input type="checkbox" id="only-wrong" ${ex.onlyWrong ? 'checked' : ''}> Only wrong</label>
          <button class="btn primary" data-act="resNext">Next →</button>
        </div></div>`;
      $('#only-wrong').onchange = e => { ex.onlyWrong = e.target.checked; save(); };
      keyHandler = e => {
        if (e.key === 'ArrowLeft') actions.resPrev();
        if (e.key === 'ArrowRight' || e.key === 'Enter') actions.resNext();
        if (e.key === 'Escape') actions.examBackToResults();
      };
      return;
    }
    const byDomain = DOMAINS.map(d => {
      const ids = ex.ids.filter(id => BY_ID[id].domain === d.key);
      return { d, n: ids.length, r: ids.filter(id => results[id]).length };
    }).filter(x => x.n);
    app.innerHTML = `
      <div class="stack">
        <section class="card enter" style="text-align:center;padding:32px 20px">
          <p class="eyebrow">Exam result · ${clock(ex.secs || 0)} used</p>
          <div class="summary-score ${p >= PASS_PCT ? 'pass' : 'fail'}">${p}<small>%</small></div>
          <p style="margin:10px 0 0;font-weight:700" class="${p >= PASS_PCT ? 'pass' : 'fail'}">${p >= 80 ? 'Exam-ready territory' : p >= PASS_PCT ? 'Likely pass — push for 80%+' : 'Below the pass mark — keep drilling'}</p>
          <p class="muted" style="margin:6px 0 0">${right} of ${ex.ids.length} correct</p>
          <div class="row" style="justify-content:center;margin-top:20px">
            <button class="btn" data-act="examDone">Done</button>
            <button class="btn primary" data-act="examDetail">Review answers ${ICON.arrow}</button>
          </div>
        </section>
        <section class="card enter"><h2>By domain</h2><div class="domains">
          ${byDomain.map(x => `<div class="domain-row static" style="--dc:var(--d-${x.d.key})">
            <span class="domain-name"><span class="dot"></span>${esc(x.d.name)}</span>
            <span class="bar"><i style="width:${pct(x.r, x.n)}%"></i></span>
            <span class="domain-pct">${pct(x.r, x.n)}%<small>${x.r}/${x.n}</small></span></div>`).join('')}
        </div></section>
        <section class="enter"><h2 style="margin-bottom:10px">All questions</h2>${navGrid(ex, results)}</section>
      </div>`;
    keyHandler = e => { if (e.key === 'Enter') actions.examDetail(); };
  }
  actions.examDetail = () => { const ex = state.exam; ex.i = ex.onlyWrong ? Math.max(0, ex.ids.findIndex(id => !ex.results[id])) : 0; save(); viewExamResults(ex, true); };
  actions.examBackToResults = () => viewExamResults(state.exam);
  actions.examDone = () => { state.exam = null; save(); render(); };
  function stepResult(dir) {
    const ex = state.exam;
    let i = ex.i;
    do { i += dir; } while (ex.onlyWrong && i >= 0 && i < ex.ids.length && ex.results[ex.ids[i]]);
    if (i < 0) return;
    if (i >= ex.ids.length) return viewExamResults(ex);
    ex.i = i;
    save();
    viewExamResults(ex, true);
    window.scrollTo(0, 0);
  }
  actions.resNext = () => stepResult(1);
  actions.resPrev = () => stepResult(-1);

  // ---------- Review / browse ----------
  let reviewFilter = { tab: 'all', domain: '', q: '' };
  function listIds(kind) {
    return QUESTIONS.filter(q => {
      const c = getCard(q.id);
      if (kind === 'mistakes') return isMistake(q.id);
      if (kind === 'flagged') return c && c.flagged;
      if (kind === 'notes') return c && c.note;
      if (kind === 'unseen') return !c || !c.seen;
      if (kind === 'mastered') return c && c.box >= MASTERED_BOX;
      return true;
    }).map(q => q.id);
  }
  function viewReview() {
    const tabs = [['all', 'All'], ['mistakes', 'Mistakes'], ['flagged', 'Flagged'], ['notes', 'My notes'], ['unseen', 'Unseen'], ['mastered', 'Mastered']];
    const draw = () => {
      const term = reviewFilter.q.trim().toLowerCase();
      const ids = listIds(reviewFilter.tab).filter(id => {
        const q = BY_ID[id];
        if (reviewFilter.domain && q.domain !== reviewFilter.domain) return false;
        if (!term) return true;
        const c = getCard(id);
        return [q.topic, q.scenario, q.question, q.takeaway, (q.services || []).join(' '), c && c.note].join(' ').toLowerCase().includes(term);
      });
      $('#review-list').innerHTML = ids.length
        ? ids.slice(0, 300).map(listItem).join('')
        : `<div class="empty">${ICON.book}<p>Nothing here yet.</p></div>`;
      $('#review-count').textContent = plural(ids.length, 'question', 'questions');
      $('#practice-list').disabled = !ids.length;
      $('#practice-list').onclick = () => startSession('custom', 'Custom set', shuffle(ids).slice(0, 40));
    };
    app.innerHTML = `
      <div class="enter" style="margin-bottom:16px"><p class="eyebrow">Review</p><h1>Question bank</h1>
        <p class="muted" style="margin:8px 0 0">Read your notes before every practice exam — the same traps keep coming back.</p></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${reviewFilter.tab === k ? 'active' : ''}" data-act="reviewTab" data-tab="${k}">${l}<span>${listIds(k).length}</span></button>`).join('')}</div>
      <div class="filters">
        <input type="search" id="review-q" placeholder="Search topic, service, scenario or your notes…" value="${esc(reviewFilter.q)}">
        <select id="review-domain"><option value="">All domains</option>${DOMAINS.map(d => `<option value="${d.key}" ${reviewFilter.domain === d.key ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
        <button class="btn primary" id="practice-list">Practise these</button>
      </div>
      <p class="faint" id="review-count" style="font-size:13px;margin:0 0 8px"></p>
      <div class="list" id="review-list"></div>`;
    $('#review-q').oninput = e => { reviewFilter.q = e.target.value; draw(); };
    $('#review-domain').onchange = e => { reviewFilter.domain = e.target.value; draw(); };
    draw();
    keyHandler = e => { if (e.key === '/') { e.preventDefault(); $('#review-q').focus(); } };
  }
  actions.reviewTab = el => { reviewFilter.tab = el.dataset.tab; viewReview(); };

  // ---------- Settings ----------
  function viewSettings() {
    app.innerHTML = `
      <div class="stack">
        <div class="enter"><p class="eyebrow">Settings</p><h1>Your plan</h1></div>
        <section class="card enter stack">
          <div class="field"><label for="s-date">Exam date</label>
            <input type="date" id="s-date" value="${state.examDate}"><span class="help">Drives the countdown and the suggested daily pace.</span></div>
          <div class="field"><label>Daily goal</label>
            <div class="seg">${[15, 20, 30, 40, 50].map(n => `<button data-act="goal" data-n="${n}" class="${state.dailyGoal === n ? 'active' : ''}">${n}</button>`).join('')}</div>
            <span class="help">30–40 a day with every mistake reviewed is a good pace for a month of preparation.</span></div>
          <div class="field"><label>Theme</label>
            <div class="seg">${[['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button data-act="theme" data-t="${k}" class="${state.theme === k ? 'active' : ''}">${l}</button>`).join('')}</div></div>
        </section>
        <section class="card enter stack">
          <div><h2>Your progress</h2><p class="muted" style="margin:4px 0 0">Saved in this browser only. Export it to back it up or move to another device.</p></div>
          <div class="row">
            <button class="btn" data-act="export">Export progress</button>
            <label class="btn" style="cursor:pointer">Import progress<input type="file" id="import" accept="application/json" hidden></label>
            <button class="btn danger" data-act="reset">Reset everything</button>
          </div>
        </section>
        <section class="card enter"><h2>About the questions</h2>
          <p class="muted" style="margin:6px 0 0">${QUESTIONS.length} original scenario questions across the six DOP-C02 domains, each with an explanation for every option. Not real exam questions — use them alongside a reputable practice-exam set.</p></section>
      </div>`;
    $('#s-date').onchange = e => { state.examDate = e.target.value; save(); toast('Exam date saved'); };
    $('#import').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then(txt => {
        const data = JSON.parse(txt);
        if (!data || typeof data.cards !== 'object') throw new Error('bad file');
        state = Object.assign(defaults(), data);
        save();
        applyTheme();
        toast('Progress imported');
        render();
      }).catch(() => toast('That file is not a valid progress export'));
    };
  }
  actions.goal = el => { state.dailyGoal = Number(el.dataset.n); save(); viewSettings(); };
  actions.theme = el => { state.theme = el.dataset.t; save(); applyTheme(); viewSettings(); };
  actions.export = () => {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dop-c02-progress-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  actions.reset = () => confirmDialog('Reset all progress?', 'This deletes every answer, note, flag and exam result in this browser. Export first if you might want it back.', 'Reset everything', () => {
    state = defaults();
    save();
    applyTheme();
    toast('Progress reset');
    go('');
  }, true);

  function applyTheme() {
    if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.theme);
  }

  applyTheme();
  render();
})();
