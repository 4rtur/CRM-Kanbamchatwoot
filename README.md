# CRM Kanban + Chatwoot

CRM Kanban integrado ao Chatwoot — "single pane of glass" para agentes.

## Deploy em Nova VPS (1 comando)

### Pré-requisitos
- VPS Ubuntu 22+ com Docker e Docker Compose plugin instalados
- Chatwoot já rodando (container `chatwoot-postgres-1` ativo, rede `chatwoot_default`)
- Token API do Chatwoot + account ID em mãos
- 2GB RAM livres

### Instalação
```bash
git clone https://github.com/4rtur/CRM-Kanbamchatwoot.git
cd CRM-Kanbamchatwoot
chmod +x install.sh update.sh uninstall.sh
./install.sh
```

O script faz tudo:
1. Valida pré-requisitos (Docker, Chatwoot rodando, rede `chatwoot_default`)
2. Pergunta URL do Chatwoot, token API, account ID, porta local (default 3005)
3. Detecta senha do Postgres do container `chatwoot-postgres-1` automaticamente
4. Gera `AUTH_SECRET` (`openssl rand -hex 32`)
5. Cria o database `chatwoot_crm` no Postgres do Chatwoot
6. Roda migrations + seed inicial (tenant default, pipeline Vendas com 8 stages, custom fields padrão)
7. Builda e sobe o container
8. Verifica saúde via `curl`

Depois é só apontar um Cloudflare Tunnel para `http://localhost:3005` e configurar o Dashboard App no Chatwoot com `https://crm.seudominio.com.br/embed`.

### Modo não-interativo (CI/automação)
```bash
CHATWOOT_URL=https://chat.exemplo.com \
CHATWOOT_API_TOKEN=xxxxx \
CHATWOOT_ACCOUNT_ID=1 \
CRM_PORT=3005 \
./install.sh --non-interactive
```

### Atualizar
```bash
./update.sh   # git pull + rebuild + migrate + restart
```

### Remover
```bash
./uninstall.sh   # remove containers; pergunta antes de remover DB e .env
```

### Arquivos de deploy
- `install.sh` — instalador idempotente (re-rodável)
- `update.sh` — puxa última versão e migra
- `uninstall.sh` — remove tudo (com confirmação para dados)
- `docker-compose.yml` — serviços `crm`, `migrate`, `seed`
- `Dockerfile` — imagem de produção (Next standalone)
- `Dockerfile.migrate` — imagem auxiliar para rodar migrations/seed com `tsx`
- `.env.example` — template comentado


## Rotas

| Rota | Uso |
|------|-----|
| `/` | Board Kanban completo (multi-pipeline, filtros, relatórios) |
| `/embed` | **Visão focada no contato da conversação atual** — destinada ao Dashboard App do Chatwoot, renderiza só o card do contato da conversação aberta |
| `/settings` | Configuração do Chatwoot (URL, API key, account ID) |
| `/produtos` | Catálogo de produtos |
| `/relatorios` | Relatórios do pipeline |

## Configuração do Dashboard App (Chatwoot)

Em **Chatwoot → Settings → Integrations → Dashboard Apps**, crie um app e configure a URL:

```
https://kanban.cirurgiaoitech.tech/embed
```

> Importante: use `/embed`, **não** a raiz `/`. A raiz carrega o board completo (útil quando aberto em nova aba), enquanto `/embed` renderiza apenas o card do contato da conversação, em layout compacto (~380px) adequado ao sidebar.

O `/embed` ouve automaticamente os eventos `postMessage` do Chatwoot para detectar o contato e a conversação em contexto, e também aceita `?contact_id=X` / `?conversation_id=Y` como fallback.

## Integração de navegação — "single pane of glass"

### Comportamento dos cards

- **Clique no card** (nome/avatar/corpo): abre a conversação no Chatwoot.
  - Embutido: navega o iframe pai (via `window.parent.location` ou `postMessage`).
  - Standalone: abre em nova aba.
  - Fallback sem `conversation_id`: abre a página do contato.
- **Ícone de info (i)** no topo do card: abre o painel lateral de edição (stage, labels, checklist, notas, produtos).
- **Ícone de conversação azul** (`#1F93FF`): indicador visual de que o card é clicável para abrir o Chatwoot.

### Atalho de teclado

- **Ctrl/Cmd+K**: abre no Chatwoot o card com foco (ou o primeiro da lista filtrada).
  - Funciona em qualquer rota do app.
  - Ignorado em inputs/textareas.

### Banner de contexto embutido

Se o app for carregado dentro do Chatwoot mas na URL raiz (em vez de `/embed`), um banner aparece sugerindo configurar o Dashboard App para `/embed`.

## Desenvolvimento

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção
npm run lint     # lint
```

## Arquivos de referência

- `src/lib/dashboard-app.ts` — helpers `isEmbedded()` e `listenToDashboardEvents()`
- `src/components/kanban/card.tsx` — card com split click (conversação vs. detalhes)
- `src/components/kanban/card-detail-sheet.tsx` — painel de edição
- `src/app/embed/page.tsx` — rota compacta para sidebar do Chatwoot
- `src/app/page.tsx` — board completo + banner + atalho global
