import { readFile } from '@/lib/data/store';

// Serve logos e criativos salvos. shortcut: sem checagem de sessão (um usuário só).
// Upgrade: Supabase Storage privado com URL assinada no /replica-backend.

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path?.length || !['brand', 'creatives'].includes(path[0]) || path.some((p) => p === '..' || p.includes('\\'))) {
    return new Response('Não encontrado', { status: 404 });
  }
  const rel = path.join('/');
  const file = readFile(rel);
  if (!file) return new Response('Não encontrado', { status: 404 });
  const ext = rel.split('.').pop()!.toLowerCase();
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
