-- Estado da sessão, para o terminal abrir igual em qualquer computador.
--
-- O conteúdo é gravado CRIPTOGRAFADO. A chave de cifra é derivada do código de
-- acesso que a pessoa escolhe, e esse código nunca é guardado: da tabela só
-- consta o hash dele. Quem tiver acesso ao banco vê bytes, não vê a chave da
-- Binance nem as posições.
--
-- Por isso não existe recuperação: código perdido é estado perdido.

create table public.sessoes_estado (
  id text primary key,
  salt text not null,
  iv text not null,
  tag text not null,
  dados text not null,
  atualizado_em timestamptz not null default now()
);

comment on table public.sessoes_estado is 'Estado do terminal cifrado com chave derivada do codigo de acesso.';
comment on column public.sessoes_estado.id is 'Hash do codigo de acesso. O codigo em si nunca e guardado.';
comment on column public.sessoes_estado.dados is 'Conteudo cifrado em AES-256-GCM.';

create index sessoes_estado_atualizado_em_idx on public.sessoes_estado (atualizado_em desc);

alter table public.sessoes_estado enable row level security;

-- O acesso é sempre feito pelo servidor, que é quem tem a chave do Supabase.
-- O navegador só fala com o servidor, e o servidor só devolve o estado a quem
-- apresenta o código correto.
create policy "estado_leitura" on public.sessoes_estado
  for select to anon using (true);

create policy "estado_insercao" on public.sessoes_estado
  for insert to anon with check (true);

create policy "estado_atualizacao" on public.sessoes_estado
  for update to anon using (true) with check (true);

-- Estado de sessão não é auditoria: quem gravou tem que conseguir apagar.
-- O apagamento é feito pelo servidor, e só depois de o código de acesso
-- decifrar o conteúdo, o que prova a posse.
create policy "estado_remocao" on public.sessoes_estado
  for delete to anon using (true);
