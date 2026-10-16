# F02 — Estados de consulta do Dashboard Financeiro

## Diagnóstico

Na versão aprovada de base (`80edb7415243543a129ee9d3d82b4adfc4998787`), `FinanceOverview` convertia dados ausentes em `R$ 0,00` por meio de fallbacks como `money(result.data?.income_cents || 0)`. Como `useLoad` limpa `data` após erro, uma resposta HTTP 503 produzia seis valores zero junto ao aviso de erro. Em uma atualização de período ainda pendente, os valores do período anterior continuavam visíveis.

## Correção

A apresentação local em `FinanceOverview` agora diferencia carregamento, erro e consulta concluída. Durante carregamento ou indisponibilidade, os seis cartões exibem travessão com texto explicativo; gráfico, tabela de valores mensais, classificações e contas exibem mensagens de estado, sem imitar um resultado vazio. Dados só aparecem quando a consulta atual termina com sucesso. Uma resposta legítima com valores zero mantém `R$ 0,00`, contagens zero, 12 meses e os estados vazios legítimos.

O erro conhecido de intervalo (`Data inicial deve ser anterior à final`) continua apresentado de forma específica. O botão **Abrir livro caixa** e os filtros permanecem disponíveis. Fórmulas, valores, campos ISO, query, API, permissões e navegação não foram alterados.

## Validação

- A reprodução no baseline confirmou seis zeros artificiais em falha 503 e valores antigos durante a atualização pendente de um novo período.
- TypeScript e build Vite: aprovados.
- Vitest frontend: 133 testes aprovados em 13 arquivos.
- Chromium: 5 testes novos de estado de erro e 4 regressões dirigidas do Dashboard aprovados.
- Firefox: os mesmos 5 testes novos e 4 regressões dirigidas aprovados.
- Os casos cobrem carregamento, valores reais, zeros legítimos, erro 500/503, falha de conexão, JSON inválido, troca de período, recuperação, preservação das seis métricas, tabelas/gráfico/listas e navegação ao livro caixa.
- O teste existente de intervalo inválido confirmou a preservação da mensagem específica. A comparação de sucesso verificou os seis valores renderizados contra a resposta da API, agrupamentos, saldos e período ISO.
- `git diff --check`: aprovado.
- A suíte backend não foi repetida: o incremento não altera backend, banco nem contrato da API; as falhas HTTP foram cobertas por respostas fictícias controladas no navegador.

As falhas foram simuladas com dados fictícios e respostas controladas no navegador; o percurso de sucesso e as regressões de navegação usaram o ambiente isolado existente. Não houve alteração de backend, banco, API, cálculos, estilos, autenticação ou autorização. Não foi feita homologação manual com leitor de tela ou dispositivo físico.
