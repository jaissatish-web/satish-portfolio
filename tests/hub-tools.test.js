const assert = require('node:assert/strict');
const FT = require('../assets/js/hub-tools.js');
let count = 0;
function close(actual, expected, tol = 1e-6) { assert.ok(Math.abs(actual - expected) <= tol, `${actual} != ${expected}`); count++; }
function is(actual, expected) { assert.strictEqual(actual, expected); count++; }
function rejects(fn) { assert.throws(fn); count++; }

/* mA Loop Fault Finder — NAMUR-style bands */
is(FT.classifyLoop(0).band, 'bad');
is(FT.classifyLoop(0).label, 'Open circuit / no current');
is(FT.classifyLoop(3.5).band, 'bad');
is(FT.classifyLoop(3.5).label, 'Low-signal fault band');
is(FT.classifyLoop(12).band, 'ok');
close(FT.classifyLoop(12).pct, 50, 1e-9);
close(FT.classifyLoop(4).pct, 0, 1e-9);
close(FT.classifyLoop(20).pct, 100, 1e-9);
is(FT.classifyLoop(20.8).band, 'warn');
is(FT.classifyLoop(21.5).band, 'bad');
is(FT.classifyLoop(21.5).label, 'High-signal fault band');
is(FT.classifyLoop(25).band, 'bad');
is(FT.classifyLoop(25).label, 'Over-range / unwanted current');
rejects(() => FT.classifyLoop(-1));
rejects(() => FT.classifyLoop(31));
rejects(() => FT.classifyLoop(12, 2));     // low threshold out of range
rejects(() => FT.classifyLoop(12, 3.6, 24)); // high threshold out of range
is(FT.classifyLoop(12, 3.8, 20.5).pct, 50);

/* Loop voltage budget */
let b = FT.loopBudget(24, 20, 250, 12);
close(b.drop, 5);
close(b.margin, 7);
is(b.available, 19);
rejects(() => FT.loopBudget(-1, 20, 250, 12));

/* RTD & TC reference tables */
close(FT.referenceSingle('pt100', 0).value, 100, 1e-6);
close(FT.referenceSingle('pt100', 100).value, 138.5055, 1e-4);
close(FT.referenceSingle('K', 100).value, 4.096, 5e-4);
let rows = FT.referenceRows('pt100', 0, 100, 100);
is(rows.length, 2);
close(rows[0].value, 100, 1e-3);
close(rows[1].value, 138.5055, 1e-3);
is(FT.referenceRows('K', 0, 200, 100).length, 3);
rejects(() => FT.referenceRows('T', 0, 401, 25));   // above type T positive branch
rejects(() => FT.referenceRows('pt100', -300, 100, 25));
rejects(() => FT.referenceRows('X', 0, 100, 25));

/* HART lookup */
is(FT.HART.length >= 20, true);
is(FT.hartLookup('40').length >= 1, true);
is(FT.hartLookup('40')[0][0], '40');
is(FT.hartLookup('tag').some(r => r[0] === '11'), true);
is(FT.hartLookup('').length, FT.HART.length);
is(FT.hartLookup('zzz-no-such').length, 0);

/* ISA tag builder */
is(FT.buildTag('', 'P', 'T', 1001, '', 'plain').tag, 'PT-1001');
is(FT.buildTag('', 'P', 'T', 1001, 'A', 'plain').tag, 'PT-1001A');
is(FT.buildTag('H2', 'F', 'V', 2001, '', 'prefix').tag, 'H2FV-2001');
is(FT.buildTag('', 'L', 'I', 42, '', 'plain').tag, 'LI-42');
is(FT.buildTag('', 'A', 'T', 7, 'Z', 'plain').tag, 'AT-7Z');
rejects(() => FT.buildTag('', 'P', 'T', 'X1', '', 'plain'));
rejects(() => FT.buildTag('toolong', 'P', 'T', 1001, '', 'plain'));
rejects(() => FT.buildTag('', 'Q?', 'T', 1001, '', 'plain'));

/* DCS/PLC I/O spares */
let plan = FT.ioPlan({ AI: 240, AO: 60, DI: 400, DO: 120 }, { AI: 16, AO: 8, DI: 32, DO: 16 }, 20, 0);
is(plan.AI.modules, 18);            // ceil(240*1.2/16)
is(plan.AI.installed, 288);
is(plan.AI.spare, 48);
close(plan.AI.utilization, 83.333, 1e-2);
is(plan.AO.modules, 9);             // ceil(60*1.2/8)
is(plan.DI.modules, 15);            // ceil(400*1.2/32)
is(plan.DO.modules, 9);             // ceil(120*1.2/16)
let planR = FT.ioPlan({ AI: 0, AO: 0, DI: 0, DO: 0 }, { AI: 16, AO: 8, DI: 32, DO: 16 }, 20, 1);
is(planR.AI.modules, 0);            // no signals -> no modules even with reserve
let planR2 = FT.ioPlan({ AI: 16, AO: 0, DI: 0, DO: 0 }, { AI: 16, AO: 8, DI: 32, DO: 16 }, 0, 1);
is(planR2.AI.modules, 2);           // 16 signals -> 1 module + 1 reserve
rejects(() => FT.ioPlan({ AI: -1, AO: 0, DI: 0, DO: 0 }, { AI: 16, AO: 8, DI: 32, DO: 16 }, 20, 0));

/* Punch-list stats */
let stats = FT.punchStats([
  { status: 'Open', category: 'Instrument' },
  { status: 'Open', category: 'Piping' },
  { status: 'Closed', category: 'Instrument' },
  { status: 'In progress', category: 'Functional' }
]);
is(stats.total, 4);
is(stats.open, 2);
is(stats.closed, 1);
is(stats.inprogress, 1);
is(stats.byCategory.Instrument, 2);

console.log(`Passed ${count} field-tool assertions (P0 engine: loop fault, reference tables, HART, tags, I/O, punch).`);
