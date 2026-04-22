#!/usr/bin/env bash
# ==========================================================
# CRM Kanban — Updater
# Puxa última versão, rebuilda, roda migrations e reinicia.
# ==========================================================

set -euo pipefail

if [ -t 1 ]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi
log()     { printf '%s[INFO]%s %s\n'  "$BLUE"   "$NC" "$*"; }
ok()      { printf '%s[OK]%s %s\n'    "$GREEN"  "$NC" "$*"; }
warn()    { printf '%s[AVISO]%s %s\n' "$YELLOW" "$NC" "$*"; }
err()     { printf '%s[ERRO]%s %s\n'  "$RED"    "$NC" "$*" >&2; }
section() { printf '\n%s== %s ==%s\n' "$BOLD"   "$*" "$NC"; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  err ".env não encontrado. Rode ./install.sh primeiro."
  exit 1
fi

section "Git pull"
if [ -d .git ]; then
  git pull --ff-only
  ok "Repositório atualizado"
else
  warn "Não é um repo git — pulando git pull"
fi

section "Rebuild"
docker compose build
ok "Build concluído"

section "Migrations"
docker rm -f chatwoot-crm-migrate >/dev/null 2>&1 || true
docker compose run --rm migrate
ok "Migrations aplicadas"

section "Restart CRM"
docker compose up -d crm
ok "CRM reiniciado"

section "Healthcheck"
# shellcheck disable=SC1091
. ./.env
PORT="${CRM_PORT:-3005}"
HEALTH_OK=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 2
done

if [ "$HEALTH_OK" -eq 1 ]; then
  ok "CRM respondendo em http://127.0.0.1:${PORT}"
else
  warn "CRM não respondeu em 60s. Veja: docker compose logs -f crm"
fi
