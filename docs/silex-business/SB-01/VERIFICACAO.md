# Evidência do SB-01

## Ajustes finais

Direção visual/design system e navegação aprovados conceitualmente pelo usuário; SB-02 não autorizado/iniciado. [Resumo da revisão](AJUSTES-FINAIS.md) e [rótulos, precedência e datas](DADOS-APRESENTACAO.md). A segunda demonstração A agora apresenta Vendas com campos/situações existentes no código. D tem Nova despesa neutra, datas brasileiras com ISO preservado e orientação de rolagem em tablet/celular.

## Escopo observado

Auditoria de código e arquivos locais; geração de documentos e estudos HTML/CSS/JS isolados em `docs/silex-business/SB-01`. Navegador Firefox já instalado renderizou somente esses estudos por servidor estático em loopback, sem carregar o ERP ou o ControlMax.

Não foram executados build, suites de teste do ERP, API, migrações, seed ou operações de banco. Os testes listados em INCREMENTOS.md são requisitos para futuras implementações, não resultados desta etapa. Não se afirma homologação de módulos, autenticação, permissões ou acessibilidade completa a partir de mockups.

## Ativos oficiais e fonte

- 12 arquivos oficiais encontrados no diretório refinado fornecido; todos copiados byte a byte.
- Cinco SVGs parseados como XML; sem texto dependente de fonte e sem raster embutido.
- PNG oficial da logo clara inspecionado visualmente; versões oficiais usadas nos renders.
- Inter 400/600 local nos estudos, sem instalação de programas/fontes ou serviços externos.
- Hashes, origem, dimensões SVG, cores e proveniência em [inventario-ativos.json](inventario-ativos.json).
- Fontes adicionais e licença em `prototipos/assets/`; nenhum estudo antigo em Documents usado.

## Renderização dos protótipos

| Tela | Desktop 1440 × 900 | Tablet 768 × 1024 | Mobile 375 × 812 |
| --- | --- | --- | --- |
| A Comercial | [Imagem](renders/a-publica-desktop.png) | [Imagem](renders/a-publica-tablet.png) | [Imagem](renders/a-publica-mobile.png) |
| B Login | [Imagem](renders/b-login-desktop.png) | [Imagem](renders/b-login-tablet.png) | [Imagem](renders/b-login-mobile.png) |
| C Inicial autenticada | [Imagem](renders/c-inicial-desktop.png) | [Imagem](renders/c-inicial-tablet.png) | [Imagem](renders/c-inicial-mobile.png) |
| D Lançamentos | [Imagem](renders/d-lancamentos-desktop.png) | [Imagem](renders/d-lancamentos-tablet.png) | [Imagem](renders/d-lancamentos-mobile.png) |

As imagens são da página completa; as dimensões indicadas são as janelas usadas, não altura final do PNG. São estudos, não telas implementadas do ERP.

As 12 renderizações registraram Inter regular/semibold carregada, nenhuma imagem ausente, nenhum erro JavaScript e nenhum transbordamento horizontal do documento. Todos os requests observados foram assets/HTML locais do servidor dos estudos, sem `/api` e sem origem externa. No D, a tabela tem scroll próprio no tablet/mobile, orientação visível e preserva as seis colunas e duas ações de Estornar. A rolagem até a última coluna foi observada nos dois tamanhos, com ações visíveis. A nova demonstração A também contém sua rolagem no celular, sem alargar o documento. Evidência de requests e dimensões: [renderizacao.json](renderizacao.json); resumo: [observacoes-estaticas.json](observacoes-estaticas.json).

Na revisão, os 12 renders foram regenerados após a alteração do CSS compartilhado. Os HTMLs B/C e seus seis PNGs permaneceram byte a byte iguais à versão aprovada. Duas imagens adicionais registram o extremo direito da tabela D: [tablet](renders/d-lancamentos-tablet-ultima-coluna.png) e [celular](renders/d-lancamentos-mobile-ultima-coluna.png).

Datas do D nas três janelas: De 01/10/2026 (ISO 2026-10-01), Até 31/10/2026 (ISO 2026-10-31). São controles somente leitura da maquete; não são implementação do DateField proposto. Cor de Nova despesa observada como azul profundo sobre branco, sem classe danger; indicadores e ações de Estornar preservados.

Inspeção visual das composições A/D e comparação de preservação das adaptações B/C: logo oficial clara/escura, menu azul profundo, conteúdo claro, login de duas colunas em desktop/tablet e uma coluna no mobile, inicial sem indicadores financeiros duplicados, filtros completos e densidade da tabela financeira preservados. Menu móvel usa controles de apresentação e não autenticação. Acessibilidade por leitor de tela e fluxos de sessão reais serão avaliados nas sprints autorizadas.

Reproduzir renders: iniciar o servidor estático conforme README; executar `node docs/silex-business/SB-01/prototipos/renderizar.mjs` na raiz do projeto. Requer apenas dependências/navegador já presentes. Script não inicia backend ou instala dependências.

## Contrastes propostos

Razões calculadas a partir das cores sRGB por luminância relativa, em [contrastes.json](contrastes.json):

| Par | Razão |
| --- | --- |
| Branco / azul médio oficial | 4,97:1 |
| Branco / azul profundo oficial | 13,53:1 |
| Texto principal / branco | 14,31:1 |
| Texto secundário / branco | 6,20:1 |
| Borda de controle / branco | 3,16:1 |
| Azul de apoio / azul profundo | 6,68:1 |
| Receita / branco | 5,72:1 |
| Despesa / branco | 5,92:1 |

Semânticas de sucesso/erro/alerta/vencido também documentadas no JSON. Esses cálculos de pares sólidos não avaliam todas as sobreposições, foco, tamanho de texto, controles desabilitados ou estados da aplicação. Não são certificação de acessibilidade. Sinais +/− e rótulos Entrada/Saída aparecem junto aos valores; status futuros devem seguir a mesma regra de não depender só de cor.

## Integridade e isolamento

Baseline registrado antes de produzir os estudos: [preservacao-antes.json](preservacao-antes.json), com 82 arquivos de frontend/backend/dados e ativos oficiais, excluindo dependências e caches. Comparação final: [preservacao-depois.json](preservacao-depois.json). Inclui SQLite, WAL e SHM existentes, tratados apenas como arquivos para hash, sem abertura por driver/API.

A revisão tem um baseline próprio [revisao-final-antes.json](revisao-final-antes.json) e resultado [revisao-final-depois.json](revisao-final-depois.json). Comparou-se o estado atual também ao baseline original: 82 arquivos protegidos permanecem iguais. HTMLs B/C, seus seis PNGs e todos os ativos/fontes copiados permanecem idênticos. Não houve alteração de arquivos protegidos nem inclusão de código nas árvores de frontend/backend/data. Nenhuma alteração de contrato, cálculo, registro, sessão, autorização ou configuração empresarial. Todos os novos arquivos do trabalho estão na pasta de planejamento e no ZIP do SB-01.

Manifesto dos artefatos: [manifest.sha256](manifest.sha256). Documentos/HTML e links locais foram conferidos após a geração; não incluem imagens privadas do ambiente ControlMax. Servidor de prévia usado para renderização encerrado ao finalizar a tarefa.
