// Parsers puros (sem I/O), usados pelas actions e cobertos por teste.

/** Aceita "site.com.br", "https://site.com", "@perfil" ou "instagram.com/perfil". */
export function parseSource(raw: string): { websiteUrl: string | null; instagramHandle: string | null; suggestedName: string } | null {
  const s = raw.trim();
  if (!s) return null;
  const ig = s.match(/^(?:@|(?:https?:\/\/)?(?:www\.)?instagram\.com\/)([A-Za-z0-9._]{1,30})\/?$/);
  if (ig) {
    const handle = ig[1].toLowerCase();
    return { websiteUrl: null, instagramHandle: handle, suggestedName: prettify(handle) };
  }
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/\.[a-z]{2,}$/i.test(url.hostname) || url.hostname.includes('instagram.com')) return null;
    const host = url.hostname.replace(/^www\./, '');
    return { websiteUrl: url.origin, instagramHandle: null, suggestedName: prettify(host.split('.')[0]) };
  } catch {
    return null;
  }
}
function prettify(s: string) {
  return s.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "89,90", "R$ 1.299,00", "1299" → centavos. Vazio = sem preço. */
export function parsePrice(raw: string | undefined): number | null | 'invalid' {
  const s = (raw ?? '').replace(/R\$\s?/i, '').trim();
  if (!s) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return 'invalid';
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Math.round(n * 100);
}

