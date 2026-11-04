/**
 * Persistência: único ponto de acesso ao localStorage.
 * Namespace: window.Urna.storage
 */
(function (Urna) {
  'use strict';

  function newSessionId() {
    const id = `session-${Date.now()}`;
    localStorage.setItem(Urna.config.storageSessionKey, id);
    return id;
  }

  function loadVotes() {
    try {
      return JSON.parse(localStorage.getItem(Urna.config.storageKey) || '[]');
    } catch (e) {
      console.warn('Corrupt votes in storage, resetting:', e);
      return [];
    }
  }

  function saveVotes(votes) {
    localStorage.setItem(Urna.config.storageKey, JSON.stringify(votes));
  }

  Urna.storage = { newSessionId, loadVotes, saveVotes };
})(window.Urna = window.Urna || {});