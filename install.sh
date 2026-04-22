#!/usr/bin/env bash
# ==========================================================
# CRM Kanban — Instalador One-Command
# ==========================================================
# Uso:
#   ./install.sh                 # modo interativo
#   ./install.sh --non-interactive   # usa variáveis de ambiente
#
# Requisitos:
#   - Docker + Docker Compose plugin
#   - Chatwoot rodando (container `chatwoot-postgres-1`)
#   - Rede docker `chatwoot_default` existente
# ==========================================================

set -euo pipefail

# ---------- cores ----------
if [ -t 1 ]; then
  RED=$'\033[0;31m'
  GREEN=$'\033[0;32m'
  YELLOW=$'\033[1;33m'
  BLUE=$'\033[0;34m'
  BOLD=$'\033[1m'
  NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi

log()     { printf '%s[INFO]%s %s\n'  "$BLUE"   "$NC" "$*"; }
ok()      { printf '%s[OK]%s %s\n'    "$GREEN"  "$NC" "$*"; }
warn()    { printf '%s[AVISO]%s %s\n' "$YELLOW" "$NC" "$*"; }
err()     { printf '%s[ERRO]%s %s\n'  "$RED"    "$NC" "$*" >&2; }
section() { printf '\n%s== %s ==%s\n' "$BOLD"   "$*" "$NC"; }

# ---------- parâmetros ----------
INTERACTIVE=1
for arg in "$@"; do
  case "$arg" in
    --non-interactive|-y) INTERACTIVE=0 ;;
    --help|-h)
      cat <<EOF
Uso: ./install.sh [--non-interactive]

Variáveis de ambiente aceitas (modo não-interativo):
  CHATWOOT_URL           URL pública do Chatwoot
  CHATWOOT_API_TOKEN     Token da API do Chatwoot
  CHATWOOT_ACCOUNT_ID    ID da conta (default: 1)
  CRM_PORT               Porta local (default: 3005)
  POSTGRES_CONTAINER     Container do Postgres (default: chatwoot-postgres-1)
  POSTGRES_USER          Usuário do Postgres (default: postgres)
  POSTGRES_DB_CRM        Nome do database do CRM (default: chatwoot_crm)
EOF
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

# ---------- 1. pré-requisitos ----------
section "Verificando pré-requisitos"

if ! command -v docker >/dev/null 2>&1; then
  err "Docker não encontrado. Instale: https://docs.docker.com/engine/install/"
  exit 1
fi
ok "Docker instalado"

if ! docker compose version >/dev/null 2>&1; then
  err "Docker Compose plugin não encontrado. Instale: https://docs.docker.com/compose/install/"
  exit 1
fi
ok "Docker Compose instalado"

if ! docker info >/dev/null 2>&1; then
  err "Docker não está rodando ou usuário sem permissão. Rode: sudo usermod -aG docker \$USER"
  exit 1
fi
ok "Docker rodando"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-chatwoot-postgres-1}"
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  err "Container '${POSTGRES_CONTAINER}' não encontrado. O Chatwoot precisa estar rodando."
  err "Containers ativos:"
  docker ps --format '  - {{.Names}}' >&2
  exit 1
fi
ok "Chatwoot Postgres encontrado (${POSTGRES_CONTAINER})"

if ! docker network inspect chatwoot_default >/dev/null 2>&1; then
  err "Rede docker 'chatwoot_default' não existe. Suba o Chatwoot antes de instalar o CRM."
  exit 1
fi
ok "Rede chatwoot_default existe"

# ---------- 2. coleta de dados ----------
section "Configuração"

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB_CRM="${POSTGRES_DB_CRM:-chatwoot_crm}"

# Se existe .env, lê valores existentes como default.
if [ -f .env ]; then
  warn "Arquivo .env existente detectado — usando valores atuais como default."
  set -a
  # shellcheck disable=SC1091
  . ./.env || true
  set +a
fi

prompt() {
  local var_name="$1"
  local label="$2"
  local default="${3:-}"
  local current="${!var_name:-}"
  local value=""

  if [ "$INTERACTIVE" -eq 0 ]; then
    value="${current:-$default}"
    if [ -z "$value" ]; then
      err "Variável $var_name obrigatória em modo não-interativo."
      exit 1
    fi
    printf -v "$var_name" '%s' "$value"
    return
  fi

  local shown_default="${current:-$default}"
  if [ -n "$shown_default" ]; then
    read -r -p "$label [$shown_default]: " value || true
    value="${value:-$shown_default}"
  else
    while [ -z "$value" ]; do
      read -r -p "$label: " value || true
    done
  fi
  printf -v "$var_name" '%s' "$value"
}

prompt CHATWOOT_URL          "URL do Chatwoot (ex: https://chat.seudominio.com.br)"  ""
prompt CHATWOOT_API_TOKEN    "Token API do Chatwoot"                                 ""
prompt CHATWOOT_ACCOUNT_ID   "ID da conta no Chatwoot"                               "1"
prompt CRM_PORT              "Porta local para o CRM"                                "3005"
prompt POSTGRES_USER         "Usuário Postgres do Chatwoot"                          "$POSTGRES_USER"
prompt POSTGRES_DB_CRM       "Nome do database do CRM"                               "$POSTGRES_DB_CRM"

# ---------- 3. descobre senha do postgres ----------
section "Detectando credenciais do Postgres"

POSTGRES_PASSWORD="$(docker exec "$POSTGRES_CONTAINER" /bin/sh -c 'echo -n "$POSTGRES_PASSWORD"' 2>/dev/null || true)"
if [ -z "$POSTGRES_PASSWORD" ]; then
  warn "Não foi possível ler POSTGRES_PASSWORD do container automaticamente."
  if [ "$INTERACTIVE" -eq 1 ]; then
    read -r -s -p "Digite a senha do Postgres: " POSTGRES_PASSWORD; echo
  else
    err "Defina POSTGRES_PASSWORD no ambiente em modo não-interativo."
    exit 1
  fi
fi
ok "Senha do Postgres obtida"

# ---------- 4. AUTH_SECRET ----------
section "Gerando AUTH_SECRET"

if [ -n "${AUTH_SECRET:-}" ]; then
  ok "AUTH_SECRET já existe no .env — mantendo."
else
  AUTH_SECRET="$(openssl rand -hex 32)"
  ok "AUTH_SECRET gerado"
fi

# URL de conexão usa o hostname interno da rede docker.
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_CONTAINER}:5432/${POSTGRES_DB_CRM}"

# ---------- 5. cria database ----------
section "Criando database '${POSTGRES_DB_CRM}' (se não existir)"

DB_EXISTS="$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
  psql -U "$POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB_CRM}'" 2>/dev/null || true)"

if [ "$DB_EXISTS" = "1" ]; then
  ok "Database '${POSTGRES_DB_CRM}' já existe"
else
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" \
    createdb -U "$POSTGRES_USER" "$POSTGRES_DB_CRM"
  ok "Database '${POSTGRES_DB_CRM}' criado"
fi

# ---------- 6. escreve .env ----------
section "Gerando .env"

umask 077
cat > .env <<EOF
# Gerado por install.sh em $(date -u +"%Y-%m-%dT%H:%M:%SZ")
NODE_ENV=production

# Banco (Postgres compartilhado do Chatwoot)
DATABASE_URL=${DATABASE_URL}

# Chatwoot
CHATWOOT_URL=${CHATWOOT_URL}
CHATWOOT_API_TOKEN=${CHATWOOT_API_TOKEN}
CHATWOOT_ACCOUNT_ID=${CHATWOOT_ACCOUNT_ID}

# Auth
AUTH_SECRET=${AUTH_SECRET}

# Tenant
DEFAULT_TENANT_ID=${DEFAULT_TENANT_ID:-default}

# Feature flags
USE_DATABASE=true

# Infra
CRM_PORT=${CRM_PORT}
EOF
chmod 600 .env
ok ".env criado (permissões 600)"

# ---------- 7. build ----------
section "Buildando imagens Docker (pode demorar alguns minutos)"
docker compose build
ok "Build concluído"

# ---------- 8. migrations ----------
section "Rodando migrations"
# Remove container antigo caso exista (run --rm garante limpeza, mas por segurança)
docker rm -f chatwoot-crm-migrate >/dev/null 2>&1 || true
docker compose run --rm migrate
ok "Migrations aplicadas"

# ---------- 9. seed ----------
section "Rodando seed inicial"
docker rm -f chatwoot-crm-seed >/dev/null 2>&1 || true
docker compose --profile seed run --rm seed || warn "Seed retornou não-zero — pode ser idempotência, verifique logs."
ok "Seed concluído"

# ---------- 10. sobe CRM ----------
section "Subindo CRM"
docker rm -f chatwoot-crm >/dev/null 2>&1 || true
docker compose up -d crm
ok "Container iniciado"

# ---------- 11. healthcheck ----------
section "Verificando saúde do container"

HEALTH_OK=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${CRM_PORT}/" 2>/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 2
done

if [ "$HEALTH_OK" -eq 1 ]; then
  ok "CRM respondendo em http://127.0.0.1:${CRM_PORT}"
else
  warn "CRM não respondeu em 60s. Veja logs: docker compose logs -f crm"
fi

# ---------- 12. sumário ----------
section "Instalação concluída"

cat <<EOF

${GREEN}${BOLD}CRM Kanban instalado com sucesso!${NC}

${BOLD}Acesso local:${NC} http://127.0.0.1:${CRM_PORT}

${BOLD}Próximos passos:${NC}
  1. Configure Cloudflare Tunnel apontando para a porta ${CRM_PORT}:
       cloudflared tunnel route dns <tunnel-name> crm.seudominio.com.br
       (service: http://localhost:${CRM_PORT})

  2. No Chatwoot, crie um Dashboard App:
       Settings → Integrations → Dashboard Apps
       URL: https://crm.seudominio.com.br/embed

  3. Comandos úteis:
       docker compose logs -f crm        # logs em tempo real
       docker compose restart crm        # reiniciar
       ./update.sh                        # atualizar para última versão
       ./uninstall.sh                     # remover tudo

EOF
