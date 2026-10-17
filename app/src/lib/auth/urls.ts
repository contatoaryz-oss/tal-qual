/** Endereço público do app (para os links dos e-mails). */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Só aceita caminho interno ("/w/x"). Bloqueia "//outro.site", "https://..." e "/\\x" (redirecionamento aberto). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
