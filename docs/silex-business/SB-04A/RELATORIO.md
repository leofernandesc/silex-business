# Silex Business — SB-04A

**Implementação da página pública comercial. Aguardando revisão explícita. SB-04B não iniciado.**

## Entrega

A rota / apresenta a Silex Business sem exigir ou consultar sessão. Hero “Sua empresa, organizada em um só lugar”, demonstração financeira fictícia, quatro cartões de recursos, faixa de serviços/diaristas/frete/PIX, segunda demonstração de Vendas, benefícios, CTA e rodapé institucional. Todos os links Entrar conduzem ao login existente em /entrar.

Mantida a composição A aprovada, com SVGs oficiais/Brand, Inter local e tokens. CSS próprio sob .silex-public; nenhum estilo global operacional foi alterado. Menu móvel acessível como disclosure não modal, âncoras nativas, skip link, foco, contraste, tabela rolável por teclado, movimento reduzido e ampliação a 200%.

O conteúdo anuncia somente funções confirmadas no código. Conciliação é OFX com confirmação manual; PIX é cadastro/consulta de chave. Sem preços, usuários ilimitados, testes gratuitos, contratação, cadastro comercial, emissão fiscal, integrações inventadas ou dados empresariais reais.

## Integração e preservação

Application separa public/operacional por pathname e allowlist dos hashes existentes. Em / nenhum hook de autenticação/empresa é montado; isso vale também para cookie válido. Hashes operacionais antigos continuam abrindo App; seções públicas não são módulos. Lazy chunks evitam solicitar App no público.

App.tsx inteiro, api.ts, backend, modelos/contratos, cookie/credenciais, autorização, dados persistentes, financeiro/cálculos, módulos, templates, index.html, styles.css, tokens/SVGs/fontes e evidências anteriores permanecem intactos. Login, retorno protegido, refresh, histórico, sessão expirada, 401/403 e logout do SB-03 são preservados. Logout permanece /entrar e /app#home ainda não existe.

Duas fontes preexistentes mudaram: main.tsx monta Application; useAppNavigation reconhece a superfície pública para não reescrevê-la por listeners/respostas anteriores. Dois arquivos de teste existentes tiveram apenas preparação/fixture ajustados à nova entrada. Código da página foi criado em componentes próprios, sem nova biblioteca ou refatoração do shell.

## Validação

- TypeScript/build e **48 testes frontend** aprovados; baseline tinha 38.
- **69 testes backend** aprovados em fixtures próprias.
- **57 E2E navegação/público** aprovados nas três larguras: 36 herdados + 21 públicos.
- **27 E2E operacionais** aprovados, mantendo as asserções e fluxos anteriores.
- Capturas públicas/ERP, comparação SB-01 e audit de contraste/controles; sem overflow nos casos revisados, inclusive probe a 200%, e sem falhas textuais de contraste na página pública.
- Público com zero requests à API, zero requests externos, nenhum chunk App carregado ou identificação privada exibida; sessão válida não expõe empresa/usuário.
- SVGs oficiais em XML/hashes idênticos; Inter local 400/600 carregada.
- Backup ensaiado antes e depois, manifestos e fontes testadas conferidos; checkout segue sem Git.

As falhas das tentativas iniciais e correções estão em TESTES.md e nos logs attempt-1/attempt-2. Não foram omitidas. Prévia usa somente fonte/build e banco de demonstração isolados.

## Revisão

- [Galeria HTML](../../evidence/sb04a/galeria.html).
- Página pública: [1440](../../evidence/sb04a/screenshots/public-1440.png), [768](../../evidence/sb04a/screenshots/public-768.png), [375](../../evidence/sb04a/screenshots/public-375.png).
- Comparação com A: [1440](../../evidence/sb04a/comparativo-1440.png), [768](../../evidence/sb04a/comparativo-768.png), [375](../../evidence/sb04a/comparativo-375.png).
- [Prévia local](http://127.0.0.1:18025/); estado e instruções em preview.json/REPRODUCAO.md.
- [Arquitetura/diferenças](ARQUITETURA.md), [conteúdo confirmado](CONTEUDO.md), [testes](TESTES.md), [preservação/backup](PRESERVACAO.md), [arquivos](ARQUIVOS.md), [pendências](PENDENCIAS.md).

## Diferenças do estudo e limites

Retiradas as faixas de protótipo; menu móvel real acrescentado; descrições dos quatro cartões detalhadas e faixa secundária de serviços acrescentada; texto/scroll das demonstrações mais legível; rodapé real tem marca/navegação. Ações ilustrativas da tabela não são botões falsos nem operações do ERP. Na inspeção visual, removido espaçamento excessivo do CTA móvel causado por flex-basis em coluna.

Não há alteração substancial da organização hero→módulos→Vendas→benefícios→CTA. Revisar as adaptações na galeria antes de aprovar. SEO continua CSR, com metadados públicos por JavaScript; prerender/SSR, domínio/hosting, legal/comercial e leitor de tela real permanecem pendentes. A configuração empresarial continua global.

Não houve deploy, merge, modificação operacional ou início do SB-04B. Próximo incremento recomendado, após aprovação: página inicial autenticada real, mantendo Visão Geral independente e permissões existentes.
