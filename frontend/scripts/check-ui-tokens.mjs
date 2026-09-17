import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function analyzeSource(source) {
  let hardcodedColors = 0;
  let legacyTokens = 0;

  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    if (line.includes('/* ui-token-check-allow */')) continue;

    // Detect legacy tokens: var(--smax-*, var(--at-*, var(--rk-*
    const legacyMatches = line.match(/var\(--(?:smax|at|rk)-[A-Za-z0-9_-]+/g);
    if (legacyMatches) {
      legacyTokens += legacyMatches.length;
    }

    // Strip semantic token fallbacks like var(--color-*, #123456) or var(--space-*, 12px)
    const cleanedLine = line.replace(/var\(--(?:color|radius|space|font|shadow|duration|ease)-[A-Za-z0-9_-]+,\s*[^)]+\)/g, '');

    // Match hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa
    const hexMatches = cleanedLine.match(/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g);
    if (hexMatches) {
      hardcodedColors += hexMatches.length;
    }

    // Match rgb/rgba/hsl/hsla
    const funcMatches = cleanedLine.match(/\b(?:rgb|rgba|hsl|hsla)\([^)]+\)/g);
    if (funcMatches) {
      hardcodedColors += funcMatches.length;
    }
  }

  return { hardcodedColors, legacyTokens };
}

export function compareWithBaseline(current, baseline) {
  const violations = [];
  for (const [file, curStats] of Object.entries(current)) {
    const baseStats = baseline[file] || { hardcodedColors: 0, legacyTokens: 0 };
    if (curStats.hardcodedColors > baseStats.hardcodedColors) {
      violations.push(`${file}: hardcoded colors increased from ${baseStats.hardcodedColors} to ${curStats.hardcodedColors}`);
    }
    if (curStats.legacyTokens > baseStats.legacyTokens) {
      violations.push(`${file}: legacy tokens increased from ${baseStats.legacyTokens} to ${curStats.legacyTokens}`);
    }
  }
  return violations;
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const srcDir = fileURLToPath(new URL('../src', import.meta.url));
  const baselinePath = fileURLToPath(new URL('./ui-token-baseline.json', import.meta.url));

  function walk(dir) {
    const files = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (['node_modules', '.git', 'dist'].includes(entry)) continue;
        files.push(...walk(full));
      } else if (['.vue', '.css', '.scss'].includes(extname(entry))) {
        files.push(full);
      }
    }
    return files;
  }

  const files = walk(srcDir);
  const current = {};

  for (const f of files) {
    const rel = relative(srcDir, f).replaceAll('\\', '/');
    // Skip token definitions and compatibility layer
    if (rel.startsWith('design-system/tokens/') || rel.includes('compatibility.css')) continue;
    const text = readFileSync(f, 'utf8');
    const stats = analyzeSource(text);
    if (stats.hardcodedColors > 0 || stats.legacyTokens > 0) {
      current[rel] = stats;
    }
  }

  if (process.argv.includes('--update-baseline') || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, JSON.stringify(current, null, 2), 'utf8');
    console.log(`Updated baseline at ${baselinePath}`);
    process.exit(0);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const violations = compareWithBaseline(current, baseline);

  if (violations.length > 0) {
    console.error('UI Token CI Enforcement Violations:');
    for (const v of violations) console.error(` - ${v}`);
    process.exit(1);
  } else {
    console.log('✓ UI Token Enforcement: All checks passed within baseline.');
  }
}
