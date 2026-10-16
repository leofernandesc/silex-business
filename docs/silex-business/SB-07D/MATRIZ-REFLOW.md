# SB-07D — matriz de reflow

336 medições, 168 comparações pareadas: dois perfis × três configurações de texto × duas telas × sete larguras × dois estados de fonte × baseline/candidata. Mesmos textos, nomes, ações, links, números e tamanhos de fonte em cada par. Fonte ampliada é duplicação computada, não zoom nativo.

| Tela | Largura | Documento antes / normal, máximo da matriz | Depois / normal | Antes / texto 200%, máximo | Depois / texto 200% |
|---|---:|---:|---:|---:|---:|
| home | 1440 | 1440 | 1440 | 1440 | 1440 |
| home | 1024 | 1024 | 1024 | 1024 | 1024 |
| home | 768 | 768 | 768 | 768 | 768 |
| home | 375 | 375 | 375 | 550 | 375 |
| home | 320 | 320 | 320 | 550 | 320 |
| home | 256 | 281 | 256 | 550 | 256 |
| home | 187 | 281 | 187 | 550 | 187 |
| dashboard | 1440 | 1440 | 1440 | 1440 | 1440 |
| dashboard | 1024 | 1024 | 1024 | 1024 | 1024 |
| dashboard | 768 | 768 | 768 | 768 | 768 |
| dashboard | 375 | 375 | 375 | 375 | 375 |
| dashboard | 320 | 320 | 320 | 320 | 320 |
| dashboard | 256 | 256 | 256 | 276 | 256 |
| dashboard | 187 | 187 | 187 | 276 | 187 |

Os máximos acima incluem nomes empresariais sem espaços e descrições sintéticas extensas. A reprodução histórica com nome de usuário específico está em DIAGNOSTICO.md e baseline-probe.json. A camada de apresentação recebe respostas sintéticas idênticas para estressar valores positivos/negativos, sem alterar os bancos nem reduzir valores. A equivalência de respostas reais dos dois backends clonados é registrada separadamente em api-comparison.json.

## Limites e diferenças intencionais

- Em 320 e maiores os indicadores continuam cabendo com os valores testados, inclusive texto 200%.
- Em 256/187, os valores íntegros com fonte 200% podem exigir pan na região de indicadores; Tab/foco/setas mantêm acesso e o documento não rola horizontalmente. O número não é quebrado, truncado ou diminuído. A orientação aparece apenas abaixo de 300 px.
- Tabelas conservam suas colunas e rolagem própria. Não foram transformadas em cartões.
- Dez pares da fixture padrão (duas telas × 1440/1024/768/375/320) são PNGs idênticos byte a byte. Conteúdo extremo altera somente a quebra/distribuição necessária; uma captura com descrição sintética excessiva difere intencionalmente por deixar de cortar o texto.
- Zoom Firefox real: 16 estados, perfis administrador/operador e ambas as versões, 1280→640/320 CSS px e DPR 1→2/4; oito estados candidatos sem overflow, menu/Escape/foco preservados. Ver native-zoom.json.
- 256 e 187 são largura adicional de robustez. Não equivalem ao requisito vertical de 320 px de 1.4.10, nem atestam conformidade WCAG global.
