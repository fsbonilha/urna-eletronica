/**
 * Estado da aplicação + seletores derivados (puros).
 * Namespace: window.Urna.state
 * Nota: funções derivadas recebem o state por parâmetro para serem testáveis
 * sem DOM e sem depender do objeto mutável.
 */
(function (Urna) {
  'use strict';

  const State = {
    positions: [],
    blankLabel: 'VOTO EM BRANCO',
    nullLabel: 'VOTO NULO',
    labels: { banner: 'SEU VOTO VAI PARA', vice: 'Vice', suplente: 'Suplente' },
    stepIndex: 0,
    digits: [],
    isBranco: false,
    isFinished: false,
    muted: false,
    votes: [],
    sessionId: '',
    adminPassword: 'festa2025'
  };

  // --- seletores puros (state, stepIndex, digits) -> valor ---

  function currentStep(st, stepIndex) {
    st = st || State;
    return st.positions[stepIndex === undefined ? st.stepIndex : stepIndex];
  }

  function enteredCode(st) {
    st = st || State;
    return st.digits.join('');
  }

  function isComplete(st) {
    st = st || State;
    const step = currentStep(st);
    return !!step && st.digits.length === step.digits;
  }

  function currentCandidate(st) {
    st = st || State;
    const step = currentStep(st);
    return step ? step.candidates[enteredCode(st)] : undefined;
  }

  function isNullVote(st) {
    st = st || State;
    return isComplete(st) && !currentCandidate(st) && !st.isBranco;
  }

  Urna.state = State;
  Urna.select = { currentStep, enteredCode, isComplete, currentCandidate, isNullVote };
})(window.Urna = window.Urna || {});