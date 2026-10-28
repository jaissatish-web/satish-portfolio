/* Field Tools P0 — pure engineering logic + thin DOM adapters.
   SJ Hub System v1. Existing validated engines remain untouched; this file
   is additive and independently tested (tests/hub-tools.test.js).
   Diagnostic outputs are screening aids, not definitive fault determinations. */
(function (root) {
'use strict';

/* Node compatibility: the reference tables reuse the validated Pt100/TC
   temperature functions from engineering-math.js (browser sets window.Engineering). */
if (typeof module !== 'undefined' && module.exports && !root.Engineering) {
  root.Engineering = require('./engineering-math.js');
}

const check = (ok, msg) => { if (!ok) throw new Error(msg); };
const finite = (...xs) => xs.every(Number.isFinite);
const round = (n, d = 3) => { check(Number.isFinite(Number(n)), 'Result exceeds the supported numeric range. Use smaller input values.'); return Number(n).toLocaleString('en-US', { maximumFractionDigits: d }); };

/* ---------- 1. mA Loop Fault Finder ---------- */
/* NAMUR NE43-style bands with explicit thresholds. Diagnostic assistance only. */
function classifyLoop(mA, lo = 3.6, hi = 21.0) {
  check(finite(mA, lo, hi), 'Enter finite current and fault limits.');
  check(lo >= 3.0 && lo <= 4.0, 'Low fault limit is typically 3.6 mA (NAMUR NE43).');
  check(hi >= 20.0 && hi <= 23.0, 'High fault limit is typically 21.0 mA (NAMUR NE43).');
  check(mA >= 0 && mA <= 30, 'Enter a measured current between 0 and 30 mA.');
  if (mA < 0.5) {
    return { band: 'bad', label: 'Open circuit / no current', pct: null,
      advice: ['Confirm loop power supply is energised.', 'Measure voltage directly at the transmitter terminals (typically 10–32 V DC).', 'Check the loop for open terminals, blown fuse or disconnected cable.', 'Verify the transmitter is seated and loop test / sim mode is off.'],
      hint: 'mA below 0.5 usually means no current is flowing at all.' };
  }
  if (mA < 3.8) {
    return { band: 'bad', label: 'Low-signal fault band', pct: null,
      advice: ['Compare with the configured fault current (3.6 mA is common; some use 3.8 mA).', 'Check supply voltage and polarity at the transmitter.', 'Look for high loop resistance, corroded terminals or a failing powered device.', 'Sensor fault or hardware error can also drive the output low.'],
      hint: 'Below 3.8 mA falls in the NAMUR NE43 fault band — the process may be live but the signal line reports a fault.' };
  }
  if (mA <= 20.5) {
    const pct = ((mA - 4) / 16) * 100;
    return { band: 'ok', label: 'Normal signal band (' + round(pct, 1) + ' % of span)', pct,
      advice: ['Signal is within the normal operating band (3.8–20.5 mA).', 'A value below 4 mA is a live-zero read, not a fault.', 'Verify the measured percentage agrees with the instrument reading before continuing.'],
      hint: '4 mA = live zero (0 %); 20 mA = span end (100 %).' };
  }
  if (mA < 21.0) {
    return { band: 'warn', label: 'High limit transition', pct: null,
      advice: ['Between 20.5 and 21 mA some devices still report; treat as an alarm state.', 'Confirm configured fault threshold and device alarm limits (NAMUR or vendor specific).', 'Watch for actual over-range conditions rather than a configured alarm.'],
      hint: 'Transition zone between normal operation and the declared fault band.' };
  }
  if (mA <= 23) {
    return { band: 'bad', label: 'High-signal fault band', pct: null,
      advice: ['Greater than 21 mA is the declared fault band for most transmitters.', 'Typical causes: sensor/electronics fault, loop test mode left on, or wiring mistake feeding a foreign current.', 'Identify with functional test: force the input and watch whether the output returns to a normal value.'],
      hint: 'A persistent >21 mA output usually points at the device or a loop-wiring fault, not the process.' };
  }
  return { band: 'bad', label: 'Over-range / unwanted current', pct: null,
    advice: ['Above 23 mA is beyond normal HART transmission range.', 'Suspect a short to another source, an incorrectly wired powered device, or an auxiliary feed.', 'Isolate the loop and test the transmitter alone on a power supply + mA meter.'],
    hint: 'Not a normal analog output — investigate before re-energising the loop.' };
}
/* Voltage budget check: available = supply − device minimum − I·Rloop */
function loopBudget(supply, mA, resistance, deviceMin) {
  check(finite(supply, mA, resistance, deviceMin), 'Enter finite supply, current, resistance and device minimums.');
  check(supply > 0 && mA >= 0 && resistance >= 0 && deviceMin >= 0, 'Use a positive supply and nonnegative values.');
  const drop = (mA / 1000) * resistance;
  return { drop, margin: supply - deviceMin - drop, available: supply - drop };
}

/* ---------- 2. RTD & Thermocouple Reference ---------- */
function referenceRows(type, from, to, step) {
  check(['pt100', 'K', 'J', 'T'].includes(type), 'Choose Pt100, K, J or T.');
  check(finite(from, to, step) && step > 0, 'Enter finite temperatures and a positive step.');
  if (from > to) { const t = from; from = to; to = t; }
  const rows = [];
  if (type === 'pt100') {
    check(from >= -200 && to <= 850, 'Pt100 table range: −200…850 °C.');
    for (let t = from; t <= to + 1e-9; t += step) {
      const r = Number(root.Engineering.rtd(t).toFixed(4));
      const tolA = 0.15 + 0.002 * Math.abs(t);
      const tolB = 0.30 + 0.005 * Math.abs(t);
      rows.push({ t: round(t, 1), value: round(r, 4), unit: 'Ω', tol: 'A ±' + round(tolA, 3) + ' / B ±' + round(tolB, 3) });
    }
  } else {
    const maxT = { K: 1372, J: 760, T: 400 }[type];
    check(from >= 0 && to <= maxT, 'Type ' + type + ' table range: 0…' + maxT + ' °C (positive branch).');
    for (let t = from; t <= to + 1e-9; t += step) {
      const e = Number(root.Engineering.tc(type, t).toFixed(4));
      rows.push({ t: round(t, 1), value: round(e, 4), unit: 'mV', tol: 'Class 1 ≈ ±1.5 °C' });
    }
  }
  return rows;
}
function referenceSingle(type, t, cj = 0) {
  if (type === 'pt100') {
    const r = root.Engineering.rtd(t);
    return { value: r, unit: 'Ω', detail: 'IEC 60751 nominal; two/three/four-wire lead effects are separate.' };
  }
  const e = root.Engineering.tc(type, t) - root.Engineering.tc(type, cj);
  return { value: e, unit: 'mV', detail: 'NIST ITS-90 reference function with ' + round(cj, 1) + ' °C reference junction.' };
}

/* ---------- 3. HART universal / common-practice commands ---------- */
const HART = [
  ['0', 'Read unique identifier', 'Device type, manufacturer, revision and serial number', 'Device unique ID', 'Works at all power levels; polling address affects later commands'],
  ['1', 'Read primary variable (PV)', 'Current process variable', 'PV value + engineering unit', 'Unit comes from command 3 or 14'],
  ['2', 'Read loop current and percent of range', 'Analog output and its range percentage', 'mA value, % of range (4=0%, 20=100%)', 'Useful with a series mA meter to verify calibration'],
  ['3', 'Read all dynamic variables', 'PV, SV, TV, QV', 'Up to four variables with units', 'Device-dependent which variable maps where'],
  ['6', 'Write polling address', 'Device address (0–15 default)', 'Acknowledgment', 'Changing one address in tight-control loops is practical; excessive changes complicate discovery'],
  ['7', 'Read loop configuration', 'Loop current mode and transfer function', 'Mode + transfer function', 'Legacy command; many devices mark it obsolete'],
  ['8', 'Write loop configuration', 'Desired mode/transfer function', 'Acknowledgment', 'Restrict to authorised maintenance'],
  ['11', 'Read tag, descriptor, date', 'Tag (8 chars), descriptor, date', 'Tag + metadata', 'Command 20 covers the long tag'],
  ['12', 'Write tag', 'New tag', 'Acknowledgment', 'Tag length depends on device limit'],
  ['13', 'Write descriptor and date', 'Descriptor + date', 'Acknowledgment', 'Metadata editing, not process data'],
  ['14', 'Read primary variable sensor information', 'Sensor serial, limits, span, units', 'Sensor info block', 'Confirm sensor limits against the process range'],
  ['15', 'Read output information', 'Alarm selection, transfer function, PV range', 'Output config block', 'Check alarm direction (high/low) to match fail-safe design'],
  ['16', 'Read final assembly number', 'Final assembly / installation number', 'Number', 'Often left unused on site'],
  ['17', 'Write message', 'Free 32-char message', 'Acknowledgment', 'Useful for loop notes'],
  ['18', 'Write tag, descriptor, date', 'Combined metadata write', 'Acknowledgment', 'May be blocked on some devices'],
  ['19', 'Write final assembly number', 'New number', 'Acknowledgment', '—'],
  ['20', 'Read long tag', 'Long tag (32 chars)', 'Long tag', 'Modern installations use long tags for DCS interfaces'],
  ['21', 'Read unique identifier associated with long tag', 'Long tag query', 'Device ID', '—'],
  ['22', 'Write long tag', 'New long tag', 'Acknowledgment', '—'],
  ['24', 'Read additional device status', 'Device diagnostic bits', 'Status words', 'Pair with command 48 for extended diagnostics'],
  ['27', 'Read device variables and status', 'Device variables + status', 'Set of variables', 'Addresses mapping vary by manufacturer'],
  ['33', 'Read device variables', 'Select device variables', 'Values + units', 'Standard way to read auxiliary measurements'],
  ['35', 'Write device variables', 'Select variable + value', 'Acknowledgment', 'Restricted where write-protect is enabled'],
  ['38', 'Reset configuration changed flag', '—', 'Status', 'Used after configuration verification workflows'],
  ['40', 'Enter / exit fixed current mode', 'Target mA (e.g. 4.0 for zero test)', 'Acknowledgment', 'The loop remains at the fixed value until command 40 or 128 exits'],
  ['48', 'Read additional device status', 'Extended diagnostics', 'Status words + help text', 'Key for NAMUR NE107-style process device diagnostics']
];
function hartLookup(q) {
  const needle = String(q || '').trim().toLowerCase();
  if (needle === '') return HART;
  return HART.filter(r => r.some(cell => cell.toLowerCase().includes(needle)));
}

/* ---------- 4. ISA tag builder (simplified conventions) ---------- */
const ISA_VARS = { 'P': 'Pressure', 'T': 'Temperature', 'F': 'Flow', 'L': 'Level', 'A': 'Analysis', 'Q': 'Quantity', 'V': 'Vibration', 'D': 'Density', 'H': 'Hand', 'X': 'Unspecified', 'Y': 'Event', 'Z': 'Position', 'S': 'Speed', 'G': 'Gauge' };
const ISA_FUNS = { 'T': 'Transmitter', 'I': 'Indicator', 'S': 'Switch', 'A': 'Alarm', 'R': 'Recorder', 'C': 'Controller', 'V': 'Valve', 'E': 'Element/sensor', 'G': 'Gauge', 'Y': 'Relay/compute', 'Z': 'Positioner', 'K': 'Check valve', 'J': 'Power element' };
function buildTag(prefix, varL, fnL, loop, suffix, style) {
  check(/^[A-Za-z0-9]{0,4}$/.test(prefix), 'Project prefix: 0–4 letters or digits only.');
  check(Object.prototype.hasOwnProperty.call(ISA_VARS, varL), 'Select a measured variable.');
  check(Object.prototype.hasOwnProperty.call(ISA_FUNS, fnL), 'Select a function.');
  check(/^\d{1,5}$/.test(String(loop)), 'Loop number must be 1–5 digits.');
  if (suffix !== '') check(/^[A-Za-z0-9]{1,2}$/.test(suffix), 'Suffix: 1–2 letters/digits only.');
  const core = varL + fnL + '-' + loop + suffix.toUpperCase();
  const full = (style === 'prefix' && prefix) ? prefix + core : core;
  return {
    tag: full,
    parts: [
      [prefix ? 'Prefix' : '', prefix],
      ['Measured variable', varL + ' = ' + ISA_VARS[varL]],
      ['Function', fnL + ' = ' + ISA_FUNS[fnL]],
      ['Loop number', String(loop)],
      ['Suffix', suffix || '—']
    ].filter(p => p[0] !== '' || p[1] !== ''),
    note: 'Simplified ISA 5.1-style tag. Project naming rules and client standards always take precedence.'
  };
}

/* ---------- 5. DCS / PLC I/O spares ---------- */
const IO_TYPES = ['AI', 'AO', 'DI', 'DO'];
function ioPlan(counts, channels, perTypeSparePct, reserveModules) {
  check(finite(...Object.values(counts), ...Object.values(channels), perTypeSparePct, reserveModules), 'Enter finite numbers.');
  counts = { AI: counts.AI, AO: counts.AO, DI: counts.DI, DO: counts.DO };
  channels = { AI: channels.AI, AO: channels.AO, DI: channels.DI, DO: channels.DO };
  check(IO_TYPES.every(k => counts[k] >= 0), 'I/O counts must be nonnegative.');
  check(perTypeSparePct >= 0 && perTypeSparePct <= 100, 'Spare policy 0–100 %.');
  check(IO_TYPES.every(k => channels[k] >= 1 && channels[k] <= 64), 'Channel capacity per module must be 1–64.');
  const out = {};
  IO_TYPES.forEach(k => {
    const need = Math.ceil((counts[k] * (1 + perTypeSparePct / 100)) / channels[k]);
    const modules = Math.max(need, 0) + (reserveModules ? Math.ceil(counts[k] / channels[k]) > 0 ? 1 : 0 : 0);
    out[k] = {
      modules,
      installed: modules * channels[k],
      used: counts[k],
      spare: modules * channels[k] - counts[k],
      utilization: counts[k] ? (counts[k] / (modules * channels[k])) * 100 : 0
    };
  });
  return out;
}

/* ---------- 6. Punch-list / ITR records ---------- */
const PUNCH_CATEGORIES = ['Documentation', 'Instrument', 'Electrical', 'Piping', 'Functional', 'Walkdown', 'Other'];
function punchStats(rows) {
  const stats = { total: rows.length, open: 0, closed: 0, inprogress: 0, byCategory: {} };
  rows.forEach(r => {
    if (r.status === 'Open') stats.open++; else if (r.status === 'Closed') stats.closed++; else stats.inprogress++;
    stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
  });
  return stats;
}

const FieldTools = {
  classifyLoop, loopBudget, referenceRows, referenceSingle, HART, hartLookup,
  ISA_VARS, ISA_FUNS, buildTag, IO_TYPES, ioPlan, PUNCH_CATEGORIES, punchStats
};

if (typeof module !== 'undefined' && module.exports) module.exports = FieldTools;
else root.FieldTools = FieldTools;

/* ---------- Page adapters (browser) ---------- */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const app = document.getElementById('engineering-app');
  if (app && window.FieldTools) {
    const slug = app.dataset.tool;
    const FT = window.FieldTools;
    const $ = id => document.getElementById(id);
    const inputs = $('tool-inputs'), visual = $('live-visual'), results = $('live-results'), message = $('tool-message'), extra = $('extra-results');
    const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const read = k => { const e = $(k); if (!e) throw new Error('Missing input ' + k); if (e.tagName === 'SELECT') return e.value; check(e.value.trim() !== '' && Number.isFinite(Number(e.value)), 'Enter ' + (e.labels && e.labels[0] ? e.labels[0].textContent : k) + '.'); return Number(e.value); };
    const render = (rows, graphic, note) => { results.innerHTML = rows.map(([l, v]) => '<div class="result-tile"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></div>').join(''); visual.innerHTML = graphic; message.textContent = note || ''; message.className = 'tool-message'; };
    const table = (headers, rows) => '<div class="table-scroll"><table><thead><tr>' + headers.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    const cards = (items, cols) => '<div class="result-grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + items.map(([l, v]) => '<div class="result-tile"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></div>').join('') + '</div>';
    let lastRows = [];
    const bandHtml = b => '<div class="diag-band ' + b.band + '"><span class="band-icon">' + (b.band === 'ok' ? '✓' : b.band === 'warn' ? '△' : '✕') + '</span><div><div>' + esc(b.label) + '</div><div style="font-weight:400;font-size:.82rem;margin-top:2px">' + esc(b.hint) + '</div></div></div>';
    const adviceHtml = list => '<div style="margin-top:14px"><h3 style="font-size:.95rem">Field checks — in order</h3><ol style="margin:10px 0 0;padding-left:20px">' + list.map(x => '<li style="font-size:.88rem;color:var(--text-2);margin-bottom:6px">' + esc(x) + '</li>').join('') + '</ol></div>';
    const csvExport = (name, rows2d) => { const q = x => '"' + String(x).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"'; const csv = rows2d.map(r => r.map(q).join(',')).join('\r\n'); const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name + '-report.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

    function calculate() {
      try {
        let rows = [], graphic = '', note = '', html = '';
        switch (slug) {
          case 'ma-loop-fault-finder': {
            const ma = read('ma'), lo = read('flo'), hi = read('fhi');
            const b = FT.classifyLoop(ma, lo, hi);
            const v = read('supply') > 0 ? FT.loopBudget(read('supply'), ma, read('resistance'), read('vmin')) : null;
            rows = [['Measured current', round(ma, 2) + ' mA'], ['Signal band', b.label], ['Span reading', b.pct === null ? '—' : round(b.pct, 1) + ' %']];
            if (v) rows.push(['Voltage check', v.margin >= 0 ? 'OK · margin ' + round(v.margin, 2) + ' V' : 'Insufficient · ' + round(v.margin, 2) + ' V']);
            graphic = bandHtml(b) + (v ? '<p style="font-size:.8rem;color:var(--muted);margin-top:10px">Loop drop: ' + round(v.drop, 3) + ' V at ' + round(ma, 2) + ' mA over ' + round(read('resistance'), 0) + ' Ω. Margin = supply − device minimum − drop.</p>' : '') + adviceHtml(b.advice);
            note = 'Diagnostic assistance only — not a conclusive fault determination. Confirm with device diagnostics and project drawings.';
            lastRows = [['Measured mA', ma], ['Band', b.label], ['Advice start', b.advice[0]]];
            break;
          }
          case 'rtd-tc-reference': {
            const type = read('stype'), mode = read('rmode');
            if (mode === 'single') {
              const t = read('rtemp'), cj = read('rcj') || 0;
              const r = FT.referenceSingle(type, t, read('rcj'));
              rows = [['Sensor', type === 'pt100' ? 'Pt100 (IEC 60751)' : 'Type ' + type], ['Temperature', round(t, 1) + ' °C'], ['Reference value', round(r.value, 4) + ' ' + r.unit], ['Reference junction', round(read('rcj'), 1) + ' °C']];
              graphic = '<div class="result-box"><div class="result-label">Expected signal</div><div class="result-value">' + round(r.value, 4) + ' ' + r.unit + '</div><div class="result-note">' + esc(r.detail) + '</div></div>';
              note = type === 'pt100' ? 'Tolerance (typical): Class A ±(0.15+0.002·|t|) °C, Class B ±(0.30+0.005·|t|) °C. Lead resistance and connection effects excluded.' : 'Type K/J/T positive branch per NIST ITS-90; tolerance is device- and class-dependent (Class 1 ≈ ±1.5 °C).';
            } else {
              const from = read('rfrom'), to = read('rto'), step = read('rstep');
              const rows2 = FT.referenceRows(type, from, to, step);
              html = table(['Temperature (°C)', type === 'pt100' ? 'Resistance (Ω)' : 'EMF (mV)', 'Tolerance note'], rows2.map(r => [r.t, r.value, r.tol]));
              rows = [['Sensor', type === 'pt100' ? 'Pt100' : 'Type ' + type], ['Table range', round(Math.min(from, to), 1) + '…' + round(Math.max(from, to), 1) + ' °C'], ['Rows', rows2.length], ['Step', round(step, 1) + ' °C']];
              graphic = html;
              note = 'Generated from the same validated Pt100 temperature function and NIST forward reference functions used by the interactive calculators.';
            }
            lastRows = rows;
            break;
          }
          case 'hart-command-reference': {
            const q = read('hquery');
            const found = FT.hartLookup(q);
            html = table(['#', 'Command', 'Typical data', 'Response', 'Caveats'], found.map(r => r.slice(0, 5)));
            rows = [['Commands shown', found.length], ['All', FT.HART.length], ['Search', q || '(empty = all)']];
            graphic = '<div style="font-size:.84rem;color:var(--text-2);line-height:1.6">Universal commands (0–48) plus common-practice entries. Universal commands are mandatory for HART-compatible devices; device-specific commands vary by vendor.</div>' + html;
            note = 'Reference table for field communicator work — exact data objects are device- and protocol-revision-dependent.';
            lastRows = [['Commands shown', found.length]];
            break;
          }
          case 'isa-tag-builder': {
            const res = FT.buildTag(read('prefix'), read('var'), read('fun'), read('loop'), read('suffix'), read('style'));
            rows = [['Proposed tag', res.tag], ['Variable', FT.ISA_VARS[read('var')]], ['Function', FT.ISA_FUNS[read('fun')]], ['Loop', String(read('loop'))]];
            const used = JSON.parse(localStorage.getItem('sj-used-tags') || '[]');
            const dup = used.includes(res.tag);
            graphic = '<div class="tag-preview">' + esc(res.tag) + '</div><div style="margin-top:10px;font-size:.84rem;color:var(--muted)">' + res.parts.map(p => esc(p.join(' — '))).join(' · ') + '</div>' + (dup ? '<p style="color:var(--warning);font-size:.85rem;margin-top:8px">⚠ Tag already used in this browser — check for duplicates.</p>' : '');
            if (!dup && res.tag !== '-') used.push(res.tag), localStorage.setItem('sj-used-tags', JSON.stringify(used.slice(-200)));
            note = res.note + ' Loop numbers are project conventions; ISA 5.1 defines letter meanings, not number formats.';
            lastRows = [['Tag', res.tag]];
            break;
          }
          case 'io-spares-calculator': {
            const counts = { AI: read('ai'), AO: read('ao'), DI: read('di'), DO: read('do') };
            const channels = { AI: read('ch-ai'), AO: read('ch-ao'), DI: read('ch-di'), DO: read('ch-do') };
            const plan = FT.ioPlan(counts, channels, read('spare'), read('reserve') === 'yes' ? 1 : 0);
            rows = [];
            FT.IO_TYPES.forEach(k => rows.push([k + ' modules', plan[k].modules], [k + ' installed channels', plan[k].installed], [k + ' spares', plan[k].spare]));
            graphic = table(['Type', 'Used', 'Modules', 'Installed', 'Spares', 'Utilization'], FT.IO_TYPES.map(k => [k, counts[k], plan[k].modules, plan[k].installed, plan[k].spare, round(plan[k].utilization, 0) + ' %']));
            note = 'Need = ceil(count × (1 + spare policy) / channels). Reserve module adds one extra module per type when the type has any signals. Verify module capacity with the actual vendor catalog and cabinet layout.';
            lastRows = FT.IO_TYPES.map(k => [k, plan[k].modules + ' modules / ' + plan[k].spare + ' spares']);
            break;
          }
          case 'punch-list-generator': {
            const rows2 = JSON.parse(localStorage.getItem('sj-punch-' + (read('pname') || 'draft')) || '[]');
            const stats = FT.punchStats(rows2);
            rows = [['Records', stats.total], ['Open', stats.open], ['Closed', stats.closed], ['In progress', stats.inprogress]];
            graphic = rows2.length ? table(['Tag', 'Subsystem', 'Category', 'Issue', 'Owner', 'Status', 'Date'], rows2.map(r => [r.tag, r.subsystem, r.category, r.issue, r.owner, r.status, r.date])) : '<p class="visual-empty" style="color:var(--muted)">No punch records yet. Add rows below and they appear here.</p>';
            note = 'Records are stored only in this browser under the project name. Export a CSV before clearing browser data.';
            lastRows = rows2.map(r => [r.tag, r.category, r.issue, r.status]);
            break;
          }
        }
        if (slug !== 'punch-list-generator') render(rows, graphic, note);
        else { results.innerHTML = cards(rows, 4); visual.innerHTML = graphic; message.textContent = note; message.className = 'tool-message'; }
        if (extra) extra.innerHTML = '';
        const exp = $('export-report'); if (exp) exp.disabled = false;
      } catch (e) {
        results.innerHTML = ''; visual.innerHTML = '<p class="visual-empty" style="color:var(--muted)">Enter valid values to see the updated result.</p>';
        message.textContent = e.message; message.className = 'tool-message error'; if (extra) extra.innerHTML = '';
        const exp = $('export-report'); if (exp) exp.disabled = true;
      }
    }

    if (inputs) {
      inputs.addEventListener('input', calculate);
      inputs.addEventListener('change', calculate);
      const reset = $('reset-tool');
      if (reset) reset.onclick = () => { inputs.reset(); calculate(); };
      const exp = $('export-report');
      if (exp) exp.onclick = () => { const name = slug; const data = lastRows.map(r => [r[0], r[1]]); csvExport(name, [['Tool', document.title], ['Generated', new Date().toISOString()], ...data]); };
      /* punch list editor */
      if (slug === 'punch-list-generator') {
        const addBtn = $('add-punch'); const list = $('punch-rows');
        const draw = () => {
          const name = read('pname');
          const rows2 = JSON.parse(localStorage.getItem('sj-punch-' + name) || '[]');
          list.innerHTML = rows2.length ? rows2.map((r, i) => '<div class="sensor-row" style="grid-template-columns:1fr auto"><span style="font-size:.86rem"><strong>' + esc(r.tag) + '</strong> <span style="color:var(--muted)">' + esc(r.category) + ' · ' + esc(r.status) + '</span></span><button type="button" class="button small ghost" data-del="' + i + '" aria-label="Remove ' + esc(r.tag) + '">Remove</button></div>').join('') : '<p class="kbd-hint">No records for project “' + esc(name) + '”.</p>';
          list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const rows3 = JSON.parse(localStorage.getItem('sj-punch-' + name) || '[]'); rows3.splice(Number(b.dataset.del), 1); localStorage.setItem('sj-punch-' + name, JSON.stringify(rows3)); draw(); calculate(); });
        };
        if (addBtn) addBtn.onclick = () => {
          const name = read('pname');
          const rows2 = JSON.parse(localStorage.getItem('sj-punch-' + name) || '[]');
          rows2.push({
            tag: read('ptag') || 'TAG-001',
            subsystem: read('psub') || '',
            location: read('ploc') || '',
            category: read('pcat'),
            issue: read('pissue') || '',
            owner: read('powner') || '',
            status: read('pstat'),
            date: read('pdate') || new Date().toISOString().slice(0, 10)
          });
          localStorage.setItem('sj-punch-' + name, JSON.stringify(rows2));
          ['ptag', 'psub', 'ploc', 'pissue', 'powner'].forEach(id => { const e = $(id); if (e) e.value = ''; });
          draw(); calculate();
        };
        draw();
      }
      calculate();
    }
  }
}
})(typeof window !== 'undefined' ? window : this);
