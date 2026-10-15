# SB-07B — Homologação dirigida dos campos de datas

## Estado

Instrumentos e roteiro preparados para revisão. O incremento não altera arquivos de produção. **Nenhuma avaliação humana foi realizada**, portanto não há conclusão sobre compreensão real da legenda. P05 continua parcial.

## Base e Git

Branch `test/sb07b-date-validation`, criada sobre o HEAD aprovado SB-07A `0ea8ed077afba7c00779f81be765d1bacfbd3ae1`. A `main` continua no baseline SB-04B e está 63 commits atrás do HEAD desta branch no início do trabalho. Nenhuma integração, push ou deploy foi feita.

## Preparação reproduzível

O [roteiro do participante](ROTEIRO-USUARIO.md) e a [ficha do observador](FORMULARIO-OBSERVADOR.md) cobrem as tarefas solicitadas. A ficha deixa em branco o resultado humano e separa o que a pessoa disse da expectativa técnica. Para uma leitura não induzida, o facilitador prepara antes um registro de referência em 04/03/2026 e deixa a edição aberta; o participante recebe somente a folha de tarefas, sem o valor esperado.

Execute `bash docs/silex-business/SB-07B/start-homologation.sh` a partir do checkout revisado. O script arquiva o HEAD, compila em uma cópia temporária, cria e semeia SQLite fictício dentro de diretório `0700`, e serve em `127.0.0.1:18083` (ou porta definida em `SILEX_SB07B_PORT`). `Ctrl+C` interrompe o servidor e remove todo o diretório temporário. Nenhum banco persistente é lido ou alterado. A senha do usuário demonstração é mantida fora dos artefatos; o facilitador deve consultar as instruções locais do projeto e não registrar a credencial.

O teste automatizado SB-07B abre o formulário no locale `pt-BR`, verifica `input[type=date]`, idioma, legenda/`aria-describedby`, required vazio, foco por teclado e valor ISO da data fictícia. Não salva serviço nem título e não tenta inferir a compreensão humana ou o popup nativo. `frontend/playwright.sb07b.config.ts` aponta para esse único teste, Firefox desktop e servidor já iniciado. Credencial é lida de `SILEX_TEST_PASSWORD`.

## Auditoria dos campos restantes

O código de produção contém 20 declarações `type=date` e duas `type=month`; o componente compartilhado `Dates` é montado em Vendas e Estoque, elevando a 22 os controles `date` em execução. Treze declarações usam o `LedgerDateField`. Sete declarações sem legenda, com os dois campos de `Dates` usados em duas telas, resultam em nove controles sem conferência explícita. Testes e fixtures estão excluídos da contagem. Os dois controles de mês preservam a granularidade mês/ano.

A [matriz detalhada](MATRIZ-DATAS.md) prioriza: (1) vencimento em venda a prazo e referência do saldo inicial, com possível impacto financeiro; (2) intervalos de relatórios financeiros; (3) filtros de Vendas/Estoque; (4) saída CSV/impressão em ISO, em etapa própria. O componente `Dates` é compartilhado por Vendas e Estoque e exige validação cruzada. Os filtros e editores financeiros já legendados seguem candidatos a avaliação humana, não são considerados compreendidos sem participantes.

## Limites de navegador e dispositivo

O Firefox disponível já foi usado no SB-07A para conferir legendas, valores ISO, criação/edição e persistência em pt-BR/Manaus e en-US/Kiritimati. A renderização nativa observada antes da correção foi `03/04/2026` para ISO `2026-03-04`; no estado aprovado, a legenda correspondente é `Data: 04/03/2026`. No SB-07B o Chromium/Chrome não está instalado nem disponível no cache local, e nenhum software foi instalado. Um celular físico não foi disponibilizado. Comportamento do popup de calendário deve ser observado pelo participante no navegador/dispositivo efetivamente utilizado; automação DOM não valida a janela nativa.

## Recomendação e pendências

Manter a legenda atual durante a avaliação; não remover nem substituir controles nativos com base em testes automatizados. Se participantes ainda relatarem dúvida, avaliar a solução junto a teclado, leitor de tela e navegador móvel antes de qualquer alteração de produção.

P05 permanece **parcial**, com três campos de Serviços tecnicamente validados em SB-07A e eficácia humana ainda não medida. Permanecem fora do escopo: C02; P07 parcial; V01/T01 em acompanhamento; leitor de tela real; segurança de produção e isolamento multiempresa. Nenhuma dessas pendências foi encerrada neste trabalho.

## Evidências

Registros automatizados, capturas e manifesto do preparo estão no pacote de revisão. Os testes automatizados provam estrutura, foco, valor ISO e ausência de mutação; não comprovam que um usuário entenda a data nem que consiga operar o popup nativo. Consulte `RESULTADOS-HUMANOS.md`: estado explícito `NÃO EXECUTADO` até haver observação real.
