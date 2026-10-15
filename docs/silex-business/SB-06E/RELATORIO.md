# Silex Business — SB-06E

**Validação consolidada pronta para revisão. Nenhum código de produção alterado.** Sem push, merge, deploy ou nova funcionalidade.

Referência aprovada: `dfa489a49fd7c59e6ca89a1ce6824f2f0a42ee35`. Branch `feat/sb06e-final-validation`, criada diretamente dessa referência. Git inicialmente limpo, íntegro e sem remoto; as branches anteriores pertencem à cadeia ancestral preservada. `main` permanece no baseline SB-04B. Os hashes completos dos commits finais, status, diff e relação de arquivos estão em `git-summary.txt`, `review.diff` e `file-inventory.json` no pacote, gerados após o commit de documentação para evitar autorreferência de hash.

## Parecer técnico

| Decisão | Parecer | Condições |
|---|---|---|
| Revisão final do rebranding | **Apto, com ressalvas explícitas** | Identidade/interface preservadas; impressão backend e documentação raiz ainda têm legado Gestão |
| Homologação controlada | **Apto como atividade de validação** | Ambiente isolado, dados fictícios, acompanhamento, roteiro manual e riscos conhecidos. Não é aceite de todos os requisitos nem uso produtivo |
| Lançamento comercial | **Não comprovadamente apto** | Implantação/segurança, homologação assistiva e operação comercial ainda pendentes; SaaS multiempresa não implementado |

[Prontidão/checklist](PRONTIDAO.md), [15 riscos com gravidade, evidência, reprodução, proposta e aceite](RISCOS.md), [roteiro manual](HOMOLOGACAO-MANUAL.md). Não houve bypass demonstrado nos perfis testados; isso não é auditoria exaustiva de segurança. Não há isolamento por cliente/CNPJ ou gestão de assinaturas. Empresa atual é uma configuração global.

## Cobertura e resultados

- **26 superfícies**: 23 telas operacionais, Início, login e público. Alias legado de Fornecedores mantido sem contar como tela nova. Inventário registra recursos realmente existentes, fontes, perfis e limites. [Inventário](INVENTARIO.md).
- **130 medições normais**, nas larguras 1440, 1024, 768, 375 e 320: documento sem excesso horizontal em todas. Capturas representativas nas três larguras principais, formulários/foco/menu e estados adicionais.
- **96 testes frontend, 69 backend, TypeScript e build aprovados**. Duas compilações do código aprovado geram 16 arquivos iguais.
- **357 E2E aprovados**, sem falhas, skips ou retries: 285 integrados + 72 modais em outro banco. Login inválido/válido, sessão real expirada, logout/falha de rede, retorno validado, histórico/refresh/hashes antigos, perfis A/O, P03/P08, Home/Visão Geral, operações e acessibilidade incluídos. [Matriz e limites](TESTES.md), [matriz de acessibilidade](ACESSIBILIDADE.md).
- **35 respostas JSON e 30 exportações/impressões iguais** em clones sintéticos idênticos; **17 checkpoints financeiros iguais** em criação, baixa parcial/integral/idempotência, encargos/desconto, estorno, cancelamento e OFX manual. Não foram comparados tokens ou timestamps gerados como se fossem valores financeiros. API/ISO/saldos/centavos e regras permanecem intactos.
- **V01: 90/90 cliques**, 60 carregados e 30 com entrega da resposta real retida apenas pelo teste durante UI busy. Destinos, sessão, carregamento, eventos e console/rede registrados. **T01: 21 testes originais e 15 sondas adicionais aprovados**. Ambos continuam em acompanhamento, sem causa histórica demonstrada.

A matriz SB-06D.2 de 201 estados/581.135 propriedades não foi repetida: não existe mudança de CSS/produto. Sua evidência é referenciada como anterior; não é contada novamente como execução atual. A seleção integrada cobre fluxos e requisitos relevantes à decisão final, sem reproduzir toda a matriz combinatória histórica.

## Zoom real e acessibilidade

Desta vez foi possível executar **zoom nativo no Firefox 155 com janela isolada em Xvfb**, usando eventos X11 reais e estabilização de frames. Sem emular viewport: área inicial 1280 CSS px/DPR 1; a 200%, 640/DPR 2; a 400%, 320/DPR 4. CSS zoom e escala de visualViewport permanecem 1.

Oito superfícies em cada nível — público, Início, Visão Geral e cinco telas financeiras — totalizam **16 estados confirmados, documento=viewport**. Menu da Home conserva Enter/Escape/retorno de foco nos dois níveis. Isso atende ao ensaio dimensional de reflow escolhido, não certifica WCAG integral, todos os controles nativos, leitores ou plataformas.

O Orca está instalado, porém desativado e sem processo ativo. **Não foi realizada homologação com leitor de tela real.** Há roteiro com ambiente, casos, ações, anúncios esperados e registro de não executado. Toque físico, outros navegadores/SO e drivers/PDF também precisam de homologação.

P01/P02/P03/P04/P06/P08/P09/V02/R02 preservam seus respectivos recortes aprovados; 23 instâncias atuais de Modal, com testes de componente e fluxos reais. Não se generaliza uma correção pontual a conformidade global.

## Problemas que permanecem

### C01 — conteúdo com ampliação computada de texto

A simulação de fontes do conteúdo a 200%, distinta de zoom nativo, conserva excessos no baseline e na candidata:

| Tela/cenário | Viewport/documento | Causa confirmada |
|---|---|---|
| Visão Geral | 1440/1477, 375/440, 320/412 | Mínimo intrínseco/valor nos indicadores |
| Lançamentos | 768/854 | Texto monetário de 393,83 px para coluna de 357 px |
| Lançamentos | 320/348 | Trecho do h1; independente dos cartões V02 |
| Pagar/Receber | 768/850 | Texto `nowrap` escapa da caixa de valor; detectado por range/scrollWidth |

Busca/Pesquisar permaneceu alcançável por Tab, com foco e botão completo nas amostras. Não foi demonstrado bloqueio desses controles essenciais; há risco alto de leitura financeira no cenário ampliado. Sem mudança incidental de layout ou ocultação de overflow. [Diagnóstico completo](RESPONSIVIDADE.md).

### C02 — conteúdo em larguras adicionais

Home com nome sintético não separável: documento 281 em 256/187, igual nas duas versões. Visão Geral: 222 em 187. Header global cabe. Essas larguras são robustez adicional, não a referência normativa de 320 CSS px. Não confundir com R02 corrigida.

### P05 — parcial, risco de interpretação

Em Firefox pt-BR, o valor ISO `2026-03-04` aparece no campo nativo como `03/04/2026`. Em Pagar há conferência **Data: 04/03/2026**; em Serviços não existe descrição equivalente. ISO e requests estão corretos; a possibilidade de o usuário inverter a interpretação é relevante e não deve ser chamada apenas cosmética. Recomenda-se proposta separada de conferência brasileira nos campos faltantes e teste humano; nenhum editor customizado foi implementado.

### P07 e outros limites

P07 permanece parcial; os oito CSS, tokens, ordem de imports e impressão são byte a byte iguais ao baseline. Manter o restante da cascata até necessidade concreta. V01/T01 continuam em acompanhamento. Erros auxiliares/expiração do upload OFX, fallback zero acompanhado de Notice em falha de Dashboard, impressão Gestão/ISO e README legado estão explicitados na matriz de risco, sem correção fora do escopo.

## Preservação, Git e recuperação

Backup externo verificado dos **395 arquivos aprovados**. Dos arquivos preexistentes, **394 permanecem iguais**; somente `PENDENCIAS.md` é atualizado. Fontes novas são documentos e instrumentos de teste. O verificador confirma **103 arquivos de produção/ativos/backend/configuração** no subconjunto funcional e todo o manifesto rastreado, além dos hashes dos arquivos de banco/WAL/SHM e ZIPs históricos. Nenhuma fonte funcional pode diferir; nenhum banco real foi consultado ou modificado.

Restauração ensaiada em árvore temporária: aplica alterações/adições do incremento, restaura o documento original, remove os novos caminhos e recupera os **395 hashes**. Não houve reset/clean/rebase nem alteração de histórico. [Recuperação](PRESERVACAO.md), [reprodução e reconstrução dos temporários](REPRODUCAO.md), [arquivos](ARQUIVOS.md).

Os 357 E2E concluídos conservaram logs/JSON quando os temporários da sessão deixaram de existir. Ambiente reconstruído do arquivo aprovado; novos clones sintéticos gerados pelos construtores anteriores. Comparações financeiras foram repetidas e mantêm primeira evidência separada. Ocorrências de desenvolvimento dos instrumentos estão documentadas, sem relaxar asserções antigas ou mascarar falhas.

## Entrega e próxima decisão

- Galeria: `docs/evidence/sb06e/index.html`.
- ZIP compacto: `docs/evidence/sb06e/SB-06E-review.zip`, com manifesto SHA-256 e CRC verificados, diff, commits, relatórios e evidências essenciais.
- Relatórios e matrizes incluem inventário, testes, acessibilidade/responsividade, riscos e prontidão. O ZIP não inclui `.git`, banco, credenciais, caches ou builds; logs antigos completos permanecem locais.

Recomenda-se **revisar este pacote e executar a homologação manual controlada**, decidindo separadamente sobre correções C01/P05 e demais riscos. Nenhuma implementação seguinte foi iniciada. Não realizar lançamento comercial a partir apenas do encerramento do rebranding. Aguardar revisão e autorização explícita.
