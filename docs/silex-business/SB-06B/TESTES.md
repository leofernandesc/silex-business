# SB-06B — método e matriz de validação

## Ambiente

Cópias temporárias separadas do baseline aprovado e da candidata; dependências locais reutilizadas, sem instalação. Builds e TypeScript executados somente nessas cópias. Bancos SQLite fictícios e descartáveis, com GESTAO_DATABASE_URL explícito; banco persistente da aplicação não utilizado. Firefox instalado, headless, um worker e zero retries. Fixture de componente servida por Vite em loopback, importando o Modal de produção; não há biblioteca de modal nem simulação DOM/jsdom.

A suíte de componente monta React StrictMode. Os acionadores são alcançados por Tab/Shift+Tab e ativados por Enter. Não se usa locator.focus() nem foco programático para fabricar o acionador. Na aplicação, o auxiliar usa a ordem real do DOM para escolher Tab ou Shift+Tab, evitando depender de uma volta pelo chrome do navegador ao alcançar o fim da página.

## Matriz de padrões

| Padrão | Verificação |
|---|---|
| Foco inicial | Botão seguro Fechar janela; formulários não passam a focar uma confirmação financeira |
| Modalidade | Tab/Shift+Tab permanecem dentro, controles desabilitados/ocultos excluídos, ação externa impedida pelo diálogo nativo |
| Escape/X/Voltar/Confirmar | Diálogo desmonta e acionador reaparece focado |
| Confirmação assíncrona | Fetch real no ensaio; formulários reais executam APIs somente no banco descartável |
| Acionador removido/desabilitado/oculto | Fallback semântico acessível; não body |
| Remoção/indisponibilidade tardia | Mesmo teste após fechar e aguardar fetch; recarga real de Pagar/Receber também coberta |
| Novo destino deliberado | Foco novo preservado; não imposto retorno ao acionador |
| Histórico e navegação | Hash e Voltar reais desmontam modal e preservam main do novo módulo |
| StrictMode/desmontagem | Abertura/limpeza/remontagem e repetição sem roubo de foco |
| Modal sobre outro modal | Fixture de robustez, sem afirmar existência desse fluxo no ERP; Escape afeta somente o diálogo superior |
| Continuação do fluxo | Após Tab para Próxima ação, remoção posterior do acionador não rouba foco |
| Cadastros | Clientes salvar/editar/cancelar; produtos/serviços/fornecedores/diaristas/frete e catálogos em varredura; regressões existentes de persistência |
| Financeiro sensível | Título 42,50, baixa integral, histórico e cancelamento/estorno em Pagar/Receber; valores/status conferidos pela API |
| Demais fluxos | Estoque, venda/recibo, caixa (troca do acionador), serviço/geração/cancelamento, administração e orçamento |
| Empresa e identidade | Sem Modal: formulário embutido, código preservado; não se fabrica um diálogo para testar |

A varredura inicial/final compara os mesmos 15 acionadores nas três larguras (45 aberturas). A lista está em modal-inventory.json e os resultados em baseline/candidate-modal-probe.json. Testes adicionais não são contados como novos consumidores de produção.

## Reprodução dos comandos

No frontend temporário: `npm test`, `npm run build`. Backend: `PYTHONPATH=backend PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest backend/tests -q -p no:cacheprovider`.

TypeScript adicional para testes/fixture: `node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx --lib ES2022,DOM,DOM.Iterable --esModuleInterop tests/modal-focus.spec.ts tests/modal-workflows.spec.ts tests/fixtures/modal-focus.tsx`.

Para o componente, iniciar Vite em loopback na cópia e apontar SILEX_MODAL_ORIGIN. Copiar scripts/playwright.sb06b.config.ts ao lado de playwright.config.ts. SILEX_TEST_ORIGIN aponta ao servidor FastAPI da cópia com dist recém-gerado; SILEX_RESULTS e SILEX_OUTPUT_DIR ficam na pasta temporária. SILEX_TEST_PASSWORD é fornecida no ambiente, nunca incorporada nos scripts ou no pacote. Testes de expiração existentes exigem SILEX_SB04B_ENV, manifesto com `persistent_database_used:false` e work_dir descartável com prefixo `/tmp/silex-sb04b-`.

Novos: `playwright test --config=playwright.sb06b.config.ts modal-focus.spec.ts modal-workflows.spec.ts`. Existentes: app, navigation, header-reflow, home, public, ledger-interface, ledger-summary-responsive, accounts-interface, reconciliation-interface e dashboard-interface.

## Intercorrências e limites

Uma rodada exploratória concorrente sofreu forte pressão de memória/swap e timeout ao carregar o login, antes de testar a correção. Foi interrompida e substituída por execuções serializadas; sem retries. Outras rodadas de desenvolvimento identificaram suposições incorretas da fixture (React autoFocus em diálogo fechado, atributo hidden sobrescrito pelo CSS legado e prefixo do código de pedido sintético). Os testes finais usam o comportamento real e ocultação efetiva, mantendo as verificações de foco. A bateria real também demonstrou a necessidade da proteção contra remoção assíncrona tardia do acionador. A amostra complementar passou a preparar seu próprio movimento e pedido fictícios, evitando depender de ações disponíveis na primeira página após outras suítes; o seletor do filtro de pedidos foi conferido como Buscar. Essas correções pertencem aos ensaios, sem reduzir as asserções de foco ou alterar a aplicação.

Os quatro testes de retorno ao acionador (Escape/X/Voltar/Confirmar) falham no baseline, como esperado para P01. Logs exploratórios completos permanecem localmente; não substituem os resultados finais.

Ampliação de fontes computadas a 200% é uma simulação de texto, não zoom nativo. Leitores de tela reais, dispositivos físicos e homologação integral de zoom não são cobertos por DOM/teclado automatizado. Não se declara conformidade WCAG completa. Os excessos independentes da Home/Visão Geral em larguras extremas permanecem documentados, fora do escopo.

Resultados finais, quantidades e arquivos de evidência estão no RELATORIO.md e test-results-summary.json, gerados após o encerramento das rodadas.
