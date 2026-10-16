# SB-07D — reflow de conteúdo C02

**Pronto para revisão no escopo validado.** Base `43f9d95f461b31b92253eef026a6b9e84d923309`, branch `fix/sb07d-content-reflow`. Nenhuma integração na main, push, merge, deploy, homologação final ou novo incremento.

## Diagnóstico e correção

A reprodução histórica confirmou **281 px de documento em 256/187** na Home: o trecho sem espaços do nome de usuário na saudação impunha um mínimo de 269 px à trilha grid. A origem histórica é a resposta sintética de auth/me, embora o problema fosse descrito genericamente como identificação empresarial. Nomes empresariais e descrições também foram testados. Com texto 200%, o mesmo mínimo crescia e o documento chegava a 550 px.

Na Visão Geral, o antigo excesso de 222 em 187, documentado no SB-06E, não se reproduziu em texto normal no HEAD aprovado: a grade já foi corrigida por C01. O caso atual comprovado era **260 px em 256/187 com texto 200%**, incluindo valores de 237 px que não cabiam na área disponível. Banner, cabeçalhos e ações também exigiam quebra local.

| Arquivo de produção | Alteração |
|---|---|
| `frontend/src/home/home.css` | Quebra herdada de textos extensos, mínimos locais de grid/flex e reorganização do link para Visão Geral |
| `frontend/src/overview.css` | Reflow somente sob classe própria e media screen; títulos, textos e ações flexíveis; abaixo de 300 px, indicadores em região rolável por teclado |
| `frontend/src/App.tsx` | Classe somente no main da Visão Geral; região de indicadores nomeada, tabulável e com orientação nas larguras extremas |

**69 linhas adicionadas e duas removidas em três arquivos de produção.** Não há wrapper novo que altere a impressão do recibo. SummaryCard, Modal, shell, estilos globais e todos os componentes de data permanecem intactos.

Os valores não são divididos, truncados, arredondados nem reduzidos em fonte. Em 256/187 com fonte ampliada, pan local preserva números maiores que a própria área disponível. A região pode ser alcançada por Tab e operada por setas; o documento fica contido. A orientação aparece apenas abaixo de 300 px. Essa é uma adaptação explícita de robustez, não uma declaração de reflow universal de valores ilimitados.

## Resultados

- **336 estados / 168 pares** com os mesmos nomes, textos, links, ações, números e tamanhos de fonte, em dois perfis, três cenários de dados, duas telas e sete larguras. Nenhum excesso do documento na candidata.
- Dez pares da fixture padrão em **1440/1024/768/375/320**, nas duas telas, são PNGs idênticos byte a byte. Mudanças de composição ficam nos conteúdos/extremos que precisam de reflow.
- **16 amostras de zoom Firefox nativo:** 1280→640/320 CSS px e DPR 1→2/4; oito estados candidatos sem excesso. Menu/Escape/retorno de foco preservados.
- **121 testes frontend**, **17 backend pertinentes**, TypeScript e build aprovados.
- **36 regressões existentes** aprovadas, incluindo Home, navegação/permissões, modais, público, indicadores de Lançamentos e Serviços. **Cinco testes R02**, **seis regressões dirigidas SB-07C** e verificações financeiras de foco/valores complementam a cobertura.
- Os **três testes antigos de sessão expirada foram efetivamente executados e passaram**, com manifesto de compatibilidade para SQLite descartável. Nenhuma regra de sessão foi alterada.
- Respostas reais de oito consultas, incluindo recusas de acesso, são iguais entre os clones baseline/candidata; handlers e consultas de App são idênticos por AST. O teste de recibo e sua apresentação de impressão passou em ambas as versões.

As fixtures de estresse de apresentação e a comparação de API real são evidências separadas. Não foram alterados dados reais, regras financeiras ou valores para facilitar o layout. Detalhes e ocorrências em [TESTES.md](TESTES.md), [diagnóstico](DIAGNOSTICO.md) e [matriz](MATRIZ-REFLOW.md).

## Preservação e limites

472 arquivos originais fora do escopo são conferidos por SHA-256, incluindo datas/competência, dependências/lockfile, rotas, autenticação, permissões, modelos, backend, impressão, cores e CSS global. Backup de 476 arquivos com restauração ensaiada em temporário. Nenhum banco persistente foi utilizado; as mutações de testes ocorreram somente em SQLite temporários.

C02 está corrigida **nos cenários conhecidos e na matriz documentada**. As larguras 256/187 são robustez adicional; pan interno dos números nesses extremos fica explícito. Não se certifica WCAG global, leitor de tela real, toque em aparelho físico ou homologação humana. P05 mantém o estado aprovado do SB-07C: entrada corrigida tecnicamente, saídas ISO e homologação humana/assistiva pendentes. P07 parcial; V01/T01 em acompanhamento.

Código: `afa4a81`. Testes: `5585326`. O pacote registra também o hash final do commit de documentação, estado Git, diff e manifestos.

[Galeria e evidências](../../evidence/sb07d/galeria.html) · [Arquivos e recuperação](RECUPERACAO.md). Próximo passo: revisão explícita deste incremento; nenhuma próxima implementação foi iniciada.
