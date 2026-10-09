'use strict';
// ═══════════════════════════════════════════
// NOMANDA CLI — Home
// Smart AC, lights, devices with company brands
// (Samsung, LG, Panasonic…) and remote-control
// commands. Mirrors the web Home dashboard.
// ═══════════════════════════════════════════
import { loadHomeState, saveHomeState } from './store.js';
import { c, say, box, table, hr, ask } from './ui.js';

const DEFAULTS = {
  ac:     { on: true, set: 24, cur: 26.4, mode: 'cool', brand: '' },
  lights: { living: true, bedroom: false, kitchen: true, bright: 70, temp: 'neutral', brand: '' },
  devices: {
    tv:      { name: 'Smart TV',      icon: '📺', on: true,  w: 110, brand: '' },
    fridge:  { name: 'Fridge',        icon: '🧊', on: true,  w: 145, brand: '' },
    washer:  { name: 'Washing Mach.', icon: '🫧', on: false, w: 500, brand: '' },
    fan:     { name: 'Ceiling Fan',   icon: '🌀', on: true,  w: 48,  brand: '' },
    speaker: { name: 'Smart Speaker', icon: '🔊', on: false, w: 12,  brand: '' },
    router:  { name: 'Wi-Fi Router',  icon: '📡', on: true,  w: 15,  brand: '' },
  },
  rc: {},
  todayKwh: 3.4,
  history: null,
  lastTick: Date.now(),
};

export const CATALOG = {
  ac:      { label: 'Air Conditioner', brands: ['Voltas', 'Daikin', 'LG', 'Samsung', 'Blue Star', 'Hitachi', 'Carrier', 'Godrej', 'Lloyd'] },
  lights:  { label: 'Lights',          brands: ['Philips', 'Wipro', 'Syska', 'Havells', 'Crompton', 'Mi LED', 'Philips Hue'] },
  tv:      { label: 'TV',              brands: ['Samsung', 'LG', 'Sony', 'Panasonic', 'Google / TCL', 'OnePlus', 'Xiaomi', 'VU', 'Hisense'] },
  fridge:  { label: 'Fridge',          brands: ['Samsung', 'LG', 'Whirlpool', 'Godrej', 'Haier', 'Bosch', 'Kelvinator'] },
  washer:  { label: 'Washing Machine', brands: ['LG', 'Samsung', 'IFB', 'Bosch', 'Whirlpool', 'Haier', 'Panasonic'] },
  fan:     { label: 'Ceiling Fan',     brands: ['Atomberg', 'Havells', 'Orient', 'Crompton', 'Usha', 'Bajaj'] },
  speaker: { label: 'Smart Speaker',   brands: ['JBL', 'Bose', 'Sonos', 'Amazon Echo', 'Google Nest', 'Zebronics'] },
  router:  { label: 'Wi-Fi Router',    brands: ['TP-Link', 'Netgear', 'D-Link', 'Jio Fiber', 'Airtel Xstream', 'Tenda'] },
};

const RC_DEFAULTS = {
  ac:      { fan: 'Auto', swing: true, timer: 0 },
  tv:      { vol: 35, chan: 1, mute: false, source: 'HDMI 1' },
  fridge:  { temp: 4, freezer: -18, mode: 'Eco' },
  washer:  { program: 'Daily', tempC: 40, spin: 800, running: false },
  fan:     { speed: 3, timer: 0, swing: false },
  speaker: { vol: 30, mute: false, eq: 'Balanced' },
  router:  { band: '2.4 GHz', guest: false },
};

export const AC_MODES = ['cool', 'heat', 'fan', 'auto'];
const LIGHT_TEMPS = ['warm', 'neutral', 'cool'];

let H = null;

function ensure() {
  if (H) return H;
  H = loadHomeState() || JSON.parse(JSON.stringify(DEFAULTS));
  // migrate defaults
  H.ac = { ...DEFAULTS.ac, ...H.ac };
  H.lights = { ...DEFAULTS.lights, ...H.lights };
  for (const id in DEFAULTS.devices) H.devices[id] = { ...DEFAULTS.devices[id], ...(H.devices?.[id] || {}) };
  H.rc = H.rc || {};
  for (const id in RC_DEFAULTS) H.rc[id] = { ...RC_DEFAULTS[id], ...(H.rc[id] || {}) };
  H.lastTick = Date.now();
  tick();
  return H;
}
function persist() { saveHomeState(H); }

// ── power model (same idea as web) ──────────
function acWatts() {
  if (!H.ac.on) return 0;
  if (H.ac.mode === 'fan') return 35;
  const effort = Math.abs(H.ac.set - H.ac.cur);
  const base = H.ac.mode === 'heat' ? 1100 : 1250;
  return Math.round(Math.min(1, effort / 4 + 0.25) * base);
}
function lightWatts() {
  let w = 0; const b = H.lights.bright / 100;
  for (const k of ['living', 'bedroom', 'kitchen']) if (H.lights[k]) w += 6 + 9 * b;
  return Math.round(w);
}
function deviceWatts() {
  let w = 0; for (const id in H.devices) if (H.devices[id].on) w += H.devices[id].w;
  return w;
}
function totalWatts() { return acWatts() + lightWatts() + deviceWatts(); }

// advance simulation by elapsed time (accrues kWh)
function tick() {
  const now = Date.now();
  const mins = Math.min(60, (now - (H.lastTick || now)) / 60000);
  H.lastTick = now;
  // room drifts toward AC set point
  if (H.ac.on && H.ac.mode !== 'fan') {
    const diff = H.ac.set - H.ac.cur;
    H.ac.cur += Math.sign(diff) * Math.min(Math.abs(diff), 0.15);
  } else {
    H.ac.cur += (26 - H.ac.cur) * 0.03;
  }
  H.todayKwh += (totalWatts() / 1000) * mins; // real-time accrual
  persist();
}

// ── dashboard ───────────────────────────────
export function dashboard() {
  ensure();
  const ON = () => '●';
  const OFF = () => '○';
  const lines = [];

  lines.push(
    `${'❄'.padEnd(3)} ${c.bold('AC')}       ${H.ac.on ? c.cyan(`▶ ${H.ac.set}°`) : c.gray('■ off')}  ` +
    `${c.dim('room')} ${H.ac.cur.toFixed(1)}°  ${c.dim(H.ac.mode)}  ` +
    (H.ac.brand ? c.accent2(H.ac.brand) : c.gray('no brand'))
  );
  lines.push(
    `${'💡'.padEnd(3)} ${c.bold('Lights')}   ` +
    ['living', 'bedroom', 'kitchen'].map(k => `${H.lights[k] ? c.yellow(ON()) : c.gray(OFF())} ${c.dim(k)}`).join('  ') +
    `  ${c.dim('bright')} ${H.lights.bright}%` + (H.lights.brand ? `  ${c.accent2(H.lights.brand)}` : '')
  );
  for (const id in H.devices) {
    const dv = H.devices[id];
    lines.push(
      `${dv.icon.padEnd(3)} ${c.bold(dv.name.padEnd(14))} ` +
      (dv.on ? c.green('▶ on ') : c.gray('■ off')) + '  ' +
      (dv.brand ? c.accent2(dv.brand.padEnd(13)) : c.gray('choose brand '.padEnd(13))) +
      c.dim(`${dv.w} W`)
    );
  }
  const tW = totalWatts();
  lines.push('');
  lines.push(
    `${c.yellow('⚡')} ${c.bold(String(tW) + ' W')} ${c.dim('now')}   ` +
    `${c.bold(H.todayKwh.toFixed(2))} ${c.dim('kWh today')}   ` +
    `${c.dim('≈')} ₹${Math.round(H.todayKwh * 8.5)} ${c.dim('/day')}`
  );

  console.log(box('HOME', lines, { width: 66 }));
  console.log(c.dim(`  try: home brand tv samsung · home vol tv 40 · home temp 22 · home light living off`));
}

// ── brand picker ────────────────────────────
export async function pickBrand(id, brandArg) {
  ensure();
  const cat = CATALOG[id];
  if (!cat) { say.err(`unknown device "${id}" — try: ${Object.keys(CATALOG).join(', ')}`); return; }

  let brand = brandArg;
  if (!brand) {
    console.log(c.bold(`\n ${cat.label} — which company?`));
    cat.brands.forEach((b, i) => console.log(`  ${c.accent(i + 1)}) ${b}`));
    const ans = await ask(`pick 1-${cat.brands.length}:`);
    const n = parseInt(ans, 10);
    brand = (!isNaN(n) && cat.brands[n - 1]) ? cat.brands[n - 1] : ans;
  }
  if (!cat.brands.some(b => b.toLowerCase() === String(brand).toLowerCase())) {
    say.warn(`"${brand}" isn't in the catalog — pairing anyway`);
  }
  const real = cat.brands.find(b => b.toLowerCase() === String(brand).toLowerCase()) || brand;
  if (id === 'ac') H.ac.brand = real;
  else if (id === 'lights') H.lights.brand = real;
  else H.devices[id].brand = real;
  persist();
  say.ok(`${real} ${cat.label} paired`);
  remoteHelp(id);
}

function remoteHelp(id) {
  const tips = {
    tv:      'home vol tv 40 · home vol tv + · home mute tv · home chan + · home source',
    ac:      'home temp 22 · home mode cool · home acfan High · home swing · home timer 2',
    lights:  'home bright 80 ·home light living off · home lighttone warm',
    fridge:  'home ftemp 4 · home freezer -18 · home fmode Eco',
    washer:  'home program Daily · home wtemp 40 · home spin 800 · home start washer',
    fan:     'home speed 3 · home swing · home ftimer 2',
    speaker: 'home vol speaker 30 · home mute speaker · home eq Bass',
    router:  'home band 5 · home guest on',
  }[id];
  if (tips) say.dim('remote: ' + tips);
}

// ── command router: `home …` ────────────────
export async function runHome(args) {
  ensure();
  const [cmd, ...rest] = args;

  if (!cmd) { dashboard(); return; }

  const dev = (i = 0) => (rest[i] || '').toLowerCase();
  const num = (i = 0, fallback) => { const v = parseFloat(rest[i]); return isNaN(v) ? fallback : v; };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  switch (cmd.toLowerCase()) {
    case 'help':
      console.log(box('HOME COMMANDS', [
        'home                          dashboard',
        'home brand <id> [company]     pick company (tv, ac, lights, fridge, washer, fan, speaker, router)',
        'home on|off <id>              power a device (or ac)',
        'home temp <16-30>             AC temperature',
        'home mode cool|heat|fan|auto  AC mode  ·  home acfan Low|Med|High|Auto',
        'home light <room> on|off      room = living|bedroom|kitchen',
        'home bright <5-100>           light brightness · home lighttone warm|neutral|cool',
        'home vol <id> <+|->|<0-100>    volume (tv, speaker)  ·  home mute <id>',
        'home chan <+|->               TV channel  ·  home source  TV source',
        'home speed <1-5>              fan speed  ·  home swing  ·  home ftimer <h>',
        'home ftemp <0-8>              fridge temp · home freezer <-24--12> · home fmode <m>',
        'home program <p>              washer program · home wtemp <c> · home spin <rpm> · home start <id>',
        'home band 2.4|5               router band · home guest on|off',
      ]));
      return;

    case 'brand': {
      const id = dev();
      if (!id) { say.err('usage: home brand <tv|ac|lights|…> [company]'); return; }
      await pickBrand(id, rest.slice(1).join(' ') || null);
      return;
    }

    case 'on': case 'off': {
      const id = dev();
      const state = cmd === 'on';
      if (id === 'ac') { H.ac.on = state; say.ok(`AC ${state ? 'on' : 'off'}`); }
      else if (H.devices[id]) { H.devices[id].on = state; say.ok(`${H.devices[id].name} ${state ? 'on' : 'off'}`); }
      else say.err(`unknown device "${id}"`);
      persist(); return;
    }

    case 'temp': {
      H.ac.set = clamp(num(), 16, 30); H.ac.on = true;
      say.ok(`AC set to ${H.ac.set}°`); persist(); return;
    }
    case 'mode': {
      const m = dev();
      if (!AC_MODES.includes(m)) { say.err(`mode: ${AC_MODES.join(', ')}`); return; }
      H.ac.mode = m; H.ac.on = true; say.ok(`AC mode: ${m}`); persist(); return;
    }
    case 'acfan': {
      const v = rest[0] ? rest[0][0].toUpperCase() + rest[0].slice(1).toLowerCase() : 'Auto';
      H.rc.ac.fan = ['Low', 'Medium', 'High', 'Auto'].includes(v) ? v : 'Auto';
      say.ok(`AC fan: ${H.rc.ac.fan}`); persist(); return;
    }
    case 'swing':    { H.rc.fan.swing = !H.rc.fan.swing; say.ok(`fan swing ${H.rc.fan.swing ? 'on' : 'off'}`); persist(); return; }
    case 'acswing':  { H.rc.ac.swing = !H.rc.ac.swing; say.ok(`AC swing ${H.rc.ac.swing ? 'on' : 'off'}`); persist(); return; }
    case 'timer': { H.rc.ac.timer = clamp(num(), 0, 24); say.ok(`AC timer: ${H.rc.ac.timer}h`); persist(); return; }

    case 'light': {
      const room = dev(), state = (rest[1] || '').toLowerCase();
      if (!(room in { living: 1, bedroom: 1, kitchen: 1 })) { say.err('room: living | bedroom | kitchen'); return; }
      if (!['on', 'off'].includes(state)) { say.err('usage: home light <room> on|off'); return; }
      H.lights[room] = state === 'on';
      say.ok(`${room} light ${state}`); persist(); return;
    }
    case 'bright': { H.lights.bright = clamp(num(), 5, 100); say.ok(`brightness ${H.lights.bright}%`); persist(); return; }
    case 'lighttone': {
      const t = dev();
      if (!LIGHT_TEMPS.includes(t)) { say.err(`tone: ${LIGHT_TEMPS.join(', ')}`); return; }
      H.lights.temp = t; say.ok(`light tone: ${t}`); persist(); return;
    }

    case 'vol': {
      const id = dev(), arg = (rest[1] || '').toLowerCase();
      const rc = H.rc[id];
      if (!rc || !('vol' in rc)) { say.err('usage: home vol <tv|speaker> <+|->|<0-100>'); return; }
      if (arg === '+') rc.vol = clamp(rc.vol + 5, 0, 100);
      else if (arg === '-') rc.vol = clamp(rc.vol - 5, 0, 100);
      else rc.vol = clamp(num(1, rc.vol), 0, 100);
      rc.mute = false;
      if (H.devices[id]) H.devices[id].on = true;
      say.ok(`${id} volume ${rc.vol}%`); persist(); return;
    }
    case 'mute': {
      const id = dev();
      const rc = H.rc[id];
      if (!rc || !('mute' in rc)) { say.err('usage: home mute <tv|speaker>'); return; }
      rc.mute = !rc.mute; say.ok(`${id} ${rc.mute ? 'muted' : 'unmuted'}`); persist(); return;
    }
    case 'chan': {
      const arg = dev();
      if (arg === '+') H.rc.tv.chan = clamp(H.rc.tv.chan + 1, 1, 999);
      else if (arg === '-') H.rc.tv.chan = clamp(H.rc.tv.chan - 1, 1, 999);
      else H.rc.tv.chan = clamp(num(0, H.rc.tv.chan), 1, 999);
      H.devices.tv.on = true;
      say.ok(`TV channel ${H.rc.tv.chan}`); persist(); return;
    }
    case 'source': {
      const srcs = ['HDMI 1', 'HDMI 2', 'AV', 'YouTube', 'Live TV'];
      H.rc.tv.source = srcs[(srcs.indexOf(H.rc.tv.source) + 1) % srcs.length];
      say.ok(`TV source: ${H.rc.tv.source}`); persist(); return;
    }

    case 'speed': {
      H.rc.fan.speed = clamp(num(), 1, 5); H.devices.fan.on = true;
      say.ok(`fan speed ${H.rc.fan.speed}`); persist(); return;
    }
    case 'ftimer': { H.rc.fan.timer = clamp(num(), 0, 8); say.ok(`fan timer ${H.rc.fan.timer}h`); persist(); return; }

    case 'ftemp':   { H.rc.fridge.temp = clamp(num(), 0, 8); say.ok(`fridge ${H.rc.fridge.temp}°C`); persist(); return; }
    case 'freezer': { H.rc.fridge.freezer = clamp(num(), -24, -12); say.ok(`freezer ${H.rc.fridge.freezer}°C`); persist(); return; }
    case 'fmode':   { H.rc.fridge.mode = rest[0] || 'Eco'; say.ok(`fridge mode: ${H.rc.fridge.mode}`); persist(); return; }

    case 'program': { H.rc.washer.program = rest[0] || 'Daily'; say.ok(`washer program: ${H.rc.washer.program}`); persist(); return; }
    case 'wtemp':   { H.rc.washer.tempC = clamp(num(), 20, 60); say.ok(`wash temp: ${H.rc.washer.tempC}°C`); persist(); return; }
    case 'spin':    { H.rc.washer.spin = clamp(num(), 400, 1400); say.ok(`spin: ${H.rc.washer.spin} RPM`); persist(); return; }
    case 'start': {
      const id = dev() || 'washer';
      if (!H.devices[id]) { say.err('unknown device'); return; }
      H.devices[id].on = true;
      if (id === 'washer') H.rc.washer.running = !H.rc.washer.running;
      say.ok(`${H.devices[id].name} ${H.devices[id].on ? '▶ started' : '■ stopped'}`); persist(); return;
    }

    case 'band': {
      const b = dev();
      H.rc.router.band = b.startsWith('5') ? '5 GHz' : '2.4 GHz';
      say.ok(`router band: ${H.rc.router.band}`); persist(); return;
    }
    case 'guest': {
      H.rc.router.guest = (rest[0] || '').toLowerCase() === 'on';
      say.ok(`guest wifi ${H.rc.router.guest ? 'on' : 'off'}`); persist(); return;
    }

    case 'table':
      console.log(table(
        [['AC', H.ac.on ? 'on' : 'off', H.ac.set + '°', H.ac.mode, H.ac.brand || '—'],
         ...Object.entries(H.devices).map(([id, dv]) => [dv.name, dv.on ? 'on' : 'off', dv.w + 'W', id, dv.brand || '—'])],
        ['device', 'state', 'value', 'id', 'brand']
      ));
      return;

    default:
      say.err(`unknown home command "${cmd}" — try: home help`);
  }
}

// expose state for the AI command parser (future voice/text control)
export function homeState() { ensure(); return H; }
