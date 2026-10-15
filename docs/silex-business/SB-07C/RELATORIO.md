# Silex Business — SB-07C

**Entrega para revisão.** Incremento exclusivo de entrada brasileira de datas. Não houve SB-07D, correção de C02, push, merge ou deploy.

## Implementado

- `SilexDatePicker`: React Aria Components 1.22.1, @internationalized/date 3.12.4, CalendarDate gregoriano e locale fixo pt-BR. Segmentos dia/mês/ano, calendário, teclado, limpeza, validação, limites, rótulos, erro, disabled/readOnly e integração com Modal existente.
- `SilexMonthField`: seleção explícita de mês e edição de ano, MM/AAAA, sem inventar data no primeiro dia nem impor faixa fixa de anos.
- Migração completa de **20 declarações civis e duas mensais**, com contratos YYYY-MM-DD/YYYY-MM preservados. Reuso por rota está explicitado no inventário, corrigindo a ambiguidade de contagem do baseline histórico.
- Estados iniciais, obrigatoriedade e limites preservados. Nenhum timestamp é convertido em data civil; não se usa `new Date(ISO)` na camada de entrada.
- Edição parcial fica local; não envia ISO parcial nem apaga valor anterior sem ação apropriada. Seleção de calendário/limpeza são explícitas. Dados inválidos e limites bloqueiam o formulário.
- CSS restrito aos novos controles. Calendário cabe no Modal sob zoom nativo e sua grade amplia sem sobreposição; texto ampliado pode usar rolagem interna, mantendo cabeçalho e ações.

Não há máscara própria, calendário recriado nem sobreposição de texto sobre input nativo. Inputs auxiliares invisíveis pertencem à implementação documentada do React Aria.

## Arquitetura e preservação

Os formulários continuam recebendo strings ISO. O adaptador substitui apenas a origem da entrada. Pagar/Receber e o filtro mensal passam por validação nativa de um formulário semântico antes da mesma ação existente; handlers financeiros assíncronos e expressões `api(...)` dos sete consumidores são idênticos por AST.

Backend, schema, banco persistente, autenticação, permissões, navegação, shell, estilos globais, identidade, templates e regras financeiras foram preservados. Somente bancos descartáveis com dados fictícios foram usados nos testes. Todos os arquivos originais fora da lista autorizada são conferidos por SHA-256; o backup completo tem restauração ensaiada em temporário.

O Popover utiliza a API pública tipada `UNSTABLE_portalContainer` da versão fixada para permanecer dentro do `dialog.showModal()` existente. A depreciação dessa API está documentada como risco de manutenção; não foi adicionada outra dependência direta nem desativado P01. Detalhes em [ARQUITETURA.md](ARQUITETURA.md).

## Validação

- TypeScript e build aprovados; **121 testes frontend e 69 backend** aprovados.
- Firefox e Chromium: datas brasileiras nos locales pt-BR/en-US; componente também em de-DE e três fusos horários.
- Piloto e demais formulários: payloads ISO, filtros, títulos, resultados financeiros e competência equivalentes ao baseline.
- Comparação visual nas larguras 1440, 768, 375 e 320; calendário adicional em 291 px.
- Teclado, foco/Modal, erro, limites, texto 200%, contraste e alvos medidos. Zoom Firefox **nativo** 200/400 confirmado por DPR/viewport/CSS zoom.
- Regressão ampla: 90 casos aprovados inicialmente, dois instrumentos de visibilidade adaptados e aprovados, três cenários de expiração não executados por depender de manifestos antigos. Regressão móvel dirigida 14/14. Tentativas e limites completos em [TESTES.md](TESTES.md), sem retries para ocultar falhas.

## Custo e riscos

Duas dependências diretas aprovadas e onze transitivas novas (13 pacotes ao todo); Apache-2.0 nas diretas, Apache-2.0/MIT nas transitivas e zero vulnerabilidades na auditoria de instalação. Nenhuma versão preexistente foi atualizada. Chunk autenticado App: 163,56→404,41 kB; gzip 43,35→121,84 kB. A página pública mantém seu chunk e CSS. O aumento é um custo explícito da camada acessível; não foi feita refatoração de bundle.

P05 fica **corrigida nos campos editáveis civis/mensais, parcial no registro global**: CSV/impressão ISO seguem contratos anteriores. Participantes, leitor de tela real, dispositivo físico e ponteiro sob zoom nativo não foram homologados. P07 parcial, C02 aberta para SB-07D e V01/T01 em acompanhamento.

## Git e revisão

Branch `feat/sb07c-ptbr-dates`, criada diretamente do aprovado `fddcb66d18ba22fc1c07700852cd2f5a5c6b6ed8`. Histórico anterior preservado; `main` continua no baseline antigo, sem integração automática. Commits de código: `5707c2a`, `7ab533d`, `13a17bc`, `56f51b5`, `e045223`; validação: `f5e0303`. O commit de documentação contém este relatório; o pacote externo registra seu hash final e estado Git.

[Inventário dos campos](INVENTARIO-DATAS.md) · [Testes](TESTES.md) · [Reprodução](REPRODUCAO.md) · [Recuperação](RECUPERACAO.md) · [Galeria](../../evidence/sb07c/galeria.html).

A relação completa de arquivos, diff, hashes, commits, manifestos e evidências selecionadas acompanha o ZIP. Próximo passo recomendado: revisão desta migração e homologação humana/assistiva dirigida. Nenhum incremento posterior foi iniciado; aguardar autorização explícita.
