#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      files.push(...walk(full));
    } else if (['.vue', '.css', '.scss'].includes(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(SRC_DIR);
const namespaces = {
  smax: /var\(--smax-[A-Za-z0-9_-]+/g,
  at: /var\(--at-[A-Za-z0-9_-]+/g,
  rk: /var\(--rk-[A-Za-z0-9_-]+/g,
  hsFoundation: /var\(--(?:brand|brand-[0-9]+|brand-soft|ink|ink-[0-9]|line|line-[0-9]|surface|surface-[0-9]|r-[a-z]+|sh-[a-z]+)/g,
};

const counts = { smax: 0, at: 0, rk: 0, hsFoundation: 0 };

for (const f of files) {
  // Do not count the compatibility bridge itself
  if (f.includes('compatibility.css')) continue;
  const content = readFileSync(f, 'utf8');
  for (const [key, regex] of Object.entries(namespaces)) {
    const matches = content.match(regex);
    if (matches) {
      counts[key] += matches.length;
    }
  }
}

console.log('Legacy Token Consumer Inventory:');
console.log(`- --smax-*       : ${counts.smax} occurrences (Target: Wave 4 Chat)`);
console.log(`- --at-*         : ${counts.at} occurrences (Target: Wave 1 Dashboard / Wave 3 CRM)`);
console.log(`- --rk-*         : ${counts.rk} occurrences (Target: Wave 1 Reports)`);
console.log(`- HS Foundation  : ${counts.hsFoundation} occurrences (Target: Wave 2 Settings/Admin)`);
console.log('Total tracked legacy usages:', Object.values(counts).reduce((a, b) => a + b, 0));
