"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Three.js só no cliente, sem SSR
const NucleoCerebro = dynamic(() => import("@/components/NucleoCerebro"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

type Resultado = {
  alvo: string;
  geracao: string;
  canal: string;
  tom: string;
  score: number;
  bant: { b: number; a: number; n: number; t: number };
  rota: string;
  mensagem: string;
};

const GERACOES = [
  { nome: "Geração Z", canal: "Instagram Direct", tom: "rápido, visual, sem formalidade" },
  { nome: "Millennial", canal: "WhatsApp", tom: "direto, com ROI claro e propósito" },
  { nome: "Geração X", canal: "E-mail / LinkedIn", tom: "objetivo, com autoridade e prova" },
  { nome: "Baby Boomer", canal: "Ligação / e-mail detalhado", tom: "respeitoso, passo a passo" },
];

// Simulação local (determinística). Para usar a IA real, troque por fetch("/api/simular").
function simular(alvo: string): Resultado {
  const h = [...alvo].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
  const g = GERACOES[h % 4];
  const b = 8 + (h % 18);
  const a = 6 + ((h >> 2) % 20);
  const n = 10 + ((h >> 3) % 16);
  const t = 5 + ((h >> 4) % 20);
  const score = Math.min(100, b + a + n + t);
  const rota =
    score >= 80 ? "Lead quente: alerta + checkout direto" :
    score >= 50 ? "Lead morno: página dinâmica da geração" :
    "Lead frio: régua de nutrição por IA";
  const mensagem =
    g.nome === "Geração Z"
      ? "Vi o seu perfil e já montei seu funil rodando. Quer ver em 2 min? 👇"
      : g.nome === "Millennial"
      ? "Seu negócio pode captar e vender sozinho. Veja o ROI estimado em 1 minuto:"
      : g.nome === "Geração X"
      ? "Empresas do seu porte já operam com este sistema. Posso enviar os casos?"
      : "Bom dia. Preparei um passo a passo simples de como funciona, com suporte humano.";
  return { alvo, geracao: g.nome, canal: g.canal, tom: g.tom, score, bant: { b, a, n, t }, rota, mensagem };
}

const ETAPAS = [
  "Lendo o perfil público",
  "Enriquecendo cargo, setor e porte",
  "Mapeando geração e persona",
  "Calculando score BANT",
  "Montando a oferta personalizada",
];

function Simulador() {
  const [alvo, setAlvo] = useState("");
  const [etapa, setEtapa] = useState(-1);
  const [res, setRes] = useState<Resultado | null>(null);
  const rodando = etapa >= 0 && etapa < ETAPAS.length;

  async function rodar() {
    if (!alvo.trim() || rodando) return;
    setRes(null);
    for (let i = 0; i < ETAPAS.length; i++) {
      setEtapa(i);
      await new Promise((r) => setTimeout(r, 750));
    }
    setRes(simular(alvo.trim().toLowerCase()));
    setEtapa(ETAPAS.length);
  }

  return (
    <div className="rounded-2xl border border-[#D4A94F]/40 bg-[#0B1B3A]/70 p-5 backdrop-blur sm:p-8">
      <label htmlFor="alvo" className="font-serif text-xl text-[#F3E3B8]">
        Digite o site ou o Instagram da sua empresa
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          id="alvo"
          value={alvo}
          onChange={(e) => setAlvo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && rodar()}
          placeholder="@suaempresa ou suaempresa.com.br"
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-[#D4A94F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A94F]"
        />
        <button
          onClick={rodar}
          disabled={rodando}
          className="rounded-lg bg-[#D4A94F] px-6 py-3 font-semibold text-[#0B1B3A] transition hover:bg-[#E6C070] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
        >
          {rodando ? "Analisando..." : "Simular um cliente ideal"}
        </button>
      </div>

      <ul className="mt-5 space-y-2" aria-live="polite">
        {ETAPAS.map((e, i) => (
          <li key={e} className={`flex items-center gap-3 text-sm ${i <= etapa ? "text-white" : "text-white/30"}`}>
            <span className={`h-2 w-2 rounded-full ${i < etapa ? "bg-[#D4A94F]" : i === etapa ? "animate-pulse bg-[#D4A94F]" : "bg-white/20"}`} />
            {e}
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {res && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-black/30 p-5 sm:grid-cols-2"
          >
            <div>
              <p className="text-sm text-white/60">Perfil identificado</p>
              <p className="font-serif text-2xl text-[#F3E3B8]">{res.geracao}</p>
              <p className="mt-1 text-sm text-white/70">Tom: {res.tom}</p>
              <p className="text-sm text-white/70">Canal: {res.canal}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Score BANT</p>
              <p className="font-serif text-5xl text-[#D4A94F]">{res.score}<span className="text-xl text-white/50">/100</span></p>
              <p className="mt-1 text-xs text-white/60">
                Orçamento {res.bant.b} · Autoridade {res.bant.a} · Necessidade {res.bant.n} · Timing {res.bant.t}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-white/60">Rota automática: {res.rota}</p>
              <p className="mt-2 rounded-lg bg-[#D4A94F]/10 p-4 text-white">{res.mensagem}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ENTREGAS = [
  ["Capta", "Leads de formulário, Instagram e WhatsApp entram sozinhos no sistema."],
  ["Entende", "Cada lead é enriquecido, classificado por geração e pontuado de 0 a 100."],
  ["Vende", "A mensagem certa, no canal certo, no tom certo para a idade de quem recebe."],
  ["Entrega", "O pagamento aprovado cria a conta do cliente com tudo configurado, sem ninguém digitar nada."],
];

const OBJECOES = [
  ["Já comprei ferramentas e nunca usei.", "Aqui você não recebe ferramenta. Recebe o sistema rodando: você só conecta seu WhatsApp."],
  ["Não entendo de tecnologia.", "O painel já vem pronto, com agentes e funis instalados. Você acompanha os resultados."],
  ["Demora para dar resultado?", "O primeiro lead classificado aparece no mesmo dia da conexão."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07122A] text-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_30%,#1B3F8F55,transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 pb-16 pt-14 md:grid-cols-2 md:pt-24">
          <div>
            <h1 className="font-serif text-4xl leading-[1.08] text-[#F3E3B8] sm:text-6xl">
              Seu negócio captando, entendendo e vendendo sozinho.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">
              O Business OS entrega a solução completa rodando: capta o lead, descobre quem ele é,
              fala do jeito que ele escuta e cria a conta do cliente assim que o pagamento cai.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#simulador" className="rounded-lg bg-[#D4A94F] px-6 py-3 font-semibold text-[#0B1B3A] hover:bg-[#E6C070] focus-visible:ring-2 focus-visible:ring-white">
                Ver funcionando agora
              </a>
              <a href="#como" className="rounded-lg border border-[#D4A94F]/60 px-6 py-3 text-[#F3E3B8] hover:bg-[#D4A94F]/10">
                Como funciona
              </a>
            </div>
          </div>
          <div className="h-[320px] sm:h-[460px]">
            <NucleoCerebro />
          </div>
        </div>
      </section>

      {/* SIMULADOR */}
      <section id="simulador" className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="mb-6 font-serif text-3xl text-[#F3E3B8]">Veja a IA trabalhando no seu nicho</h2>
        <Simulador />
      </section>

      {/* COMO FUNCIONA */}
      <section id="como" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-serif text-3xl text-[#F3E3B8]">Quatro etapas, nenhuma delas feita por você</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {ENTREGAS.map(([t, d], i) => (
            <div key={t} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <span className="pointer-events-none absolute -right-2 -top-6 font-serif text-8xl text-[#D4A94F]/10">{i + 1}</span>
              <h3 className="font-serif text-2xl text-[#D4A94F]">{t}</h3>
              <p className="mt-2 text-white/75">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OBJEÇÕES */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="font-serif text-3xl text-[#F3E3B8]">Se você já comprou ferramenta e não usou</h2>
        <dl className="mt-6 space-y-5">
          {OBJECOES.map(([q, a]) => (
            <div key={q} className="border-l-2 border-[#D4A94F] pl-4">
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-white/70">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 pb-24 pt-8 text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl text-[#F3E3B8] sm:text-4xl">
          Ative seu Business OS hoje e receba o acesso em minutos.
        </h2>
        <a
          href="/checkout"
          className="mt-8 inline-block rounded-lg bg-[#D4A94F] px-8 py-4 text-lg font-semibold text-[#0B1B3A] hover:bg-[#E6C070] focus-visible:ring-2 focus-visible:ring-white"
        >
          Quero meu sistema rodando
        </a>
        <p className="mt-10 font-serif text-sm tracking-widest text-[#D4A94F]/80">KENNEDY / KNL.LIMA</p>
      </section>
    </main>
  );
}
