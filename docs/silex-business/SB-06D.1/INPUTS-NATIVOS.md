# P05 — Controles nativos e alternativa futura

Os valores de `input type=date` continuam sendo ISO YYYY-MM-DD. Exibição nativa e valor do controle são assuntos distintos: `lang=pt-BR` não garante que o navegador desenhe dia/mês/ano. `LedgerDateField` já acrescenta conferência brasileira independente do desenho nativo; não foi alterado nem espalhado para todos os formulários neste incremento.

O ensaio utiliza o Firefox headless **155.0** instalado, pt-BR/Manaus, en-US/UTC e pt-BR/Kiritimati, nas duas versões. `native-and-v01.json` registra versão do navegador, locale, timezone, tipo declarado/efetivo, valor, valueAsDate, validade, limites, campo month e retorno de foco. Capturas dos campos reais acompanham o ensaio. `valueAsDate` é apenas medido, **não usado para serialização financeira**.

Campos fora de LedgerDateField (por exemplo Conta, Serviços, Vendas e filtro compartilhado Dates) continuam sem conferência adicional. O mês do orçamento também precisa de avaliação de suporte: onde month não é suportado efetivamente, o navegador mantém campo textual e o value YYYY-MM atual. No Firefox 155.0 medido, month tem tipo efetivo **text** nas seis combinações, mantendo o valor YYYY-MM. Os campos date preservam 2024-02-29 e validade nas duas versões, inclusive em UTC/Kiritimati. Não foi instalado outro navegador para ampliar a matriz.

## Decisão recomendada agora

**Preservar os controles nativos e manter P05 parcial.** As apresentações textuais civis usam dd/mm/aaaa; meses não recebem um dia inventado. Backend/CSV/print e tooltip mensal legado do gráfico mantêm apresentações contratuais anteriores. O formatador genérico legado dos relatórios ainda reconhece prefixos ISO em strings: a revisão por tipo/coluna, inclusive nomes que comecem por uma data, merece lote próprio; não foi transformada em refatoração de relatórios.

## Alternativas para aprovação separada

| Aspecto | Nativo + conferência brasileira | Componente civil customizado |
| --- | --- | --- |
| Consistência visual | Valor legível em legenda; editor depende do navegador | Pode impor dd/mm/aaaa |
| Acessibilidade | Reutiliza comportamento do agente; conferir rótulos e descrição | Exige semântica, mensagens e navegação completas, testes com leitor real |
| Validação | required/min/max/value nativos preservados | Parsing, datas impossíveis, bissextos, limites e feedback precisam ser especificados |
| Teclado | Mantém segmentos/seletor nativo e recursos da plataforma | Definir digitação, apagar, setas, seleção e calendário; não inserir máscara incidental |
| Localização | Dependente da plataforma | Exibição pt-BR explícita; não usar locale para contrato ISO |
| Fuso | String civil mantida; evitar valueAsDate para contrato | Parsing manual civil, sem conversão de instante |
| Compatibilidade | Testar suporte efetivo de date/month em cada navegador | Maior superfície de manutenção em desktop, toque, autofill e tecnologias assistivas |
| Impacto | Legenda pode aumentar altura de filtros; validar antes de expandir | Todos os formulários, filtros, testes e restrições precisam de migração controlada |

Caso a uniformidade integral seja exigida, recomendar primeiro um piloto sem mutação de handlers, com contrato civil estrito e testes de serialização baseline/candidata. Validar leitores/zoom/toque antes de substituir controles em massa. Nenhum componente customizado, máscara ou biblioteca foi implementado.
