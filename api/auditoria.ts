// Leitura da auditoria persistente para o painel.
// Rota própria: /api/auditoria (a Vercel resolve os ficheiros de api/ antes
// de aplicar os rewrites, por isso não passa pelo Express).

// @ts-ignore - módulo em JavaScript simples, sem tipos
import { auditoriaAtiva, lerAuditoria, registarEvento } from "../auditoria.mjs";

export default async function handler(req: any, res: any) {
  if (!auditoriaAtiva()) {
    return res.status(200).json({
      ativa: false,
      mensagem:
        "Auditoria desligada: faltam as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    });
  }

  if (req.method === "POST") {
    const corpo = req.body || {};
    await registarEvento({
      categoria: corpo.categoria,
      nivel: corpo.nivel,
      titulo: corpo.titulo,
      detalhe: corpo.detalhe,
      dados: corpo.dados
    });
    return res.status(201).json({ registado: true });
  }

  const limiteBruto = Number(req.query?.limite);
  const limite = Number.isFinite(limiteBruto)
    ? Math.min(Math.max(Math.trunc(limiteBruto), 1), 200)
    : 40;

  try {
    const dados = await lerAuditoria({ limite });
    return res.status(200).json(dados);
  } catch (erro: any) {
    return res.status(500).json({
      ativa: true,
      erro: `Falha ao ler a auditoria: ${erro?.message || erro}`
    });
  }
}
