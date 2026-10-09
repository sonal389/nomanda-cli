'use strict';
// ═══════════════════════════════════════════
// NOMANDA CLI — Smart Email
// AI drafts the email → saves .eml in outbox/
// and prints a one-click Gmail compose link.
// ═══════════════════════════════════════════
import path from 'node:path';
import { PATHS, loadMemory, writeFileSafe, stamp } from './store.js';
import { quick } from './brain.js';
import { c, say, box } from './ui.js';

export async function runEmail(args) {
  const raw = args.join(' ').trim();
  if (!raw) { say.err('usage: email <what the email should say>\n       email to boss@example.com about sick leave'); return; }

  const mem = loadMemory();
  const toMatch = raw.match(/to\s+([^\s]+@[^\s]+)|to\s+([A-Za-z][\w\s.]{1,30}?)(?:\s+(?:about|regarding|for)\s|$)/i);
  const to = toMatch?.[1] || toMatch?.[2]?.trim() || '';

  say.info('drafting your email with Frabula 1.2…');
  let text = '';
  try {
    text = await quick(
      `Draft a complete professional email based on this request: "${raw}"
Sender: ${mem.name || 'User'}${mem.profession ? ' (' + mem.profession + ')' : ''}${mem.gmail ? ' <' + mem.gmail + '>' : ''}
${to ? 'Recipient: ' + to : ''}
Reply with EXACTLY this format:
Subject: <email subject>
Body:
<complete email body with greeting, paragraphs and sign-off>`,
      'You are an expert email writing assistant. Reply only with the Subject: and Body: lines requested.'
    );
  } catch (e) {
    say.err('brain unreachable: ' + e.message);
    return;
  }

  const subj = (text.match(/^Subject:\s*(.*)$/mi)?.[1] || 'Message from ' + (mem.name || 'NOMANDA')).trim();
  const body = (text.split(/^Body:\s*$/mi)[1] || text).trim();

  // save .eml
  const file = path.join(PATHS.outbox, `${stamp()}.eml`);
  const eml = `From: ${mem.gmail || (mem.name || 'user') + '@nomanda.local'}\nTo: ${to || ''}\nSubject: ${subj}\n\n${body}\n`;
  writeFileSafe(file, eml);

  console.log(box('DRAFT EMAIL', [
    c.dim('To: ') + (to || c.yellow('(fill in)')),
    c.dim('Subject: ') + c.bold(subj),
    '',
    ...body.split('\n').slice(0, 40),
  ], { width: 68 }));
  say.ok('saved to ' + file);

  if (to && to.includes('@')) {
    const gmail = 'https://mail.google.com/mail/?view=cm&fs=1'
      + '&to=' + encodeURIComponent(to)
      + '&su=' + encodeURIComponent(subj)
      + '&body=' + encodeURIComponent(body);
    console.log(` ${c.accent('›')} Gmail compose: ${c.cyan(gmail)}`);
  } else {
    say.dim('tip: "email to someone@example.com about …" to get a Gmail send link');
  }
}
