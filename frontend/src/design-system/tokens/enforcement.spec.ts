import { describe, expect, it } from 'vitest';
import { analyzeSource, compareWithBaseline } from '../../../scripts/check-ui-tokens.mjs';

describe('UI token enforcement', () => {
  it('detects raw colors and legacy variables', () => {
    const result = analyzeSource(`
      .card {
        color: #123456;
        background: rgb(1, 2, 3);
        border-color: var(--smax-grey-200);
      }
    `);

    expect(result).toEqual({ hardcodedColors: 2, legacyTokens: 1 });
  });

  it('allows semantic token fallbacks and explicitly exempted lines', () => {
    const result = analyzeSource(`
      .card { color: var(--color-text, #141a24); }
      .chart { color: #ff00ff; } /* ui-token-check-allow */
    `);

    expect(result).toEqual({ hardcodedColors: 0, legacyTokens: 0 });
  });

  it('reports only increases above the recorded baseline', () => {
    expect(compareWithBaseline(
      { 'views/Test.vue': { hardcodedColors: 3, legacyTokens: 2 } },
      { 'views/Test.vue': { hardcodedColors: 2, legacyTokens: 2 } },
    )).toEqual([
      'views/Test.vue: hardcoded colors increased from 2 to 3',
    ]);
  });
});
