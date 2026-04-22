#!/usr/bin/env bash
# ==========================================================
# CRM Kanban — Uninstaller
# Remove containers, imagens e (opcional) database + .env.
# Preserva o repositório para reinstalação.
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

confirm() {
  local prompt_text="$1"
  local reply
  read -r -p "$prompt_text (s/N): " reply || true
  [[ "$reply" =~ ^[sSyY]$ ]]
}

section "Parando containers"
docker compose down --remove-orphans 2>/dev/null || true
docker rm -f chatwoot-crm chatwoot-crm-migrate chatwoot-crm-seed 2>/dev/null || true
ok "Containers removidos"

section "Removendo imagens"
if confirm "Remover imagens Docker (chatwoot-crm:latest, chatwoot-crm-migrate:latest)?"; then
  docker rmi -f chatwoot-crm:latest chatwoot-crm-migrate:latest 2>/dev/null || true
  ok "Imagens removidas"
else
  warn "Imagens mantidas"
fi

section "Database"
if [ -f .env ] && confirm "Remover o database chatwoot_crm do Postgres? ${RED}ISSO APAGA TODOS OS DADOS DO CRM.${NC}"; then
  # shellcheck disable=SC1091
  . ./.env || true
  POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-chatwoot-postgres-1}"
  DB_NAME="$(echo "${DATABASE_URL:-}" | sed -E 's|.*/([^?]+).*|\1|')"
  DB_USER="$(echo "${DATABASE_URL:-}" | sed -E 's|^postgresql://([^:]+):.*|\1|')"
  DB_PASS="$(echo "${DATABASE_URL:-}" | sed -E 's|^postgresql://[^:]+:([^@]+)@.*|\1|')"

  if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
    docker exec -e PGPASSWORD="$DB_PASS" "$POSTGRES_CONTAINER" \
      dropdb -U "$DB_USER" --if-exists "$DB_NAME" || warn "Falha ao dropar DB — talvez já não exista"
    ok "Database '$DB_NAME' removido"
  else
    warn "Não consegui parsear DATABASE_URL — remova o database manualmente."
  fi
else
  warn "Database mantido"
fi

section "Arquivo .env"
if [ -f .env ] && confirm "Remover .env?"; then
  rm -f .env
  ok ".env removido"
else
  warn ".env mantido"
fi

section "Concluído"
ok "Uninstall finalizado. Repositório preservado — rode ./install.sh para reinstalar."
