import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const webRoot = path.resolve(import.meta.dirname, '..');

function parseCssThemeVariables(css: string, selector: ':root' | "[data-theme='dark']"): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) {
    throw new Error(`Could not locate CSS block for ${selector}`);
  }
  const vars: Record<string, string> = {};
  const declRegex = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let decl: RegExpExecArray | null;
  while ((decl = declRegex.exec(match[1])) !== null) {
    vars[decl[1].trim()] = decl[2].trim();
  }
  return vars;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length !== 6) {
    throw new Error(`Expected 3- or 6-digit hex color, got "${hex}"`);
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function collectTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Programmatic WCAG 2.1/2.2 Color Contrast & CSS Guardrails', () => {
  const cssPath = path.join(webRoot, 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const lightVars = parseCssThemeVariables(cssContent, ':root');
  const darkVars = parseCssThemeVariables(cssContent, "[data-theme='dark']");

  it.each([
    ['light (:root)', lightVars],
    ["dark ([data-theme='dark'])", darkVars],
  ])('enforces >= 4.5:1 AA text contrast and >= 3.0:1 UI control contrast in %s', (_themeName, vars) => {
    const surfaces = ['--bg-primary', '--bg-surface', '--bg-card', '--bg-inset'] as const;
    const textTokens = [
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--accent-crimson',
      '--status-success',
      '--status-warning',
      '--status-danger',
    ] as const;

    for (const surface of surfaces) {
      for (const textToken of textTokens) {
        const ratio = contrastRatio(vars[textToken], vars[surface]);
        expect(
          ratio,
          `${textToken} (${vars[textToken]}) on ${surface} (${vars[surface]}) must be >= 4.5:1, got ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(4.5);
      }

      // Non-text UI control borders and keyboard focus rings (WCAG 1.4.11 >= 3.0:1)
      for (const controlToken of ['--border-control', '--focus-ring'] as const) {
        const ratio = contrastRatio(vars[controlToken], vars[surface]);
        expect(
          ratio,
          `${controlToken} (${vars[controlToken]}) on ${surface} (${vars[surface]}) must be >= 3.0:1, got ${ratio.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(3.0);
      }
    }

    // Primary ink text on primary/card surfaces meets AAA (>= 12:1)
    expect(contrastRatio(vars['--text-primary'], vars['--bg-primary'])).toBeGreaterThanOrEqual(12.0);
    expect(contrastRatio(vars['--text-primary'], vars['--bg-card'])).toBeGreaterThanOrEqual(12.0);

    // Primary button default state (--bg-surface on --text-primary) & crimson hover state (#ffffff on --accent-crimson-solid)
    expect(contrastRatio(vars['--bg-surface'], vars['--text-primary'])).toBeGreaterThanOrEqual(12.0);
    expect(contrastRatio('#ffffff', vars['--accent-crimson-solid'])).toBeGreaterThanOrEqual(4.5);
  });

  it('includes skip-link, :focus-visible, and prefers-reduced-motion rules and forbids sub-12px typography', () => {
    expect(cssContent).toContain('.skip-link');
    expect(cssContent).toContain(':focus-visible');
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');

    // Verify no CSS rule in index.css sets font-size below 0.75rem / 12px
    const cssFontSizes = [...cssContent.matchAll(/font-size\s*:\s*([0-9.]+)(rem|px)/gi)];
    expect(cssFontSizes.length).toBeGreaterThan(0);
    for (const match of cssFontSizes) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'rem') {
        expect(value, `CSS font-size ${match[0]} is below 0.75rem`).toBeGreaterThanOrEqual(0.75);
      } else if (unit === 'px') {
        expect(value, `CSS font-size ${match[0]} is below 12px`).toBeGreaterThanOrEqual(12);
      }
    }

    // Verify no component inline style sets fontSize below 0.75rem / 12px
    const componentsDir = path.join(webRoot, 'src', 'components');
    const componentFiles = collectTsxFiles(componentsDir);
    expect(componentFiles.length).toBeGreaterThan(10);

    for (const file of componentFiles) {
      const src = fs.readFileSync(file, 'utf-8');
      const inlineMatches = [...src.matchAll(/fontSize\s*:\s*['"]([0-9.]+)(rem|px)['"]/g)];
      for (const match of inlineMatches) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        const relFile = path.relative(componentsDir, file);
        if (unit === 'rem') {
          expect(value, `${relFile} inline fontSize ${match[0]} is below 0.75rem`).toBeGreaterThanOrEqual(0.75);
        } else if (unit === 'px') {
          expect(value, `${relFile} inline fontSize ${match[0]} is below 12px`).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });
});
