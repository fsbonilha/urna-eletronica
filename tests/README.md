# Testes

Dois níveis, ambos rodam no **Firefox headless** (único runtime JS disponível
neste ambiente — não há node/deno/bun). Requerem servidor HTTP na raiz do projeto.

## Unit — `tests/runner.html` + `tests/unit.js`

Testa os módulos puros sem DOM da aplicação: `data.normalizePositions`,
seletores puros de `state.js`, `storage` (localStorage real do runner) e
contrato de apuração.

```bash
python3 -m http.server 8000
# abre http://localhost:8000/tests/runner.html
```

Resultado pintado no DOM (`PASS/FAIL` por linha) e em `document.title`
(`OK n/n` ou `FAIL n/n`) — o título é a forma mais fácil de verificar
em automação (screenshot/dump).

## E2E — `tests/e2e.html`

Carrega a aplicação real (chrome + todos os módulos + `main.js`) e simula um
eleitor completo via cliques reais de keypad:

- vota nas N categorias (primeiro código de cada mapa)
- confere `stepIndex` a cada etapa, resolução de candidate, `isFinished`
- FIM overlay visível
- votos no localStorage com `stepIndex` corretos
- apuração: linhas da tabela = Σ(candidates) + BRANCO + NULO, total correto
- `resetUrna` restaura estado inicial
- BRANCO registra voto `blank`

Mesma leitura: `document.title` = `OK n/n` | `FAIL n/n`.

> Nota: `e2e.html` é gerado a partir de `index.html` (chrome + scripts são
> copiados com paths `../js/`). Se o markup mudar, remonte com o mesmo
> passo usado na criação (extrair `<header>`→`</footer>` + bloco de scripts).

## Cobertura

| Módulo | Testado |
|--------|---------|
| config.js | (consumido indiretamente) |
| storage.js | ✅ roundtrip, JSON corrompido, session id |
| data.js | ✅ normalizePositions (7 casos), loadData via E2E |
| state.js | ✅ 5 seletores puros |
| audio.js | — (síntese; exigiria mock de AudioContext) |
| ui.js | — (cache DOM; coberto pelo E2E) |
| views.js | — (coberto pelo E2E: render, resultados, FIM) |
| actions.js | ✅ via E2E (fluxo completo) |
| admin.js | ✅ apuração (unit) + CSV seria idem |
| main.js | ✅ via E2E (init + eventos) |

`audio.js` e testes de CSV/download exigiriam mocks de `AudioContext`/`URL.createObjectURL`
— ficaram fora de propósito (smoke E2E já cobre o caminho crítico).