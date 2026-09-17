declare module "*/scripts/check-ui-tokens.mjs" {
  export function analyzeSource(source: string): { hardcodedColors: number; legacyTokens: number };
  export function compareWithBaseline(
    current: Record<string, { hardcodedColors: number; legacyTokens: number }>,
    baseline: Record<string, { hardcodedColors: number; legacyTokens: number }>
  ): string[];
}
