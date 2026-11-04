# Urna Eletrônica UE2020 — Simulador

Faithful web simulator of the Brazilian electronic voting machine, built on the
UE2020 reference design. Generic voting domain — no party/event-specific terms in code.

## Features

- **Authentic machine layout**: 8-column frame (screen = cols 1–5, keypad = cols 6–8),
  `#D6D6D0` industrial body, white screen with black bezel, `#1A1A1A` keypad panel
- **Official action colors**: BRANCO `#FFFFFF`, CORRIGE `#F36F21`, CONFIRMA `#009645`
  (CONFIRMA taller, sits lower — larger hit target)
- **Reference interaction model**: type digits → inline preview (name/party/vice) →
  CONFIRMA advances. No separate confirm screen.
- **Signature audio** (Web Audio, synthesized):
  - Key beep: 1050 Hz sine, 120 ms
  - FIM chime: 1250 Hz beep-beep + long held note (the "urna" end sound)
  - Mute toggle in header
- **Multi-position voting**: 5 configurable steps (Federal 4 digits → Estadual 5 →
  Senador 3 → Governador 2 → Presidente 2), each with its own candidate set
- **VOTO EM BRANCO**: hides number boxes, shows bordered title
- **VOTO NULO**: "NÚMERO ERRADO / VOTO NULO" for unknown codes
- **Photo top-right** with position caption; broken/missing photos hide gracefully
- **Braille bump** on key 5 (tactile reference)
- **Admin results**: password-gated overlay, per-position totals, CSV export,
  new-session reset
- **Persistence**: votes survive refresh (localStorage); session id kept separately
- **Test-code footer**: generated from the config so testers see valid codes
- **Responsive**: stacks below 860px; reduced-motion support; ARIA labels

## Quick Start

```bash
cd urna-eletronica
python3 -m http.server 8000
# open http://localhost:8000
```

(An HTTP server is required: `candidates.json` is fetched at startup.)

## Voting Flow

1. Type the candidate code on the keypad (or keyboard `0-9`)
2. Digits fill left-to-right; preview appears when the code is complete
3. **CONFIRMA** records the vote and advances to the next position
4. After the last position: **FIM** screen + signature chime
5. Machine returns to step 1 for the next voter

| Key | Action |
|-----|--------|
| 0-9 | Type digits |
| Enter | CONFIRMA |
| Backspace / Escape | CORRIGE |
| Space / B | BRANCO |

CORRIGE clears the current entry at any time before confirmation.

## Configuration

The active `candidates.json` ships with a **costume-party example** (Mais Bonito /
Mais Exótico / Mais Assustador). A full election example is kept alongside in
`candidates.election.json` — swap either one into place.

```json
{
  "positions": [
    {
      "id": "geral",
      "title": "MAIS BONITO",
      "digits": 2,
      "candidates": {
        "10": { "name": "PARTICIPANTE UM", "party": "GRUPO A", "photo": "photos/pg1.jpg" }
      }
    }
  ],
  "blankVote": { "label": "VOTO EM BRANCO" },
  "nullVote": { "label": "VOTO NULO" },
  "labels": { "banner": "SEU VOTO VAI PARA", "vice": "Vice", "suplente": "Suplente" },
  "adminPassword": "festa2025"
}
```

- **positions**: ordered list; each is one voting category/step
  - `digits`: code length (1–5); digit boxes render to match
  - `candidates`: map of code → candidate; codes can be anything numeric
    (they do not need to be unique across categories)
- **candidate fields**: `name` (required), `party`, `photo` (path/URL/data-URI),
  `vice` (shows "Vice:") or `suplente` (shows "Suplente:")
- **labels**: on-screen strings (`banner`, `vice`, `suplente`) — rename freely
- Invalid entries are dropped at load; a fully invalid file falls back to defaults

The header **Resultados** button opens the password prompt
(default `festa2025`, change it in the JSON).

## Files

```
urna-eletronica/
├── index.html              # App shell (header, machine, footer, modal)
├── styles.css              # Hardware palette, 8-col frame, keys, overlays
├── js/                     # Módulos (ordem de dependência via <script>)
│   ├── config.js           # CONFIG + DEFAULT_DATA
│   ├── storage.js          # localStorage (único ponto de acesso)
│   ├── audio.js            # Web Audio: beeps + FIM chime, mute
│   ├── data.js             # normalizePositions + loadData (validação)
│   ├── state.js            # Estado + seletores puros (testáveis)
│   ├── ui.js               # Cache de elementos DOM
│   ├── views.js            # render / FIM / resultados / test codes
│   ├── actions.js          # Fluxo de votação
│   ├── admin.js            # Senha, apuração, CSV, nova sessão
│   └── main.js             # init + bindEvents (conhece todos)
├── candidates.json         # Config ativa (festa)
├── candidates.election.json# Exemplo de eleição (?config= troca)
├── photos/
│   ├── party/              # placeholders da config ativa
│   └── election/           # placeholders do exemplo
└── tests/                  # unit + E2E (Firefox headless), ver tests/README.md
```

### Trocar de cenário sem editar arquivos

```
index.html                                  -> candidates.json (festa)
index.html?config=candidates.election.json  -> exemplo de eleição
```

## Screens

| State | Shows |
|-------|-------|
| Typing | Empty digit boxes, blinking cursor on active box |
| Complete code | Candidate name/party/vice + photo top-right |
| Unknown code | "NÚMERO ERRADO" + "VOTO NULO" |
| BRANCO | "VOTO EM BRANCO", boxes hidden |
| Last CONFIRMA | "FIM" + chime + "VOTO GRAVADO" stamp |
| Admin | Results table per position + export/reset |

## Browser Support

Chrome/Edge 79+, Firefox 55+, Safari 14+. Requires `localStorage`, `AudioContext`, `fetch`.

## License

MIT. Educational/recreational use. Not affiliated with the TSE.
