/**
 * Ações de votação (fluxo principal).
 * Namespace: window.Urna.actions — depende de state, select, ui, views, audio, storage.
 */
(function (Urna) {
  'use strict';

  const { El } = Urna.ui;
  const { currentStep, enteredCode, currentCandidate, isComplete } = Urna.select;
  const st = Urna.state;

  function handleNumber(num) {
    if (st.isFinished || st.isBranco) return;
    const step = currentStep(st);
    if (!step || st.digits.length >= step.digits) return;
    Urna.audio.playBeep();
    st.digits.push(num);
    Urna.views.render();
  }

  function handleBranco() {
    if (st.isFinished) return;
    Urna.audio.playBeep();
    st.digits = [];
    st.isBranco = true;
    Urna.views.render();
  }

  function handleCorrige() {
    if (st.isFinished) return;
    Urna.audio.playBeep();
    st.digits = [];
    st.isBranco = false;
    Urna.views.render();
  }

  function recordVote(voteType, code, name) {
    const step = currentStep(st);
    st.votes.push({
      stepIndex: st.stepIndex,
      positionId: step.id,
      positionTitle: step.title,
      voteType,
      code,
      name,
      timestamp: new Date().toISOString(),
      sessionId: st.sessionId
    });
    Urna.storage.saveVotes(st.votes);
  }

  function handleConfirma() {
    if (st.isFinished) return;
    const step = currentStep(st);
    if (!step) return;
    if (!(st.isBranco || isComplete(st))) return; // must be complete or branco

    Urna.audio.playBeep();

    if (st.isBranco) {
      recordVote('blank', '', st.blankLabel);
    } else if (currentCandidate(st)) {
      recordVote('candidate', enteredCode(st), currentCandidate(st).name);
    } else {
      recordVote('null', enteredCode(st), st.nullLabel);
    }

    if (st.stepIndex < st.positions.length - 1) {
      st.stepIndex++;
      st.digits = [];
      st.isBranco = false;
      Urna.views.render();
    } else {
      st.isFinished = true;
      Urna.views.showFim();
    }
  }

  function resetUrna() {
    st.stepIndex = 0;
    st.digits = [];
    st.isBranco = false;
    st.isFinished = false;
    El.fimOverlay.hidden = true;
    El.resultsOverlay.hidden = true;
    Urna.views.render();
  }

  Urna.actions = { handleNumber, handleBranco, handleCorrige, handleConfirma, resetUrna, recordVote };
})(window.Urna = window.Urna || {});