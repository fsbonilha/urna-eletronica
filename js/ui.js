/**
 * Cache de elementos DOM + helpers de renderização.
 * Namespace: window.Urna.ui
 */
(function (Urna) {
  'use strict';

  const $ = id => document.getElementById(id);

  const El = {}; // preenchido por init()

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function init() {
    const ids = [
      'bannerLabel', 'stepBadge', 'stepTitle', 'digitBoxes',
      'detailsBox', 'dName', 'dParty', 'dVice', 'kVice', 'vName', 'vParty', 'vVice',
      'statusMsg', 'warnText', 'bigText', 'blankMsg',
      'photoBox', 'candidatePhoto', 'photoCaption',
      'fimOverlay', 'resultsOverlay', 'resultsBody', 'resultsTotal',
      'keysNumeric', 'btnBranco', 'btnCorrige', 'btnConfirma',
      'btnMute', 'btnMuteLabel', 'btnReset', 'btnResults',
      'btnExport', 'btnNewSession', 'btnCloseResults', 'testCodesGrid',
      'modal', 'pwdInput', 'pwdError', 'btnCancel', 'btnSubmitPwd'
    ];
    ids.forEach(id => { El[id] = $(id); });
  }

  Urna.ui = { $, El, escapeHtml, init };
})(window.Urna = window.Urna || {});