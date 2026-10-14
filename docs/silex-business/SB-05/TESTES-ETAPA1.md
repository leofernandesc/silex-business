# Testes — SB-05 etapa 1

## Ambiente

Cópias criadas por git archive do baseline aprovado, sem copiar data/ de produção. SQLite fictício mestre, baseline, candidato e funcional separados em /tmp/silex-sb05-1-*. Fonte/venv/dependências existentes reutilizadas; sem instalações. Fixture inclui 31 lançamentos ilustrativos criados pela API original e um estorno, além dos dois pagamentos de vendas do seed, totalizando 34 movimentos para captura. Banco funcional pode receber registros adicionais dos testes; capturas não usam essa base modificada.

Build/tsbuildinfo ficam nas cópias isoladas; o build preexistente do checkout é preservado. Suíte backend utiliza fixtures próprias; eventuais migrações pytest ocorrem somente nas bases temporárias. Nenhum comando de migração/seed foi executado na aplicação persistente.

## Resultados

| Verificação | Resultado |
| --- | --- |
| Baseline frontend/build | 54 testes + TypeScript/Vite aprovados |
| Frontend final | 59 testes em nove arquivos |
| TypeScript separado, tsc --noEmit | Aprovado |
| Build Vite, inclui tsc -b | Aprovado |
| Backend | 69 testes aprovados, um warning Starlette/httpx anterior |
| E2E específicos de Lançamentos | 24: oito cenários × 1440/768/375 px |
| E2E operacionais herdados | 27 |
| E2E página pública herdados | 21 |
| Total final E2E | 72, sem skips/retries na rodada final |
| Consultas read-only em fixtures equivalentes | 19 respostas iguais |
| AST financeiro | 84 chamadas críticas e 31 handlers equivalentes |
| Template print/filtros/estado/seis colunas | Preservados |
| Prettier nas fontes/testes afetados | Aprovado |
| Lint dedicado | Não configurado |

## Cenários novos

Operador não monta LedgerPage por URL direta; backend responde 403 ao GET e ao POST de movimento. Administrador acessa a tela. Neutralidade de Nova despesa e primário de Nova receita, foco visível, tabela completa e acesso à última coluna/Estornar por rolagem e teclado. Indicação de overflow aparece/desaparece ao redimensionar.

Draft permanece separado de applied; pesquisar por documento/tipo/origem, Enter, competência, estados vazios, paginação e tamanho funcionam. Preset preserva critérios aplicados, como antes. Payload de despesa conserva centavos, posting_date e competence_date ISO; invalid currency comunica erro; estorno mantém original e movimento oposto. Não existe edição direta de movimento efetivo na aplicação atual e nenhuma foi criada.

Datas verificadas em pt-BR/en-US: casos ambíguos 10/01 e 01/10, bissexto 29/02/2024, vazio, required e max. Input continua type=date e value ISO; a legenda explícita é dd/mm/aaaa. Limites nativos são exercitados sem criar validação diferente. Não se declara a aparência do calendário nativo uniformemente brasileira.

CSV usa o filtro aplicado mesmo com draft pendente. Impressão reúne o mesmo registro e conserva o template Livro caixa · Gestão, conforme a restrição de não alterar impressão. A nova CSS media screen e as legendas não aparecem na impressão.

Os testes operacionais herdados continuam exercitando cadastros/PIX/prestadores, estoque/venda/recibo/estorno, caixa, títulos/baixas, recorrência/parciais/comprovantes/OFX/painel/relatórios e serviços/pedidos. Seus arquivos não foram alterados. Público conserva conteúdo, acesso/login/logout, âncoras/histórico, zero APIs/dados privados, menu e movimento reduzido.

## Tentativas preservadas

1. Launcher inicial procurou direction diretamente em Subcategory; o contrato correto usa category_id e Category.direction. Corrigido somente no script de fixture. Log launcher-attempt1.log preservado.
2. Primeiro candidato foi iniciado antes de existir dist; o servidor original só monta o catchall ao iniciar com dist disponível. A primeira captura recebeu 404. Ambos os builds ficaram prontos e os servidores próprios foram reiniciados; nenhuma alteração de backend. Launcher agora verifica builds e reutiliza a fixture isolada existente.
3. Probe AST inicial usava printer com diferenças de whitespace/trailing comma. Foi substituído por comparação estrutural kind/text/children, mantendo as mesmas chamadas/handlers. Diferenças iniciais foram preservadas e não eram mudanças de regra.
4. Primeira rodada nova: 13 aprovados/5 falhas. Três eram seleção exata pelo label de Itens por página com opções embutidas; duas eram viewport vertical do cabeçalho durante rolagem horizontal. Selecionador foi delimitado à página e o teste rola o alvo verticalmente antes de verificar o viewport, mantendo a prova de ArrowRight/scrollLeft.
5. Segunda rodada: 21 aprovados/3 falhas; a substituição do seletor não havia atingido o formato multiline. Corrigida e conferida no arquivo, sem alterar aplicação.
6. Terceira rodada: 24/24 aprovados. Na revisão visual final, a faixa de períodos ainda herdava width=max-content e rolava parcialmente no celular. Delimitada a largura somente em Ledger para envolver todos os botões; acrescentadas asserções dos sete presets no viewport. A repetição em base funcional acumulada trouxe 22 aprovados/2 falhas por falta de Estornar nos primeiros 20 registros já cancelados. O teste passou a pesquisar a fixture ativa SB05 02; rodada final utiliza nova cópia da fixture mestre. Todas as rodadas e artifacts anteriores permanecem no pacote.

## Visual e limites

30 capturas baseline e 30 candidatas: Lançamentos, foco, última coluna, dois diálogos e cinco telas preservadas nas três larguras. Matriz de overflow/Inter/erros JS e contraste textual local; baseline tinha 261 ocorrências amostradas com contraste baixo na Ledger (repetições das linhas incluídas), candidato zero. Não certifica acessibilidade integral do ERP, contraste de todas as partes do calendário nativo ou leitores de tela reais.

P01 retorno de foco dos modais permanece anterior; Modal não foi alterado. P02 original permanece em Pagar/Receber. P05 parcial, conforme descrito. P06 corrigida só em Ledger. Demais pendências e dispositivos físicos continuam para escopo/revisão próprios. Não foram reexecutadas todas as suítes históricas de Home/sessão; fontes de navegação/autenticação/permissões permanecem intactas, backend/perfis e público foram revalidados.
