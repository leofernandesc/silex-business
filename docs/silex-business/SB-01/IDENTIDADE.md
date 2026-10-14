# Identidade visual consolidada

## Fonte oficial

Marca: **Silex Business**. Direção aprovada: minimalista, geométrica, tecnológica e profissional. Símbolo mineral facetado existente, sem redesenho. Fonte oficial da análise: `/home/leofernandesc/Pictures/Silex_Business_SVG_Refinado`, fornecida expressamente pelo usuário. O diretório extraído está completo; o ZIP não é necessário para esta etapa.

O `LEIA-ME.txt` informa cinco facetas preservadas e tipografia Inter ExtraBold/Light convertida em curvas Bézier. Os cinco SVGs foram analisados como XML: não contêm elementos de texto nem imagens embutidas. A logo não depende de fonte instalada. Propostas A01/A02/A03 de Documents não são oficiais e não foram usadas.

## Inventário e aplicação

| Ativo | Variantes | Uso proposto |
| --- | --- | --- |
| `silex-business-logo-fundo-claro-refinado` | SVG + PNG, 1120 × 455 no SVG | Página comercial e login sobre branco |
| `silex-business-logo-fundo-escuro-transparente` | SVG + PNG, 1120 × 455 no SVG | Menu azul profundo e coluna escura do login |
| `silex-business-logo-fundo-escuro-refinado` | SVG + PNG, 1120 × 455 no SVG | Prancha com fundo oficial incorporado |
| `silex-business-simbolo-refinado` | SVG + PNG, 445 × 455 no SVG | Usos compactos que mantenham legibilidade das facetas |
| `silex-business-app-icon-refinado` | SVG + PNG, 512 × 512 no SVG | Ícone oficial disponível no componente Brand; não conectado à navegação do ERP |
| `comparativo-contornos.png` | PNG | Evidência de refinamento, não identidade de interface |
| `LEIA-ME.txt` | Texto | Proveniência e instruções do pacote |

Dimensões acima são atributos SVG, não afirmações sobre o tamanho dos PNGs. Inventário técnico de 12 arquivos oficiais, tamanhos, cores, origem e hashes: [inventario-ativos.json](inventario-ativos.json). As fontes Inter locais têm proveniência separada; não fazem parte do pacote de marca.

Preservar proporção, facetas, cores e tipografia da logo. Não aplicar filtros CSS, reconstruir o texto com fontes de interface, recortar símbolo/texto, recolorir ou distorcer. Para fundos escuros usar a variante transparente aprovada, não tentar tornar a versão clara branca com filtro. Propostas de área de respiro e tamanho mínimo devem ser revistas visualmente: 16 px de respiro no menu; logo com 154–180 px de largura no ERP e 176–230 px em páginas de apresentação. São parâmetros de interface propostos, não normas já aprovadas da marca.

## Paleta e semântica

| Token | Valor | Aplicação |
| --- | --- | --- |
| `brand.deep` | `#102D5C` | Menu lateral; títulos e superfícies institucionais |
| `brand.primary` | `#1769E8` | Ação primária, seleção e foco |
| `brand.support` | `#8EB7FF` | Apoio sobre azul profundo; decoração contida |
| `surface.canvas` | `#F4F6FA` | Fundo operacional |
| `surface.base` | `#FFFFFF` | Cartões, tabelas, formulários |
| `surface.subtle` | `#EEF3FA` | Cabeçalhos de tabela, campos auxiliares |
| `text.primary` | `#172B45` | Texto principal |
| `text.muted` | `#52627A` | Informação secundária |
| `border.default` | `#DCE4F0` | Divisórias e cartões |
| `border.control` | `#8192AC` | Contornos de controles reconhecíveis |
| `status.success` | `#146B46` | Sucesso com texto/ícone ✓ |
| `status.error` | `#B42318` | Erro com texto/ícone ! |
| `status.warning` | `#855000` | Alerta com texto/ícone △ |
| `status.overdue` | `#9E294A` | Vencido com rótulo “Vencido” e data |
| `finance.income` | `#08745E` | Receita com + e “Entrada” |
| `finance.expense` | `#B83236` | Despesa com − e “Saída” |

A paleta de marca é aprovada; o design system recebeu aprovação conceitual do usuário nesta revisão. Os tokens estão carregados, sem seletores operacionais consumidores. Azul claro não deve ser usado como texto pequeno sobre branco. Sucesso e receita têm papéis diferentes, assim como erro e despesa. Estados exigem texto, sinal e/ou ícone além da cor. Saldo negativo mantém o sinal; não mudar cálculos para obter aparência desejada.

## Tipografia

Interface em **Inter** local, pesos 400/600. Os protótipos e a infraestrutura SB-02.1 usam os arquivos Inter-Regular/Inter-SemiBold já disponíveis no ambiente PyCharm/JBR, copiados sem alteração; família conferida por fc-scan, licença OFL 1.1 e atribuição conferidas nos metadados da fonte. A licença e a origem estão junto aos arquivos da fonte. Nenhuma fonte foi instalada e não há requisições a Google Fonts.

O ERP atual apenas cita Inter como fallback. O SB-02.1 distribui localmente os pesos 400/600 com licença, sob a família CSS Silex Inter Local, para que a face nova não altere a fonte já usada nas telas antes da migração visual. Tokens tipográficos nomeados cobrem títulos, corpo, botões, menus, tabelas e indicadores financeiros, com fallbacks. A escala continua: 12 px auxiliares, 13 px tabela densa, 14 px interface, 16 px texto comercial, 20 px seções, 26 px título operacional, 44–56 px título comercial. Valores usam font-variant-numeric: tabular-nums; não sintetizar pesos inexistentes nem alterar o logotipo.

## Preparação técnica SB-02.1

Os cinco SVGs oficiais foram copiados sem alteração para frontend/public/assets/brand/; os originais em Pictures permanecem intactos. A marca completa tem variantes clara e escura transparentes; o símbolo isolado oficial é adequado ao fundo claro; o app icon oficial é usado sobre fundo escuro quando se pede somente o símbolo, pois o pacote não contém uma versão isolada clara/invertida. Nenhum filtro, redesenho ou substituição raster foi aplicado.

Tokens CSS estão centralizados em frontend/src/styles/tokens.css e carregados no ponto de entrada. São variáveis aditivas sem seletores operacionais consumidores; as telas continuam com as regras atuais até os próximos incrementos. O componente frontend/src/brand/Brand.tsx expõe variantes logo, symbol e app-icon, aparência clara/escura, dimensões, classe, texto alternativo e modo decorativo. O componente é independente e não substitui a marca atual no App.

## Tokens e componentes

Valores estruturados em [design-tokens.json](design-tokens.json). CSS dos estudos em [prototipos/estudos.css](prototipos/estudos.css); não é folha de estilo de produção.

| Elemento | Proposta reutilizável |
| --- | --- |
| Espaçamento | Escala 4, 8, 12, 16, 20, 24, 32, 48, 64 px; formulários com 12–16 px |
| Bordas/raios | Contorno 1 px; raio 6 controles, 8 tabelas, 12 cartões, 16 blocos institucionais |
| Elevação | Menu/topbar por separação; sombra leve em cartões; elevação maior só modal/menu móvel |
| Botões | Primário azul; secundário branco; Nova despesa secundária/neutra, pois criação não é destrutiva; Estornar mantém semântica própria. Hover azul profundo; active mais escuro; focus-visible com anel e respiro; disabled identificado por atributo e aparência; loading com texto |
| Campos | Label persistente, ajuda/erro conectado; datas visíveis dd/mm/aaaa com valores ISO preservados (adaptador futuro em DADOS-APRESENTACAO); altura 38 px densa e 44 px padrão. Campo inválido com mensagem, não apenas borda vermelha |
| Tabelas | Cabeçalho neutro, linhas separadas, valores alinhados à direita, ações nomeadas; scroll horizontal contido, com orientação visível em tablet/celular quando houver overflow; sem apagar colunas ou ações |
| Filtros | Grid responsivo; preservar draft/applied, Enter, presets, datas e bases de competência/lançamento; não esconder campos no financeiro |
| Menu | 224 px desktop, azul profundo; seleção com faixa e `aria-current`; grupos expansíveis; no móvel gaveta com foco e fechamento |
| Cartões | Base branca; indicadores numéricos somente onde já existem; home com atalhos, não cópia do dashboard |
| Feedback | Loading, vazio, falha, sucesso, sem permissão e sessão expirada identificáveis; preservar texto de validação |
| Responsividade | Proposta móvel até 650, tablet 651–900, intermediário 901–1200, desktop acima de 1200; respeitar fluxos existentes durante migração |
| Acessibilidade | Link pular ao conteúdo, foco visível, nomes acessíveis, contraste verificado por par, alvos 44 px no toque, movimento reduzido; navegação sem mouse |

Contrastes e composição observados nos protótipos constarão em VERIFICACAO.md. Isso não certifica acessibilidade do ERP funcional. Revisão por teclado/leitor de tela e todos os estados reais permanece como critério dos incrementos posteriores.

## Marca versus cliente

Silex Business identifica o software em logo, login, navegação e assinatura institucional. Nome empresarial, documento, contatos e endereço continuam identificando a empresa cliente. Não derivar a marca do produto de `brand_name` ou `company_name`. Não preencher informações empresariais inexistentes: apresentar “Não informado” ou “Minha empresa” conforme contexto.

Decisão de rótulos e apresentação em [DADOS-APRESENTACAO.md](DADOS-APRESENTACAO.md): company_name identifica a empresa, com vazio honesto; brand_name é um nome de apresentação configurável, mantido compatível e sem uso automático como nome empresarial. Seus valores não foram reclassificados ou alterados.

Recibos e relatórios: identificação empresarial existente preservada no documento e assinatura discreta “Silex Business”, separada. Não transformar a marca de software em emitente fiscal. Não há novo cadastro comercial, selector de empresas, emissão fiscal, pagamento bancário automático ou promessa de hospedagem neste plano.
