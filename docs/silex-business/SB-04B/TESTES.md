# Testes — SB-04B

Todas as execuções usaram cópias em /tmp, SQLite fictício isolado e loopback. Nenhuma base persistente do checkout ou ambiente real foi usada. Dependências existentes foram reutilizadas por symlink; sem instalações. Build não altera dist/tsbuildinfo originais.

## Cobertura final

| Verificação | Resultado |
| --- | --- |
| Baseline npm test / npm run build | 48 testes; TypeScript/Vite aprovados |
| Frontend final npm test | 54 testes em oito arquivos |
| TypeScript separado, tsc --noEmit | Aprovado |
| Build Vite, npm run build (inclui tsc -b) | Aprovado |
| Backend PYTHONPATH=backend pytest backend/tests -q | 69 testes aprovados; um warning de depreciação anterior |
| Novos testes Home | 24 E2E: oito cenários × três larguras |
| Navegação/auth herdados e adaptados | 36 E2E aprovados |
| Página pública | 21 E2E aprovados |
| Fluxos operacionais existentes | 27 E2E aprovados |
| Total navegador | 108 E2E, sem skips ou retries no resultado final |
| Comparação read-only de consultas | Dez respostas equivalentes em fixtures baseline/candidato |
| SVGs oficiais | Cinco XML válidos e hashes iguais aos originais em Pictures |
| Formatação dos novos arquivos e fontes/testes delimitados | Prettier aprovado; formatação legada do App/testes preservada |
| Lint dedicado | Não configurado no projeto |

A antiga asserção de que /#home era público foi removida por incompatibilidade com a ativação aprovada da rota; o loop de superfícies agora valida home como protegida. Sete casos unitários novos incluem modelos por perfil, exclusão de aliases, cobertura dos módulos sem duplicação, ausência de usuário, semântica company_name/brand_name, operador sem áreas administrativas e carregamento/erro sem dados empresariais.

Login normal, retorno protegido prioritário, home guest, home expirada no servidor e reautenticação, refresh, logout confirmado/401/falha, retorno adulterado, histórico, links antigos, item ativo, permissões admin/operator, recusa real 403/mutação administrativa, menu móvel P03 e teclado foram exercitados. Os cliques incluem todos os 23 destinos canônicos admin e seis operator, nas três larguras; alias legado é coberto na matriz herdada.

Home após login solicita somente auth/me/login e a configuração já consultada pelo shell, sem dashboard/financeiro/estoque/vendas. Público mantém testes de zero API, zero rastreadores, dados privados ausentes e navegação por seções. Mudança de sessão rederiva as opções e desmonta conteúdos privados.

Os testes operacionais mantêm cadastro/edição, PIX/prestadores, estoque/venda/recibo/estorno, caixa, financeiro, títulos parciais/recorrência/comprovantes, OFX, relatórios e serviços/pedidos. Preparação do helper foi adaptada: valida home após login e abre Visão Geral antes das asserções operacionais originais. Nenhuma asserção de negócio foi removida.

## Tentativas e diagnóstico

- Primeiro comando backend falhou por ausência de PYTHONPATH; corrigido para o comando do Makefile. Não foi uma falha de teste da aplicação. Logs backend.log e backend-final.log preservados.
- Primeiro launcher foi chamado com python3 do sistema, sem SQLAlchemy. Reexecutado com a .venv já existente, sem instalar programas.
- Teste Home inicialmente em .test.tsx não correspondia ao include de Vitest (src/**/*.test.ts). Foi convertido para .test.ts com createElement, sem alterar a configuração ou excluir testes.
- Primeira rodada navegador: 71 aprovados e sete falhas. Três provinham de foco programático após clique, que não ativa :focus-visible no Firefox; teste passou a entrar no modo teclado com Tab antes de avaliar o foco. Três esperavam Visão Geral como primeiro item no retorno de breakpoint; agora o primeiro item é Início, preservando o hook P03 original. Uma era click durante mudança de layout de Dashboard financeiro; teste aguarda networkidle antes de acionar Abrir livro caixa. Sem correção de negócio/auth/menu por causa dessas falhas.
- Primeiro script de capturas aguardava o título Estoque; o título real da tela é Movimentações de estoque. O seletor do harness foi corrigido, sem mudar a aplicação; log preservado.
- Segunda rodada: 81/81 aprovados, incluindo um novo cenário de expiração real em Home nas três larguras. Depois, suíte operacional: 27/27.

Logs, JSON, contextos de erro, capturas e traces da primeira tentativa permanecem sob evidence/sb04b. Matriz final em test-matrix.json/CSV e resumo em tests-summary.json. As fontes testadas foram comparadas byte a byte ao checkout.

## Visual e limites

Capturas reais antes/depois de Login, público, Visão Geral, Clientes, Vendas, Estoque e Financeiro nas três larguras; Home admin/operator, menu e texto ampliado 200%. Auditoria DOM/CSS verifica overflow, Inter 400/600, erros JavaScript, contraste textual da Home e APIs do público. Galeria inclui o C original como estudo estático separado das telas reais de fixture.

Ampliação de texto é um probe CSS documentado, não certificação de zoom de todos os navegadores. Leitor de tela real, dispositivos físicos e abertura de atalho em nova aba não testados; href nativo foi preservado no código. Contraste calculado cobre texto visível da Home, não certifica todas as pendências antigas do ERP. A expiração em Home foi comprovada após atualização; nenhuma sondagem periódica foi acrescentada. Testes pytest podem executar migrações somente nas próprias fixtures temporárias, nunca no banco persistente.
