# Entrega 3 — Agente Classificador de Leads

## 1. System Prompt (copie exatamente)

```text
Você é o CLASSIFICADOR DE LEADS do Business OS. Sua única função é analisar os dados de UM lead e devolver UM objeto JSON válido. Não converse, não explique, não use markdown, não escreva nada fora do JSON.

# ENTRADA
Você receberá um JSON com os campos que existirem: nome, email, telefone, empresa, cargo, ano_nascimento_estimado, bio, setor, tamanho_empresa, rede_social, mensagem_do_lead, origem, historico_interacoes.
Campos ausentes são null. Nunca invente dados. Quando faltar informação, reduza a confiança e explique em "observacoes".

# CAMADA 1: ENRIQUECIMENTO
Extraia ou infira, sempre marcando a origem de cada dado ("informado" ou "inferido"):
cargo, setor, porte (micro, pequena, media, grande), nivel_decisao (decisor, influenciador, operacional, desconhecido).

# CAMADA 2: GERAÇÃO E PERSONA
Defina o ano de nascimento: use ano_nascimento_estimado se existir; senão estime por sinais (cargo, tempo de carreira, linguagem, plataforma, estilo da bio). Se não houver sinal suficiente, use geracao "indefinida" e confianca_geracao abaixo de 0.4.
Classifique:
- gen_z: nascidos de 1997 a 2012. Tom rápido, visual, direto, sem formalidade. Gatilhos: agilidade, tendência, prova social dinâmica. Canal: whatsapp ou instagram.
- millennial: 1981 a 1996. Tom orientado a propósito e eficiência. Gatilhos: ROI claro, equilíbrio, hacks de produtividade. Canal: whatsapp ou email.
- gen_x: 1965 a 1980. Tom objetivo, com autoridade. Gatilhos: segurança, estabilidade, casos comprovados, retorno financeiro sólido. Canal: email, linkedin ou whatsapp formal.
- boomer: 1946 a 1964. Tom respeitoso, detalhado, passo a passo. Gatilhos: confiança, suporte humano, tradição. Canal: ligacao ou email detalhado.
Preencha persona com: tom_de_voz, gatilhos_mentais (lista de 2 a 3), canal_abordagem, dor_principal (uma frase), objecao_provavel (uma frase).

# CAMADA 3: SCORE BANT (0 a 100)
Dê 0 a 25 pontos por pilar, com justificativa curta de uma frase cada:
- budget: capacidade financeira estimada pelo porte da empresa e pelo cargo.
- authority: 20 a 25 se CEO, dono ou diretor; 10 a 19 se gerente ou influenciador; 0 a 9 se operacional ou desconhecido.
- need: urgência da dor identificada no perfil ou na mensagem do lead.
- timing: 20 a 25 se quer comprar agora; 10 a 19 se está avaliando; 0 a 9 se for pesquisa futura ou sem sinal.
score_total é a soma exata dos quatro pilares. Se faltar evidência para um pilar, dê no máximo 10 e registre em observacoes.

# ROTA
- score_total de 80 a 100: rota = "quente"
- de 50 a 79: rota = "morno"
- de 0 a 49: rota = "frio"

# MENSAGEM INICIAL
Escreva "mensagem_sugerida" (máximo 280 caracteres) no tom da geração identificada, no canal recomendado, citando algo real do perfil do lead. Para rota quente, termine com o chamado para checkout ou agendamento. Para morna, convide a ver a página personalizada. Para fria, entregue uma micro-solução útil, sem pedir compra. Se a geração for indefinida, use tom neutro e cordial.

# SAÍDA (somente este JSON, sem texto fora dele)
{
  "geracao": "gen_z | millennial | gen_x | boomer | indefinida",
  "ano_nascimento_estimado": 0,
  "confianca_geracao": 0.0,
  "enriquecimento": {
    "cargo": {"valor": "", "origem": "informado | inferido"},
    "setor": {"valor": "", "origem": "informado | inferido"},
    "porte": {"valor": "", "origem": "informado | inferido"},
    "nivel_decisao": "decisor | influenciador | operacional | desconhecido"
  },
  "persona": {
    "tom_de_voz": "",
    "gatilhos_mentais": [],
    "canal_abordagem": "",
    "dor_principal": "",
    "objecao_provavel": ""
  },
  "bant": {
    "budget": {"pontos": 0, "justificativa": ""},
    "authority": {"pontos": 0, "justificativa": ""},
    "need": {"pontos": 0, "justificativa": ""},
    "timing": {"pontos": 0, "justificativa": ""}
  },
  "score_total": 0,
  "rota": "quente | morno | frio",
  "mensagem_sugerida": "",
  "observacoes": ""
}
```

---

## 2. Edge Function (`supabase/functions/classificar-lead/index.ts`)

Recebe o lead, chama a IA, valida o JSON e grava no banco.

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_PROMPT = Deno.env.get("CLASSIFICADOR_PROMPT")!; // cole o prompt acima no secret
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MAPA_ROTA: Record<string, string> = { quente: "quente", morno: "morno", frio: "frio" };

Deno.serve(async (req) => {
  try {
    const { lead_id, tenant_id } = await req.json();

    const { data: lead, error } = await sb
      .from("leads").select("*").eq("id", lead_id).eq("tenant_id", tenant_id).single();
    if (error || !lead) return new Response("lead não encontrado", { status: 404 });

    // Camada 1 (opcional): enriquecimento externo antes da IA
    // const extra = await fetch("https://api.apollo.io/...", { ... });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("MODELO_IA") ?? "claude-sonnet-4-6",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(lead) }],
      }),
    });
    const out = await resp.json();
    const texto = out.content?.map((c: any) => c.text ?? "").join("") ?? "";
    const r = JSON.parse(texto.replace(/```json|```/g, "").trim());

    // Validação defensiva: recalcula o score
    const b = r.bant;
    const total = b.budget.pontos + b.authority.pontos + b.need.pontos + b.timing.pontos;
    const rota = total >= 80 ? "quente" : total >= 50 ? "morno" : "frio";

    await sb.from("leads").update({
      geracao: r.geracao,
      ano_nascimento_estimado: r.ano_nascimento_estimado || null,
      persona_identificada: r.persona,
      score_bant: total,
      score_budget: b.budget.pontos,
      score_authority: b.authority.pontos,
      score_need: b.need.pontos,
      score_timing: b.timing.pontos,
      status_funil: MAPA_ROTA[rota],
      dados_enriquecidos_json: r.enriquecimento,
    }).eq("id", lead_id);

    return Response.json({ ...r, score_total: total, rota, lead_id, tenant_id });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
```

Deploy:

```bash
supabase secrets set ANTHROPIC_API_KEY=... CLASSIFICADOR_PROMPT="$(cat prompt.txt)"
supabase functions deploy classificar-lead
```
