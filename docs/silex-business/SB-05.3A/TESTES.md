# Validação — SB-05.3A

## Ambiente

Baseline aprovado b21a117, checkout inicialmente limpo. Fontes do baseline e candidata em `/tmp/silex-sb053a-f1ssxh1t`; dependências já instaladas reutilizadas, sem instalações. Quatro processos próprios nas portas 18040–18043. Fixture fictícia criada por seed/API existentes; bancos independentes para capturas e operações, sem usar data/ do projeto. Pytest usa suas próprias fixtures temporárias.

## Resultados finais

| Verificação | Resultado |
| --- | --- |
| Frontend baseline | 65/65, dez arquivos |
| TypeScript + Vite baseline | Aprovados |
| Frontend candidata | 65/65 |
| TypeScript + Vite candidata final | Aprovados |
| TypeScript estrito adicional do novo teste E2E | Aprovado |
| Backend original preservado | 69/69; um warning preexistente Starlette/httpx |
| Cenários novos da Conciliação | 21/21 validados, sete cenários nas três larguras |
| Suíte herdada: app, ledger, accounts, home, navigation, public | 189/189 casos validados após adaptar a porta de nove verificações, somente nas cópias temporárias |
| Comparação funcional baseline | 3/3; JSON igual à candidata nas três larguras |
| V01, clique real Abrir livro caixa | 60/60, 30 por versão, dez por largura |
| Estilos de elementos estáveis de nove telas preservadas | 27/27 comparações iguais |
| Preservação SHA-256 e AST, backup e restauração | Aprovados; manifesto de 2.323 originais |

Não existe comando de lint configurado. Nenhuma biblioteca foi instalada. Prettier foi aplicado somente aos arquivos novos e git diff --check não apresentou erros. Builds/tsbuildinfo ficaram nas cópias temporárias; dist/ do checkout não foi alterado.

Os 210 casos da candidata são a consolidação das suítes e revalidações direcionadas; não se afirma que a primeira execução inteira passou. tests-summary.json mantém a matriz final por caso/largura e os logs históricos completos permanecem locais. Não houve retries automáticos nem repetição de casos já aprovados sem uma alteração ou falha a justificar.

## Conciliação: cobertura funcional

- Histórico com 52 importações de demonstração, paginação de 50 e revisão de importação existente; tabela do extrato com sete linhas e todos os cinco estados. Não há busca/filtros de período nessa implementação.
- Seleção de conta bancária ativa, upload OFX, prévia, confirmação manual e sugestões reais do backend. Arquivo sem conta, inválido e maior que 10 MB mantêm validação/mensagem existentes.
- Fluxo idêntico nas duas versões: título de R$ 22,00, principal 22,00 + juros 1,00 + multa 0,50 − desconto 1,00 = baixa líquida de R$ 22,50; criação de receita 12,34 e despesa 3,50; linha de 0,01 ignorada. Variação da conta −R$ 13,66 em ambas. Título quitado, principal restante zero e importação Revisado/zero pendentes.
- JSON enviado pelo navegador, estados, datas, saldo e valores comparados. Repetição idêntica da confirmação retorna 200 sem duplicar baixa; reimportação produz quatro duplicadas e tentativa de conciliá-las retorna 409 sem alterar o saldo.
- Visitante recebe 401; operador não monta a página nem recebe menu/atalhos, e GET/POST protegidos respondem 403. Regras do backend permanecem idênticas.
- Estado vazio testado por stub restrito à consulta do histórico no navegador: validação de apresentação, não alteração da base nem prova de backend vazio.
- Não existe reversão/desfazimento de OFX, exportação/impressão ou exclusão de importação; nenhuma dessas funções foi inventada para teste.

## Responsividade e acessibilidade

1440/768/375: nenhuma largura de página excedente nas capturas finais principais. Tabelas preservam cinco colunas, permitem foco e setas e anunciam rolagem quando há overflow real. Última coluna/actions acessíveis. Valores pequenos, grandes e negativos têm uma linha e nenhuma elipse/corte; centavos preservados. Datas tabela/modal dd/mm/aaaa por dateOnly, sem mudança de timezone.

Foco verificado após entrada real na modalidade teclado, em controles e tabela. Diálogo conserva rótulos, modos, validações e ações. Estados são identificados por texto; menor contraste medido dos badges novos: 5,56:1. Fonte Inter local carregada. As comparações de nove telas abrangem títulos, ações de página, toolbars, cabeçalhos e indicadores estáveis; não equivalem a uma auditoria de contraste completa de todo o ERP.

Texto duplicado pelo tamanho computado, CSS zoom 200% e metade da viewport foram medidos em tabela e diálogo. Uma medição adicional encontrou scrollWidth 314 px em conteúdo de 311 px no diálogo móvel com texto 200%. Corrigido somente o coeficiente responsivo do valor (4.3cqw, mínimo 1rem/máximo 18px); medição final 311/311 px e número em uma linha. Sem alteração de money, dados ou Modal compartilhado.

R02 permanece: viewport187/documento252 em ambas as versões; painel da Conciliação candidata161/161. Simulação CSS zoom200 no celular: documento681 em ambas, root da Conciliação sem overflow adicional. As simulações automatizadas não certificam zoom nativo do navegador, leitor de tela ou dispositivo físico. P01 retorno de foco continua pendente; não se declara acessibilidade integral.

## Regressões e V01

Suítes anteriores validam Clientes, produtos/estoque/vendas/caixa, lançamentos, Pagar/Receber, Dashboard, Visão Geral, login/logout, público, Home, histórico/URLs antigas, 401/403, expiração e menu móvel P03/atalhos P08. P02/P06 continuam validadas nas duas telas de títulos. P05 permanece parcial, com editores nativos e templates legados fora deste escopo.

V01: runtime-baseline.json/runtime-candidate.json registram URL/hash antes/depois, largura, sequência, estado do menu/foco, bounding box, erros e aprovação de cada clique real. Foram 30/30 + 30/30 direcionados e o atalho também foi exercitado nas suítes herdadas. Nenhuma falha direcionada foi reproduzida; isso não explica a ocorrência anterior e não encerra V01. Roteamento não foi modificado.

## Tentativas e limites do ambiente

1. Primeiro E2E próprio: nove casos passaram e nove falharam em expectativas de foco acionado programaticamente após mouse e no nome inexistente demo.operator da fixture. Testes corrigidos para Tab antes do foco, espera do fim da transição de cor e nome de operador do seed existente. Os nove casos corrigidos passaram. Nenhuma mudança de autenticação ou permissão.
2. Capturas iniciais de tabs registravam a transição de 150 ms entre cores; capturas finais desativam animações para registrar o estado final. Duas primeiras tentativas do audit auxiliar pararam por um título de Estoque digitado incorretamente; seletor corrigido no script, sem modificar a página.
3. Firefox instalado não suporta o argumento bypassServiceWorker do protocolo de interceptação de rede da versão Playwright disponível. Estado vazio usa addInitScript/fetch apenas na consulta do histórico, sem instalação de navegador ou alteração da aplicação. Três cenários passaram após esse ajuste.
4. Suíte histórica inicial: 180 aprovados e nove falhas que assumiam porta8011 como mesma origem/URL. A aplicação retornava corretamente à porta isolada18042. Somente cópias temporárias de app/navigation/public foram adaptadas para18042, mantendo ações e verificações de mesma origem. Guards de diretório de home/navigation também usam o prefixo temporário deste incremento. Diffs/hashes acompanham o pacote; arquivos originais desses testes estão preservados. Primeira adaptação deixou o literal de regex com pontos escapados ainda em8011: seis passaram e os três casos de retorno exigiram corrigir a substituição do literal e repetir. Os três passaram; nove casos revalidados ao todo, sem mudar as expectativas de segurança.
5. Sondagem ampla de estilos incluiu opções ainda carregando e botões de linhas condicionais; não foi usada como prova de igualdade. A comparação final restringiu-se a elementos estáveis e passou em27/27. Isso não muda nem omite as verificações funcionais, feitas em suíte separada.

Logs iniciais, screenshots de falhas e traces permanecem locais. O ZIP inclui apenas evidências finais necessárias; traces/cookies e fontes de teste com credenciais fictícias não entram no pacote externo. Os nomes e registros empresariais nas capturas pertencem à fixture, identificados como fictícios.
