"""Field Tools P0 generator — additive pages that never touch the validated
18-tool catalog or its engines. Reads assets/data/field-tools.json, writes
tools/<slug>.html, injects the homepage FIELD-TOOLS block and extends sitemap.

Run from build.py after the core build, before the metadata pass.
"""
from pathlib import Path
from html import escape as E
import json, re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://jaissatish-web.github.io'
BASE = '/satish-portfolio/'
VER = '20261028c'

def field(key, label, kind='number', value=None, opts=None, placeholder=None, step=None, min=None, max=None, grid=None):
    d = {'key': key, 'label': label, 'kind': kind, 'value': value, 'opts': opts or [],
         'placeholder': placeholder, 'step': step, 'min': min, 'max': max, 'grid': grid}
    return d

F = field  # shorthand

TOOLS = {
 'ma-loop-fault-finder': dict(
  category='Signal & calibration',
  formula='Namur-style bands: <3.8 mA low fault · 3.8–20.5 mA normal · >21 mA high fault;  % span = (mA − 4) / 16 × 100',
  example='A transmitter reading 3.5 mA on a 4–20 mA output: the loop is in the low-signal fault band. Check supply voltage, polarity, loop resistance and configured fault level before touching the instrument.',
  notes='Diagnostic assistance only — it narrows the likely cause, it does not conclude the fault. Always confirm with device diagnostics, loop drawings and the configured fault current (NAMUR NE43 or vendor option).',
  reference='Signal scaling guide ↗',
  ref_href='../blog/signal-scaling-guide.html',
  related=['../knowledge/basics/4-20ma-signal.html', '../blog/loop-voltage-and-cables.html'],
  fields=[
    F('ma','Measured current (mA)',value=12,min=0,max=30,step=.01),
    F('flo','Low fault limit (mA)',value=3.6,min=3,max=4,step=.1),
    F('fhi','High fault limit (mA)',value=21,min=20,max=23,step=.1),
    F('supply','Loop supply voltage (V)',value=24,min=0),
    F('resistance','Total loop resistance (Ω)',value=250,min=0),
    F('vmin','Transmitter minimum voltage (V)',value=12,min=0),
  ]),
 'rtd-tc-reference': dict(
  category='Temperature',
  formula='Pt100: R = 100 × (1 + 3.9083e-3·t − 5.775e-7·t²)  [IEC 60751] ·  TC: E = Etype(Thot) − Etype(Tref)  [NIST ITS-90]',
  example='Look up a Pt100 at 100 °C: 138.5055 Ω (IEC 60751 nominal). A Type K thermocouple with a 0 °C reference produces ≈ 4.096 mV at 100 °C. Use the table mode to print a field crib sheet.',
  notes='Values are nominal reference data. Tolerance classes (Pt100 Class A/B; TC Class 1/2) are typical and device-dependent — verify with the actual sensor certificate.',
  reference='RTD & thermocouple guide ↗',
  ref_href='../knowledge/temperature/rtd-pt100.html',
  related=['../knowledge/temperature/thermocouple-types.html', '../blog/rtd-and-thermocouple.html'],
  fields=[
    F('stype','Sensor type','select',opts=[('pt100','Pt100 (IEC 60751)'),('K','Type K (0–1372 °C)'),('J','Type J (0–760 °C)'),('T','Type T (0–400 °C)')]),
    F('rmode','Mode','select',opts=[('single','Single lookup'),('table','Generate table')]),
    F('rtemp','Temperature (°C)',value=100,min=-200,max=1372),
    F('rcj','Reference junction (°C)',value=0,min=0,max=100),
    F('rfrom','Table from (°C)',value=0,min=-200),
    F('rto','Table to (°C)',value=400),
    F('rstep','Table step (°C)',value=25,min=1),
  ]),
 'hart-command-reference': dict(
  category='Signal & calibration',
  formula='Static reference table of HART universal commands (0–48) and common-practice commands used during field commissioning.',
  example='Command 40 puts the device in fixed current mode — useful for injecting 4 or 20 mA during loop checks. Command 15 reads the output alarm selection (high/low), matching fail-safe direction.',
  notes='Universal commands are mandatory for HART devices; exact response data objects are device- and protocol-revision-dependent. Consult the device manual before writing.',
  reference='HART field communicator guidance ↗',
  ref_href='../blog/signal-scaling-guide.html',
  related=['../knowledge/basics/4-20ma-signal.html', '../blog/5-point-transmitter-calibration.html'],
  fields=[
    F('hquery','Search command (number or name)',kind='text',value='',placeholder='e.g. 2, 40, "read tag", "loop current"',grid=True),
  ]),
 'isa-tag-builder': dict(
  category='Flow & process',
  formula='Tag = [prefix] + measured-variable letter + function letter + loop number + [suffix]   (simplified ISA 5.1-style convention)',
  example='Pressure + Transmitter + loop 1001 + suffix A → PT-1001A. Flow + Valve + loop 2001 → FV-2001. Loop numbers and suffix rules follow each project&#8217;s document control standard.',
  notes='ISA 5.1 defines letter meanings, not number formats. Project naming rules and client standards always take precedence over this simplified convention.',
  reference='Commissioning records guide ↗',
  ref_href='../blog/commissioning-records.html',
  related=['../knowledge/index.html', '../blog/loop-voltage-and-cables.html'],
  fields=[
    F('prefix','Project prefix (0–3 letters)',kind='text',value='',placeholder='e.g. H2 for green hydrogen',grid=True),
    F('var','Variable','select',opts=[('P','P – Pressure'),('T','T – Temperature'),('F','F – Flow'),('L','L – Level'),('A','A – Analysis'),('Q','Q – Quantity'),('V','V – Vibration'),('D','D – Density'),('H','H – Hand'),('X','X – Unspecified'),('Y','Y – Event'),('Z','Z – Position'),('S','S – Speed'),('G','G – Gauge')]),
    F('fun','Function','select',opts=[('T','T – Transmitter'),('I','I – Indicator'),('S','S – Switch'),('A','A – Alarm'),('R','R – Recorder'),('C','C – Controller'),('V','V – Valve'),('E','E – Element'),('G','G – Gauge'),('Y','Y – Relay/compute'),('Z','Z – Positioner'),('K','K – Check valve'),('J','J – Power element')]),
    F('loop','Loop number',kind='text',value='1001',placeholder='1001',min=None),
    F('suffix','Suffix (1–2 chars)',kind='text',value='',placeholder='A'),
    F('style','Tag format','select',opts=[('plain','PT-1001 style'),('prefix','Prefix + PT-1001')]),
  ]),
 'io-spares-calculator': dict(
  category='Electrical',
  formula='Modules = ⌈ count × (1 + spare%) / channels per module ⌉ + reserve module',
  example='240 AI × 1.2 (20% spare) ÷ 16 channels = 18 AI modules, 288 installed channels, 48 spares. Choose real channel counts from the DCS vendor catalog.',
  notes='Preliminary cabinet planning only. Validate with vendor I/O bus capacities, marshalling constraints, special channels and project reserve policy.',
  reference='Loop voltage and cables guide ↗',
  ref_href='../blog/loop-voltage-and-cables.html',
  related=['../blog/commissioning-records.html', '../knowledge/index.html'],
  fields=[
    F('ai','AI signals',value=240,min=0),
    F('ao','AO signals',value=60,min=0),
    F('di','DI signals',value=400,min=0),
    F('do','DO signals',value=120,min=0),
    F('ch-ai','Channels per AI module',value=16,min=1,max=64),
    F('ch-ao','Channels per AO module',value=8,min=1,max=64),
    F('ch-di','Channels per DI module',value=32,min=1,max=64),
    F('ch-do','Channels per DO module',value=16,min=1,max=64),
    F('spare','Spare policy (%)',value=20,min=0,max=100,step=5),
    F('reserve','Add reserve module per type','select',opts=[('no','No'),('yes','Yes, +1 per type')],grid=True),
  ]),
 'punch-list-generator': dict(
  category='Commissioning',
  formula='Record structure: tag · subsystem · location · issue · category · owner · status · date. Records persist in this browser per project and export to CSV.',
  example='Add “HV-1002” with issue “Air supply leaks at actuator” under category Piping, owner “mech crew”, status Open. Export the CSV before clearing browser data.',
  notes='Commissioning-quality records, not an approved ITR substitute. Punch closure requires witness review and project-specific acceptance criteria.',
  reference='Commissioning records guide ↗',
  ref_href='../blog/commissioning-records.html',
  related=['../knowledge/index.html', '../blog/5-point-transmitter-calibration.html'],
  fields=[
    F('pname','Project / area name',kind='text',value='draft',placeholder='draft',grid=True),
    F('ptag','Tag',kind='text',value='TAG-001',placeholder='PT-1001'),
    F('psub','Subsystem',kind='text',value='',placeholder='e.g. Loop 101'),
    F('ploc','Location',kind='text',value='',placeholder='e.g. Area 2 / Rack A'),
    F('pcat','Category','select',opts=[('Documentation','Documentation'),('Instrument','Instrument'),('Electrical','Electrical'),('Piping','Piping'),('Functional','Functional'),('Walkdown','Walkdown'),('Other','Other')]),
    F('pissue','Issue description',kind='text',value='',placeholder='Describe the punch item',grid=True),
    F('powner','Owner',kind='text',value='',placeholder='Crew / discipline'),
    F('pstat','Status','select',opts=[('Open','Open'),('In progress','In progress'),('Closed','Closed')]),
    F('pdate','Date',kind='text',value='__TODAY__'),
  ]),
}

CHART = {'Signal & calibration': 'signal', 'Temperature': 'temperature', 'Flow & process': 'process', 'Electrical': 'electrical', 'Commissioning': 'commissioning'}

def control(f):
    k, label = f['key'], f['label']
    if f['kind'] == 'select':
        c = f'<select id="{k}">' + ''.join(f'<option value="{E(v)}">{E(t)}</option>' for v, t in f['opts']) + '</select>'
    elif f['kind'] == 'text':
        attrs = f'type="text" id="{k}" value="{E(str(f["value"] or ""))}" placeholder="{E(f["placeholder"] or "")}" inputmode="text"'
        c = f'<input {attrs}>'
    else:
        attrs = f'type="number" inputmode="decimal" id="{k}" value="{f["value"] if f["value"] is not None else ""}"'
        for a in ('min', 'max', 'step'):
            if f.get(a) is not None:
                attrs += f' {a}="{f[a]}"'
        c = f'<input {attrs}>'
    return f'<div class="field{" full" if f.get("grid") else ""}"><label for="{k}">{E(label)}</label>{c}</div>'

def build():
    rows = json.loads((ROOT / 'assets/data/field-tools.json').read_text())
    from build_redesign import header as shared_header
    header = shared_header()
    footer = (ROOT / 'templates/footer.html').read_text().strip()
    page_urls = []
    for tool in rows:
        slug, title, desc = tool['slug'], tool['title'], tool['description']
        cfg = TOOLS[slug]
        fields_html = ''.join(control(f) for f in cfg['fields']).replace('__TODAY__', '2026-10-28')
        today = '2026-10-28'
        extra = ''
        if slug == 'punch-list-generator':
            cats = ''.join(f'<option value="{E(c)}">{E(c)}</option>' for c in ['Documentation','Instrument','Electrical','Piping','Functional','Walkdown','Other'])
            extra = '<div class="punch-editor" id="punch-rows"></div><div class="punch-actions"><button class="button small primary" type="button" id="add-punch">+ Add punch record</button><span class="kbd-hint">Records auto-save to this browser under the project name.</span></div>'
        related = ''.join(f'<a class="button ghost" href="{E(h)}" style="margin-right:8px;margin-bottom:8px">{E(l)} →</a>' for h in TOOLS[slug]['related'] for l in ['Related resource'])
        related = ''.join(f'<a class="button ghost" style="margin:0 8px 8px 0" href="{E(h)}">Related guide →</a>' for h in cfg['related'])
        canonical = f'{ORIGIN}{BASE}tools/{slug}.html'
        schema = json.dumps({
            '@context': 'https://schema.org', '@type': 'WebApplication',
            'name': title, 'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any',
            'browserRequirements': 'JavaScript enabled', 'description': desc.replace('™', ''),
            'url': canonical, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}
        }, ensure_ascii=False).replace('<', '\\u003c')
        meta_desc = f"{desc} Free, browser-based {cfg['category'].lower()} tool with worked examples and validation notes."
        html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{E(meta_desc)}"><title>{E(title)} | Instrumentation Hub</title><link rel="stylesheet" href="../assets/css/redesign.css?v={VER}"></head><body>{header}<main id="main-content"><section class="page-hero compact-hero"><div class="container"><div class="breadcrumbs"><a href="../#tools">Tool library</a> / <a href="../#field-tools">New field tools</a> / {E(title)}</div><div class="eyebrow">Free engineering workspace · {E(cfg['category'])}</div><h1>{E(title)}</h1><p class="hero-copy">{E(desc)} Change an input to see the result.</p></div></section><div class="container engineering-app" id="engineering-app" data-tool="{slug}"><div class="engineering-grid"><section class="tool-surface"><h2>Inputs</h2><form id="tool-inputs" onsubmit="return false"><div class="field-grid">{fields_html}</div>{extra}</form><div class="inline-actions"><button class="button small ghost" type="button" id="reset-tool">Reset</button><button class="button small" type="button" id="export-report">Export CSV report</button></div></section><section class="visual-surface"><div class="visual-heading"><h2>See the change</h2><span class="status">Live</span></div><div id="live-visual"></div><div id="live-results" class="result-grid" aria-live="polite"></div><p id="tool-message" class="tool-message" role="status"></p></section></div><div id="extra-results"></div><section class="tool-explanation"><div><h2>How it works</h2><p class="formula">{cfg['formula']}</p><h3>Try this example</h3><p>{cfg['example']}</p></div><div><h2>Understand the result</h2><p>{cfg['notes']}</p><p class="field-note">Reference: {cfg['reference']}</p><div style="margin-top:14px">{related}</div></div></section></div></main>{footer}<script src="../assets/js/hub.js?v={VER}"></script><script src="../assets/js/engineering-math.js?v=1"></script><script src="../assets/js/hub-tools.js?v={VER}"></script><script type="application/ld+json">{schema}</script></body></html>'''
        (ROOT / 'tools' / f'{slug}.html').write_text(html)
        page_urls.append(f'tools/{slug}.html')
    # Homepage catalogue is unified by build.py; this builder only publishes pages.
    # Extend sitemap
    sp = ROOT / 'sitemap.xml'
    if sp.exists():
        xml = sp.read_text()
        for u in page_urls:
            if u not in xml:
                xml = xml.replace('</urlset>', f'<url><loc>{ORIGIN}{BASE}{u}</loc></url></urlset>')
        sp.write_text(xml)
    print(f'Built {len(rows)} field tool pages (P0) and extended the sitemap.')

if __name__ == '__main__':
    build()
