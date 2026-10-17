// Gera as chaves anon e service_role locais, assinadas com o JWT_SECRET do simulador (só teste).
import { createHmac } from 'node:crypto';
const SECRET = process.env.JWT_SECRET ?? 'segredo-local-de-teste-com-pelo-menos-32-caracteres';
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (p) => { const h = b64u({ alg: 'HS256', typ: 'JWT' }); const b = b64u(p); return `${h}.${b}.${createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url')}`; };
const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${sign({ role: 'anon', iss: 'local', exp })}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${sign({ role: 'service_role', iss: 'local', exp })}`);
