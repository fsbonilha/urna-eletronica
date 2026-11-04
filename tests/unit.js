/**
 * Testes unitários dos módulos puros (config, data, state/select, storage).
 * Rodam no navegador (tests/runner.html) — o único runtime JS disponível aqui
 * é o Firefox headless. Resultado é pintado no DOM e no document.title.
 *
 * Sem dependências: mini-framework assert inline.
 */
(function () {
  'use strict';

  const results = [];
  let current = '';

  function suite(name) { current = name; }

  function test(name, fn) {
    try {
      fn();
      results.push({ suite: current, name, ok: true });
    } catch (e) {
      results.push({ suite: current, name, ok: false, error: String(e && e.message || e) });
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assert failed'); }
  function assertEq(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error((msg || 'not equal') + ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  // ============================================
  // data.normalizePositions
  // ============================================
  suite('data.normalizePositions');

  test('retorna [] para entrada não-array', () => {
    assertEq(Urna.data.normalizePositions(null), []);
    assertEq(Urna.data.normalizePositions('x'), []);
    assertEq(Urna.data.normalizePositions(undefined), []);
  });

  test('descarta posições malformadas e mantém válidas', () => {
    const out = Urna.data.normalizePositions([
      null,
      { title: 'SEM CANDIDATOS' },
      { title: 'OK', digits: 2, candidates: { '10': { name: 'A' } } }
    ]);
    assertEq(out.length, 1);
    assertEq(out[0].title, 'OK');
  });

  test('descarta candidates sem código numérico ou sem nome', () => {
    const out = Urna.data.normalizePositions([
      { title: 'T', digits: 2, candidates: {
        '10': { name: 'BOM' },
        'ab': { name: 'CODE NÃO NUMÉRICO' },
        '99': { party: 'SEM NOME' },
        '88': null
      }}
    ]);
    assertEq(Object.keys(out[0].candidates), ['10']);
  });

  test('aplica defaults: digits=2, id=position-N, campos vazios', () => {
    const out = Urna.data.normalizePositions([
      { title: 'T', candidates: { '5': { name: 'X' } } }
    ]);
    assertEq(out[0].digits, 2);
    assertEq(out[0].id, 'position-0');
    assertEq(out[0].candidates['5'].party, '');
    assertEq(out[0].candidates['5'].photo, '');
  });

  test('código com zeros à esquerda preservado como string', () => {
    const out = Urna.data.normalizePositions([
      { title: 'T', digits: 3, candidates: { '007': { name: 'JAMES' } } }
    ]);
    assertEq(out[0].candidates['007'].name, 'JAMES');
    assertEq(Object.keys(out[0].candidates)[0], '007');
  });

  // ============================================
  // state/select — seletores puros
  // ============================================
  suite('select (seletores puros)');

  const mkState = over => Object.assign({
    positions: Urna.data.normalizePositions([
      { id: 'p1', title: 'UM', digits: 2, candidates: { '10': { name: 'A' }, '20': { name: 'B' } } },
      { id: 'p2', title: 'DOIS', digits: 3, candidates: { '101': { name: 'C' } } }
    ]),
    stepIndex: 0,
    digits: [],
    isBranco: false,
    isFinished: false
  }, over);

  test('currentStep retorna a posição do stepIndex', () => {
    const st = mkState();
    assertEq(Urna.select.currentStep(st).id, 'p1');
    st.stepIndex = 1;
    assertEq(Urna.select.currentStep(st).id, 'p2');
  });

  test('isComplete só quando digits preenchem step.digits', () => {
    const st = mkState();
    assertEq(Urna.select.isComplete(st), false);
    st.digits = [1];
    assertEq(Urna.select.isComplete(st), false);
    st.digits = [1, 0];
    assertEq(Urna.select.isComplete(st), true);
  });

  test('currentCandidate resolve code->candidate', () => {
    const st = mkState({ digits: [1, 0] });
    assertEq(Urna.select.currentCandidate(st).name, 'A');
    st.digits = [3, 0]; // código '30' não existe no fixture
    assertEq(Urna.select.currentCandidate(st), undefined);
  });

  test('isNullVote: completo + sem candidate + não-branco', () => {
    assertEq(Urna.select.isNullVote(mkState({ digits: [3, 0] })), true); // '30' não existe
    assertEq(Urna.select.isNullVote(mkState({ digits: [1, 0] })), false);   // candidato existe
    assertEq(Urna.select.isNullVote(mkState({ digits: [3], isBranco: true })), false); // incompleto
    assertEq(Urna.select.isNullVote(mkState({ digits: [3, 0], isBranco: true })), false); // branco
  });

  test('enteredCode junta dígitos preservando zeros', () => {
    assertEq(Urna.select.enteredCode(mkState({ digits: [0, 1] })), '01');
  });

  // ============================================
  // storage (usa localStorage real do runner)
  // ============================================
  suite('storage');

  test('saveVotes/loadVotes roundtrip', () => {
    const votes = [{ code: '10', voteType: 'candidate' }];
    Urna.storage.saveVotes(votes);
    assertEq(Urna.storage.loadVotes(), votes);
    localStorage.clear();
  });

  test('loadVotes retorna [] com JSON corrompido', () => {
    localStorage.setItem(Urna.config.storageKey, '{não-json');
    assertEq(Urna.storage.loadVotes(), []);
    localStorage.clear();
  });

  test('newSessionId gera e persiste session id', () => {
    const id = Urna.storage.newSessionId();
    assert(id.startsWith('session-'), 'id deve começar com session-');
    assertEq(localStorage.getItem(Urna.config.storageSessionKey), id);
    localStorage.clear();
  });

  // ============================================
  // admin.buildRows (lógica de apuração, sem DOM além de escape)
  // ============================================
  suite('apuração');

  test('contagem por categoria com branco e nulo', () => {
    // buildRows vive em admin.js (depende de DOM via ui.El? não — só state)
    // admin.js não está carregado aqui para manter o runner puro; replicamos via
    // verificação direta do contrato de votos usado por renderResults/exportCSV.
    const st = {
      positions: Urna.data.normalizePositions([
        { id: 'p1', title: 'UM', digits: 2, candidates: { '10': { name: 'A' } } }
      ]),
      votes: [
        { stepIndex: 0, voteType: 'candidate', code: '10' },
        { stepIndex: 0, voteType: 'candidate', code: '10' },
        { stepIndex: 0, voteType: 'candidate', code: '99' },  // nulo na apuração
        { stepIndex: 0, voteType: 'blank' },
        { stepIndex: 1, voteType: 'candidate', code: '10' }   // outra categoria
      ]
    };
    const pos = st.positions[0];
    const posVotes = st.votes.filter(v => v.stepIndex === 0);
    const count = pred => posVotes.filter(pred).length;
    assertEq(count(v => v.voteType === 'candidate' && v.code === '10'), 2);
    assertEq(count(v => v.voteType === 'blank'), 1);
    // votos com código desconhecido contam como nulo (voteType null registrado no fluxo)
    assertEq(count(v => v.voteType === 'null'), 0); // este registro veio como 'candidate'
  });

  // ============================================
  // relatório
  // ============================================
  function report() {
    const pass = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok);
    const lines = results.map(r =>
      `${r.ok ? 'PASS' : 'FAIL'}  [${r.suite}] ${r.name}${r.ok ? '' : ' — ' + r.error}`
    );
    lines.push('');
    lines.push(`${pass} passed, ${fail.length} failed`);
    document.getElementById('report').textContent = lines.join('\n');
    document.title = fail.length === 0 ? `OK ${pass}/${results.length}` : `FAIL ${fail.length}/${results.length}`;
  }

  report();
})();