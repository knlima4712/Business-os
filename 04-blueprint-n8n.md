# Entrega 4 — Blueprint de Automação (n8n, com equivalentes no Make)

Três fluxos independentes. Crie cada um como um workflow separado.

**Credenciais necessárias no n8n:** Supabase (service_role), Anthropic (ou HTTP Header Auth), WhatsApp (Evolution API / Z-API / WhatsApp Cloud), SMTP ou Resend, gateway de pagamento.

---

## FLUXO A — Captação, classificação e roteamento

| # | Nó | Configuração |
|---|-----|--------------|
| 1 | **Webhook** `POST /lead-novo` | Recebe `{tenant_id, nome, email, telefone, empresa, cargo, instagram, origem, mensagem}`. Conecte ao formulário do site, anúncio e Instagram (via ManyChat ou Make). |
| 2 | **Supabase → Insert** em `leads` | `status_funil = novo`. Em caso de e-mail duplicado, use *Upsert* por `(tenant_id, email)`. |
| 3 | **HTTP Request** (enriquecimento, opcional) | Apollo ou Phantombuster com e-mail/@. Em erro, siga em frente (*Continue On Fail*). |
| 4 | **HTTP Request** → Edge Function `classificar-lead` | Body: `{lead_id, tenant_id}`. Devolve geração, persona, BANT, rota e mensagem. |
| 5 | **Switch** por `rota` | 3 saídas: quente, morno, frio. |

### Saída 1 — Quente (80 a 100)
- 6a. **Telegram/WhatsApp interno**: alerta ao dono com nome, score, geração e cargo.
- 6b. **Code**: monta o link de checkout com `?lead_id=...&utm_source=bant`.
- 6c. **Switch por canal** (`persona.canal_abordagem`): WhatsApp, Instagram ou e-mail.
- 6d. **Enviar mensagem** com `mensagem_sugerida` + link de checkout (ou link de agenda prioritária).
- 6e. **Supabase → Insert** em `interacoes_ia` (canal, mensagem_enviada).

### Saída 2 — Morna (50 a 79)
- 7a. **Code**: gera URL `https://seusite.com/oferta?g={geracao}&n={setor}&l={lead_id}`.
- 7b. **Enviar mensagem** no canal indicado com o link.
- 7c. **Registrar** em `interacoes_ia`.
- A página `/oferta` lê os parâmetros e troca headline e estudo de caso.

### Saída 3 — Fria (0 a 49)
- 8a. **Supabase → Update** `status_funil = frio`.
- 8b. **Execute Workflow** → Fluxo C (régua de nutrição).

---

## FLUXO B — Pós-venda: auto-provisionamento

| # | Nó | Configuração |
|---|-----|--------------|
| 1 | **Webhook** `POST /pagamento` | URL cadastrada no gateway (Kiwify: *Webhooks → compra aprovada*). |
| 2 | **IF** | `status` igual a `aprovado` (`paid` no Stripe, `approved` no Mercado Pago). Senão, encerra. |
| 3 | **Supabase → Select** `vendas` | Filtra por `gateway_id`. Se já existir, encerra (idempotência: webhooks repetem). |
| 4 | **HTTP Request** → `POST {SUPABASE_URL}/auth/v1/admin/users` | Header `apikey` e `Authorization: Bearer service_role`. Body: `{email, password: <gerada>, email_confirm: true}`. Retorna `id` do usuário. |
| 5 | **Code** | Gera senha forte: `Math.random().toString(36).slice(-10)+"A1!"`. Use antes do nó 4. |
| 6 | **HTTP Request** → `POST /rest/v1/rpc/provision_tenant` | Body: `{p_nome_empresa, p_auth_user_id, p_email, p_plano}`. Retorna `tenant_id`. Já clona agentes e funis. |
| 7 | **Supabase → Insert** `vendas` | `tenant_id, lead_id, valor, status_pagamento='aprovado', gateway_id, data_aprovacao=now()`. |
| 8 | **Supabase → Update** `leads` | `status_funil='cliente'` (pelo `lead_id` vindo do `utm`/metadata). |
| 9 | **Send Email** | Boas-vindas com link do painel, e-mail e senha provisória (peça troca no primeiro acesso). |
| 10 | **WhatsApp** | Mesma mensagem curta com o link do painel e o passo 1: conectar o WhatsApp. |
| 11 | **Telegram interno** | "Novo cliente: {empresa} · plano {plano} · R$ {valor}". |

**Falhas:** adicione um **Error Trigger** que avisa você e salva o payload numa tabela `fila_erros` para reprocessar.

---

## FLUXO C — Régua de nutrição (leads frios)

| # | Nó | Configuração |
|---|-----|--------------|
| 1 | **Schedule Trigger** | Todo dia às 09h. |
| 2 | **Supabase → Select** | `leads` com `status_funil='frio'` e sem contato nos últimos 2 dias. |
| 3 | **Loop Over Items** | Um lead por vez. |
| 4 | **HTTP Request** → agente `nutricao-email` | Gera uma micro-solução no tom da geração do lead. |
| 5 | **Enviar** por e-mail ou WhatsApp conforme canal. |
| 6 | **Supabase → Insert** `interacoes_ia`. |
| 7 | **IF** responder ou clicar | Se `resposta_lead` existir ou houver clique: reclassifica chamando a Edge Function de novo (Fluxo A, nó 4). Se o score subir para 50+, sai da régua. |

---

## Equivalência no Make.com
- Webhook → **Custom Webhook**
- Switch → **Router** com filtros nas rotas
- Supabase → módulo **HTTP** com os mesmos endpoints REST
- Loop → **Iterator**
- Use o Make para integrações rápidas de IA e captação do Instagram; deixe o provisionamento no n8n.

## Ordem de montagem (para testar cada parte)
1. Rode o SQL e faça deploy da Edge Function.
2. Fluxo A até o nó 5, mandando um lead de teste com `curl`.
3. Conecte as saídas quente, morna e fria.
4. Fluxo B com uma compra de teste do gateway (modo sandbox).
5. Fluxo C por último.

Teste rápido do Fluxo A:

```bash
curl -X POST https://SEU-N8N/webhook/lead-novo \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"UUID","nome":"Carla Mendes","email":"carla@clinica.com","telefone":"5511999999999","empresa":"Clínica Mendes","cargo":"Sócia-diretora","origem":"instagram"}'
```
