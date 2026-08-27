-- Políticas da auditoria: append-only.
--
-- A auditoria é escrita com a chave publicável do projeto, guardada apenas na
-- variável de ambiente do servidor. Por isso as políticas são deliberadamente
-- append-only: dá para inserir e ler, nunca para alterar nem apagar. Mesmo
-- quem tiver a chave não consegue adulterar nem limpar o histórico.
--
-- Nenhuma destas tabelas guarda chave de API, chave secreta ou endereço IP.
--
-- Para trocar pela chave de serviço mais tarde, basta definir a variável
-- SUPABASE_SERVICE_ROLE_KEY na Vercel: ela tem precedência no código.

create policy "auditoria_insercao" on public.sessoes for insert to anon with check (true);
create policy "auditoria_leitura" on public.sessoes for select to anon using (true);

create policy "auditoria_insercao" on public.chamadas_api for insert to anon with check (true);
create policy "auditoria_leitura" on public.chamadas_api for select to anon using (true);

create policy "auditoria_insercao" on public.ligacoes_binance for insert to anon with check (true);
create policy "auditoria_leitura" on public.ligacoes_binance for select to anon using (true);

create policy "auditoria_insercao" on public.ordens for insert to anon with check (true);
create policy "auditoria_leitura" on public.ordens for select to anon using (true);

create policy "auditoria_insercao" on public.eventos_auditoria for insert to anon with check (true);
create policy "auditoria_leitura" on public.eventos_auditoria for select to anon using (true);

-- Sem políticas de update e de delete: o Postgres nega por omissão.
revoke update, delete on public.sessoes from anon;
revoke update, delete on public.chamadas_api from anon;
revoke update, delete on public.ligacoes_binance from anon;
revoke update, delete on public.ordens from anon;
revoke update, delete on public.eventos_auditoria from anon;
