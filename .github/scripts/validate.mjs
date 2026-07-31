import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'index.html','app/index.html','app/js/verified-engine.js','app/js/engine-adapter.js',
  'app/js/auth.js','app/js/cloud.js','app/js/supabase.js','app/js/config.example.js',
  'login.html','manifest.json','icon-192.png','icon-512.png','README.md','docs/SUPABASE_SETUP.md'
];
const missing = required.filter(file => !existsSync(resolve(root, file)));
if (missing.length) {
  console.error('Missing required files:\n' + missing.map(file => `- ${file}`).join('\n'));
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
if (manifest.start_url !== './app/index.html') {
  console.error('manifest.json start_url must be ./app/index.html');
  process.exit(1);
}
console.log('Harbour North repository validation passed.');
