#!/usr/bin/env node
// SÓ PARA TESTE LOCAL — simulador do protocolo HTTP do Supabase Auth (GoTrue) em /auth/v1.
// Existe porque este ambiente não baixa o servidor real. O app usa a biblioteca oficial
// (@supabase/ssr) e não sabe que está falando com isto. Com um projeto Supabase de verdade,
// este arquivo não é usado: rode `npm run check:supabase` para validar contra o real.
//
// Cobre: signup com confirmação, login com senha, link mágico (otp), recover, verify (PKCE),
// troca de código (grant_type=pkce), refresh, GET/PUT /user, logout (local/global),
// admin: criar e apagar usuário. Os e-mails vão para mailbox.jsonl (GET /__mailbox).
import { createServer } from 'node:http';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AUTH_PORT ?? 54321);
const SECRET = process.env.JWT_SECRET ?? 'segredo-local-de-teste-com-pelo-menos-32-caracteres';
const SITE = `http://localhost:${PORT}`;
const MAILBOX = join(here, 'mailbox.jsonl');
const TEMPLATES = join(here, '..', '..', 'supabase', 'templates');
const sql = postgres(process.env.DATABASE_URL, { max: 4, onnotice: () => {} });

/* ---------------- JWT HS256 ---------------- */
const b64u = (b) => Buffer.from(b).toString('base64url');
export function signJwt(payload, secret = SECRET) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [h, b, s] = (token ?? '').split('.');
  if (!s) return null;
  const good = createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url');
  if (good.length !== s.length || !timingSafeEqual(Buffer.from(good), Buffer.from(s))) return null;
  const p = JSON.parse(Buffer.from(b, 'base64url').toString());
  if (p.exp && p.exp < Date.now() / 1000) return null;
  return p;
}

/* ---------------- estado em memória (sessões e códigos) ---------------- */
const sessions = new Map(); // refresh_token -> { userId, sessionId }
const tokens = new Map();   // token do e-mail -> { userId, type, challenge, redirectTo }
const codes = new Map();    // auth_code -> { userId, challenge }

const hash = (pw) => { const salt = randomBytes(16); return `${salt.toString('hex')}:${scryptSync(pw, salt, 32).toString('hex')}`; };
const check = (pw, stored) => {
  if (!stored) return false;
  const [salt, h] = stored.split(':');
  return timingSafeEqual(scryptSync(pw, Buffer.from(salt, 'hex'), 32), Buffer.from(h, 'hex'));
};
const pkce = (verifier) => createHash('sha256').update(verifier).digest('base64url');

const userJson = (u) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
  email_confirmed_at: u.email_confirmed_at, confirmed_at: u.email_confirmed_at, last_sign_in_at: u.last_sign_in_at,
  app_metadata: u.raw_app_meta_data ?? { provider: 'email', providers: ['email'] }, user_metadata: u.raw_user_meta_data ?? {},
  identities: [], created_at: u.created_at, updated_at: u.updated_at, is_anonymous: false,
});

async function session(u) {
  await sql`update auth.users set last_sign_in_at = now() where id = ${u.id}`;
  const sessionId = randomUUID();
  const refresh = randomBytes(24).toString('base64url');
  sessions.set(refresh, { userId: u.id, sessionId });
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const access = signJwt({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', iat: now, exp, session_id: sessionId, aal: 'aal1', amr: [{ method: 'password', timestamp: now }], app_metadata: { provider: 'email' }, user_metadata: {} });
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user: userJson(u) };
}

function template(type, link) {
  const file = join(TEMPLATES, `${type}.html`);
  const html = existsSync(file) ? readFileSync(file, 'utf8') : `<a href="{{ .ConfirmationURL }}">link</a>`;
  return html.replaceAll('{{ .ConfirmationURL }}', link).replaceAll('{{ .SiteURL }}', SITE);
}
function mail(to, type, userId, challenge, redirectTo) {
  const token = randomBytes(20).toString('hex');
  tokens.set(token, { userId, type, challenge, redirectTo });
  const link = `${SITE}/auth/v1/verify?token=${token}&type=${type}&redirect_to=${encodeURIComponent(redirectTo ?? '')}`;
  const subject = { signup: 'Confirme seu cadastro', magiclink: 'Seu link de acesso', recovery: 'Redefinir sua senha' }[type];
  appendFileSync(MAILBOX, JSON.stringify({ to, type, subject, link, html: template(type === 'signup' ? 'confirmation' : type, link), at: new Date().toISOString() }) + '\n');
}

/* ---------------- HTTP ---------------- */
const err = (res, status, code, msg) => send(res, status, { code: status, error_code: code, msg });
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(d ? JSON.parse(d) : {}); } catch { r({}); } }); });
const bearer = (req) => (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
const findUser = async (email) => (await sql`select * from auth.users where lower(email) = lower(${email})`)[0];
const getUser = async (id) => (await sql`select * from auth.users where id = ${id}`)[0];

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, SITE);
    const path = url.pathname.replace(/^\/auth\/v1/, '');
    if (req.method === 'OPTIONS') return send(res, 204, undefined, { 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });

    if (path === '/__mailbox') {
      const to = url.searchParams.get('to');
      const items = existsSync(MAILBOX) ? readFileSync(MAILBOX, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
      return send(res, 200, to ? items.filter((m) => m.to === to) : items);
    }
    if (path === '/__reset') { writeFileSync(MAILBOX, ''); sessions.clear(); tokens.clear(); codes.clear(); return send(res, 200, {}); }
    if (path === '/health') return send(res, 200, { name: 'auth-emulator' });
    if (path === '/settings') return send(res, 200, { external: { email: true, google: false }, mailer_autoconfirm: false });

    if (path === '/signup' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.email || !b.password) return err(res, 400, 'validation_failed', 'Email and password required');
      if (b.password.length < 8) return err(res, 422, 'weak_password', 'Password should be at least 8 characters.');
      const existing = await findUser(b.email);
      if (existing?.email_confirmed_at) return send(res, 200, userJson(existing)); // igual ao GoTrue: não revela que o e-mail existe
      const u = existing ?? (await sql`insert into auth.users (email, encrypted_password) values (${b.email.toLowerCase()}, ${hash(b.password)}) returning *`)[0];
      mail(u.email, 'signup', u.id, b.code_challenge, url.searchParams.get('redirect_to'));
      return send(res, 200, { ...userJson(u), confirmation_sent_at: new Date().toISOString() });
    }

    if (path === '/token' && req.method === 'POST') {
      const grant = url.searchParams.get('grant_type');
      const b = await readBody(req);
      if (grant === 'password') {
        const u = await findUser(b.email ?? '');
        if (!u || !check(b.password ?? '', u.encrypted_password)) return err(res, 400, 'invalid_credentials', 'Invalid login credentials');
        if (!u.email_confirmed_at) return err(res, 400, 'email_not_confirmed', 'Email not confirmed');
        return send(res, 200, await session(u));
      }
      if (grant === 'refresh_token') {
        const s = sessions.get(b.refresh_token);
        if (!s) return err(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        sessions.delete(b.refresh_token);
        const u = await getUser(s.userId);
        if (!u) return err(res, 400, 'user_not_found', 'User not found');
        return send(res, 200, await session(u));
      }
      if (grant === 'pkce') {
        const c = codes.get(b.auth_code);
        if (!c || !b.code_verifier || pkce(b.code_verifier) !== c.challenge) return err(res, 400, 'bad_code_verifier', 'code challenge does not match previously saved code verifier');
        codes.delete(b.auth_code);
        const u = await getUser(c.userId);
        return send(res, 200, await session(u));
      }
      return err(res, 400, 'unsupported_grant_type', 'unsupported grant type');
    }

    if (path === '/otp' && req.method === 'POST') {
      const b = await readBody(req);
      let u = await findUser(b.email ?? '');
      if (!u && b.create_user === false) return err(res, 422, 'otp_disabled', 'Signups not allowed for otp');
      u ??= (await sql`insert into auth.users (email) values (${b.email.toLowerCase()}) returning *`)[0];
      mail(u.email, 'magiclink', u.id, b.code_challenge, url.searchParams.get('redirect_to'));
      return send(res, 200, {});
    }

    if (path === '/recover' && req.method === 'POST') {
      const b = await readBody(req);
      const u = await findUser(b.email ?? '');
      if (u) mail(u.email, 'recovery', u.id, b.code_challenge, url.searchParams.get('redirect_to'));
      return send(res, 200, {}); // não revela se o e-mail existe
    }

    if (path === '/verify' && req.method === 'GET') {
      const t = tokens.get(url.searchParams.get('token'));
      const redirectTo = url.searchParams.get('redirect_to') || t?.redirectTo || 'http://localhost:3000';
      if (!t) {
        res.writeHead(303, { location: `${redirectTo}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired` });
        return res.end();
      }
      tokens.delete(url.searchParams.get('token'));
      await sql`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = ${t.userId}`;
      const code = randomUUID();
      codes.set(code, { userId: t.userId, challenge: t.challenge });
      const target = new URL(redirectTo);
      target.searchParams.set('code', code);
      res.writeHead(303, { location: target.toString() });
      return res.end();
    }

    if (path === '/user') {
      const p = verifyJwt(bearer(req));
      if (!p || p.role !== 'authenticated') return err(res, 401, 'bad_jwt', 'invalid JWT');
      const live = [...sessions.values()].some((s) => s.sessionId === p.session_id);
      if (!live) return err(res, 403, 'session_not_found', 'Session from session_id claim in JWT does not exist');
      let u = await getUser(p.sub);
      if (!u) return err(res, 404, 'user_not_found', 'User not found');
      if (req.method === 'PUT') {
        const b = await readBody(req);
        if (b.password) {
          if (b.password.length < 8) return err(res, 422, 'weak_password', 'Password should be at least 8 characters.');
          u = (await sql`update auth.users set encrypted_password = ${hash(b.password)}, updated_at = now() where id = ${u.id} returning *`)[0];
        }
      }
      return send(res, 200, userJson(u));
    }

    if (path === '/logout' && req.method === 'POST') {
      const p = verifyJwt(bearer(req));
      if (!p) return send(res, 204);
      const scope = url.searchParams.get('scope') ?? 'global';
      for (const [rt, s] of sessions) {
        if (s.userId !== p.sub) continue;
        if (scope === 'global' || (scope === 'local' && s.sessionId === p.session_id) || (scope === 'others' && s.sessionId !== p.session_id)) sessions.delete(rt);
      }
      return send(res, 204);
    }

    if (path.startsWith('/admin/users')) {
      const p = verifyJwt(bearer(req));
      if (p?.role !== 'service_role') return err(res, 403, 'not_admin', 'User not allowed');
      const id = path.split('/')[3];
      if (req.method === 'POST' && !id) {
        const b = await readBody(req);
        const u = (await sql`insert into auth.users (email, encrypted_password, email_confirmed_at) values (${b.email.toLowerCase()}, ${b.password ? hash(b.password) : null}, ${b.email_confirm ? sql`now()` : null}) returning *`)[0];
        return send(res, 200, userJson(u));
      }
      if (req.method === 'DELETE' && id) {
        await sql`delete from auth.users where id = ${id}`;
        for (const [rt, s] of sessions) if (s.userId === id) sessions.delete(rt);
        return send(res, 200, {});
      }
      if (req.method === 'GET' && !id) {
        const users = await sql`select * from auth.users order by created_at limit ${Number(url.searchParams.get('per_page') ?? 50)}`;
        return send(res, 200, { users: users.map(userJson), aud: 'authenticated' });
      }
      if (req.method === 'GET' && id) {
        const u = await getUser(id);
        return u ? send(res, 200, userJson(u)) : err(res, 404, 'user_not_found', 'User not found');
      }
    }
    return err(res, 404, 'not_found', `rota ${req.method} ${path} não existe no simulador`);
  } catch (e) {
    console.error(e);
    return err(res, 500, 'unexpected_failure', e.message);
  }
}).listen(PORT, () => console.log(`simulador de auth em ${SITE}/auth/v1`));
