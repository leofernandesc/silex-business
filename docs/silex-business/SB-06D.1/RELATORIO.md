# Silex Business — SB-06D.1

Datas e auditoria de CSS, exclusivamente. Baseline aprovado `aa4964d48c51fb8f56f29daf3b3a20401d2df2bb`; branch `feat/sb06d1-dates`. SB-06D.2 e SB-06E não iniciados. Sem push, merge ou deploy.

## Implementação

Produção limitada a **três arquivos**, sem CSS ou alteração de handlers:

- `format.ts`: dateOnly verifica a representação civil estrita e o calendário sem converter por fuso; válido continua dd/mm/aaaa. Vazio/inválido usa travessão. dateTime mantém pt-BR/America/Manaus para instantes válidos e evita RangeError ao exibir timestamp inválido.
- `reportDates.ts`: reutiliza financialMonthLabel para meses de cash-monthly, charges-monthly e discounts-monthly; no result-monthly troca apenas o sufixo mensal e preserva classificação/grupo.
- `financePlanning.tsx`: conecta o formatador apenas à apresentação da coluna group. Consultas, ordenação, cálculos, exportação e handlers são preservados.

Os controles date/month não foram substituídos. Não há máscara, componente customizado, dependência nova ou mudança de valor ISO. A correção protege apresentação; não acrescenta validação de formulário ou regra de vencimento.

## Auditorias

[DATAS.md](DATAS.md): 116 ocorrências AST em 15 arquivos frontend, incluindo wrappers/chamadas repetidas e 22 elementos input declarados; complemento de 252 limites de contrato/cálculo/backend em JSON. A matriz distingue civil, timestamp, mês, controle, API, impressão e risco. Público usa dados fictícios já brasileiros; Home/cadastros sem data operacional não recebem campos inventados.

[CSS-AUDITORIA.md](CSS-AUDITORIA.md): oito arquivos, 999 regras e 76 grupos de seletor/contexto repetidos, com declarações diferentes. Nenhum foi considerado removível automaticamente. Classes A/B/C, riscos de cascata global/print e plano incremental de SB-06D.2 estão documentados. **Todos os oito CSS permanecem idênticos byte a byte; P07 segue pendente.**

## Evidência suplementar da Home

A captura histórica baseline-home-375 do SB-06C mostra login Salvando, e não Home. O instrumento histórico aceitava título do login como prontidão após Entrar. A nova coleta exige login 200, URL exata, shell/Home e sessão 200. A comparação suplementar c2696e3 → aa4964d usa Home estabilizada em 375 px; não reescreve imagens, relatórios ou ZIP anteriores. [Diagnóstico e limites](HOME-SUPLEMENTO.md).

## Verificação funcional e acessibilidade

- 1827 datas civis válidas e quatro instantes mantêm exatamente a apresentação anterior; casos inválidos agora têm fallback controlado.
- 35 respostas JSON financeiras/estoque/vendas, incluindo os 26 relatórios, são idênticas em fixtures iguais.
- 30 respostas de CSV/impressão têm hashes idênticos. O ISO desses contratos não foi alterado.
- Os 40 handlers JSX de financePlanning e todos os exports não temporais de format.ts são idênticos.
- 24 rotas autenticadas × três larguras mantêm atributos dos controles de data, colunas e largura do documento. Nenhuma falha adicional de contraste textual nas amostras mensuráveis. Texto computado a 200% em Home/Relatórios mantém métricas e conteúdo.
- TypeScript, build Vite, frontend (71 baseline/96 candidata) e backend (69 por versão) aprovados. Datas: 25 casos em cada um de UTC, Manaus e Kiritimati.
- 348 cenários candidatos distintos finais passaram, além de seis comparações baseline; 60 cliques V01 chegaram ao destino. V01 continua em acompanhamento, com cancelamentos NS_BINDING_ABORTED durante navegação/reload registrados.
- 36 dos 45 pares PNG são byte a byte idênticos; os nove diferentes correspondem aos relatórios com meses reformatados (incluindo texto ampliado). Público, Home, demais módulos e nativos permanecem iguais nas capturas pareadas.
- Regressões, comparações ISO, modais e navegação são detalhados em [TESTES.md](TESTES.md) e test-results-summary.json; a falha de autoria do teste inicial é preservada separadamente.

## Preservação e entrega

Backup externo dos 350 arquivos aprovados, com hashes dos três arquivos do banco persistente. O ensaio de restauração recupera todos os 350 arquivos, remove adições em diretório temporário e verifica histórico de ZIPs. Backend, banco, contratos, regras, autenticação, permissões, rotas, fontes/SVG e templates permanecem intactos. [Reprodução e reversão](REPRODUCAO.md).

Galeria `docs/evidence/sb06d1/index.html`; ZIP `SB-06D.1-review.zip` na mesma pasta. O pacote contém evidências essenciais, diff completo, inventário de arquivos, commits, SHA-256 e originais efetivamente alterados; não inclui .git, banco, credenciais, traces, caches ou builds. As capturas completas e logs extensos permanecem localmente.

## Pendências e decisão seguinte

**P05 parcial:** desenho nativo, suporte month, tooltip mensal legado, impressão/CSV backend e casos indicados no inventário continuam limitados. quickPeriod dependente do fuso do host e timestamps sem offset são riscos preexistentes que não foram corrigidos modificando regras. [Alternativas para aprovação separada](INPUTS-NATIVOS.md).

**P07 pendente**, plano proposto. V01/T01 permanecem em acompanhamento, sem inferir resolução a partir de testes aprovados. Conteúdos Home/Visão Geral em larguras extremas, demais excessos preexistentes com texto ampliado, zoom nativo e leitor de tela real continuam registrados. Não se declara conformidade WCAG integral nem prontidão de produção.

Recomendação: revisar este pacote, decidir se controles de data uniformes/templates entrarão em autorização específica e, somente após aprovação, selecionar um lote pequeno do plano CSS. Nenhuma etapa posterior será iniciada automaticamente.
