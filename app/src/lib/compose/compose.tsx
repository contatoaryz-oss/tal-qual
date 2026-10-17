import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';

// Composição determinística: fundo (imagem sem texto) + logo REAL + headline + CTA.
// Texto nunca vem do gerador de imagem — evita erro de acento e logo inventado.

const fontDir = join(process.cwd(), 'node_modules/@fontsource');
let fonts: { name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: 'normal' }[] | null = null;
function loadFonts() {
  fonts ??= [
    { name: 'Inter', data: readFileSync(join(fontDir, 'inter/files/inter-latin-400-normal.woff')), weight: 400, style: 'normal' },
    { name: 'Inter', data: readFileSync(join(fontDir, 'inter/files/inter-latin-600-normal.woff')), weight: 600, style: 'normal' },
    { name: 'Manrope', data: readFileSync(join(fontDir, 'manrope/files/manrope-latin-700-normal.woff')), weight: 700, style: 'normal' },
    { name: 'Manrope', data: readFileSync(join(fontDir, 'manrope/files/manrope-latin-800-normal.woff')), weight: 800, style: 'normal' },
  ];
  return fonts;
}

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/** Cor de texto legível sobre uma cor de fundo (o maior contraste entre quase-preto e branco). */
export const readableOn = (hex: string) => (lum(hex) > 0.18 ? '#0B1B33' : '#FFFFFF');

export async function composeAd(input: {
  width: number; height: number; background: Buffer; logoPng: Buffer | null; companyName: string;
  headline: string; subhead: string; cta: string; accent: string;
}): Promise<Buffer> {
  const { Resvg } = await import('@resvg/resvg-js');
  const { width, height } = input;
  const unit = width / 1080;
  const hLen = input.headline.length;
  const headlineSize = Math.round((hLen <= 26 ? 104 : hLen <= 44 ? 86 : 68) * unit);
  const pad = Math.round(72 * unit);
  const dataUrl = (b: Buffer) => `data:image/png;base64,${b.toString('base64')}`;

  const svg = await satori(
    <div style={{ width, height, display: 'flex', position: 'relative', fontFamily: 'Inter' }}>
      <img src={dataUrl(input.background)} width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(height * 0.62),
          display: 'flex', backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.72))',
        }}
      />
      <div style={{ position: 'absolute', top: pad, left: pad, display: 'flex' }}>
        {input.logoPng ? (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.94)', borderRadius: 20 * unit, padding: `${18 * unit}px ${24 * unit}px` }}>
            <img src={dataUrl(input.logoPng)} height={Math.round(64 * unit)} style={{ objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', color: '#FFFFFF', fontFamily: 'Manrope', fontWeight: 800, fontSize: 40 * unit }}>{input.companyName}</div>
        )}
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: pad, display: 'flex', flexDirection: 'column', gap: 24 * unit }}>
        <div style={{ display: 'flex', color: '#FFFFFF', fontFamily: 'Manrope', fontWeight: 800, fontSize: headlineSize, lineHeight: 1.05, letterSpacing: -1.5 * unit }}>
          {input.headline}
        </div>
        {input.subhead ? (
          <div style={{ display: 'flex', color: 'rgba(255,255,255,0.9)', fontSize: 36 * unit, lineHeight: 1.3 }}>{input.subhead}</div>
        ) : null}
        <div style={{ display: 'flex', marginTop: 12 * unit }}>
          <div
            style={{
              display: 'flex', background: input.accent, color: readableOn(input.accent), fontWeight: 600,
              fontSize: 34 * unit, padding: `${20 * unit}px ${36 * unit}px`, borderRadius: 999,
            }}
          >
            {input.cta}
          </div>
        </div>
      </div>
    </div>,
    { width, height, fonts: loadFonts() },
  );
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng());
}

/** Converte o logo salvo (svg, png, jpg, webp) em PNG para entrar na composição. */
export async function logoToPng(file: Buffer, path: string): Promise<Buffer> {
  if (path.endsWith('.svg')) {
    const { Resvg } = await import('@resvg/resvg-js');
    return Buffer.from(new Resvg(file.toString('utf8'), { fitTo: { mode: 'height', value: 256 } }).render().asPng());
  }
  const sharp = (await import('sharp')).default;
  return sharp(file).resize({ height: 256, withoutEnlargement: true }).png().toBuffer();
}
