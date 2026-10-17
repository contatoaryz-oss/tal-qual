#!/bin/bash
# SÓ PARA TESTE LOCAL: Postgres 16 (porta 54322) + shim do Supabase + migrações + simulador de auth (54321).
# Uso: dev/local-supabase/up.sh [--reset]
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; APP="$(cd "$HERE/../.." && pwd)"
PG=/usr/lib/postgresql/16/bin; DATA=/var/tmp/pglocal
if [ "$1" = "--reset" ]; then
  su postgres -c "$PG/pg_ctl -D $DATA/data stop" >/dev/null 2>&1 || true
  rm -rf $DATA; [ -f "$HERE/auth.pid" ] && kill "$(cat "$HERE/auth.pid")" 2>/dev/null || true; rm -f "$HERE/auth.pid" "$HERE/mailbox.jsonl"
fi
if [ ! -d $DATA/data ]; then
  mkdir -p $DATA && chown postgres $DATA
  su postgres -c "$PG/initdb -D $DATA/data -A trust >/dev/null"
fi
su postgres -c "$PG/pg_ctl -D $DATA/data -o '-k $DATA -p 54322 -c listen_addresses=localhost' -l $DATA/log status" >/dev/null 2>&1 \
  || su postgres -c "$PG/pg_ctl -D $DATA/data -o '-k $DATA -p 54322 -c listen_addresses=localhost' -l $DATA/log start" >/dev/null
sleep 1
psql -h localhost -p 54322 -U postgres -tc "select 1 from pg_database where datname='app'" | grep -q 1 || psql -h localhost -p 54322 -U postgres -qc "create database app"
export DATABASE_URL=postgres://postgres@localhost:54322/app
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$HERE/shim.sql"
(cd "$APP" && DIRECT_URL=$DATABASE_URL node scripts/migrate.mjs)
if [ -f "$HERE/auth.pid" ] && kill -0 "$(cat "$HERE/auth.pid")" 2>/dev/null; then echo "simulador de auth já está rodando"; else
  (cd "$APP" && DATABASE_URL=$DATABASE_URL nohup node "$HERE/auth-emulator.mjs" > "$HERE/auth.log" 2>&1 & echo $! > "$HERE/auth.pid")
  sleep 1; curl -s localhost:54321/auth/v1/health; echo
fi
