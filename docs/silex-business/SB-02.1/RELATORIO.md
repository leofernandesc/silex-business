# Silex Business — SB-02.1

**Estado:** pronto para revisão do usuário.  
**Escopo:** infraestrutura visual isolada; nenhuma tela operacional foi redesenhada.

## Preparação e preservação

- O checkout atual é `/home/leofernandesc/controlmax-inspired`, sem diretório Git. Não foi possível identificar branch ou obter `git status`.
- Antes das alterações, foram registrados hashes de 213 arquivos em [baseline.json](../../evidence/sb02-1/baseline.json). Naquele momento, os 82 hashes do encerramento SB-01 coincidiam com o checkout, sem arquivo ausente ou divergente.
- O teste frontend inicial passou: 2 arquivos e 15 testes.
- O build final foi executado em pasta temporária. O `frontend/dist` e o `frontend/tsconfig.tsbuildinfo` preexistentes foram preservados.

## Entregas

- Cinco SVGs oficiais foram copiados sem alteração para `frontend/public/assets/brand/`: logo clara, logo escura transparente, logo escura com fundo, símbolo isolado e app icon. A verificação XML passou e todos os hashes coincidem com os arquivos originais em Pictures. Nenhum PNG, filtro ou desenho CSS foi usado como marca.
- Inter Regular 400 e SemiBold 600 foram copiados para `frontend/public/assets/fonts/` com a licença OFL 1.1. Os dois arquivos mantêm exatamente os hashes das fontes aprovadas. Não houve instalação nem requisição externa de fonte.
- [tokens.css](../../../frontend/src/styles/tokens.css) centraliza cores institucionais e semânticas, superfícies, texto, bordas, tipografia com fallbacks, escala tipográfica, espaçamento, raios, sombras, dimensões de controles e estados interativos.
- [Brand.tsx](../../../frontend/src/brand/Brand.tsx) oferece logo, símbolo ou app icon; aparência clara/escura; largura e altura configuráveis; texto alternativo; apresentação decorativa e classe opcional. A seleção do símbolo em fundo escuro usa o app icon oficial, que contém o campo azul do próprio ícone. O pacote não inclui um símbolo isolado invertido.
- Os tokens são carregados por `main.tsx`, porém nenhum seletor ou componente operacional os consome nesta etapa. A fonte local usa o alias CSS `Silex Inter Local`; o CSS global continua usando a pilha atual. Assim, a tipografia nova está pronta para migração sem aplicar mudanças de métricas às telas agora. O componente Brand também permanece isolado e não substitui a marca provisória no App.
- A decisão de nomes foi registrada em [DADOS-APRESENTACAO.md](../SB-01/DADOS-APRESENTACAO.md): Silex Business é a marca fixa do software; company_name identifica a empresa cliente; brand_name é nome de apresentação configurável, preservado por compatibilidade e sem substituição automática de company_name ou razão social. Usos atuais foram documentados. Nenhum campo, payload ou valor foi alterado.

## Validação

| Verificação | Resultado |
| --- | --- |
| Testes frontend antes da mudança | 15/15 passaram |
| Testes frontend após a mudança | 19/19 passaram, em 3 arquivos |
| TypeScript e build Vite | Passaram com `npm run build`, saída redirecionada para pasta temporária |
| Ativos públicos no bundle | 5 SVGs, 2 fontes e licença encontrados com hashes idênticos |
| Prettier nos arquivos TypeScript/CSS alterados | Passou |
| Integridade dos SVGs | 5 de 5 analisados como XML e cópias idênticas |
| Inter 400/600 no navegador | `document.fonts.load/check` passou para os dois pesos |
| Brand no navegador | 4 imagens carregadas; nenhuma falha de requisição ou chamada externa |
| Telas operacionais | App.tsx e styles.css permaneceram byte a byte iguais ao baseline; tokens sem consumidores fora de tokens.css |
| Lint dedicado | Não disponível: package.json não define script nem dependência de lint |
| Testes E2E | Não executados: a suíte existente executa cadastros e fluxos financeiros e grava capturas em diretórios de evidência já usados por outras sprints |

As capturas são uma demonstração isolada do componente, em 1440, 768 e 375 px. Não representam uma tela do ERP já redesenhada:

- [Prévia 1440 px](../../evidence/sb02-1/brand-preview-1440.png)
- [Prévia 768 px](../../evidence/sb02-1/brand-preview-768.png)
- [Prévia 375 px](../../evidence/sb02-1/brand-preview-375.png)

## Arquivos e evidências

- Código: `frontend/src/main.tsx`, `frontend/src/styles/tokens.css`, `frontend/src/brand/Brand.tsx`, `frontend/src/brand/Brand.test.ts`.
- Ativos: cinco SVGs oficiais, duas fontes OTF e `OFL.txt` em `frontend/public/assets/`.
- Planejamento atualizado: `IDENTIDADE.md`, `DADOS-APRESENTACAO.md`, `INCREMENTOS.md`, `AJUSTES-FINAIS.md`, `design-tokens.json` e índice README do SB-01.
- Preservação e proveniência: [baseline inicial](../../evidence/sb02-1/baseline.json), [manifesto dos ativos](../../evidence/sb02-1/asset-manifest.json) e [comparação final](../../evidence/sb02-1/preservacao-final.json).

Nenhuma alteração de banco, backend, API, autenticação, permissões, rotas, navegação, formulários, cálculos, regras financeiras ou templates de impressão foi feita. Não houve deploy ou merge. O próximo passo continua sendo revisar esta entrega; SB-02.2 não foi iniciado.
