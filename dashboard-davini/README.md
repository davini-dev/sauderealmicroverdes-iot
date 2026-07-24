# Atendimentos — Clínica Davini

Painel interno pra Michele acompanhar os atendimentos classificados automaticamente
pelo bot do WhatsApp (Lia), com filtros, indicadores e um espaço pra anotações por
atendimento.

Lê direto das tabelas `atendimentos_clinica_davini` e `atendimentos_comentarios` no
mesmo Postgres que o n8n já usa pro RAG. Não depende do n8n em runtime — conecta
direto no banco.

## Stack

- Next.js 16 (App Router) + Bun
- TypeScript + Tailwind v4
- `pg` (conexão direta ao Postgres, sem ORM)
- Login fixo (usuário/senha via variável de ambiente), sessão em cookie assinado (HMAC)
- Atualização automática a cada 30s via SWR (polling simples — ver observação abaixo)

## Rodando localmente

```bash
bun install
cp .env.example .env.local   # preencha DATABASE_URL, AUTH_USER, AUTH_PASSWORD, SESSION_SECRET
bun run dev
```

Abre em `http://localhost:3000`. Se `DATABASE_URL` apontar pro mesmo Postgres de
produção, você já vê os dados reais — não precisa de banco separado pra testar.

## Variáveis de ambiente

Ver `.env.example`. Resumo:

| Variável | O que é |
|---|---|
| `DATABASE_URL` | connection string do Postgres onde estão as tabelas |
| `AUTH_USER` / `AUTH_PASSWORD` | login fixo do painel |
| `SESSION_SECRET` | segredo pra assinar o cookie de sessão — gere com `openssl rand -base64 32` |
| `N8N_DASHBOARD_WEBHOOK_URL` | URL do webhook "Dashboard - Enviar Mensagem" no n8n |
| `N8N_DASHBOARD_WEBHOOK_SECRET` | segredo que o webhook exige no header `x-dashboard-secret` (já vem preenchido no `docker-compose.example.yml`, igual ao que está no node "Validar Secret" do workflow) |

## Funcionalidades

- **Clique nos "Urgentes"** do alerta já filtra a tabela por urgência
- **Histórico / Chat**: aba Histórico mostra o resumo da conversa; aba Chat mostra a
  troca de mensagens (bot + Michele) e permite responder o paciente direto pelo
  WhatsApp — sem precisar digitar `#humano`, o próprio envio já ativa o modo humano
  por 2h no Redis
- **Confirmar Consulta**: filtro dedicado + checkbox "ProntMed" (aparece quando a
  consulta está confirmada) pra Michele marcar se já lançou no ProntMed
- **Atendimentos por dia**: número exibido em cima de cada barra
- **Finalizado/Não finalizado**: combobox por atendimento — quando finalizado, a
  linha aparece riscada na tabela

## Deploy no seu Hetzner (Docker/Portainer)

O jeito mais simples é adicionar como mais um serviço na stack que você já tem
rodando (a mesma onde estão n8n e Postgres), pra reusar a rede Docker interna e
não precisar expor o banco pra fora.

1. **Suba os arquivos do projeto pro VPS** (git, scp, ou upload direto no Portainer).

2. **Confirme o nome do serviço/rede do Postgres na sua stack atual** — você vai
   usar esse nome como host no `DATABASE_URL` (ex: se o serviço se chama `postgres`
   no docker-compose, o host é `postgres`, não `localhost`).

3. **Adicione o serviço** — `docker-compose.example.yml` já vem preenchido com o
   container (`postgres`) e a rede (`stack_stack`) da sua stack atual. Só falta
   trocar `usuario`, `senha` e `nome_do_banco` pelos valores reais do seu Postgres,
   e `AUTH_PASSWORD`/`SESSION_SECRET` por valores seus.

4. **Build e sobe:**
   ```bash
   docker compose up -d --build davini-dashboard
   ```

5. **Exponha via Cloudflare Tunnel**, igual você já faz com o n8n e o OpenClaw —
   adiciona um novo "Public Hostname" no `cloudflared` apontando pro serviço
   (ex: `atendimentos.sauderealmicroverdes.club` → `http://davini-dashboard:3000`).
   Não precisa abrir porta nenhuma no firewall.

6. Acessa pela URL, loga com o `AUTH_USER`/`AUTH_PASSWORD` que você definiu, passa
   pra Michele.

### Dockerfile

Já vem pronto (multi-stage, usa `oven/bun:1` pra build e `oven/bun:1-slim` pra
rodar, output `standalone` do Next.js — imagem final enxuta, sem `node_modules`
solto). Não precisa mexer, só rodar `docker compose up -d --build`.

## Sobre o "tempo real"

O painel usa polling (busca de novo a cada 30s) em vez de WebSocket. Pra um
dashboard de uma pessoa só olhando de vez em quando, é a opção mais simples de
manter e o custo é irrelevante nesse volume de dados. Dá pra trocar por algo
mais instantâneo depois se fizer falta, mas não é o ponto que mais vale esforço
agora.

## Estrutura

```
src/
  app/
    page.tsx                          # dashboard (protegido)
    login/page.tsx                    # tela de login
    api/
      atendimentos/route.ts           # listagem + filtros + paginação
      atendimentos/stats/route.ts     # agregados, alerta, comparativo
      atendimentos/[id]/comentarios/  # GET/POST anotações da Michele
      auth/login|logout/route.ts
  components/                         # TopBar, AlertStrip, StatCards, tabela, etc.
  lib/
    db.ts                             # pool do pg
    auth.ts                           # sessão via HMAC (Web Crypto)
    labels.ts                         # tradução dos enums pro português + formatação
    types.ts
  proxy.ts                            # (era middleware.ts — Next.js 16 renomeou)
```

## O que fica pra depois (se quiser evoluir)

- Multi-usuário de verdade (hoje é um login fixo só — combinado com você)
- Exportar CSV/Excel do que está filtrado
- Gráfico de tendência maior que os 7-30 dias do cabeçalho
