// Ponto de entrada da Vercel.
// O Express de server.ts é reaproveitado como função serverless, sem alterar rotas.
// A Vercel só compila o que está dentro de api/, por isso o server.ts é
// empacotado para server.build.mjs no buildCommand definido em vercel.json.

// @ts-ignore - gerado durante o build pelo esbuild
import app from "../server.build.mjs";
// @ts-ignore - módulo em JavaScript simples, sem tipos
import {
  auditoriaAtiva,
  mascararChave,
  registarChamada,
  registarLigacao,
  registarOrdem
} from "../auditoria.mjs";

/**
 * Grava na auditoria o que aconteceu neste pedido. Corre antes da resposta
 * sair, para a função não congelar a meio da escrita, e nunca deixa um erro
 * de auditoria derrubar a rota.
 */
async function registarPedido(
  req: any,
  res: any,
  resposta: any,
  corpoPedido: any,
  duracaoMs: number
) {
  const rota = String(req.url || "").split("?")[0];
  const tarefas: Promise<any>[] = [
    registarChamada({
      metodo: req.method,
      rota,
      statusHttp: res.statusCode,
      duracaoMs
    })
  ];

  if (rota === "/api/binance/test-connection") {
    tarefas.push(
      registarLigacao({
        ambiente: corpoPedido?.environment,
        tipoConta: corpoPedido?.accountType,
        cluster: corpoPedido?.serverCluster,
        chaveMascarada: mascararChave(corpoPedido?.apiKey),
        sucesso: resposta?.success === true,
        codigoErro: resposta?.errorCode,
        mensagem: resposta?.message,
        pingMs: resposta?.pingMs,
        saldoUsdt: resposta?.accountBalanceUsdt
      })
    );
  }

  if (rota === "/api/binance/order") {
    tarefas.push(
      registarOrdem({
        ambiente: corpoPedido?.environment,
        tipoConta: corpoPedido?.accountType,
        simbolo: corpoPedido?.symbol,
        lado: corpoPedido?.side,
        tipo: corpoPedido?.type,
        quantidade: corpoPedido?.quantity,
        status: resposta?.status,
        orderIdBinance: resposta?.orderId,
        quantidadeExecutada: resposta?.executedQty,
        valorExecutado: resposta?.cummulativeQuoteQty,
        sucesso: resposta?.success === true,
        mensagem: resposta?.message,
        resposta: resposta?.data || resposta?.error || null
      })
    );
  }

  await Promise.all(tarefas);
}

export default function handler(req: any, res: any) {
  const inicio = Date.now();

  // A Vercel já lê e desserializa o corpo do pedido antes do handler.
  // Marcar como lido evita que o body-parser do Express fique à espera
  // de um stream que já foi consumido (os POST /api/binance/* enviam JSON).
  if (req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined) {
    req._body = true;
  }

  if (auditoriaAtiva()) {
    const corpoPedido = req.body;
    const jsonOriginal = res.json.bind(res);

    res.json = (payload: any) => {
      registarPedido(req, res, payload, corpoPedido, Date.now() - inicio)
        .catch(() => undefined)
        .finally(() => jsonOriginal(payload));
      return res;
    };
  }

  return (app as any)(req, res);
}
