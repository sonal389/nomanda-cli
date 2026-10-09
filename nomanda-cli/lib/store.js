'use strict';
// ═══════════════════════════════════════════
// NOMANDA CLI — persistent store
// Everything lives in ~/.nomanda (override: NOMANDA_HOME)
//   config.json   settings (provider, model)
//   memory.json   who you are (name, profession, interests, gmail)
//   chats.json    chat history
//   home.json     simulated smart-home state
//   workspace/    your files (file manager)
//   outbox/       drafted emails (.eml)
//   research/     saved research reports
//   studio/       saved studio outputs
// ═══════════════════════════════════════════
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DIR = process.env.NOMANDA_HOME || path.join(os.homedir(), '.nomanda');
export const PATHS = {
  config:   path.join(DIR, 'config.json'),
  memory:   path.join(DIR, 'memory.json'),
  chats:    path.join(DIR, 'chats.json'),
  home:     path.join(DIR, 'home.json'),
  workspace:path.join(DIR, 'workspace'),
  outbox:   path.join(DIR, 'outbox'),
  research: path.join(DIR, 'research'),
  studio:   path.join(DIR, 'studio'),
};

export function init() {
  for (const d of [DIR, PATHS.workspace, PATHS.outbox, PATHS.research, PATHS.studio]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function readJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; }
}
function writeJSON(p, obj) {
  try { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); } catch (_) {}
}

// ── config ──────────────────────────────────
export const DEFAULT_CONFIG = { provider: 'frabula', model: 'openai' };
export function loadConfig()  { return { ...DEFAULT_CONFIG, ...readJSON(PATHS.config, {}) }; }
export function saveConfig(c) { writeJSON(PATHS.config, c); }

// ── memory ──────────────────────────────────
export const DEFAULT_MEMORY = { name: '', profession: '', interests: [], gmail: '', joinedAt: null };
export function loadMemory()  { return { ...DEFAULT_MEMORY, ...readJSON(PATHS.memory, {}) }; }
export function saveMemory(m) { writeJSON(PATHS.memory, m); }

// ── chats ───────────────────────────────────
export function loadChats() { return readJSON(PATHS.chats, []); }
export function saveChats(chats) { writeJSON(PATHS.chats, chats.slice(0, 100)); }

export function newChat(chats) {
  const chat = { id: Date.now(), title: 'New Chat', msgs: [], at: new Date().toISOString() };
  chats.unshift(chat);
  saveChats(chats);
  return chat;
}

// ── home state ──────────────────────────────
export function loadHomeState() { return readJSON(PATHS.home, null); }
export function saveHomeState(h) { writeJSON(PATHS.home, h); }

// ── generic ─────────────────────────────────
export function writeFileSafe(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
export function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.'))
      .map(d => ({
        name: d.name,
        dir: d.isDirectory(),
        size: d.isDirectory() ? 0 : fs.statSync(path.join(dir, d.name)).size
      }))
      .sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
  } catch (_) { return []; }
}
export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
