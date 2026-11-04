# Urna Eletrônica UE2020 — Implementation Plan

> **Status: IMPLEMENTED.** This plan documents the built prototype, which follows the
> UE2020 React reference design (interaction model, layout grid, audio signatures)
> combined with the official hardware color spec.

## Overview
Web simulator of the Brazilian Urna Eletrônica. Generic voting domain. Data-driven
from `candidates.json` — any event can define its own positions/candidates without
code changes.

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Vanilla HTML/CSS/JS | Zero dependencies, runs anywhere, offline-capable |
| Layout | CSS Grid 8-column frame | Reference spec: screen cols 1–5, keypad cols 6–8 |
| Scale | 1200px machine, screen 17:10 | Real chassis ~42×15cm (~2.8:1); display 10.1" WXGA |
| State | In-memory + localStorage | Votes persist across refresh; sessions resettable |
| Audio | Web Audio API (synthesized) | Real urna frequencies; no audio files |
| Data | candidates.json | Positions, candidates, labels, admin password |

## Interaction Model (from reference)

Single-screen voting like the real machine — **no separate preview screen**:

```
type digits -> digits fill boxes L->R
            -> on complete code: inline preview (name/party/vice/suplente + photo)
            -> CONFIRMA: record vote, advance to next position
            -> last CONFIRMA: FIM overlay + signature chime
```

- **CORRIGE** clears digits at any time
- **BRANCO** hides number boxes and shows "VOTO EM BRANCO"
- Unknown complete code shows "NÚMERO ERRADO / VOTO NULO"
- CONFIRMA only accepted when code is complete OR branco (real urna rule)

## Layout Architecture

Real-machine proportions: the frame runs wide and low (2.52:1 at 840px,
30% narrower per user preference; physical chassis ~2.83:1). The screen is an
exact 17:10 aspect (486×286px) and the keypad stays shorter than the screen
so the screen defines the chassis height. Numeric keys are 1.7:1 (flat,
like the hardware).

```
+---------------------------------------------------------------+
| HEADER: brand chip | Som | Reiniciar | Resultados                |
+---------------------------------------------------------------+
| MACHINE FRAME 1000x750, bg #D6D6D0, border #b8b8b0            |
| +---------------------------+  +---------------------------+  |
| | SCREEN (cols 1-5)         |  | KEYPAD (cols 6-8)         |  |
| | banner: SEU VOTO VAI PARA |  |  [1][2][3]                |  |
| |         ETAPA n/N         |  |  [4][5•][6]  black keys   |  |
| | step title                |  |  [7][8][9]  white text    |  |
| | Número: [_][_][_][_]      |  |     [0]    (centered)     |  |
| | Nome / Partido / Vice     |  |  -------------------      |  |
| |                  [PHOTO]  |  |  [BRANCO][CORRIGE][CONFIR]|
| | footer: VERDE/LARANJA hint|  |  CONFIRMA taller/lower    |  |
| +---------------------------+  +---------------------------+  |
+---------------------------------------------------------------+
| FOOTER: test codes per position (auto-generated from config)  |
+---------------------------------------------------------------+
```

## Color Palette (hardware spec)

| Element | HEX | Use |
|---------|-----|-----|
| Frame / body | `#D6D6D0` | Machine chassis |
| Frame border | `#b8b8b0` | Chassis edge |
| Keypad panel | `#1A1A1A` | Numeric area |
| Numeric keys | `#000000` / `#FFFFFF` | Keys / text |
| BRANCO | `#FFFFFF` / `#000000` | Blank vote |
| CORRIGE | `#F36F21` | Correct/clear |
| CONFIRMA | `#009645` | Confirm (larger target) |
| Screen | `#FFFFFF` on `#222222` bezel | Display |
| Null text | `#B91C1C` | VOTO NULO |
| Header/footer chrome | `#262626` | App controls around machine |

## Audio (Web Audio API, from reference)

| Sound | Spec |
|-------|------|
| Key beep | 1050 Hz sine, 120 ms, exponential decay |
| FIM chime | 1250 Hz: beep (150ms) + beep (150ms) + long held note (~1.7s) |
| Mute toggle | Header button; context resumes on first gesture |

## Data Model (candidates.json)

```json
{
  "positions": [
    {
      "id": "federal",
      "title": "DEPUTADO FEDERAL",
      "digits": 4,
      "candidates": {
        "1010": { "name": "AURA SILVA", "party": "PDS (10)",
                  "vice": "", "suplente": "", "photo": "photos/f1.jpg" }
      }
    }
  ],
  "blankVote": { "label": "VOTO EM BRANCO" },
  "nullVote": { "label": "VOTO NULO" },
  "adminPassword": "festa2025"
}
```

- `candidates` is a **map code → candidate** (reference shape); codes are per-category
  and need not be unique across categories
- `vice` renders as "Vice:", `suplente` as "Suplente:" (mutually exclusive)
- `labels` (banner/vice/suplente) configurable — UI has no hardcoded election terms
- `normalizePositions()` validates at load: bad entries dropped; empty -> defaults
- Ships with a costume-party config active; full election example in
  `candidates.election.json`

## Vote Record & Persistence

```js
{ stepIndex, positionId, positionTitle, voteType: candidate|blank|null,
  code, name, timestamp, sessionId }
```

- `localStorage["urna_ue2020_votes"]` — survives refresh
- `localStorage["urna_ue2020_session"]` — session id for CSV naming
- "NOVA SESSÃO" clears votes, issues a new session id

## Admin Results

- Header **Resultados** button → password modal (default `festa2025`)
- Overlay table per position: candidates + BRANCO + NULO rows, grand total
- **EXPORTAR CSV** (UTF-8 BOM), **NOVA SESSÃO**, **VOLTAR**

## Implementation Phases (all complete)

1. ✅ Shell: header controls, machine frame, footer test codes
2. ✅ Screen: banner, digit boxes with blink, details, photo, footer hints
3. ✅ Keypad: 1-9, centered 0, braille bump on 5, action row
4. ✅ Flow: inline preview, CONFIRMA advance, FIM + chime
5. ✅ Admin: password, results table, CSV, session reset
6. ✅ Config: JSON-driven positions, normalization, fallback
7. ✅ Photos: 300×400 (3:4) placeholders, top-right placement
8. ✅ Responsive (<860px stack), reduced-motion, focus-visible

## Verification Performed

- Static: all DOM ids referenced exist; JS/CSS brace-balanced; JSON valid;
  palette tokens exact; photos on disk match config paths
- Rendered (headless Firefox screenshots): initial state, complete preview
  with photo (code 1010), mid-flow progression to step 2
- Flow driven by dispatching real keypad clicks in-page

## Known Limitations / Future

- No per-voter verification (toy use)
- Results are client-side only (no network sync)
- Sound requires a user gesture first (browser autoplay policy)
