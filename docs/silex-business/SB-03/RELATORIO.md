# Silex Business — SB-03

**Estado: concluído tecnicamente, aguardando revisão explícita. SB-04 não iniciado.**

## Implementado

- Registro único das 23 telas e alias legado; menu e guard reutilizam disponibilidade dos papéis existentes. P08 corrigida: operador não vê financeiro/administração; destinos negados não montam componentes restritos. Backend continua autorizando cada pedido.
- Login em `/entrar` e módulos em `/app#id`; hashes operacionais antigos preservados. A entrada autenticada continua a Visão Geral. `/` permanece entrada transitória; `home` é reservado, com mensagem e fallback ao dashboard. Não há páginas públicas ou home fictícias.
- Retorno seguro ao módulo solicitado após login, persistindo só ID na aba; normalização por replace, navegação por push e coordenação de Voltar/Avançar/refresh. Destinos externos/desconhecidos e negados não concedem acesso.
- Coordenação de 401/403, respostas obsoletas, logout confirmado/expirado/falha de rede. Saída remove apresentação privada imediatamente; falha de revogação é informada com nova tentativa e bloqueio de reentrada automática nesta aba.
- P03 corrigida: painel móvel modal com foco inicial, Tab/Shift+Tab, submenus, Escape, fechar/backdrop, retorno ao acionador, inert no conteúdo encoberto e menu fechado, e foco acessível na mudança de breakpoint. Desktop não modal.
- [Registro central de P01–P09](../PENDENCIAS.md); somente P03/P08 encerradas com testes.

## Preservado

Identidade Silex/Inter/SVGs/tokens, CSS e shell visual do SB-02.3, grupos atuais, main com remontagem por rota, Visão Geral/indicadores/consultas, módulos/formulários/cálculos financeiros, PIX/estoque/vendas/serviços, templates e dados empresariais.

Backend, banco persistente, migrations, contratos, cookies/credenciais, política de autorização, assets/fontes, dist/tsbuildinfo do checkout e evidências dos incrementos anteriores mantêm os hashes iniciais. Nenhuma dependência instalada, deploy ou merge.

Silex Business continua marca fixa, company_name identifica empresa e brand_name é nome de apresentação legado. Não criamos precedência nova nem multitenancy: o backend atual usa configuração empresarial global.

## Arquivos de código

Modificados:

- `frontend/src/App.tsx`: integração de sessão/navegação, menu uniforme e ARIA/inert/foco; mantém telas funcionais e composição do login.
- `frontend/src/api.ts`: erro com status e proteção contra evento obsoleto de sessão, preservando requests/cookie/contratos/helpers.
- `frontend/src/financePlanning.tsx`: exclusivamente assinatura e callback de navegação do atalho Abrir livro caixa.

Novos:

- `frontend/src/navigation/routes.ts`, `useAppNavigation.ts`, `useMobileNavigation.ts`.
- `frontend/src/navigation/routes.test.ts`, `frontend/src/api.test.ts`, `frontend/tests/navigation.spec.ts`.

Relação completa, incluindo documentos/evidências: [ARQUIVOS.md](ARQUIVOS.md). [Diff de produção](../../evidence/sb03/production.diff) e fontes afetadas integram o ZIP de revisão.

## Validação

- **38/38 unitários**, **69/69 backend**, **36/36 novos E2E** e **27/27 E2E existentes**.
- TypeScript, build e formatação dos novos arquivos passaram; projeto não possui lint dedicado.
- Desktop/tablet/celular: 64 capturas comparativas, nenhum overflow global, erro JavaScript ou requisição externa nas capturas. Seis smoke cases FastAPI/Vite passaram.
- 23 módulos + alias testados por link legado; todos os destinos administrativos negados ao operador. Backend 403 real e mutação administrativa recusada. Sessão expirada real testada no SQLite descartável.
- Seis consultas de negócio retornaram JSON idêntico entre fixtures equivalentes. DashboardPage, helpers de query/CSV e demais módulos preservados; financePlanning tem apenas mudança de callback.
- Cinco SVGs oficiais verificados por XML e hash; Inter 400/600 carregada localmente.
- Backup ensaiado antes e depois em cópias, com restauração dos originais e remoção dos novos arquivos do incremento.

As tentativas iniciais/falhas e suas correções estão registradas em [TESTES.md](TESTES.md); não foram omitidas ou atribuídas a problemas anteriores sem análise.

## Revisão disponível

- [Comparativo visual antes/depois](../../evidence/sb03/comparativo.html).
- Painéis: [1440](../../evidence/sb03/contact-sheet-1440.png), [768](../../evidence/sb03/contact-sheet-768.png), [375](../../evidence/sb03/contact-sheet-375.png).
- [Arquitetura e transição](ARQUITETURA.md), [testes/matriz](TESTES.md), [preservação/recuperação](PRESERVACAO.md), [reprodução](REPRODUCAO.md), [recomendações SB-04](RECOMENDACOES-SB04.md).
- [Manifesto de preservação](../../evidence/sb03/preservation-test.json), [recuperação](../../evidence/sb03/backup-integrity-final.json), [resumo de testes](../../evidence/sb03/tests-summary.json).

## Riscos e aprovação

P01/P02/P04–P07/P09 permanecem abertas. Leitor de tela real, dispositivos físicos, exportação nativa em sessão expirada, sincronização entre abas e hosting externo não foram homologados. Falha de logout de rede não revoga a sessão remotamente até nova tentativa/expiração; essa condição é mostrada na interface.

O backup restaura todos os três arquivos existentes alterados; a reversão integral de código também remove os seis novos arquivos listados. Alterações posteriores do usuário devem ser conferidas antes de restaurar.

Solicita-se revisão técnica/visual do SB-03 e confirmação da navegação e dos estados de sessão. Depois de aprovação, o próximo incremento recomendado é SB-04: criar as páginas reais pública e home e só então ativar seus destinos padrão. **Não há autorização presumida para começar SB-04 ou publicar.**
