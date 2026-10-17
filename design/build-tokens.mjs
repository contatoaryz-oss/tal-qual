// Gera tokens.css, tailwind.css e contrast-report.md a partir de tokens.json.
// Sai com código 1 se algum par falhar no WCAG AA.  Uso: node build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

// ---------- contraste (WCAG 2.x) ----------
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// ---------- tokens.css ----------
const colorVars = (mode) =>
  Object.entries(t.color[mode]).map(([k, v]) => `  --color-${k}: ${v};`).join('\n');

const base = [
  ...Object.entries(t.font.family).map(([k, v]) => `  --font-${k}: ${v};`),
  ...Object.entries(t.font.size).flatMap(([k, v]) => [
    `  --text-${k}: ${v.size};`, `  --text-${k}--line-height: ${v.line};`]),
  ...Object.entries(t.space).map(([k, v]) => `  --space-${k}: ${v};`),
  ...Object.entries(t.radius).map(([k, v]) => `  --radius-${k}: ${v};`),
  ...Object.entries(t.shadow).map(([k, v]) => `  --shadow-${k}: ${v};`),
  `  --duration-fast: ${t.motion.fast};`,
  `  --duration-base: ${t.motion.base};`,
  `  --duration-slow: ${t.motion.slow};`,
  `  --ease-standard: ${t.motion.ease};`,
  `  --layout-sidebar: ${t.layout.sidebar};`,
  `  --layout-header: ${t.layout.header};`,
  `  --layout-content-max: ${t.layout['content-max']};`,
  `  --layout-gutter-mobile: ${t.layout['gutter-mobile']};`,
].join('\n');

const css = `/* GERADO por build-tokens.mjs a partir de tokens.json — não editar à mão */
:root {
  color-scheme: light;
${colorVars('light')}
${base}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${colorVars('dark').replace(/^/gm, '  ')}
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
${colorVars('dark')}
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-base: 0ms;
    --duration-slow: 0ms;
  }
}

html, body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: var(--text-md--line-height);
  -webkit-font-smoothing: antialiased;
}
`;
writeFileSync(join(here, 'tokens.css'), css);

// ---------- tailwind.css (Tailwind v4: @theme inline lê as variáveis) ----------
const colorKeys = Object.keys(t.color.light);
const tw = `/* GERADO por build-tokens.mjs — importar depois de "tailwindcss" e de tokens.css.
   Uso nos componentes: bg-surface text-text-muted border-border-input ring-ring rounded-md shadow-sm
   Nunca hex solto em componente. */
@import "./tokens.css";

@theme inline {
${colorKeys.map((k) => `  --color-${k}: var(--color-${k});`).join('\n')}

${Object.keys(t.font.family).map((k) => `  --font-${k}: var(--font-${k});`).join('\n')}

${Object.keys(t.font.size).map((k) => `  --text-${k}: var(--text-${k});\n  --text-${k}--line-height: var(--text-${k}--line-height);`).join('\n')}

${Object.keys(t.radius).map((k) => `  --radius-${k}: var(--radius-${k});`).join('\n')}

${Object.keys(t.shadow).map((k) => `  --shadow-${k}: var(--shadow-${k});`).join('\n')}

  --spacing: 4px;
  --ease-standard: var(--ease-standard);
${Object.entries(t.layout.breakpoints).map(([k, v]) => `  --breakpoint-${k}: ${v};`).join('\n')}
}

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
`;
writeFileSync(join(here, 'tailwind.css'), tw);

// ---------- contrast-report.md ----------
let fails = 0;
const rows = [];
for (const mode of ['light', 'dark']) {
  for (const p of t.pairs) {
    if (p.modes && !p.modes.includes(mode)) continue;
    const fg = t.color[mode][p.fg];
    const bg = t.color[mode][p.bg];
    const r = ratio(fg, bg);
    const ok = r >= p.min;
    if (!ok) fails++;
    rows.push(`| ${mode} | \`${p.fg}\` ${fg} | \`${p.bg}\` ${bg} | ${r.toFixed(2)}:1 | ${p.min}:1 | ${ok ? 'ok' : '**FALHA**'} | ${p.use} |`);
  }
}
const report = `# Relatório de contraste (WCAG 2.2 AA)

Gerado por \`build-tokens.mjs\`. Mínimo: 4,5:1 para texto, 3:1 para borda de input, anel de foco e ícones.

**Resultado: ${rows.length} pares verificados, ${fails} falha(s).**

| modo | texto / traço | fundo | contraste | mínimo | status | uso |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Regras que saem desta tabela

- Amarelo (\`accent\`) sobre branco dá ${ratio(t.color.light.accent, t.color.light.surface).toFixed(2)}:1. Por isso o amarelo **nunca** é texto, ícone ou anel de foco no tema claro. Ele é sempre fundo, com \`on-accent\` (marinho) por cima.
- No tema claro, o anel de foco é marinho. No tema escuro, é amarelo.
- \`border\` (${t.color.light.border}) é só divisória decorativa. Toda borda que delimita um controle usa \`border-input\`.
- No tema escuro, \`primary\` vira amarelo. O botão primário continua sendo a ação mais forte da tela nos dois temas.
`;
writeFileSync(join(here, 'contrast-report.md'), report);

console.log(`${rows.length} pares, ${fails} falha(s)`);
process.exit(fails ? 1 : 0);
