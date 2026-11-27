#!/usr/bin/env node
/**
 * Browser Check Skill - Playwright-based URL verification
 *
 * Usage: node browser-check.js [--yaml <path>] [--task <name>] [--personal-dir <dir>]
 *
 * Named tasks (--task) save/reuse flow_step under .personal/flow_steps/<slug>.yaml.
 * First run runs a lightweight survey of spec/, docs/, specific/* for matching URL hints.
 * Subsequent runs load the saved flow_step and check immediately.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

function confirm(q, defaultYes = true) {
  const suffix = defaultYes ? ' (Y/n): ' : ' (y/N): ';
  return ask(q + suffix).then(a => {
    const t = a.trim().toLowerCase();
    return t === '' || t === 'y' || t === 'yes';
  });
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Minimal YAML parser – handles flat key:value, quoted strings, numbers, booleans. */
function parseSimpleYaml(text) {
  const out = {};
  let curKey = null;
  const lines = text.split('\n');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line || line.startsWith('#')) continue;
    // Nested key?
    const mNested = line.match(/^(\s+)(\S+):\s*(.*)$/);
    if (mNested && curKey) {
      if (!out[curKey] || typeof out[curKey] !== 'object') out[curKey] = {};
      const [, , k, v] = mNested;
      out[curKey][k.trim()] = coerce(v.trim());
      continue;
    }
    const m = line.match(/^(\S+):\s*(.*)$/);
    if (m) {
      const [, key, val] = m;
      out[key] = coerce(val.trim());
      curKey = key;
    }
  }
  return out;
}

function coerce(s) {
  if (/^".*"|^'.*$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (!isNaN(s) && s !== '') return Number(s);
  return s;
}

function loadYaml(filePath) {
  try {
    const yml = require('js-yaml');
    return yml.load(fs.readFileSync(filePath, 'utf8'));
  } catch { /* fall through */ }
  return parseSimpleYaml(fs.readFileSync(filePath, 'utf8'));
}

function saveYaml(filePath, obj) {
  try {
    const yml = require('js-yaml');
    fs.writeFileSync(filePath, yml.dump(obj, { indent: 2 }));
  } catch {
    // Fallback: simple serializer
    let lines = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        lines.push(k + ':');
        for (const [sk, sv] of Object.entries(v)) lines.push('  ' + sk + ': ' + sv);
      } else if (typeof v === 'string') {
        lines.push(k + ': "' + v.replace(/"/g, '\\"') + '"');
      } else {
        lines.push(k + ': ' + v);
      }
    }
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
  }
}

// ---------------------------------------------------------------------------
// Survey – find URLs whose surrounding context mentions the task name
// ---------------------------------------------------------------------------

function collectFiles(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.includes(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function survey(taskName) {
  console.log('\n=== Investigation: Surveying source code ===\n');
  const taskLower = taskName.toLowerCase();
  const surveyDirs = ['spec', 'docs', 'specific'];
  const exts = ['.md', '.yaml', '.yml', '.json', '.js', '.ts', '.txt', '.html'];
  const urls = [];
  const titles = [];

  for (const dir of surveyDirs) {
    const files = collectFiles(dir, exts);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only look at lines containing http(s)://
        const urlMatch = line.match(/https?:\/\/[^\s"'<>]+/);
        if (!urlMatch) continue;
        // Check if the surrounding context (up to 3 lines before/after) mentions the task name
        const windowStart = Math.max(0, i - 3);
        const windowEnd = Math.min(lines.length, i + 4);
        const context = lines.slice(windowStart, windowEnd).join('\n').toLowerCase();
        if (!context.includes(taskLower)) continue;
        const cleanUrl = urlMatch[0].replace(/[.,)]$/, '');
        if (!urls.find(u => u.url === cleanUrl && u.file === file)) {
          urls.push({ url: cleanUrl, file });
        }
      }
      // Also grab title references from the same matched region
      const titleRe = /(?:title|page)["]*\s*[:=]\s*["']([^"']+)["']/gi;
      let tm;
      while ((tm = titleRe.exec(context)) !== null) {
        if (!titles.find(t => t.hint === tm[1])) titles.push({ hint: tm[1], file });
      }
    }
  }

  if (urls.length) {
    console.log('Matching URLs in source:');
    for (const f of urls.slice(0, 5)) console.log(`  ${f.url}  (${f.file})`);
  } else {
    console.log('No matching URLs found in source.');
  }
  if (titles.length) {
    console.log('Title hints from matching context:');
    for (const t of titles.slice(0, 3)) console.log(`  "${t.hint}"  (${t.file})`);
  }
  return { urls, titles };
}

// ---------------------------------------------------------------------------
// Interactive collection
// ---------------------------------------------------------------------------

async function collectInput(surveyResult) {
  console.log('\n=== Browser Check: URL Verification ===\n');

  let defaultUrl = '';
  if (surveyResult && surveyResult.urls.length > 0) {
    defaultUrl = surveyResult.urls[0].url;
    console.log(`Suggested URL: ${defaultUrl}`);
  }

  const url = (await ask(`Enter URL${defaultUrl ? ` [${defaultUrl}]` : ''}: `)).trim() || defaultUrl;
  if (!url) throw new Error('No URL provided.');

  console.log('\nVerification type:\n  1 — Page title\n  2 — Text content search\n  3 — CSS element existence\n  4 — HTTP status code');
  const choice = await ask('Select (1-4): ');

  let type, expected;
  switch (choice) {
    case '1': type = 'title'; expected = await ask('Expected page title: '); break;
    case '2': type = 'text'; expected = await ask('Text to search for: '); break;
    case '3': type = 'element'; expected = await ask('CSS selector: '); break;
    case '4': type = 'status'; expected = parseInt(await ask('Expected HTTP status (default 200): ') || '200'); break;
    default: console.log('Invalid, defaulting to title'); type = 'title'; expected = '';
  }
  return { url, type, expected: String(expected) };
}

// ---------------------------------------------------------------------------
// Run Playwright inline (no temp file, no shell injection risk)
// ---------------------------------------------------------------------------

function runPlaywright({ url, type, expected, headless = true }) {
  return new Promise((resolve, reject) => {
    const cp = spawn('node', ['-e', buildCheckScript(url, type, expected, headless)], { stdio: ['inherit', 'pipe', 'pipe'] });

    let stdout = '';
    cp.stdout.on('data', d => stdout += d);
    cp.stderr.on('data', d => process.stderr.write(d));

    cp.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`Playwright exited ${code}. Stdout: ${stdout}`));
    });
  });
}

/** Build a safe Playwright script using JSON.stringify for all user values. */
function buildCheckScript(url, type, expected, headless = true) {
  const safeUrl = JSON.stringify(url);
  const safeType = JSON.stringify(type);
  const safeExpected = JSON.stringify(String(expected));
  const safeHeadless = JSON.stringify(!!headless);

  return `(async () => {
  const { chromium } = require('playwright');
  const url = ${safeUrl};
  const type = ${safeType};
  const expected = ${safeExpected};

    const browser = await chromium.launch({ headless: ${safeHeadless} });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = resp ? resp.status() : 'unknown';

    let actual, pass = false;
    if (type === 'title') { actual = await page.title(); pass = actual === expected; }
    else if (type === 'text') { actual = await page.textContent('body'); pass = actual.includes(expected); }
    else if (type === 'element') { const el = await page.\$(expected); pass = !!el; actual = el ? 'exists' : 'not found'; }
    else if (type === 'status') { pass = String(status) === String(expected); actual = String(status); }

    console.log('Status: ' + status);
    console.log('Actual: ' + actual);
    console.log('Result: ' + (pass ? 'PASS' : 'FAIL'));
    process.exit(pass ? 0 : 1);
  } finally { await browser.close(); }
})();`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let yamlPath = null, taskName = null, personalDir = path.join(process.cwd(), '.personal');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--yaml' && args[i + 1]) { yamlPath = args[++i]; }
    else if (args[i] === '--task' && args[i + 1]) { taskName = args[++i]; }
    else if (args[i] === '--personal-dir' && args[i + 1]) { personalDir = args[++i]; }
  }
  // Positional "verify …" shorthand
  if (!taskName && args.length >= 2 && args[0] === 'verify') taskName = args.slice(1).join(' ');

  let config = null;

  // Try loading saved flow_step
  if (taskName) {
    const personalFlowPath = path.join(personalDir, 'flow_steps', slug(taskName) + '.yaml');
    const publicFlowPath = path.join('.specific', 'browser-check', slug(taskName) + '.yaml');
    const flowPath = fs.existsSync(personalFlowPath) ? personalFlowPath : publicFlowPath;
    if (fs.existsSync(flowPath)) {
      try {
        config = loadYaml(flowPath);
        if (config.url) {
          console.log(`\nReusing saved flow_step: ${taskName}\n`);
          config.reused = true;
        }
      } catch (e) { /* ignore corrupt file, will re-investigate */ }
    }
  }

  // Parse from YAML if provided
  if (!config && yamlPath) {
    try {
      config = loadYaml(yamlPath);
    } catch (e) { console.error(`Error reading YAML: ${e.message}`); process.exit(1); }
  }

  // Need fresh input?
  if (!config || !config.url) {
    let surveyResult = null;
    if (taskName) surveyResult = await survey(taskName);
    const input = await collectInput(surveyResult);
    config = { url: input.url, type: input.type, expected: input.expected, reused: false };

    // Save flow_step?
    if (taskName) {
      const save = await confirm('\nSave flow_step for reuse?', true);
      if (save) {
        const visPrompt = await ask('Public or private? (public/private, default private): ').trim().toLowerCase() || 'private';
        const vis = visPrompt === 'public' ? 'public' : 'private';
        const baseDir = vis === 'public' ? path.join('.specific', 'browser-check') : path.join(personalDir, 'flow_steps');
        fs.mkdirSync(baseDir, { recursive: true });
        const dest = path.join(baseDir, slug(taskName) + '.yaml');

        const safe = {
          task: taskName,
          url: config.url,
          type: config.type,
          expected: config.expected,
          visibility: vis,
          created_at: new Date().toISOString(),
          reused: false
        };
        // Merge any personal_info keys that might have been entered
        // (in practice collectInput doesn't gather credentials; extend as needed)
        saveYaml(dest, safe);
        console.log(`Flow_step saved to: ${dest}`);
      }
    }
  }

  if (!config.url) { console.error('No URL provided.'); process.exit(1); }

  try {
    const result = await runPlaywright(config);
    console.log(result);
  } catch (err) {
    console.error(`Verification failed: ${err.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
