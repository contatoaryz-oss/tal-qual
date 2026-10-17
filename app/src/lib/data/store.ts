import 'server-only';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ApiCost, BrandKit, Creative, CreativeVersion, Icp, Offer, OfferIcp, OnboardingStage, Org, Workspace,
} from './types';
import { seed } from './seed';

// shortcut: banco falso em um arquivo JSON (.data/db.json). Troca pelo Supabase no /replica-backend;
// as funções em ./index.ts mantêm a mesma assinatura.

export interface Db {
  orgs: Org[];
  workspaces: Workspace[];
  stages: OnboardingStage[];
  brandKits: BrandKit[];
  icps: Icp[];
  offers: Offer[];
  offerIcps: OfferIcp[];
  creatives: Creative[];
  creativeVersions: CreativeVersion[];
  apiCosts: ApiCost[];
}

export const DATA_DIR = join(process.cwd(), '.data');
export const FILES_DIR = join(DATA_DIR, 'files');
const DB_PATH = join(DATA_DIR, 'db.json');

function ensure() {
  if (!existsSync(FILES_DIR)) mkdirSync(FILES_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    const initial = seed();
    writeFileSync(DB_PATH, JSON.stringify(initial.db, null, 2));
    for (const f of initial.files) {
      const p = join(FILES_DIR, f.path);
      mkdirSync(join(p, '..'), { recursive: true });
      writeFileSync(p, f.content);
    }
  }
}

export function read(): Db {
  ensure();
  return JSON.parse(readFileSync(DB_PATH, 'utf8')) as Db;
}

/** Transação simples: lê, aplica a mudança e grava de forma atômica (arquivo temporário + rename). */
export function tx<T>(fn: (db: Db) => T): T {
  const db = read();
  const out = fn(db);
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DB_PATH);
  return out;
}

export function saveFile(relPath: string, content: Buffer | string) {
  ensure();
  const p = join(FILES_DIR, relPath);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content);
  return relPath;
}

export function readFile(relPath: string): Buffer | null {
  const p = join(FILES_DIR, relPath);
  if (!p.startsWith(FILES_DIR) || !existsSync(p)) return null;
  return readFileSync(p);
}
