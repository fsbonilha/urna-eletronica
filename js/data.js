/**
 * Carregamento e normalização de dados (fronteira de validação).
 * Namespace: window.Urna.data
 */
(function (Urna) {
  'use strict';

  /**
   * Valida e normaliza positions vindos de JSON externo.
   * Entradas inválidas são descartadas; candidates vira mapa code->candidate.
   */
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

  /**
   * Carrega candidates.json; cai nos defaults em caso de falha total.
   * Aceita nome de arquivo alternativo (troca de cenário via ?config=).
   */
  async function loadData(file) {
    const config = Urna.config;
    const fallback = () => {
      const d = JSON.parse(JSON.stringify(Urna.defaults));
      return {
        positions: normalizePositions(d.positions),
        blankLabel: d.blankVote.label,
        nullLabel: d.nullVote.label,
        labels: { ...d.labels },
        adminPassword: config.adminPassword
      };
    };

    try {
      const res = await fetch(file || config.dataFile);
      if (!res.ok) return fallback();
      const data = await res.json();
      const positions = normalizePositions(data.positions);
      const defaults = JSON.parse(JSON.stringify(Urna.defaults));
      return {
        positions: positions.length ? positions : normalizePositions(defaults.positions),
        blankLabel: data.blankVote?.label || defaults.blankVote.label,
        nullLabel: data.nullVote?.label || defaults.nullVote.label,
        labels: { ...defaults.labels, ...(data.labels || {}) },
        adminPassword: (typeof data.adminPassword === 'string' && data.adminPassword)
          ? data.adminPassword
          : config.adminPassword
      };
    } catch (e) {
      console.warn('Could not load candidates file, using defaults:', e);
      return fallback();
    }
  }

  Urna.data = { normalizePositions, loadData };
})(window.Urna = window.Urna || {});