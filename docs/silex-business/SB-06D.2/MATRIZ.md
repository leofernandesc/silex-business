# Matriz de cascata e estilos computados

## Método e Fase A

Instrumentos `matrix.cjs` e `order.cjs`, com Firefox instalado e cópias descartáveis do HEAD aprovado. Nenhuma chamada à aplicação base ou a dados reais. Fonte local carregada com document.fonts.ready; transições finitas aguardadas e duas fases de layout antes da medição. Não usar igualdade de screenshot como única prova. São amostras representativas: até três correspondências por seletor e até oito na família summary; a lista completa de seletores e propriedades está no instrumento/JSON. Contagens de propriedades incluem medições repetidas entre estados/seletores, não propriedades únicas da aplicação.

A matriz principal registra **71 propriedades**, retângulos, scroll/clientWidth, estado de foco/disabled/selected/invalid/inert, textos representativos e CSSOM. São **201 estados pareados** em 1440/768/375/320, **581.135 propriedades de estilo comparadas** e geometrias/estados correspondentes. A Fase A foi concluída antes de aplicar o piloto; a cópia baseline permanece congelada no aprovado.

| Estado | Amostras por versão |
| --- | ---: |
| Normal | 64 |
| Foco | 56 |
| Hover | 52 |
| Modal | 8 |
| Menu aberto | 5 |
| Texto computado 200% | 4 |
| Erro de intervalo, API 422 | 4 |
| Relatório resultado mensal | 4 |
| Relatório caixa mensal | 4 |

Há 256 instâncias medidas de controles desabilitados, incluindo repetições entre estados/seletores; não são 256 defeitos. Estados selected/active são registrados nos próprios controles de cada amostra. Não se fabrica um estado disabled por CSS. Erro usa intervalo inválido e resposta real 422 no banco descartável, sem mutação de registros.

Cobertura: público, login, Home, Visão Geral, Clientes, Produtos, Vendas, PDV, Estoque, Lançamentos, Pagar, Receber, Conciliação, Dashboard Financeiro e Empresa. Componentes compartilhados de títulos, campos, botões, badges, tabelas, paginação, Modal, header/menu estão presentes nos seletores. Sondas complementares medem links da Home em normal/hover/foco por teclado nas quatro larguras, a partir das mesmas cópias congeladas.

## Cascata efetiva

Dez percursos reais: público frio → CTA Entrar → login → Home; hashes operacionais em documento aquecido; Voltar/Avançar e reload. Sem injetar history nem alterar rotas do produto.

- Entrada: `/assets/index.css`, que contém tokens e estilos globais na ordem de origem inalterada.
- Público: `/assets/PublicPage.css` após entrada.
- Login/ERP: `/assets/App.css` após entrada; ordem de famílias no chunk: Home, Contas, Lançamentos, Conciliação, Dashboard Financeiro.
- Trocas de hash não introduzem outra folha nem mudam a ordem. Voltar/Avançar/reload conservam essa organização.

Os nomes completos com hashes e posições CSSOM estão nos JSON. O hash do chunk operacional pode mudar pela organização de uma regra; isso não é diferença visual. A comparação normaliza apenas o hash do nome do asset e verifica a ordem lógica, media, disabled e famílias. Os arquivos de entrada/importações não foram alterados.

## Resultado e limites

Zero diferenças de propriedades, geometrias e estados na matriz principal. Os **68 pares PNG** são idênticos byte a byte. A prova estática expande listas de seletores e confirma os mesmos rastros ordenados de declaração por seletor/contexto; não presume redundância pela repetição do seletor.

Mantidos os excessos **preexistentes** de Lançamentos quando todas as fontes computadas do main são duplicadas: documento 854 em viewport 768, e 348 em 320, iguais nas duas versões. Não há CSS escondendo overflow. Outros excessos históricos em condições não medidas continuam documentados; não inferir conformidade global.

Ampliação computada de texto não é zoom nativo. Não houve homologação com leitor real, toque físico ou todos os agentes de impressão. Comparações adicionais em media print verificam apresentação, sem substituir homologação PDF/impressora. P04/P09 e demais correções mantêm seu recorte aprovado, sem promessa de WCAG integral.
