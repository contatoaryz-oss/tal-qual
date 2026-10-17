import { getUser } from '@/lib/auth/session';
import { withUserTx } from '@/lib/db/sql';
import { readFile } from '@/lib/storage';

// Serve logos e criativos. O caminho é {brand|creatives}/{workspaceId}/...; o arquivo só sai se o
// workspace for visível para quem está logado (RLS). Sem sessão ou de outra agência: 404 (não revela que existe).

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new Response('Não encontrado', { status: 404 });

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path || path.length < 3 || !['brand', 'creatives'].includes(path[0]) || !UUID.test(path[1])) return notFound();
  if (path.some((p) => p === '..' || p === '.' || p.includes('\\') || p.includes('/'))) return notFound();

  const user = await getUser();
  if (!user) return notFound();
  const visible = await withUserTx(user.id, async (tx) => (await tx`select 1 from workspaces where id = ${path[1]}`).length > 0);
  if (!visible) return notFound();

  const rel = path.join('/');
  const file = await readFile(rel);
  if (!file) return notFound();
  const ext = rel.split('.').pop()!.toLowerCase();
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
