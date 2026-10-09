# NOMANDA — Terminal Edition

The whole NOMANDA web app, reborn as a **fully working CLI/shell**.
Zero dependencies — just Node 18+.

```
cd nomanda-cli
node nomanda.js            # interactive shell
./bin/nomanda              # or install globally: npm link
```

## The brain — Frabula 1.2

Same free, keyless, open-source brain as the web app:

- **No Ollama, no API key, no install, no sign-up** — it just works
- Answers **stream live** into your terminal
- Automatic fallback: Frabula cloud → NOMANDA server proxy → local brain
- Force an endpoint for testing: `NOMANDA_BRAIN_URL=http://localhost:9099/chat node nomanda.js`

## Commands

Type `/` for a Codex-style command menu. Every command also works with a
leading slash (`/home`) or as a plain word (`home`).

| command | what it does |
|---|---|
| *type anything* | chat with Frabula 1.2 — answers stream live in your terminal's default color (readable on light & dark themes) |
| `/model` | numbered picker to switch Frabula Core / Lite / Open |
| `/theme light\|dark\|auto` | terminal colors — grays/yellows tuned per theme |
| `home` | smart-home dashboard: AC, lights, TV, fridge, washer, fan, speaker, router |
| `home brand tv samsung` | pick the **company** for a device (Samsung, LG, Sony, Panasonic, Voltas, Daikin, JBL, Bose…) |
| `home vol tv 40` · `home vol tv +` | TV/speaker **remote** — volume up/down |
| `home chan +` · `home source` · `home mute tv` | TV channels, source, mute |
| `home temp 22` · `home mode cool` · `home acfan High` | AC remote |
| `home light living off` · `home bright 80` · `home lighttone warm` | lights remote |
| `home speed 3` · `home program Quick` · `home ftemp 4` | fan / washer / fridge remotes |
| `home on tv` / `home off washer` | power any device |
| `studio quiz <text>` | summary · quiz · flashcards · flow · code · plan |
| `research <topic>` | deep multi-pass research report → `~/.nomanda/research/*.md` |
| `email to boss@x.com about sick leave` | AI-drafted email → `outbox/*.eml` + Gmail compose link |
| `file create notes.txt` · `file list` · `file cat x` | file manager in `~/.nomanda/workspace` |
| `chats` · `chat 2` · `new` | chat history — continue any chat |
| `memory` · `memory set name Sonal` | what NOMANDA remembers about you |
| `status` · `help` · `exit` | |

## Where your data lives

```
~/.nomanda/
├── config.json     provider & model
├── memory.json     your name, profession, gmail, interests
├── chats.json      full chat history
├── home.json       simulated smart-home state
├── workspace/      your files
├── outbox/         drafted emails (.eml)
├── research/       saved research reports
└── studio/         saved studio outputs
```

Set `NOMANDA_HOME=/somewhere/else` to relocate everything.

## One-shot mode (scripting)

```bash
node nomanda.js home
node nomanda.js home brand tv Samsung
node nomanda.js home vol tv 40
node nomanda.js chat "explain black holes in 2 lines"
node nomanda.js research "indian startup ecosystem"
```
