import 'server-only';
import type { BrandKit, Creative, Icp, Offer, Workspace } from '../data/types';

// Pontos de troca. Hoje: implementações de teste, determinísticas e grátis.
// /replica-backend troca por: SiteReader → Apify; CopyWriter → Claude API; ImageProvider → provedor de imagem.

export interface SiteReading {
  palette: { hex: string; role: 'primary' | 'accent' | 'bg' | 'text' }[];
  note: string;
}
export interface SiteReader {
  name: string;
  read(ws: Workspace): Promise<SiteReading>;
}

export interface AdCopy { headline: string; subhead: string; cta: string; caption: string }
export interface CopyWriter {
  name: string;
  write(ctx: { brand: BrandKit; offer: Offer | null; icp: Icp | null; brief: string; variant: number }): Promise<AdCopy>;
}

export interface ImageProvider {
  name: string;
  /** Fundo SEM texto. Texto e logo entram depois por código (Satori). */
  background(ctx: { brand: BrandKit; creative: Creative; variant: number; width: number; height: number }): Promise<Buffer>;
  costCents: number;
}

/* ---------------- implementações de teste ---------------- */

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

export const testSiteReader: SiteReader = {
  name: 'teste-local',
  async read(ws) {
    // Sem rede para sites externos neste ambiente: sugere uma paleta a partir do nome.
    const hue = hash(ws.name) % 360;
    const hsl = (h: number, s: number, l: number) => {
      const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * c).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    };
    return {
      palette: [
        { hex: hsl(hue, 45, 18), role: 'primary' },
        { hex: hsl((hue + 150) % 360, 80, 55), role: 'accent' },
        { hex: hsl(hue, 20, 96), role: 'bg' },
        { hex: hsl(hue, 40, 12), role: 'text' },
      ],
      note: 'Modo de teste: paleta sugerida a partir do nome. A leitura real do site e do Instagram entra no backend.',
    };
  },
};

const ctaByKind: Record<Offer['kind'], string> = {
  service: 'Peça seu orçamento',
  product: 'Compre agora',
  promotion: 'Aproveite agora',
  lead_magnet: 'Baixe grátis',
  package: 'Quero o pacote',
};

const firstSentence = (s: string) => s.split(/(?<=[.!?])\s/)[0]?.trim() ?? s;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const testCopyWriter: CopyWriter = {
  name: 'modelo-pronto (sem IA)',
  async write({ brand, offer, icp, brief, variant }) {
    const goal = icp?.goals[variant % Math.max(1, icp.goals.length)];
    const pain = icp?.painPoints[variant % Math.max(1, icp.painPoints.length)];
    const options = [
      offer?.title,
      goal ? cap(goal) : undefined,
      brand.headline ?? undefined,
      brief ? firstSentence(brief) : undefined,
    ].filter((x): x is string => Boolean(x && x.trim()));
    const headline = (options[variant % Math.max(1, options.length)] ?? brand.companyName ?? 'Seu anúncio').slice(0, 70);
    const subhead = (offer?.description ?? (brief ? firstSentence(brief) : '') ?? '').slice(0, 110);
    const cta = offer ? ctaByKind[offer.kind] : 'Saiba mais';
    const caption = [
      pain ? `${cap(pain)}? A gente resolve.` : null,
      offer ? `${offer.title}${offer.description ? ` — ${offer.description}` : ''}` : null,
      `${cta} pelo direct.`,
    ].filter(Boolean).join('\n\n');
    return { headline, subhead, cta, caption };
  },
};

export const testImageProvider: ImageProvider = {
  name: 'fundo-abstrato (sem IA)',
  costCents: 0,
  async background({ brand, creative, variant, width, height }) {
    const { Resvg } = await import('@resvg/resvg-js');
    const primary = brand.colors.find((c) => c.role === 'primary')?.hex ?? '#13294B';
    const accent = brand.colors.find((c) => c.role === 'accent')?.hex ?? '#F5C33B';
    const bg = brand.colors.find((c) => c.role === 'bg')?.hex ?? '#F6F7F9';
    const seed = hash(creative.id + variant);
    const r = (n: number) => ((seed >>> (n % 24)) % 1000) / 1000;
    const shapes = [0, 1, 2].map((i) => {
      const cx = Math.round(width * (0.2 + 0.7 * r(i * 7)));
      const cy = Math.round(height * (0.1 + 0.5 * r(i * 5 + 3)));
      const rad = Math.round(Math.min(width, height) * (0.25 + 0.3 * r(i * 3 + 1)));
      return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${i === 1 ? accent : bg}" opacity="${i === 1 ? 0.55 : 0.08}"/>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${primary}" stop-opacity="0.82"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>${shapes}
      <rect x="0" y="${Math.round(height * 0.04)}" width="${Math.round(width * 0.012)}" height="${Math.round(height * 0.18)}" fill="${accent}"/>
    </svg>`;
    return Buffer.from(new Resvg(svg).render().asPng());
  },
};

export const providers = { site: testSiteReader, copy: testCopyWriter, image: testImageProvider };
