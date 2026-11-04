/**
 * Urna Eletrônica UE2020 — Simulador
 * Interaction model based on the React reference design:
 * type digits -> inline preview -> CONFIRMA advances; FIM chime on last step.
 * Data-driven from candidates.json (positions[]), with admin results + persistence.
 */

const CONFIG = {
  dataFile: 'candidates.json',
  adminPassword: 'festa2025',
  fimDisplayMs: 5000,
  storageKey: 'urna_ue2020_votes',
  storageSessionKey: 'urna_ue2020_session'
};

const DEFAULT_DATA = {
  positions: [
    {
      id: 'federal', title: 'DEPUTADO FEDERAL', digits: 4,
      candidates: {
        '1010': { name: 'AURA SILVA', party: 'PDS (10)', photo: '' },
        '2020': { name: 'MARCOS OLIVEIRA', party: 'PRT (20)', photo: '' }
      }
    },
    {
      id: 'governador', title: 'GOVERNADOR', digits: 2,
      candidates: {
        '10': { name: 'SANTOS DUMONT', party: 'PDS (10)', vice: 'Priscila Costa', photo: '' },
        '20': { name: 'FERNANDA MONTENEGRO', party: 'PRT (20)', vice: 'Lázaro Ramos', photo: '' }
      }
    }
  ],
  blankVote: { label: 'VOTO EM BRANCO' },
  nullVote: { label: 'VOTO NULO' },
  labels: {
    banner: 'SEU VOTO VAI PARA',
    vice: 'Vice',
    suplente: 'Suplente'
  }
};

// ============================================
// STATE
// ============================================
const State = {
  positions: [],
  blankLabel: 'VOTO EM BRANCO',
  nullLabel: 'VOTO NULO',
  labels: { ...DEFAULT_DATA.labels },
  stepIndex: 0,
  digits: [],
  isBranco: false,
  isFinished: false,
  muted: false,
  votes: loadVotes(),
  sessionId: localStorage.getItem(CONFIG.storageSessionKey) || newSessionId()
};

function newSessionId() {
  const id = `session-${Date.now()}`;
  localStorage.setItem(CONFIG.storageSessionKey, id);
  return id;
}

function loadVotes() {
  try {
    return JSON.parse(localStorage.getItem('urna_ue2020_votes') || '[]');
  } catch (e) {
    console.warn('Corrupt votes in storage, resetting:', e);
    return [];
  }
}

function saveVotes() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(State.votes));
}

// ============================================
// DOM
// ============================================
const $ = id => document.getElementById(id);
const El = {
  bannerLabel: $('bannerLabel'), stepBadge: $('stepBadge'),
  stepTitle: $('stepTitle'), digitBoxes: $('digitBoxes'),
  detailsBox: $('detailsBox'), dName: $('dName'), dParty: $('dParty'),
  dVice: $('dVice'), kVice: $('kVice'), vName: $('vName'), vParty: $('vParty'), vVice: $('vVice'),
  statusMsg: $('statusMsg'), warnText: $('warnText'), bigText: $('bigText'),
  blankMsg: $('blankMsg'),
  photoBox: $('photoBox'), candidatePhoto: $('candidatePhoto'), photoCaption: $('photoCaption'),
  fimOverlay: $('fimOverlay'), resultsOverlay: $('resultsOverlay'),
  resultsBody: $('resultsBody'), resultsTotal: $('resultsTotal'),
  keysNumeric: $('keysNumeric'), btnBranco: $('btnBranco'), btnCorrige: $('btnCorrige'),
  btnConfirma: $('btnConfirma'), btnMute: $('btnMute'), btnMuteLabel: $('btnMuteLabel'),
  btnReset: $('btnReset'), btnResults: $('btnResults'),
  btnExport: $('btnExport'), btnNewSession: $('btnNewSession'), btnCloseResults: $('btnCloseResults'),
  testCodesGrid: $('testCodesGrid'),
  modal: $('modal'), pwdInput: $('pwdInput'), pwdError: $('pwdError'),
  btnCancel: $('btnCancel'), btnSubmitPwd: $('btnSubmitPwd')
};

// ============================================
// AUDIO (reference frequencies: 1050Hz key, 1250Hz FIM chime)
// ============================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, start, dur, vol, type = 'sine') {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

function playBeep() {
  if (State.muted) return;
  try {
    tone(1050, getAudioContext().currentTime, 0.12, 0.15);
  } catch (e) { console.warn('Audio blocked', e); }
}

function playFimChime() {
  if (State.muted) return;
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    tone(1250, t, 0.15, 0.2);            // beep 1
    tone(1250, t + 0.2, 0.15, 0.2);      // beep 2
    // long held note (signature urna end sound)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(1250, t + 0.4);
    gain.gain.setValueAtTime(0.25, t + 0.4);
    gain.gain.setValueAtTime(0.25, t + 1.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + 0.4);
    osc.stop(t + 2.1);
  } catch (e) { console.warn('Chime error', e); }
}

// ============================================
// DATA NORMALIZATION (trust boundary)
// ============================================
function normalizePositions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(p => p && typeof p.title === 'string' && p.candidates && typeof p.candidates === 'object')
    .map((p, i) => ({
      id: typeof p.id === 'string' && p.id ? p.id : `position-${i}`,
      title: p.title,
      digits: Number.isInteger(p.digits) && p.digits > 0 ? p.digits : 2,
      candidates: Object.fromEntries(
        Object.entries(p.candidates)
          .filter(([code, c]) => /^\d+$/.test(code) && c && c.name)
          .map(([code, c]) => [code, {
            name: String(c.name),
            party: typeof c.party === 'string' ? c.party : '',
            vice: typeof c.vice === 'string' ? c.vice : '',
            suplente: typeof c.suplente === 'string' ? c.suplente : '',
            photo: typeof c.photo === 'string' ? c.photo : ''
          }])
      )
    }));
}

async function loadData() {
  try {
    const res = await fetch(CONFIG.dataFile);
    if (res.ok) {
      const data = await res.json();
      const positions = normalizePositions(data.positions);
      State.positions = positions.length ? positions : normalizePositions(DEFAULT_DATA.positions);
      if (data.blankVote?.label) State.blankLabel = data.blankVote.label;
      if (data.nullVote?.label) State.nullLabel = data.nullVote.label;
      Object.assign(State.labels, DEFAULT_DATA.labels, data.labels || {});
      if (typeof data.adminPassword === 'string' && data.adminPassword) {
        CONFIG.adminPassword = data.adminPassword;
      }
    } else {
      State.positions = normalizePositions(DEFAULT_DATA.positions);
    }
  } catch (e) {
    console.warn('Could not load candidates.json, using defaults:', e);
    State.positions = normalizePositions(DEFAULT_DATA.positions);
  }
}

// ============================================
// DERIVED STATE HELPERS
// ============================================
const currentStep = () => State.positions[State.stepIndex];
const enteredCode = () => State.digits.join('');
const isComplete = () => currentStep() && State.digits.length === currentStep().digits;
const currentCandidate = () => (currentStep() ? currentStep().candidates[enteredCode()] : undefined);
const isNullVote = () => isComplete() && !currentCandidate() && !State.isBranco;

// ============================================
// RENDER
// ============================================
function render() {
  const step = currentStep();
  if (!step || State.isFinished) return;

  El.bannerLabel.textContent = State.labels.banner;
  El.stepBadge.textContent = `ETAPA ${State.stepIndex + 1}/${State.positions.length}`;
  El.stepTitle.textContent = step.title;

  // digit boxes
  El.digitBoxes.innerHTML = '';
  const total = step.digits;
  for (let i = 0; i < total; i++) {
    const box = document.createElement('div');
    box.className = 'digit-box';
    const d = State.digits[i];
    if (State.isBranco) {
      // boxes hidden on branco per spec; render nothing
      continue;
    }
    if (d !== undefined) {
      box.textContent = d;
      box.classList.add('filled');
    } else if (i === State.digits.length) {
      box.classList.add('active');
    }
    El.digitBoxes.appendChild(box);
  }
  El.digitBoxes.hidden = State.isBranco;
  document.querySelector('.number-row').hidden = State.isBranco;

  const candidate = currentCandidate();

  // branco
  El.blankMsg.hidden = !State.isBranco;

  // status / null vote
  El.statusMsg.hidden = !isNullVote();
  if (isNullVote()) {
    El.warnText.textContent = 'NÚMERO ERRADO';
    El.bigText.textContent = State.nullLabel;
  }

  // details
  const showDetails = candidate && !State.isBranco;
  El.detailsBox.hidden = !showDetails;
  if (showDetails) {
    El.vName.textContent = candidate.name;
    El.dName.hidden = false;
    El.vParty.textContent = candidate.party || '—';
    El.dParty.hidden = !candidate.party;

    const vice = candidate.vice;
    const suplente = candidate.suplente;
    const second = vice || suplente;
    El.kVice.textContent = vice ? `${State.labels.vice}:` : `${State.labels.suplente}:`;
    El.vVice.textContent = second || '';
    El.dVice.hidden = !second;
  }

  // photo top-right
  if (showDetails && candidate.photo) {
    El.candidatePhoto.src = candidate.photo;
    El.candidatePhoto.onerror = () => { El.photoBox.hidden = true; };
    El.candidatePhoto.onload = () => { El.photoBox.hidden = false; };
    El.photoCaption.textContent = step.id;
    El.photoBox.hidden = false; // visible while loading; onerror hides
  } else {
    El.photoBox.hidden = true;
    El.candidatePhoto.removeAttribute('src');
  }
}

function showFim() {
  El.fimOverlay.hidden = false;
  playFimChime();
}

function renderResults() {
  El.resultsBody.innerHTML = '';
  let total = 0;

  State.positions.forEach(pos => {
    const posVotes = State.votes.filter(v => v.stepIndex === State.stepIndexOf(pos));
    const count = pred => posVotes.filter(pred).length;

    Object.entries(pos.candidates).forEach(([code, c]) => {
      total += count(v => v.voteType === 'candidate' && v.code === code);
      addResultRow(pos.title, code, c.name, count(v => v.voteType === 'candidate' && v.code === code));
    });
    addResultRow(pos.title, '—', State.blankLabel, count(v => v.voteType === 'blank'));
    addResultRow(pos.title, '—', State.nullLabel, count(v => v.voteType === 'null'));
  });

  El.resultsTotal.textContent = total;
}

// helper to map position object to its index
State.stepIndexOf = pos => State.positions.indexOf(pos);

function addResultRow(cargo, num, name, votes) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${escapeHtml(cargo)}</td><td class="num">${escapeHtml(num)}</td><td>${escapeHtml(name)}</td><td>${votes}</td>`;
  El.resultsBody.appendChild(tr);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// ============================================
// ACTIONS
// ============================================
function handleNumber(num) {
  if (State.isFinished || State.isBranco) return;
  const step = currentStep();
  if (!step || State.digits.length >= step.digits) return;
  playBeep();
  State.digits.push(num);
  render();
}

function handleBranco() {
  if (State.isFinished) return;
  playBeep();
  State.digits = [];
  State.isBranco = true;
  render();
}

function handleCorrige() {
  if (State.isFinished) return;
  playBeep();
  State.digits = [];
  State.isBranco = false;
  render();
}

function recordVote(voteType, code, name) {
  State.votes.push({
    stepIndex: State.stepIndex,
    positionId: currentStep().id,
    positionTitle: currentStep().title,
    voteType,
    code,
    name,
    timestamp: new Date().toISOString(),
    sessionId: State.sessionId
  });
  saveVotes();
}

function handleConfirma() {
  if (State.isFinished) return;
  const step = currentStep();
  if (!step) return;

  if (!(State.isBranco || isComplete())) return; // must be complete or branco

  playBeep();

  if (State.isBranco) {
    recordVote('blank', '', State.blankLabel);
  } else if (currentCandidate()) {
    recordVote('candidate', enteredCode(), currentCandidate().name);
  } else {
    recordVote('null', enteredCode(), State.nullLabel);
  }

  if (State.stepIndex < State.positions.length - 1) {
    State.stepIndex++;
    State.digits = [];
    State.isBranco = false;
    render();
  } else {
    State.isFinished = true;
    showFim();
  }
}

function resetUrna() {
  State.stepIndex = 0;
  State.digits = [];
  State.isBranco = false;
  State.isFinished = false;
  El.fimOverlay.hidden = true;
  El.resultsOverlay.hidden = true;
  render();
}

// ============================================
// ADMIN
// ============================================
function openResults() {
  El.modal.hidden = false;
  El.pwdInput.value = '';
  El.pwdError.hidden = true;
  El.pwdInput.focus();
}

function closeResults() {
  El.resultsOverlay.hidden = true;
  resetUrna();
}

function submitPassword() {
  if (El.pwdInput.value === CONFIG.adminPassword) {
    El.modal.hidden = true;
    renderResults();
    El.resultsOverlay.hidden = false;
  } else {
    El.pwdError.hidden = false;
    El.pwdInput.value = '';
    El.pwdInput.focus();
  }
}

function exportCSV() {
  const rows = [['Cargo', 'Codigo', 'Candidato', 'Tipo', 'Votos']];
  State.positions.forEach(pos => {
    const posVotes = State.votes.filter(v => v.stepIndex === State.positions.indexOf(pos));
    const count = pred => posVotes.filter(pred).length;
    Object.entries(pos.candidates).forEach(([code, c]) => {
      rows.push([pos.title, code, c.name, 'candidate', count(v => v.voteType === 'candidate' && v.code === code)]);
    });
    rows.push([pos.title, '', State.blankLabel, 'blank', count(v => v.voteType === 'blank')]);
    rows.push([pos.title, '', State.nullLabel, 'null', count(v => v.voteType === 'null')]);
  });
  rows.push(['TOTAL', '', '', '', State.votes.length]);

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `resultados-${State.sessionId}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function newSession() {
  if (!confirm('Iniciar nova sessão? Todos os votos serão apagados.')) return;
  State.votes = [];
  saveVotes();
  State.sessionId = newSessionId();
  renderResults();
}

// ============================================
// TEST CODES FOOTER
// ============================================
function renderTestCodes() {
  El.testCodesGrid.innerHTML = '';
  State.positions.forEach(pos => {
    const codes = Object.keys(pos.candidates).slice(0, 2).join(' | ') || '—';
    const card = document.createElement('div');
    card.className = 'testcode-card';
    card.innerHTML = `<div class="pos">${escapeHtml(pos.title)} (${pos.digits})</div><div class="codes">${escapeHtml(codes)}</div>`;
    El.testCodesGrid.appendChild(card);
  });
}

// ============================================
// EVENTS
// ============================================
function bindEvents() {
  El.keysNumeric.addEventListener('click', e => {
    const key = e.target.closest('.key.num');
    if (key) handleNumber(parseInt(key.dataset.num, 10));
  });
  El.btnBranco.addEventListener('click', handleBranco);
  El.btnCorrige.addEventListener('click', handleCorrige);
  El.btnConfirma.addEventListener('click', handleConfirma);
  El.btnReset.addEventListener('click', resetUrna);
  El.btnResults.addEventListener('click', openResults);
  El.btnMute.addEventListener('click', () => {
    State.muted = !State.muted;
    El.btnMuteLabel.textContent = State.muted ? 'Mudo' : 'Som';
  });
  El.btnExport.addEventListener('click', exportCSV);
  El.btnNewSession.addEventListener('click', newSession);
  El.btnCloseResults.addEventListener('click', closeResults);
  El.btnCancel.addEventListener('click', () => { El.modal.hidden = true; });
  El.btnSubmitPwd.addEventListener('click', submitPassword);
  El.pwdInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitPassword(); });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (!El.modal.hidden) return;
    if (!El.resultsOverlay.hidden) return;
    if (e.key >= '0' && e.key <= '9') handleNumber(parseInt(e.key, 10));
    else if (e.key === 'Backspace' || e.key === 'Escape') handleCorrige();
    else if (e.key === 'Enter') handleConfirma();
    else if (e.key === ' ' || e.key.toLowerCase() === 'b') handleBranco();
  });

  // unlock audio on first gesture
  const unlock = () => getAudioContext();
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
}

// ============================================
// INIT
// ============================================
(async function init() {
  bindEvents();
  await loadData();
  renderTestCodes();
  render();
})();