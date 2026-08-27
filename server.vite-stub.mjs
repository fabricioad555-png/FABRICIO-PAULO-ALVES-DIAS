// Substituto do Vite no pacote da Vercel.
// Em produção o server.ts só usa createViteServer quando NODE_ENV nao é
// "production", o que nunca acontece na Vercel. Manter o Vite real no bundle
// arrastava o Rollup e o seu binário nativo para dentro da função serverless.

export function createServer() {
  throw new Error(
    'O servidor de desenvolvimento do Vite nao existe no ambiente serverless da Vercel.'
  );
}

export default { createServer };
