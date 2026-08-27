# Scripts antigos

Scripts de conserto pontual que foram usados durante a construção do projeto:
`fix_*.py`, `patch*.ts`, `test_*.js` e afins.

Estavam soltos na raiz do repositório, onde competiam visualmente com o código
que importa. Foram movidos para cá com `git mv`, então o histórico de cada um
continua inteiro.

**Nada aqui roda no build nem em produção.** Não são chamados pelo
`package.json`, pelo `vite.config.ts` nem pelo `server.ts`. São registro de
como o projeto chegou onde está.

Se um deles não fizer mais sentido, dá para apagar sem quebrar nada. Ficaram
por precaução, não por necessidade.
