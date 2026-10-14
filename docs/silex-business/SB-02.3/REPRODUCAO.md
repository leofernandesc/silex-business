# Reprodução e alcance do ambiente

As evidências usam cópias em `/tmp/silex-sb023-...`, dois estados do frontend e três bancos separados: baseline pré-SB-02.2, candidato corrigido e cenários funcionais. Os caminhos originais estão em environment.json. O build e os testes usam dependências já instaladas; não copiam o diretório data/ de produção.

O ponto de partida antes do SB-02.2 substitui somente os cinco arquivos listados no backup daquele incremento; os fundamentos do SB-02.1 permanecem. O candidato SB-02.2 inicial contém o checkpoint atual antes da correção. A versão final difere somente em styles.css.

Os scripts em docs/evidence/sb02-3/scripts registram o procedimento, os seletores, o scanner de contraste e os cenários adicionais. Para repetição, criar novas cópias temporárias e atualizar environment.json/caminhos para elas. O launcher inicializa apenas banco novo descartável com o metadata dos modelos existentes, sem executar Alembic. Não iniciar o launcher sobre o mesmo banco fixture existente nem sobre data/.

As requests de fluxo normal vão para API da cópia isolada. Somente busy/erro dos testes adicionais são controlados por wrappers de fetch no perfil descartável; o componente funcional não é substituído. Para revisar sem executar a aplicação, abra galeria.html e os JSONs.

Este é um pacote de revisão, não um instalador ou release. Os resultados finais e limites estão em TESTES.md.
