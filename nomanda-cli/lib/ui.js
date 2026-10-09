'use strict';
// ═══════════════════════════════════════════
// NOMANDA CLI — UI kit (zero dependencies)
// theme-aware colors · boxes · tables · spinner
// Codex-style menus · ONE shared readline
// ═══════════════════════════════════════════
import readline from 'node:readline/promises';

const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const E = (code, s) => (TTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));

// ── theme: readable on light AND dark terminals ──
let LIGHT = (() => {
  const v = process.env.COLORFGBG;
  if (v) { const p = v.split(';'); const bg = parseInt(p[p.length - 1], 10); if (!isNaN(bg)) return bg >= 8; }
  return false;
})();
export function setTheme(t = 'auto') {
  if (t === 'light') LIGHT = true;
  else if (t === 'dark') LIGHT = false;
  else {
    const v = process.env.COLORFGBG;
    if (v) { const p = v.split(';'); const bg = parseInt(p[p.length - 1], 10); LIGHT = !isNaN(bg) && bg >= 8; }
    else LIGHT = false;
  }
  return themeName();
}
export const themeName = () => LIGHT ? 'light' : 'dark';

export const c = {
  bold:    s => E('1', s),
  dim:     s => E('2', s),
  text:    s => String(s),                                       // terminal default fg (black on light terminals)
  red:     s => E(LIGHT ? '38;5;160' : '38;5;203', s),
  green:   s => E(LIGHT ? '38;5;28'  : '38;5;40',  s),
  yellow:  s => E(LIGHT ? '38;5;136' : '38;5;221', s),
  blue:    s => E('38;5;44', s),
  purple:  s => E('38;5;141', s),
  lilac:   s => E('38;5;177', s),
  cyan:    s => E(LIGHT ? '38;5;30' : '38;5;51', s),
  gray:    s => E(LIGHT ? '38;5;242' : '38;5;244', s),
  white:   s => E(LIGHT ? '38;5;236' : '38;5;255', s),
  accent:  s => E('38;5;141', s),
  accent2: s => E('38;5;177', s),
  ok:      s => E(LIGHT ? '38;5;28'  : '38;5;40',  s),
  err:     s => E(LIGHT ? '38;5;160' : '38;5;203', s),
  warn:    s => E(LIGHT ? '38;5;136' : '38;5;221', s),
};

export const symbols = { ok: '✓', err: '✗', warn: '!', info: '›', on: '●', off: '○', bolt: '⚡' };

export function hr(ch = '─', n = 58) { return c.gray(ch.repeat(n)); }
export function strip(s) { return String(s).replace(/\x1b\[[0-9;]*m/g, ''); }

// ── Codex-style highlighted row ─────────────
export function hl(s) { return TTY ? `\x1b[48;5;141m\x1b[38;5;255m ${s} \x1b[0m` : String(s); }

// menu list: selected row's command gets the highlight bar
export function menuList(items, sel = 0, label) {
  if (label) console.log('\n ' + c.bold(label));
  items.forEach((it, i) => {
    const arrow = i === sel ? c.accent('›') : ' ';
    const raw = it.cmd || '';
    const cmd = raw + ' '.repeat(Math.max(1, 12 - [...strip(raw)].length)); // always ≥1 space
    const desc = c.gray(it.desc || '');
    console.log(' ' + arrow + ' ' + (i === sel ? hl(strip(cmd)) : c.bold(cmd)) + desc);
  });
}

// ── Boxed panel ─────────────────────────────
export function box(title, lines = [], opts = {}) {
  const width = opts.width || Math.min(64, Math.max(
    ...(title ? [[...strip(title)].length + 4] : [0]),
    ...lines.map(l => [...strip(l)].length + 4),
    24
  ));
  const pad = (s) => {
    const visible = [...strip(s)].length;
    return s + ' '.repeat(Math.max(0, width - 4 - visible));
  };
  const top = title
    ? c.gray('┌─ ') + c.accent(title) + c.gray(' ' + '─'.repeat(Math.max(0, width - 6 - [...strip(title)].length)) + '┐')
    : c.gray('┌' + '─'.repeat(width - 2) + '┐');
  const out = [top];
  for (const l of lines) out.push(c.gray('│ ') + pad(l) + c.gray(' │'));
  out.push(c.gray('└' + '─'.repeat(width - 2) + '┘'));
  return out.join('\n');
}

// ── Simple table ────────────────────────────
export function table(rows, head = []) {
  if (!rows.length) return c.gray('(empty)');
  const all = head.length ? [head, ...rows] : rows;
  const cols = Math.max(...all.map(r => r.length));
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(...all.map(r => [...strip(r[i] ?? '')].length)));
  const line = r =>
    r.map((cell, i) => String(cell ?? '').padEnd(widths[i] + (String(cell ?? '').length - [...strip(cell ?? '')].length))).join('  ');
  const out = [];
  if (head.length) {
    out.push(c.accent(line(head.map(h => h.toUpperCase()))));
    out.push(c.gray('─'.repeat(widths.reduce((a, b) => a + b + 2, 0))));
  }
  for (const r of rows) out.push(line(r));
  return out.join('\n');
}

// ── Spinner (only on TTY) ───────────────────
let spinTimer = null;
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export function spin(msg = 'thinking') {
  stopSpin();
  if (!TTY) { process.stderr.write(`… ${msg}\n`); return; }
  let i = 0;
  spinTimer = setInterval(() => {
    process.stderr.write(`\r${c.accent(FRAMES[i++ % FRAMES.length])} ${c.dim(msg)}   `);
  }, 90);
}
export function stopSpin() {
  if (spinTimer) { clearInterval(spinTimer); spinTimer = null; process.stderr.write('\r\x1b[2K'); }
}

// ── Logging helpers ─────────────────────────
export const say = {
  ok:   m => console.log(` ${c.ok(symbols.ok)} ${m}`),
  err:  m => console.log(` ${c.err(symbols.err)} ${m}`),
  warn: m => console.log(` ${c.warn(symbols.warn)} ${m}`),
  info: m => console.log(` ${c.accent(symbols.info)} ${m}`),
  dim:  m => console.log(`   ${c.dim(m)}`),
  line: m => console.log(m ?? ''),
};

// ── ONE shared readline (fixes double echo) ──
let rl = null;
export function getRL() {
  if (!rl) rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return rl;
}
export async function ask(promptText) {
  const v = await getRL().question(c.accent(' ' + symbols.info + ' ') + c.bold(promptText) + ' ');
  return v.trim();
}
export function closeRL() { if (rl) { rl.close(); rl = null; } }

// ── ASCII orb + banner ──────────────────────
const ORB = [
  '          .od8888bo.',
  '       .d88P""""Y88b.',
  '      d8P\'   ✦    `Y8b.',
  '      88b    .    d88P',
  '      `Y8b.      .d8P\'',
  '       `Y88888888P\'',
].map(l => c.gray(l)).join('\n');

export function banner(name, info = {}) {
  console.log('\n' + ORB + '\n');
  console.log('   ' + c.accent(c.bold('NOMANDA')) + c.gray(' — Intelligence Core') +
    c.dim('  ·  terminal edition'));
  if (name) console.log('   ' + c.dim('hey, ') + c.bold(String(name)));
  console.log('   ' + c.dim('brain ') + c.cyan('Frabula 1.2') +
    (info.model ? c.dim('  ·  model ') + c.white(info.model) : '') +
    c.dim('  ·  theme ') + c.white(themeName()));
  console.log('   ' + c.dim('type ') + c.white('/') + c.dim(' for commands  ·  ') +
    c.white('/model') + c.dim(' to switch  ·  ') + c.white('help') + c.dim('\n'));
}
