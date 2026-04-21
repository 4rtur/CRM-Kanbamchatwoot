# CRM Kanban — Camada de Banco (Drizzle + Postgres)

Camada de persistência multi-tenant. Substitui o `localStorage`.

## Arquitetura

- **Postgres**: reusa a instância do Chatwoot (porta 54329), em database separado `crm_kanban`
- **ORM**: Drizzle (`drizzle-orm`)
- **Driver**: `postgres` (node-postgres-js)
- **Migrations**: `drizzle-kit` gera, `src/lib/db/migrate.ts` aplica

## Separação de responsabilidades

| Dado | Onde fica |
|---|---|
| Contatos, conversas, mensagens, agentes, labels | **Chatwoot** (fetch via proxy API, não persistir) |
| `crm_pipeline`, `crm_stage` por contato | **Chatwoot `custom_attributes`** (source of truth + visível fora do CRM) |
| Pipelines, stages, custom fields, products, deals, checklists, notes, automations | **Postgres** (`crm_kanban`) |

## Tabelas

- `tenants` — 1 por cliente SaaS
- `pipelines` + `stages` — funil customizável por tenant
- `custom_field_definitions` + `custom_field_values` — campos customizáveis por tenant
- `deals` — negócio por contato (permite rebuy)
- `products` + `deal_products` — catálogo e relação
- `checklist_items` — tarefas por deal
- `notes` — timeline
- `automation_rules` — if/then por pipeline
- `pipeline_access` — visibilidade por usuário Chatwoot

Todo registro carrega `tenant_id` com FK em cascade.

## Setup no VPS (primeira vez)

### 1. Criar database e usuário no Postgres do Chatwoot

```bash
# Descobre o container do Postgres do Chatwoot
docker ps --filter "ancestor=pgvector/pgvector:pg16"

# Entra no psql (troca <container> pelo nome real)
docker exec -it <container> psql -U postgres

# Dentro do psql:
CREATE DATABASE crm_kanban;
CREATE USER crm_kanban_user WITH PASSWORD 'TROCAR_POR_SENHA_FORTE';
GRANT ALL PRIVILEGES ON DATABASE crm_kanban TO crm_kanban_user;
\c crm_kanban
GRANT ALL ON SCHEMA public TO crm_kanban_user;
\q
```

### 2. Configurar `.env` do CRM no VPS

```bash
cd ~/chatwoot-crm
cp .env.example .env
# Edita .env:
#   DATABASE_URL=postgres://crm_kanban_user:SENHA@localhost:54329/crm_kanban
#   CHATWOOT_API_TOKEN=<token real>
```

**IMPORTANTE**: Se o CRM roda em container Docker na mesma rede do Chatwoot (`chatwoot_default`), o host em `DATABASE_URL` é o nome do container Postgres (provavelmente `chatwoot-postgres-1` ou similar), na porta interna 5432 — não `localhost:54329`.

Confere com:
```bash
docker network inspect chatwoot_default
```

### 3. Instalar deps, gerar e aplicar migrations

```bash
npm install
npm run db:generate    # gera SQL em src/lib/db/migrations/
npm run db:migrate     # aplica no Postgres
npm run db:seed        # cria tenant "cirurgiao" com 8 stages + 5 custom fields
```

### 4. Validar

```bash
npm run db:studio      # abre GUI em http://localhost:4983
```

## Setup local (Mac, desenvolvimento)

Opção A — conectar no Postgres do VPS via túnel SSH:
```bash
ssh -L 54329:localhost:54329 artur@187.77.62.184
# deixa rodando em outro terminal, e no .env local:
# DATABASE_URL=postgres://crm_kanban_user:SENHA@localhost:54329/crm_kanban
```

Opção B — subir um Postgres local temporário:
```bash
docker run --name crm-pg-dev -p 5432:5432 -e POSTGRES_PASSWORD=dev -d postgres:16
# .env:
# DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres
```

## Migrations — workflow

Sempre que mudar schema em `src/lib/db/schema/*.ts`:

```bash
npm run db:generate    # gera arquivo SQL novo
# revisa o SQL em src/lib/db/migrations/
npm run db:migrate     # aplica
```

**Não editar SQL gerado manualmente** a menos que saiba o que está fazendo.

## Custom attributes no Chatwoot (setup manual, 1 vez)

Antes do CRM sincronizar stages com o Chatwoot, cria os 2 custom attributes no Chatwoot:

Chatwoot → Settings → Custom Attributes → Add:

| Display Name | Key | Type | Scope |
|---|---|---|---|
| CRM Pipeline | `crm_pipeline` | Text | Contact |
| CRM Stage | `crm_stage` | Text | Contact |

Esses 2 ficam no Chatwoot (não no Postgres) porque outros sistemas (Elias, Moises) precisam ler. Todo o resto dos campos custom fica no Postgres em `custom_field_values`.
