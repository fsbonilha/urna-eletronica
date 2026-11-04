/**
 * Ponto de entrada: inicialização e binding de eventos.
 * Único módulo que conhece todos os outros.
 */
(function (Urna) {
  'use strict';

  const { El } = Urna.ui;
  const st = Urna.state;

  function bindEvents() {
    El.keysNumeric.addEventListener('click', e => {
      const key = e.target.closest('.key.num');
      if (key) Urna.actions.handleNumber(parseInt(key.dataset.num, 10));
    });
    El.btnBranco.addEventListener('click', Urna.actions.handleBranco);
    El.btnCorrige.addEventListener('click', Urna.actions.handleCorrige);
    El.btnConfirma.addEventListener('click', Urna.actions.handleConfirma);
    El.btnReset.addEventListener('click', Urna.actions.resetUrna);
    El.btnResults.addEventListener('click', Urna.admin.openResults);
    El.btnMute.addEventListener('click', () => {
      st.muted = !st.muted;
      Urna.audio.setMuted(st.muted);
      El.btnMuteLabel.textContent = st.muted ? 'Mudo' : 'Som';
    });
    El.btnExport.addEventListener('click', Urna.admin.exportCSV);
    El.btnNewSession.addEventListener('click', Urna.admin.newSession);
    El.btnCloseResults.addEventListener('click', Urna.admin.closeResults);
    El.btnCancel.addEventListener('click', Urna.admin.closeModal);
    El.btnSubmitPwd.addEventListener('click', Urna.admin.submitPassword);
    El.pwdInput.addEventListener('keydown', e => { if (e.key === 'Enter') Urna.admin.submitPassword(); });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (!El.modal.hidden) return;
      if (!El.resultsOverlay.hidden) return;
      if (e.key >= '0' && e.key <= '9') Urna.actions.handleNumber(parseInt(e.key, 10));
      else if (e.key === 'Backspace' || e.key === 'Escape') Urna.actions.handleCorrige();
      else if (e.key === 'Enter') Urna.actions.handleConfirma();
      else if (e.key === ' ' || e.key.toLowerCase() === 'b') Urna.actions.handleBranco();
    });

    // unlock audio on first gesture
    document.addEventListener('pointerdown', Urna.audio.unlock, { once: true });
    document.addEventListener('keydown', Urna.audio.unlock, { once: true });
  }

  async function init() {
    Urna.ui.init();
    bindEvents();

    // troca de cenário via querystring: ?config=candidates.election.json
    const params = new URLSearchParams(location.search);
    const file = params.get('config') || Urna.config.dataFile;

    const data = await Urna.data.loadData(file);
    st.positions = data.positions;
    st.blankLabel = data.blankLabel;
    st.nullLabel = data.nullLabel;
    st.labels = data.labels;
    st.adminPassword = data.adminPassword;

    st.votes = Urna.storage.loadVotes();
    st.sessionId = localStorage.getItem(Urna.config.storageSessionKey) || Urna.storage.newSessionId();

    Urna.views.renderTestCodes();
    Urna.views.render();
  }

  Urna.main = { init, bindEvents };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.Urna = window.Urna || {});