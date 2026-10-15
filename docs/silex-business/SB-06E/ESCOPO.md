# SB-06E — Escopo e baseline

Referência aprovada: `dfa489a49fd7c59e6ca89a1ce6824f2f0a42ee35`. Branch `feat/sb06e-final-validation`, criada diretamente desse commit. Workspace inicial limpo; main preservada no baseline SB-04B. `git fsck --no-reflogs` válido, com quatro blobs dangling históricos; nenhum histórico reescrito. Sem remoto configurado.

Somente instrumentos e documentação serão alterados. Código de produção, CSS, fontes/SVG, backend, contratos, banco persistente, autenticação, permissões, rotas, regras e impressão permanecem intactos. Backup externo inclui os 395 arquivos rastreados em arquivo Git verificável e hashes de bancos persistentes e ZIPs históricos. Os bancos reais não serão abertos; apenas hashes lidos.

## Cobertura planejada

- Execução integrada dos 13 arquivos E2E principais em três larguras: fluxos reais, navegação/sessão/permissões, Home/público, finanças, datas, acessibilidade e piloto CSS. Não repetir a matriz SB-06D.2 de 201 estados × 71 propriedades, pois não há mudança de produção.
- Suíte de Modal em fixture separada: evita pré-condições incompatíveis de fechamento de caixa. Sem retries.
- Sondas novas de inventário: 26 superfícies × cinco larguras; diagnósticos dirigidos de conteúdo com texto ampliado, V01 durante carregamento e T01 com prontidão observável.
- Comparação JSON/CSV/impressão entre duas instâncias do mesmo commit, com cópias idênticas da fixture sintética, antes das suítes mutáveis. Tipos, build, unitários e backend executados em cópias isoladas.
- Tentar zoom nativo em Firefox com janela isolada; não equiparar CSS zoom ou viewport reduzida a zoom de navegador. Leitor de tela só será considerado executado se houver ambiente configurado e observação real.

Qualquer falha de produto será registrada com gravidade, evidência e proposta para autorização separada. Um teste aprovado não encerra V01/T01 nem prova prontidão comercial, multitenancy ou conformidade WCAG integral.
