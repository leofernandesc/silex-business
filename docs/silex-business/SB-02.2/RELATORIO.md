# Silex Business — SB-02.2

**Estado:** implementação concluída; aguardando revisão e aprovação visual.  
**Escopo:** identidade no shell e login, metadados, rótulos empresariais e tela Clientes como piloto. Nenhuma publicação ou merge foi feito.

## Preparação e reversão

O checkout não possui `.git`, então branch e `git status` não estão disponíveis. Antes de editar, os arquivos de origem foram copiados byte a byte para um ponto de recuperação fora do projeto:

`/home/leofernandesc/.local/share/codex-backups/controlmax-inspired/sb02-2/20261014T032425Z`

O backup contém os cinco arquivos alterados, manifesto SHA-256 e instruções de restauração. Uma cópia de cada arquivo foi restaurada em um checkout temporário e conferida contra o manifesto. A evidência está em [backup-manifest.json](../../evidence/sb02-2/backup-manifest.json) e [preservacao-final.json](../../evidence/sb02-2/preservacao-final.json).

## Alterações

- [App.tsx](../../../frontend/src/App.tsx): login, barra lateral, breadcrumb e rodapé usam a marca fixa Silex Business com os SVGs refinados oficiais. A área de trabalho mantém `company_name` como identificação da empresa cliente.
- [styles.css](../../../frontend/src/styles.css): Inter local e tokens Silex aplicados ao canvas, tipografia, controles principais, foco, navegação lateral e login. A tela Clientes recebeu regras visuais delimitadas por `.silex-customers-page`.
- [catalog.tsx](../../../frontend/src/catalog.tsx): Clientes foi envolvida por um escopo de estilo e recebeu uma orientação de rolagem em telas estreitas. O formulário, seus campos e seu handler foram comparados com o backup e permanecem iguais. As seis colunas e a ação Editar continuam disponíveis.
- [settings.tsx](../../../frontend/src/settings.tsx): o rótulo legado foi esclarecido para “Nome de apresentação”; a página explica que a marca do software é Silex Business e que esse valor não substitui o nome da empresa ou dados fiscais. Obrigatoriedade, limite, estado, campos e chamada `PUT` permanecem iguais ao backup.
- [index.html](../../../frontend/index.html): título, descrição e cor de tema do navegador agora correspondem à marca aprovada.

Os SVGs e fontes não foram recriados ou alterados. A validação confirma cinco SVGs oficiais em XML, dois arquivos Inter licenciados e cópias idênticas no build.

## Dados e compatibilidade

`Silex Business` identifica o software; `company_name` continua identificando a empresa cliente; `brand_name` permanece armazenado e configurável como nome de apresentação, sem ser usado como nome empresarial ou marca do software. Nenhum valor empresarial foi reescrito e o payload de configuração foi preservado. O valor legado de demonstração “Gestão” continua visível no campo de nome de apresentação da captura de configurações; ele não representa a marca do produto.

O banco persistente `data/` e seus arquivos auxiliares mantiveram os hashes registrados no baseline preservado do SB-02.1. Os testes de navegador usaram somente uma base SQLite temporária, fora do checkout, criada com os dados de demonstração e descartada ao encerrar os servidores.

## Impacto nas outras telas

Como a barra lateral e os estilos base são compartilhados, as telas operacionais também passam a exibir a sidebar azul profunda, cabeçalho e rodapé Silex, fonte Inter, fundo claro, botões primários azuis e foco azul claro. As capturas de Visão Geral e Financeiro mostram esse efeito em 1440, 768 e 375 px.

Os conteúdos e estilos específicos desses módulos foram preservados: indicadores, dados, cálculos, filtros, regras financeiras e cores semânticas não foram modificados. Por isso, partes internas ainda refletem o visual anterior; por exemplo, o banner da Visão Geral mantém seu tom teal e os lançamentos mantêm a distinção verde/vermelha de receita/despesa. Textos internos legados em outras telas e templates não foram alterados neste incremento.

Na tabela de Clientes, a largura mínima de 820 px mantém as seis colunas legíveis. Em 768 e 375 px, a rolagem ocorre dentro da tabela, com orientação visível; a página não cria rolagem horizontal global. A Visão Geral continua independente e suas ações permanecem acessíveis.

## Validação

- `npm run build -- --outDir /tmp/sb022-vite-build-reviewed`: passou; TypeScript e Vite geraram 1.759 módulos. A saída foi direcionada a `/tmp`; `frontend/dist` permaneceu byte a byte igual ao estado inicial.
- `npm test`: 3 arquivos de teste, 19 testes passaram.
- Cenário Playwright manual no Firefox: login, navegação à Visão Geral, criar/editar cliente, busca por nome, filtro de inativos, exportação CSV, rolagem horizontal acessível, menu móvel, logout e ausência de erros JavaScript passaram.
- A paginação não foi percorrida no navegador porque a base de demonstração contém apenas dois clientes; o componente e o estado de página não foram alterados.
- Campos de Empresa e identidade: nomes separados, obrigatoriedade e limite 50 conferidos; o handler do `PUT` foi comparado ao backup sem enviar alterações ao banco.
- Inter foi carregada dos arquivos locais; nenhum pedido externo foi observado. O build inclui os SVGs, fontes e licença.
- Medidas em 1440, 768 e 375 px: sem overflow horizontal da página; rolagem interna da tabela confirmada nos dois menores tamanhos.
- O projeto não define script de lint; nenhum lint foi executado.

Resultados e capturas estão em [docs/evidence/sb02-2](../../evidence/sb02-2/README.md). A página [comparativo.html](../../evidence/sb02-2/comparativo.html) abre os pares antes/depois de Clientes, login, Visão Geral e Financeiro, além do estado final de Empresa e identidade.

## Limites desta entrega

Não foram alterados banco persistente, backend, API, rotas, autenticação, autorização, permissões, cálculos, regras financeiras ou formulários operacionais. O checkout continua sem Git. Os textos de marca dentro de páginas e templates que não pertencem ao shell permanecem para revisão em incrementos próprios.

Esta entrega aguarda aprovação visual. Nenhum incremento seguinte deve começar antes dela.
