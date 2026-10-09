#!/usr/bin/env node
'use strict';
// ═══════════════════════════════════════════
// NOMANDA — Intelligence Core · terminal edition
// Chat with Frabula 1.2 (free, keyless AI brain)
// + smart home control, files, email, research,
//   studio, memory and chat history.
//
//   $ node nomanda.js              interactive shell
//   $ node nomanda.js home         one-shot command
//   $ node nomanda.js chat "hi"    one-shot chat
// ═══════════════════════════════════════════
import {
  init, loadConfig, saveConfig, loadMemory, saveMemory,
  loadChats, saveChats, newChat, PATHS
} from './lib/store.js';
import { c, say, box, table, banner, ask, closeRL, getRL, setTheme, themeName, menuList, hl } from './lib/ui.js';
import { streamChat, buildSys, brainName } from './lib/brain.js';
import { runHome, dashboard } from './lib/home.js';
import { runFiles } from './lib/files.js';
import { runEmail } from './lib/email.js';
import { runResearch } from './lib/research.js';
import { runStudio } from './lib/studio.js';

const CONFIG = loadConfig();
setTheme(CONFIG.theme || 'auto');
let MEMORY = loadMemory();
let CHATS = loadChats();
let CUR = CHATS[0] || newChat(CHATS);

// Frabula 1.2 model lineup (keyless — all free)
const MODELS = {
  openai:  { name: 'Frabula Core', desc: 'smart & fast — best all-rounder ⭐' },
  mistral: { name: 'Frabula Lite', desc: 'lightweight & quick answers' },
  llama:   { name: 'Frabula Open', desc: 'pure open-source LLaMA' },
};

// slash-command menu (Codex-style)
const SLASH = [
  { cmd: '/model',    desc: 'choose which Frabula model to use' },
  { cmd: '/home',     desc: 'smart home — AC · lights · TV · brands · remotes' },
  { cmd: '/studio',   desc: 'make summary · quiz · flashcards · flow · code' },
  { cmd: '/research', desc: 'deep multi-pass research report' },
  { cmd: '/email',    desc: 'AI-drafted email with Gmail link' },
  { cmd: '/file',     desc: 'workspace files — list · create · cat · edit' },
  { cmd: '/memory',   desc: 'what NOMANDA remembers · /memory set name X' },
  { cmd: '/chats',    desc: 'chat history · /chat 2 continues a chat' },
  { cmd: '/new',      desc: 'fresh chat' },
  { cmd: '/theme',    desc: 'light / dark / auto terminal colors' },
  { cmd: '/status',   desc: 'brain & data overview' },
  { cmd: '/help',     desc: 'all commands' },
  { cmd: '/exit',     desc: 'quit' },
];

// ── markdown-lite renderer for the terminal ──
function renderMD(s) {
  return String(s)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, __, code) => '\n' + c.gray('┌─ code ' + '─'.repeat(40)) + '\n' +
      code.trimEnd().split('\n').map(l => c.gray('│ ') + l).join('\n') + '\n' + c.gray('└' + '─'.repeat(48)))
    .replace(/\*\*([^*\n]+)\*\*/g, (_, m) => c.bold(m))
    .replace(/`([^`\n]+)`/g, (_, m) => c.cyan(m))
    .replace(/^#{1,4}\s(.+)$/gm, (_, m) => c.accent2('\n' + m))
    .replace(/^[-*]\s(.+)$/gm, (_, m) => ' ' + c.accent('•') + ' ' + m);
}

// ── onboarding (first run) ──────────────────
async function onboarding() {
  console.log(box('WELCOME TO NOMANDA', [
    'This is the terminal edition of NOMANDA.',
    'Your AI brain: ' + c.cyan('Frabula 1.2') + c.gray(' — free, keyless, nothing to install.'),
    '',
    'Let\'s set up your memory (stored only on this machine).',
  ], { width: 62 }));
  const name = await ask('your name:');
  const profession = await ask('profession (optional):');
  const gmail = await ask('gmail (optional, for email drafts):');
  MEMORY = { ...MEMORY, name: name || 'friend', profession, gmail, joinedAt: new Date().toISOString() };
  saveMemory(MEMORY);
  say.ok(`nice to meet you, ${MEMORY.name}!`);
}

// ── chat (streams Frabula 1.2 to the terminal) ──
async function chat(prompt) {
  if (!prompt) { say.err('say something to chat'); return; }
  if (!CUR || !prompt) return;
  if (CUR.msgs.length === 0) CUR.title = prompt.slice(0, 42) + (prompt.length > 42 ? '…' : '');

  CUR.msgs.push({ role: 'user', content: prompt, at: new Date().toISOString() });

  const history = CUR.msgs.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  console.log('');
  let full = '';
  try {
    // stream Frabula 1.2 live — terminal default color (black on light themes)
    const res = await streamChat(
      [{ role: 'system', content: buildSys(MEMORY) }, ...history],
      { model: CONFIG.model, onToken: d => { full += d; process.stdout.write(d); } }
    );
    console.log('\n');
    say.dim(`· ${brainName(res.via)} · ${full.length} chars`);
  } catch (e) {
    say.err('brain unreachable: ' + e.message);
    say.dim('Frabula 1.2 needs internet. Or start the NOMANDA server (npm start) for the local brain.');
    return;
  }
  CUR.msgs.push({ role: 'assistant', content: full, at: new Date().toISOString() });
  saveChats(CHATS);
}

// ── memory / chats / settings / status ──────
function showMemory() {
  console.log(box('MEMORY', [
    `${c.dim('name:       ')}${MEMORY.name || '—'}`,
    `${c.dim('profession: ')}${MEMORY.profession || '—'}`,
    `${c.dim('gmail:      ')}${MEMORY.gmail || '—'}`,
    `${c.dim('interests:  ')}${(MEMORY.interests || []).join(', ') || '—'}`,
    `${c.dim('member since:') } ${MEMORY.joinedAt ? new Date(MEMORY.joinedAt).toLocaleDateString() : 'today'}`,
  ]));
  say.dim('memory set name Sonal · memory set profession student · memory set gmail you@gmail.com');
}

async function setMemory(args) {
  const [key, ...rest] = args;
  const val = rest.join(' ');
  if (!['name', 'profession', 'gmail', 'interests'].includes(key)) { say.err('keys: name, profession, gmail, interests'); return; }
  MEMORY[key] = key === 'interests' ? val.split(',').map(s => s.trim()).filter(Boolean) : val;
  saveMemory(MEMORY);
  say.ok(`memory.${key} = ${MEMORY[key]}`);
}

function showChats() {
  if (!CHATS.length) { say.dim('no chats yet — just talk to me'); return; }
  console.log(table(CHATS.slice(0, 15).map((ch, i) => [
    String(i + 1), ch.title.slice(0, 40), String(ch.msgs.length), new Date(ch.at).toLocaleString()
  ]), ['#', 'title', 'msgs', 'when']));
  say.dim('chat <n> to continue · new to start fresh');
}

function status() {
  console.log(box('STATUS', [
    `${c.dim('brain:     ')}${c.cyan('Frabula 1.2')} ${c.dim('(provider: ' + CONFIG.provider + ')')}`,
    `${c.dim('model:     ')}${c.white(MODELS[CONFIG.model]?.name || CONFIG.model)} ${c.dim('(' + CONFIG.model + ')')}`,
    `${c.dim('theme:     ')}${c.white(themeName())} ${c.dim('( /theme light|dark|auto )')}`,
    `${c.dim('memory:    ')}${MEMORY.name || 'not set'}`,
    `${c.dim('chats:     ')}${CHATS.length}`,
    `${c.dim('data dir:  ')}${PATHS.workspace.replace(/\/workspace$/, '')}`,
    `${c.dim('home:      ')}${'see: home'}`,
  ]));
}

// ── command router ──────────────────────────
const HELP = () => {
  console.log(box('COMMANDS', [
    c.bold('<anything>') + '            chat with Frabula 1.2 (free AI brain)',
    c.bold('/model') + '                pick Frabula Core · Lite · Open  (Codex-style menu)',
    c.bold('/theme light|dark') + '     colors for your terminal',
    c.bold('/home') + '                 smart home dashboard (AC · lights · TV · brands · remotes)',
    c.bold('/studio <mode> <text>') + ' summary · quiz · flashcards · flow · code · plan',
    c.bold('/research <topic>') + '     deep multi-pass research report (saved as .md)',
    c.bold('/email <what>') + '         AI-drafted email → outbox/*.eml + Gmail link',
    c.bold('/file <cmd>') + '           list · create · cat · edit · rename · delete',
    c.bold('/chats') + '                history · /chat <n> continue · /new fresh chat',
    c.bold('/memory') + '               what I remember · /memory set name X',
    c.bold('/status') + ' · ' + c.bold('/help') + ' · ' + c.bold('/exit'),
    c.dim('plain words also work: home, studio, memory… — type / for the menu'),
  ]));
};

function showSlashMenu(filter = '') {
  const items = SLASH.filter(s => !filter || s.cmd.includes(filter));
  menuList(items.length ? items : SLASH, 0,
    filter ? `Commands matching "${filter}"` : 'Commands');
  console.log('');
  say.dim('pick a command — or just ask me anything');
}

async function runModelPicker(arg) {
  const keys = Object.keys(MODELS);
  if (arg) {
    const byNum = keys[parseInt(arg, 10) - 1];
    const key = byNum || (keys.includes(arg.toLowerCase()) ? arg.toLowerCase() : null);
    if (!key) { say.err(`usage: /model [1-${keys.length}]`); return; }
    CONFIG.model = key; saveConfig(CONFIG);
    say.ok(`model → ${c.cyan(MODELS[key].name)} ${c.dim('(' + MODELS[key].desc + ')')}`);
    return;
  }
  const sel = Math.max(0, keys.indexOf(CONFIG.model));
  menuList(keys.map((k, i) => ({
    cmd: `${i + 1}. ${MODELS[k].name}${i === 0 ? ' (default)' : ''}${k === CONFIG.model ? ' ✓' : ''}`,
    desc: MODELS[k].desc
  })), sel, 'Select Model');
  const ans = await ask(`pick 1-${keys.length} (Enter = keep current):`);
  const key = keys[parseInt(ans, 10) - 1];
  if (!key) { say.dim('kept current model'); return; }
  CONFIG.model = key; saveConfig(CONFIG);
  say.ok(`model → ${c.cyan(MODELS[key].name)}`);
}

async function runTheme(arg) {
  if (!['light', 'dark', 'auto'].includes(arg)) {
    say.dim(`current theme: ${themeName()} — /theme light | dark | auto`);
    return;
  }
  CONFIG.theme = arg; saveConfig(CONFIG);
  say.ok(`theme → ${setTheme(arg)}${arg === 'auto' ? ' (detected)' : ''}`);
}

async function dispatch(input) {
  const raw = input.trim();
  const isSlash = raw.startsWith('/');
  const [cmd, ...rest] = raw.replace(/^\//, '').trim().split(/\s+/);
  const lower = (cmd || '').toLowerCase();

  switch (lower) {
    case 'help': case '?': HELP(); return true;
    case 'model': await runModelPicker(rest[0] || ''); return true;
    case 'theme': await runTheme((rest[0] || '').toLowerCase()); return true;
    case 'home': await runHome(rest); return true;
    case 'studio': await runStudio(rest); return true;
    case 'research': await runResearch(rest); return true;
    case 'email': case 'mail': await runEmail(rest); return true;
    case 'file': case 'files': await runFiles(rest); return true;
    case 'memory': rest[0] === 'set' ? await setMemory(rest.slice(1)) : showMemory(); return true;
    case 'status': status(); return true;
    case 'chats': showChats(); return true;
    case 'chat': {
      const ch = CHATS[parseInt(rest[0], 10) - 1];
      if (!ch) { say.err('usage: chat <n> (see chats)'); return true; }
      CUR = ch;
      say.ok(`continuing: "${ch.title}"`);
      return true;
    }
    case 'new': CUR = newChat(CHATS); say.ok('fresh chat started'); return true;
    case 'clear': process.stdout.write('\x1b[2J\x1b[H'); return true;
    case 'exit': case 'quit': case 'q': return false;
    default:
      // "/" or unknown "/cmd" → Codex-style command menu
      if (isSlash) { showSlashMenu(cmd.toLowerCase()); return true; }
      if (raw) await chat(raw);
      return true;
  }
}

// ── main ────────────────────────────────────
async function main() {
  init();
  const argv = process.argv.slice(2);

  // one-shot mode: nomanda.js <command…>
  if (argv.length) {
    if (argv[0] === 'chat') { await chat(argv.slice(1).join(' ')); closeRL(); return; }
    await dispatch(argv.join(' '));
    closeRL();
    return;
  }

  // interactive shell — ONE shared readline (no double echo)
  if (!MEMORY.name) await onboarding();
  banner(MEMORY.name, { model: MODELS[CONFIG.model]?.name || CONFIG.model });

  const rl = getRL();
  while (true) {
    let input;
    try {
      input = await rl.question(c.accent2('\nnomanda › ') + c.white(''));
    } catch (_) { break; }
    if (!input.trim()) continue;
    let keepGoing = true;
    try { keepGoing = await dispatch(input); } catch (e) { say.err(e.message); }
    if (!keepGoing) break;
  }
  closeRL();
  console.log(c.dim('\nbye — stay curious. ✦\n'));
  process.exit(0);
}

main().catch(e => { console.error(c.err('\n' + e.stack)); process.exit(1); });
