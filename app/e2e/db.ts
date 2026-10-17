import postgres from 'postgres';
import { readFileSync } from 'node:fs';

// Acesso direto ao banco local, só para preparar e conferir estado nos testes.
function env(name: string) {
  const line = readFileSync('.env.local', 'utf8').split('\n').find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}
export const DATABASE_URL = process.env.DATABASE_URL ?? env('DATABASE_URL')!;
export const AUTH = 'http://localhost:54321/auth/v1';
export const db = postgres(DATABASE_URL, { max: 2, onnotice: () => {} });

export async function resetRateLimits() {
  await db`truncate rate_limits`;
}

export async function mailbox(to: string): Promise<{ type: string; subject: string; link: string; html: string }[]> {
  return (await fetch(`${AUTH}/__mailbox?to=${encodeURIComponent(to)}`)).json();
}

export async function lastLink(to: string, type: 'signup' | 'magiclink' | 'recovery') {
  for (let i = 0; i < 30; i++) {
    const m = (await mailbox(to)).filter((x) => x.type === type);
    if (m.length) return m[m.length - 1].link;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`nenhum e-mail ${type} para ${to}`);
}
