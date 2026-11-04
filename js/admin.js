/**
 * Área administrativa: senha, resultados, CSV, nova sessão.
 * Namespace: window.Urna.admin — depende de state, ui, views, storage.
 */
(function (Urna) {
  'use strict';

  const { El, escapeHtml } = Urna.ui;
  const st = Urna.state;

  function openResults() {
    El.modal.hidden = false;
    El.pwdInput.value = '';
    El.pwdError.hidden = true;
    El.pwdInput.focus();
  }

  function closeModal() {
    El.modal.hidden = true;
  }

  function closeResults() {
    El.resultsOverlay.hidden = true;
    Urna.actions.resetUrna();
  }

  function submitPassword() {
    if (El.pwdInput.value === st.adminPassword) {
      closeModal();
      Urna.views.renderResults();
      El.resultsOverlay.hidden = false;
    } else {
      El.pwdError.hidden = false;
      El.pwdInput.value = '';
      El.pwdInput.focus();
    }
  }

  function buildRows() {
    const rows = [['Cargo', 'Codigo', 'Candidato', 'Tipo', 'Votos']];
    st.positions.forEach((pos, stepIndex) => {
      const posVotes = st.votes.filter(v => v.stepIndex === stepIndex);
      const count = pred => posVotes.filter(pred).length;
      Object.entries(pos.candidates).forEach(([code, c]) => {
        rows.push([pos.title, code, c.name, 'candidate', count(v => v.voteType === 'candidate' && v.code === code)]);
      });
      rows.push([pos.title, '', st.blankLabel, 'blank', count(v => v.voteType === 'blank')]);
      rows.push([pos.title, '', st.nullLabel, 'null', count(v => v.voteType === 'null')]);
    });
    rows.push(['TOTAL', '', '', '', st.votes.length]);
    return rows;
  }

  function exportCSV() {
    const csv = buildRows().map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `resultados-${st.sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function newSession() {
    if (!confirm('Iniciar nova sessão? Todos os votos serão apagados.')) return;
    st.votes = [];
    Urna.storage.saveVotes(st.votes);
    st.sessionId = Urna.storage.newSessionId();
    Urna.views.renderResults();
  }

  Urna.admin = { openResults, closeModal, closeResults, submitPassword, exportCSV, newSession, buildRows };
})(window.Urna = window.Urna || {});