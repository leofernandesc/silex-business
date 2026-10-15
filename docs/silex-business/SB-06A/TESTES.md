# SB-06A — Validação e matriz de testes

Todos os testes usaram fontes/builds em cópias isoladas e bancos temporários com dados fictícios. O teste de expiração modifica exclusivamente a sessão do SQLite descartável indicado pelo manifesto; os guards originais foram preservados. Nenhum teste apontou para o banco persistente.

## Resultados finais

| Verificação | Resultado |
| --- | --- |
| TypeScript + build Vite, baseline/candidata | Aprovados |
| Vitest, baseline/candidata | 71/71 em cada versão, 11 arquivos |
| TypeScript estrito do teste novo | Aprovado |
| Backend pytest | 69/69; aviso de depreciação Starlette/httpx preexistente |
| E2E principal, três projetos | 168/168, sem skips/retries |
| E2E adicional de fontes computadas 200% | 3/3, sem skips/retries |
| Total de cenários E2E distintos | **171/171** |
| Cabeçalho: 24 telas × sete larguras, por versão | 168 medições em cada versão; candidata sem excesso nem sobreposição dos grupos |
| Integridade dos três bancos descartáveis | integrity_check=ok; foreign_key_check sem erros |
| Consultas de negócio baseline/candidata | 7 respostas JSON integralmente iguais |
| Pixels desktop/tablet, Login e público | 9/9 pares idênticos |
| Sintaxe dos scripts JS/Python e diff whitespace | Aprovados |
| Lint | O projeto não possui script/config dedicado; nenhuma ferramenta instalada |

| Suíte | Aprovados |
| --- | ---: |
| header-reflow.spec.ts | 15 |
| navigation.spec.ts (SB-03/P03/P08) | 36 |
| home.spec.ts | 24 |
| public.spec.ts | 21 |
| app.spec.ts | 27 |
| ledger-interface.spec.ts | 24 |
| ledger-summary-responsive.spec.ts (V02) | 3 |
| dashboard-interface.spec.ts | 21 |

Os 15 cenários novos executam as mesmas verificações em três projetos: largura padrão estreita, administrador e operador com nomes longos, raiz a 200% e duplicação dos tamanhos de fonte efetivamente calculados. Cada perfil percorre 1440/1024/768/375/320/256/187 px, verifica limites dos elementos, painel aberto sem excesso, foco inicial, Tab/Shift+Tab, submenus, Escape, botão Fechar, retorno ao acionador e logout. O operador não vê financeiro/administração; o backend mantém 403 real. A ampliação efetiva confirma breadcrumb de 11→22 px em desktop/tablet e 10→20 px em celular, sem extrapolar o header.

Os testes herdados preservados cobrem login inválido/válido, persistência e expiração real da sessão temporária, retorno ao destino protegido, refresh, Voltar/Avançar, hashes antigos, tentativas de URL negada, 401/403, logout com falha de rede e recuperação, P03 e mudanças de breakpoint. Os fluxos operacionais cobrem cadastros/PIX, estoque, venda/estorno, serviço/custos, caixa, baixa financeira, conciliação OFX já existente e impressão/exportação, somente no banco descartável.

## Comparação e cobertura visual

A matriz CSV e os dois JSON de medições contêm viewport/documento, medidas dos grupos, controles e excedentes. A candidata tem zero casos de overflow do header e zero sobreposição dos grupos em 168 combinações. O conteúdo normalizado das 23 telas fora Histórico de operações é igual; a tela de auditoria reflete os logins/timestamps próprios de cada base. Configuração empresarial, Visão Geral, Dashboard Financeiro, Lançamentos, contas, vendas e estoque retornam JSON igual nas duas bases visuais preservadas.

Capturas antes/depois incluem sete larguras de Lançamentos, as 24 telas em 375 px, nomes longos em dois perfis, painel aberto/fechado, foco de teclado, fonte ampliada e Login/público. O recorte do header em 1440/1024/768 e as seis capturas Login/público em 1440/768/375 têm pixels idênticos. As tabelas continuam com sua rolagem interna; nenhum controle do cabeçalho foi ocultado ou reduzido.

## Baseline e tentativas iniciais

- O teste estreito novo falha contra o baseline em 320 px: grupo direito e Sair terminam em x=325, header scrollWidth=335. A mesma asserção passa na candidata. O ensaio de raiz a 200% passa no baseline na repetição isolada. Log: `tests/baseline-targeted.log`.
- Dois primeiros testes com nomes longos falharam no painel baseline: scrollWidth 324 para largura 250. Um ensaio inicial de raiz teve timeout de automação em execução concorrente; sua causa não foi comprovada, e a repetição isolada passou. Não é contado como falha financeira ou regressão CSS.
- A primeira suíte ampla foi interrompida com 7 aprovados, uma falha e 160 cenários não executados porque o teste antigo considera qualquer origem diferente de `127.0.0.1:8011` externa. O servidor temporário foi movido de 18562 para 8011 e a fixture funcional foi recopiada; a suíte original passou 168/168, sem mudar asserções.
- Duas coletas iniciais encontraram timeout de screenshot; os logs locais permanecem. A coleta final de medições/cabeçalhos completou, e as capturas Login/público já válidas foram conferidas por pixels. Nenhum arquivo histórico anterior ao incremento foi alterado.

## Limites de zoom e acessibilidade

O ensaio de viewport equivalente a 320 px verifica o recorte geométrico de reflow. As larguras de 256/187 px são robustez adicional, não outro requisito normativo para conteúdo vertical. [Referência W3C](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Aumento da raiz foi separado do teste que efetivamente duplica fontes em px. Ambos são simulações por CSS. O Firefox com janela isolada/Xvfb e eventos nativos XTest não demonstrou mudança confiável de viewport/DPR ao tentar 200%; por isso 400% não foi executado como zoom comprovado. Não se apresenta viewport reduzida, raiz a 200% ou captura X11 como homologação de zoom nativo. As tentativas e seus estados estão em `zoom-limitations.json` e nos logs locais.

Leitor de tela real, dispositivos físicos, zoom nativo 200/400 e conformidade WCAG integral não foram homologados. R02 está validada no escopo geométrico/teclado descrito. A Visão Geral e a Home com identificação longa conservam limitações próprias nas larguras extras; [diagnóstico](DIAGNOSTICO.md). P01/P04/P05/P07/P09 e V01 mantêm os estados documentados.
