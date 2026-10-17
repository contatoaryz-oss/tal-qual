import 'server-only';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { supabaseAdmin } from './auth/supabase';

// Arquivos (logos e criativos). STORAGE_DRIVER=supabase → bucket privado no Supabase Storage;
// STORAGE_DRIVER=local → pasta .data/files (só desenvolvimento: na Vercel o disco some a cada deploy).
// Os arquivos saem sempre pela rota /api/files, que confere se o workspace é do usuário.

const BUCKET = process.env.STORAGE_BUCKET ?? 'files';
const LOCAL_DIR = resolve(process.cwd(), '.data', 'files');
const driver = () => (process.env.STORAGE_DRIVER === 'supabase' ? 'supabase' : 'local');

const local = (rel: string) => {
  const p = resolve(LOCAL_DIR, rel);
  if (!p.startsWith(LOCAL_DIR + '/')) throw new Error('caminho inválido');
  return p;
};

export async function saveFile(rel: string, content: Buffer, contentType: string): Promise<string> {
  if (driver() === 'supabase') {
    const { error } = await supabaseAdmin().storage.from(BUCKET).upload(rel, content, { contentType, upsert: true });
    if (error) throw new Error(`Falha ao salvar arquivo: ${error.message}`);
    return rel;
  }
  const p = local(rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  return rel;
}

export async function readFile(rel: string): Promise<Buffer | null> {
  if (driver() === 'supabase') {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(rel);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  const p = local(rel);
  return existsSync(p) ? readFileSync(p) : null;
}

export async function removeFiles(rels: string[]) {
  if (!rels.length) return;
  if (driver() === 'supabase') {
    await supabaseAdmin().storage.from(BUCKET).remove(rels);
    return;
  }
  for (const r of rels) rmSync(local(r), { force: true });
}

/** Apaga tudo de um workspace (brand/{id}/ e creatives/{id}/). Usado ao apagar conta/cliente. */
export async function removeWorkspaceFiles(workspaceId: string) {
  if (driver() === 'supabase') {
    const s = supabaseAdmin().storage.from(BUCKET);
    for (const prefix of [`brand/${workspaceId}`, `creatives/${workspaceId}`]) {
      // creatives/{ws}/{creativeId}/vN.png: lista as pastas e depois os arquivos
      const { data: top } = await s.list(prefix, { limit: 1000 });
      const files: string[] = [];
      for (const item of top ?? []) {
        if (item.id) files.push(`${prefix}/${item.name}`);
        else {
          const { data: inner } = await s.list(`${prefix}/${item.name}`, { limit: 1000 });
          for (const f of inner ?? []) files.push(`${prefix}/${item.name}/${f.name}`);
        }
      }
      for (let i = 0; i < files.length; i += 100) await s.remove(files.slice(i, i + 100));
    }
    return;
  }
  for (const prefix of [`brand/${workspaceId}`, `creatives/${workspaceId}`]) rmSync(join(LOCAL_DIR, prefix), { recursive: true, force: true });
}
