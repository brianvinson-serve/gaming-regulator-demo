#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');
const https = require('https');

const configIdx = process.argv.indexOf('--config');
const configKey = configIdx !== -1 ? process.argv[configIdx + 1] : 'ky';
const configFile = path.join(__dirname, 'configs', `config.${configKey}.js`);

if (!fs.existsSync(configFile)) {
  console.error(`Config not found: configs/config.${configKey}.js`);
  process.exit(1);
}

const SRC       = path.join(__dirname, 'src');
const OUT       = path.join(__dirname, 'index.html');
const TOPO_FILE = path.join(__dirname, 'configs', 'us-topology.json');
const TOPO_URL  = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

function ensureTopology(cb) {
  if (fs.existsSync(TOPO_FILE)) return cb(null);
  console.log('Downloading US topology (one-time)...');
  const file = fs.createWriteStream(TOPO_FILE);
  https.get(TOPO_URL, res => {
    res.pipe(file);
    file.on('finish', () => { file.close(); cb(null); });
  }).on('error', err => { fs.unlink(TOPO_FILE, () => {}); cb(err); });
}

ensureTopology(err => {
  if (err) { console.error('Topology download failed:', err.message); process.exit(1); }

  const shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');
  const style = fs.readFileSync(path.join(SRC, 'style.css'),  'utf8');

  const configSource = fs.readFileSync(configFile, 'utf8');
  const configScript = `// ── config.${configKey}.js ──\nconst CONFIG = (function(){\nreturn ${configSource};\n})();`;

  const topoSource = fs.readFileSync(TOPO_FILE, 'utf8');
  const topoScript = `// ── us-topology ──\nconst US_TOPOLOGY = ${topoSource};`;

  const jsFiles = ['data.js', 'filters.js', 'charts.js', 'export.js', 'main.js'];
  const script  = [configScript, topoScript,
    ...jsFiles.map(f => `// ── ${f} ──\n` + fs.readFileSync(path.join(SRC, f), 'utf8')),
  ].join('\n\n');

  const output = shell
    .replace('{{STYLE}}', () => style)
    .replace('{{SCRIPT}}', () => script);

  fs.writeFileSync(OUT, output, 'utf8');
  console.log(`Built ${OUT} (${(output.length / 1024).toFixed(1)} KB) [config: ${configKey}]`);
});
