'use strict';
// ═══════════════════════════════════════════
// NOMANDA CLI — Studio
// Turn text/files into summaries, quizzes,
// flashcards, flowcharts, code & plans.
// (mirrors the web NOMANDA Studio)
// ═══════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, writeFileSafe, stamp } from './store.js';
import { streamChat } from './brain.js';
import { c, say, spin, stopSpin } from './ui.js';

export const MODES = {
  summary:   { label: 'Summary',        hint: 'studio summary <text or file:notes.txt>', ask: 'Write a clear, structured summary of the following source material.' },
  overview:  { label: 'Overview',       hint: 'studio overview <text>',                   ask: 'Write a rich overview article of the source material with intro, sections and conclusion.' },
  quiz:      { label: 'Quiz',           hint: 'studio quiz <text>',                       ask: 'Create a 8-question quiz from this material. For each: question, 4 options (A-D), correct answer and a 1-line explanation.' },
  flashcards:{ label: 'Flashcards',     hint: 'studio flashcards <text>',                 ask: 'Create 10 flashcards from this material as:\nQ: <front>\nA: <back>\n---' },
  flow:      { label: 'Flow chart',     hint: 'studio flow <text>',                       ask: 'Represent this as a Mermaid flowchart (```mermaid code) plus a numbered step list.' },
  code:      { label: 'Code',           hint: 'studio code <what to build>',              ask: 'Write complete, working code for the request. Include usage comments.' },
  plan:      { label: 'MCP / tool plan',hint: 'studio plan <goal>',                       ask: 'Create an MCP-style tool plan: servers, tools, data flow, permissions and example tool calls.' },
};

export async function runStudio(args) {
  const [modeKey, ...rest] = args;
  const mode = MODES[(modeKey || '').toLowerCase()];

  if (!mode) {
    console.log(c.bold('\n STUDIO — what should I make?'));
    for (const [k, m] of Object.entries(MODES)) console.log(`  ${c.accent(k.padEnd(11))} ${c.dim(m.hint)}`);
    return;
  }

  let source = rest.join(' ').trim();
  if (source.startsWith('file:')) {
    const p = path.resolve(PATHS.workspace, source.slice(5).trim());
    if (!fs.existsSync(p)) { say.err('file not found in workspace'); return; }
    source = fs.readFileSync(p, 'utf8');
  }
  if (!source) { say.err('usage: ' + mode.hint); return; }
  if (source.length > 12000) source = source.slice(0, 12000) + '\n…(truncated)';

  say.info(`studio · making ${mode.label.toLowerCase()}…`);
  spin(mode.label.toLowerCase());
  let out = '';
  try {
    const res = await streamChat([
      { role: 'system', content: 'You are NOMANDA Studio. Follow the requested output format exactly. Make the artifact directly, not instructions about it.' },
      { role: 'user', content: `${mode.ask}\n\nSOURCE:\n${source}` }
    ]);
    out = res.text;
    stopSpin();
  } catch (e) {
    stopSpin();
    say.err('studio failed: ' + e.message);
    return;
  }

  console.log('\n' + c.accent(`─── ${mode.label.toUpperCase()} ───`) + '\n');
  console.log(out.trim() + '\n');

  const ext = modeKey === 'flow' ? 'mmd' : 'md';
  const file = path.join(PATHS.studio, `${modeKey}-${stamp()}.${ext}`);
  writeFileSafe(file, out.trim() + '\n');
  say.ok(`saved · ${file}`);
}
