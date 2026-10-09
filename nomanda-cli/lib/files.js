'use strict';
// ═══════════════════════════════════════════
// NOMANDA CLI — File Manager
// Files live in ~/.nomanda/workspace
// ═══════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, listFiles } from './store.js';
import { c, say, table, getRL } from './ui.js';

const WS = PATHS.workspace;

function safePath(name) {
  const p = path.resolve(WS, name);
  if (!p.startsWith(path.resolve(WS))) throw new Error('path escapes workspace');
  return p;
}

export function runFiles(args = []) {
  const [cmd, ...rest] = args;

  switch ((cmd || 'list').toLowerCase()) {
    case 'list': case 'ls': {
      const files = listFiles(WS);
      if (!files.length) { say.dim('workspace is empty — try: file create notes.txt'); return; }
      console.log(table(
        files.map(f => [f.dir ? c.accent('📁') : '📄', f.name, f.dir ? 'dir' : (f.size < 1024 ? f.size + ' B' : (f.size / 1024).toFixed(1) + ' KB')])
      ));
      say.dim('workspace: ' + WS);
      return;
    }
    case 'create': case 'new': {
      const name = rest.join(' ').trim();
      if (!name) { say.err('usage: file create <name.ext>  (then type content, end with a single dot line)'); return; }
      if (fs.existsSync(safePath(name))) { say.err(`${name} already exists`); return; }
      return readMultiline().then(body => {
        fs.writeFileSync(safePath(name), body + '\n');
        say.ok(`created ${name} (${body.length} chars)`);
      });
    }
    case 'cat': case 'read': case 'open': {
      const p = safePath(rest.join(' ').trim());
      if (!fs.existsSync(p)) { say.err('file not found'); return; }
      console.log(c.dim('─── ' + path.basename(p) + ' ───'));
      console.log(fs.readFileSync(p, 'utf8'));
      return;
    }
    case 'edit': {
      const name = rest.join(' ').trim();
      const p = safePath(name);
      if (!fs.existsSync(p)) { say.err('file not found'); return; }
      console.log(c.dim(`current content of ${name} (retype it; end with a single dot line):`));
      console.log(fs.readFileSync(p, 'utf8'));
      return readMultiline().then(body => {
        fs.writeFileSync(p, body + '\n');
        say.ok(`saved ${name}`);
      });
    }
    case 'rename': {
      const [from, to] = rest;
      if (!from || !to) { say.err('usage: file rename <old> <new>'); return; }
      fs.renameSync(safePath(from), safePath(to));
      say.ok(`renamed ${from} → ${to}`);
      return;
    }
    case 'delete': case 'rm': {
      const p = safePath(rest.join(' ').trim());
      if (!fs.existsSync(p)) { say.err('file not found'); return; }
      fs.rmSync(p, { recursive: true });
      say.ok(`deleted ${path.basename(p)}`);
      return;
    }
    default:
      say.err(`unknown file command "${cmd}" — list | create | cat | edit | rename | delete`);
  }
}

// multiline stdin: end with a single "." line
async function readMultiline() {
  if (process.stdin.isTTY) {
    say.dim('type content, finish with a single "." on its own line');
    const rl = getRL(); // shared interface — never a second echo source
    const out = [];
    while (true) {
      const line = await rl.question('');
      if (line.trim() === '.') break;
      out.push(line);
    }
    return out.join('\n');
  }
  // piped input: read everything
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trimEnd();
}
