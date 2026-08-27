# Sentinela Cripto

Terminal de análise e execução para cripto. Junta cotações ao vivo, leitura de
sentimento de fóruns com IA, análise técnica e um painel de execução ligado à
Binance.

No ar: https://fabricio-paulo-alves-dias.vercel.app

## Como rodar

```bash
npm install
npm run dev
```

Sobe em `http://localhost:3000`. O `server.ts` serve a API e, em
desenvolvimento, monta o Vite como middleware, então é um processo só.

Para produção:

```bash
npm run build
npm start
```

## Variáveis de ambiente

Copie o `.env.example` e preencha:

| Variável | Para quê | Sem ela |
|---|---|---|
| `GEMINI_API_KEY` | Blocos de IA (sentimento, previsão, padrões) | As rotas respondem, mas caem numa resposta padrão |
| `SUPABASE_URL` | Auditoria em base de dados | Auditoria desligada, resto funciona |
| `SUPABASE_KEY` | Auditoria em base de dados | Auditoria desligada, resto funciona |

As chaves da Binance **não** entram aqui. Elas são digitadas na aba de ligação
e ficam no navegador de quem usa. Colocar chave de corretora numa variável do
servidor significaria que qualquer visitante da página poderia operar na conta.

## Por que a Binance passa pelo servidor

As chamadas à Binance vão por `/api/binance/*` e não direto do navegador.

Não é preferência, é limitação da corretora: a Binance não devolve cabeçalhos
de CORS nos endpoints assinados. O `/api/v3/ping`, que é público, o navegador
chama sem problema. Já o `/api/v3/account` e o `/api/v3/order`, que são os que
importam, morrem em `Failed to fetch` antes de sair da página.

De quebra, a chave secreta não precisa assinar dentro do JavaScript da página.

## O que a Binance exige para o modo real funcionar

### Restrição de IP na chave

Se a chave tiver lista branca de IP, a Binance recusa com o código `-2015`. Não
adianta autorizar o IP da Vercel: ele muda entre arranques, já foi medido indo
de `51.44.253.77` para `35.180.126.110` no mesmo dia. A interface mostra qual
IP foi barrado a cada tentativa.

Dá para manter a restrição, por dois caminhos:

- **Rodar em casa.** `npm start` na máquina cujo IP está autorizado. O servidor
  passa a sair pelo IP certo e a chave é aceita como está. Foi assim que a
  ligação foi validada pela primeira vez.
- **Proxy com IP fixo.** O campo de gateway no modal e o parâmetro `proxyUrl`
  das rotas apontam a chamada para outro endereço. Basta um host barato com IP
  estático e autorizar só ele na Binance.

Sem nenhum dos dois, a alternativa é desligar a restrição na chave.

### Permissão de mercado

Uma chave com `enableFutures` ligado e `enableSpotAndMarginTrading` desligado
não envia ordem Spot, mesmo com o IP liberado. Pior: a conta responde
`canTrade: true` e a recusa só aparece na hora de enviar a ordem.

**Isso é detectado sozinho.** Ao ligar, o servidor consulta
`/sapi/v1/account/apiRestrictions` e devolve `restricoesDaChave` e
`mercadoRecomendado`. Se escolher Spot com uma chave que só opera Futuros, a
resposta avisa qual é o mercado liberado. Não é preciso ligar permissão
nenhuma: o sistema usa a que já existe.

### Região do servidor

De IP americano a Binance devolve `HTTP 451` em qualquer chamada assinada. Por
isso o `vercel.json` fixa a região em `cdg1`.

### Relógio

Pedido assinado com horário fora da janela devolve `-1021`. Foi encontrada uma
máquina com 193 segundos de atraso, muito acima da `recvWindow` máxima de 60
segundos. Por isso o horário das assinaturas é sempre o da Binance, nunca o do
relógio local.

Mantenha os saques desligados na chave. É o que limita o estrago caso ela vaze.

## Auditoria

Ligações, ordens e chamadas à API ficam gravadas em Postgres. O registro é
feito no servidor, a partir da resposta de cada rota, e uma falha de auditoria
nunca derruba a chamada que está auditando.

As políticas são append-only de propósito: dá para inserir e ler, não dá para
alterar nem apagar. Histórico de operação que pode ser reescrito não serve de
auditoria. O SQL está em `supabase/politicas_auditoria.sql`.

Não guarda chave de API nem endereço IP. Da chave sobram só os quatro primeiros
e os quatro últimos caracteres, o suficiente para distinguir uma da outra.

## Deploy

Roda na Vercel. O `vercel.json` cuida de:

- empacotar o `server.ts` para `server.build.mjs`, porque a Vercel só compila o
  que está dentro de `api/`
- trocar o Vite por um stub nesse pacote, já que o import real arrasta o Rollup
  e o binário nativo para dentro da função e ela não sobe
- fixar a região e dar 60 segundos de limite às funções, que as chamadas de IA
  levam de 8 a 11 segundos e o padrão de 10 não dá conta

## Limite conhecido

O robô roda no navegador. Com a aba fechada, nada é executado. Operação
contínua sem alguém com a página aberta seria outra construção, com o laço de
decisão no servidor.
