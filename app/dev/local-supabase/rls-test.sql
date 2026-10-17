-- Teste de isolamento no banco: um usuário sem agência e um usuário de OUTRA agência não enxergam nem alteram nada.
-- Rodar: psql "$DATABASE_URL" -f dev/local-supabase/rls-test.sql  (precisa de dados do seed)
\set ON_ERROR_STOP 1
create temp table result (who text, tbl text, visible int);
do $$
declare t text; n int; intruder uuid := gen_random_uuid(); acc text[] := '{}'; counts int[] := '{}';
begin
  -- usuário que não pertence a agência nenhuma
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('schema_migrations','rate_limits') loop
    execute format('select count(*) from %I', t) into n;
    acc := acc || t; counts := counts || n;
  end loop;
  reset role;
  for i in 1 .. coalesce(array_length(acc, 1), 0) loop insert into result values ('intruso', acc[i], counts[i]); end loop;
end $$;
select case when sum(visible) = 0 then 'OK: intruso vê 0 linhas em ' || count(*) || ' tabelas' else 'FALHA: ' || string_agg(tbl || '=' || visible, ', ') end from result where who = 'intruso';

-- intruso tenta escrever num workspace que não é dele
do $$
declare ws uuid; intruder uuid := gen_random_uuid(); ok boolean := false;
begin
  select id into ws from workspaces limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into icps (workspace_id, name) values (ws, 'invasão');
  exception when insufficient_privilege then ok := true;
  end;
  update brand_kits set headline = 'invadido' where workspace_id = ws;  -- RLS: 0 linhas afetadas
  update orgs set monthly_cost_cap_cents = 999999999;                   -- RLS: 0 linhas afetadas
  reset role;
  raise notice '%', case when ok then 'OK: insert do intruso recusado pelo RLS' else 'FALHA: insert passou' end;
end $$;
select case when count(*) = 0 then 'OK: update do intruso não alterou nada' else 'FALHA' end from brand_kits where headline = 'invadido';
select case when max(monthly_cost_cap_cents) < 999999999 then 'OK: teto de custo intacto' else 'FALHA' end from orgs;

-- membro comum não muda o teto de custo (só dono)
do $$
declare o uuid; u uuid;
begin
  select org_id into o from org_members limit 1;
  insert into auth.users (email) values ('membro-teste@exemplo.com') returning id into u;
  insert into org_members (org_id, user_id, role) values (o, u, 'member');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update orgs set monthly_cost_cap_cents = 1 where id = o;
  reset role;
  raise notice '%', case when (select monthly_cost_cap_cents from orgs where id = o) <> 1 then 'OK: membro não altera o teto' else 'FALHA: membro alterou o teto' end;
  delete from auth.users where id = u;
end $$;

-- anon (chave pública) não lê nada
do $$ begin
  set local role anon;
  begin perform 1 from workspaces limit 1; raise notice 'FALHA: anon leu workspaces';
  exception when insufficient_privilege then raise notice 'OK: anon sem acesso às tabelas'; end;
  reset role;
end $$;
