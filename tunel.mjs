// Sobe o tunel e anuncia o endereco sorteado.
//
// O tunel gratuito da Cloudflare escolhe um nome novo a cada arranque. Em vez
// de obrigar alguem a copiar esse endereco, este script le o endereco da saida
// do proprio tunel e anuncia no servidor. A pagina da Vercel, que tem endereco
// fixo, passa a mostrar para onde ir.
//
// Uso: node tunel.mjs   (com o servidor ja a atender em localhost:3000)

import { spawn } from 'child_process';

const PORTA_LOCAL = 3000;
const INTERVALO_REANUNCIO_MS = 5 * 60 * 1000;

const PADRAO_ENDERECO = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

let enderecoAtual = null;

async function anunciar(endereco) {
  try {
    const r = await fetch(`http://localhost:${PORTA_LOCAL}/api/enlace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endereco, origem: 'tunel-em-casa' })
    });
    const d = await r.json().catch(() => ({}));
    if (d?.ok) {
      console.log(`  anunciado: ${endereco}`);
    } else {
      console.log(`  nao foi possivel anunciar: ${d?.erro || r.status}`);
    }
  } catch (erro) {
    console.log(`  nao foi possivel anunciar: ${erro?.message || erro}`);
  }
}

function tratarSaida(texto) {
  process.stdout.write(texto);

  if (enderecoAtual) return;
  const achou = texto.match(PADRAO_ENDERECO);
  if (!achou) return;

  enderecoAtual = achou[0];
  console.log('\n' + '='.repeat(58));
  console.log('  ENDERECO PARA ACESSAR DE FORA DE CASA');
  console.log(`  ${enderecoAtual}`);
  console.log('='.repeat(58) + '\n');

  anunciar(enderecoAtual);
  setInterval(() => anunciar(enderecoAtual), INTERVALO_REANUNCIO_MS);
}

console.log('Subindo o tunel...\n');

const tunel = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['--yes', 'cloudflared', 'tunnel', '--url', `http://localhost:${PORTA_LOCAL}`, '--no-autoupdate'],
  { shell: process.platform === 'win32' }
);

tunel.stdout.on('data', (d) => tratarSaida(d.toString()));
tunel.stderr.on('data', (d) => tratarSaida(d.toString()));

tunel.on('close', (codigo) => {
  console.log(`\nO tunel encerrou (codigo ${codigo}).`);
  process.exit(codigo ?? 0);
});

process.on('SIGINT', () => {
  tunel.kill();
  process.exit(0);
});
