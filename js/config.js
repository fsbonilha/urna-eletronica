/**
 * Configuração global e dados padrão.
 * Namespace: window.Urna.config
 */
(function (Urna) {
  'use strict';

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

  Urna.config = CONFIG;
  Urna.defaults = DEFAULT_DATA;
})(window.Urna = window.Urna || {});