// ============================================
// Nepali Racer - Static Reference Audit (P15)
// ============================================
// Script-based audit for the "P11-class" bug: an identifier referenced in a
// function body that is not a local, an assigned this-property, an imported
// name, or a global — i.e. a runtime-only ReferenceError/undefined crash.
//
// Checks per file in src/ (all .js), on comment/string-stripped source:
//   S1. every bare function CALL name resolves to: import / function decl /
//       class-method definition / const|let|class binding / param-or-assign
//       elsewhere in the file / JS builtin. Otherwise flagged A-candidate.
//   S2. every this.prop READ has a this.prop WRITE in the same class, or is
//       a Phaser-provided scene property.
//   S3. imported names never used (dead import, cosmetic).
//
// Exit code 1 if any A-candidate is found.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const SRC_ROOT = fileURLToPath(new URL('../src/', import.meta.url));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}
const files = walk(SRC_ROOT);

const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof',
  'new', 'delete', 'void', 'in', 'of', 'do', 'else', 'super', 'import', 'export', 'default',
  'const', 'let', 'var', 'class', 'throw', 'try', 'case', 'break', 'continue', 'instanceof',
  'await', 'async', 'yield', 'static', 'get', 'set']);
const BUILTINS = new Set(['Math', 'JSON', 'Number', 'Array', 'Object', 'String', 'Boolean',
  'Promise', 'Set', 'Map', 'WeakMap', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'console',
  'window', 'document', 'localStorage', 'navigator', 'globalThis', 'Phaser', 'undefined',
  'Infinity', 'NaN', 'Error', 'TypeError', 'RangeError', 'Symbol', 'Date', 'RegExp', 'URL',
  'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'require', 'process']);
// Phaser injects these onto Scene instances at runtime (never assigned in our code).
const PHASER_SCENE_PROPS = new Set(['scene', 'add', 'input', 'cameras', 'time', 'events', 'scale',
  'sys', 'load', 'cache', 'textures', 'sound', 'registry', 'data', 'state', 'anims', 'physics',
  'plugins', 'game', 'config', 'tweens', 'lights', 'update']);

// Strip comments and string/template literals (order: strings, block, line).
function stripNoise(src) {
  return src
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

const findings = [];

for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, '/');
  const raw = readFileSync(file, 'utf8');
  const src = stripNoise(raw);

  // ---- imports ----
  const imported = new Map();
  for (const m of raw.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (let name of m[1].split(',')) {
      name = name.trim().split(/\s+as\s+/).pop().trim();
      if (name) imported.set(name, m[2]);
    }
  }
  for (const m of raw.matchAll(/import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g)) imported.set(m[1], m[2]);
  for (const m of raw.matchAll(/import\s*\*\s*as\s+(\w+)\s+from/g)) imported.set(m[1], m[2]);

  // ---- file-scope declarations ----
  const declared = new Set();
  for (const m of src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  // Named function expressions (e.g. `return function executedFunction() {}`):
  // the name is scoped INSIDE the function — valid to resolve bare calls in it.
  for (const m of src.matchAll(/\bfunction\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(/g)) declared.add(m[1]);
  for (const m of src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  for (const m of src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g)) declared.add(m[1]);
  // params / assignments anywhere (over-approximate -> category B evidence).
  // Lookahead (not consuming) so overlapping params like (a, b, c) all bind.
  const boundAnywhere = new Set();
  for (const m of src.matchAll(/[(,]\s*([A-Za-z_$][\w$]*)\s*(?=[,)])/g)) boundAnywhere.add(m[1]);
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\s*=[^=]/g)) boundAnywhere.add(m[1]);

  // ---- class-method definitions (definition indexes, to skip in call scan) ----
  const defIndexes = new Set();
  for (const m of src.matchAll(/(?:^|\n)[ \t]*(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) {
    if (!KEYWORDS.has(m[1])) defIndexes.add(m.index + m[0].indexOf(m[1]));
    declared.add(m[1]); // method names resolve inside their class via this.
  }
  for (const m of src.matchAll(/(?:^|\n)[ \t]*(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\{/g)) {
    // getter/setter shorthand bodies without params
    if (['get', 'set'].includes(m[1]) === false && !KEYWORDS.has(m[1])) declared.add(m[1]);
  }

  // ---- S1: bare calls (skip definitions, keywords, builtins, imports, decls) ----
  for (const m of src.matchAll(/(?<![.\w$'"`])([a-z_$][\w$]*)\s*\(/g)) {
    if (defIndexes.has(m.index + m[0].indexOf(m[1]))) continue;
    const name = m[1];
    if (KEYWORDS.has(name)) continue;
    if (BUILTINS.has(name) || imported.has(name) || declared.has(name)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    if (boundAnywhere.has(name)) {
      findings.push({ cat: 'B', file: rel, kind: 'bare-call', name, note: 'L' + line + ' — bound elsewhere in file (param/assignment), verify' });
      continue;
    }
    findings.push({ cat: 'A', file: rel, kind: 'bare-call', name, note: 'L' + line + ' — NO import/decl/binding found' });
  }

  // ---- S2: this.prop reads vs writes per class segment (comment-free src) ----
  const classStarts = [...src.matchAll(/(?:^|\n)[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g)].map(m => m.index);
  const segments = classStarts.length === 0
    ? [{ start: 0, end: src.length, name: '(module)' }]
    : classStarts.map((start, i) => ({
        start,
        end: i + 1 < classStarts.length ? classStarts[i + 1] : src.length,
        name: (src.slice(start).match(/class\s+([A-Za-z_$][\w$]*)/) || [])[1]
      }));
  for (const seg of segments) {
    const segSrc = src.slice(seg.start, seg.end);
    const writes = new Set();
    for (const m of segSrc.matchAll(/this\.([A-Za-z_$][\w$]*)\s*=(?![=>])/g)) writes.add(m[1]);
    // Class methods defined in THIS segment are valid this.X references too.
    const segMethods = new Set();
    for (const m of segSrc.matchAll(/(?:^|\n)[ \t]*(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) {
      if (!KEYWORDS.has(m[1]) && !['if', 'for', 'while', 'switch', 'catch'].includes(m[1])) segMethods.add(m[1]);
    }
    const reads = new Map();
    const baseLine = src.slice(0, seg.start).split('\n').length;
    for (const m of segSrc.matchAll(/(?<![\w$.])this\.([A-Za-z_$][\w$]*)/g)) {
      const line = baseLine + segSrc.slice(0, m.index).split('\n').length - 1;
      if (!reads.has(m[1])) reads.set(m[1], line);
    }
    // Classes extending Phaser.GameObjects.* inherit many methods/props from
    // the engine — these can never be our ReferenceError bug class.
    const extendsPhaserGO = /extends\s+Phaser\.[\w.]*GameObjects/.test(segSrc.slice(0, 400));
    const phaserGOMethods = new Set(['setSize', 'setInteractive', 'on', 'once', 'off', 'emit',
      'setDepth', 'setOrigin', 'setPosition', 'setVisible', 'setScale', 'setAlpha', 'setAngle',
      'destroy', 'setText', 'setStyle', 'setColor', 'add', 'addAt', 'remove', 'removeAt',
      'getAll', 'getIndex', 'list', 'setX', 'setY', 'setName', 'setState', 'getData', 'setData']);
    for (const [prop, line] of reads) {
      if (writes.has(prop) || segMethods.has(prop) || PHASER_SCENE_PROPS.has(prop)) continue;
      if (extendsPhaserGO && phaserGOMethods.has(prop)) continue;
      if (/Object\.assign\(\s*this/.test(segSrc)) {
        findings.push({ cat: 'B', file: rel, kind: 'this-read', name: prop, note: 'L' + line + ' — class uses Object.assign(this,...), verify' });
        continue;
      }
      findings.push({ cat: 'A', file: rel, kind: 'this-read', name: prop, note: 'L' + line + ' — this.' + prop + ' read but never assigned in ' + seg.name });
    }
  }

  // ---- S3: dead imports ----
  for (const [name, source] of imported) {
    const pattern = "(?<![.\\w$'\"/])" + name.replace(/\$/g, '\\$') + "(?![\\w$])";
    const uses = [...src.matchAll(new RegExp(pattern, 'g'))].length;
    if (uses <= 1) findings.push({ cat: 'C', file: rel, kind: 'dead-import', name, note: 'from ' + source + ', never used' });
  }
}

const byCat = { A: [], B: [], C: [] };
for (const f of findings) byCat[f.cat].push(f);
console.log('Files scanned: ' + files.length);
console.log('Category A (confirmed-bug candidates): ' + byCat.A.length);
for (const f of byCat.A) console.log('  [A] ' + f.file + ' — ' + f.kind + ' "' + f.name + '" (' + f.note + ')');
console.log('Category B (likely safe, verify): ' + byCat.B.length);
for (const f of byCat.B.slice(0, 30)) console.log('  [B] ' + f.file + ' — ' + f.kind + ' "' + f.name + '" (' + f.note + ')');
if (byCat.B.length > 30) console.log('  ... +' + (byCat.B.length - 30) + ' more B findings');
console.log('Category C (dead imports): ' + byCat.C.length);
for (const f of byCat.C) console.log('  [C] ' + f.file + ' — "' + f.name + '" ' + f.note);

if (byCat.A.length > 0) {
  console.log('\nAUDIT FAILED: ' + byCat.A.length + ' category-A candidates');
  process.exit(1);
}
console.log('\nAUDIT CLEAN: no category-A candidates');
