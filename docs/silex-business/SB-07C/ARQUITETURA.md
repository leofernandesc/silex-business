# SB-07C — camada de entrada de datas

Base aprovada `fddcb66d18ba22fc1c07700852cd2f5a5c6b6ed8`. Branch `feat/sb07c-ptbr-dates`. O backend e os contratos ISO são preservados.

## Dependências e fontes

- `react-aria-components` 1.22.1 e `@internationalized/date` 3.12.4, versões estáveis fixadas no package.json/lockfile; Apache-2.0. Peer dependencies incluem React/ReactDOM 19, compatíveis com a aplicação.
- Treze pacotes transitivos adicionados; nenhuma versão preexistente alterada. Auditoria npm na instalação: zero vulnerabilidades. Lista completa/licenças/integridade no pacote de evidências.
- Documentação oficial consultada: [DatePicker](https://react-aria.adobe.com/DatePicker), [DateField](https://react-aria.adobe.com/DateField), [CalendarDate](https://react-aria.adobe.com/internationalized/date/CalendarDate), [Popover](https://react-aria.adobe.com/Popover). A API efetiva também foi conferida nos tipos/source maps da versão instalada.

## Data civil

`SilexDatePicker` recebe/emite string ISO ou vazio, utiliza `CalendarDate`, I18nProvider `pt-BR-u-ca-gregory-nu-latn` e zeros iniciais. React Aria fornece os segmentos, teclado, calendário, semântica e validação nativa do formulário. Não há parser de timestamp, máscara ou calendário próprio.

A edição é local até sair dos segmentos ou pressionar Enter; seleção pelo calendário e limpeza explícita publicam imediatamente. Isso evita disparar filtros e alterar o estado persistível a cada dígito. Os segmentos públicos do DateFieldStateContext permitem distinguir vazio, parcial e data impossível. A versão instalada pode ajustar uma data impossível ao perder foco; o adaptador rejeita essa correção automática, mantém o valor anterior e informa o erro, exigindo uma edição válida. O erro participa da validação nativa React Aria e impede envio do formulário.

O componente observa o `fieldset disabled` já usado por Form, pois segmentos contenteditable não herdariam automaticamente essa restrição como um input nativo. Não altera o handler de salvamento.

## Calendário em Modal

O Modal existente usa `dialog.showModal()`. Um portal no body ficaria atrás da modalidade nativa. O Popover é colocado no diálogo ancestral com `UNSTABLE_portalContainer`, API pública tipada da versão fixada; ela está depreciada em favor de um PortalProvider do pacote react-aria. A integração fica local, sem adicionar uma terceira dependência direta nem desativar P01. Não são alterados Modal, useModalFocus, shell ou navegação. Testes conferem posição, foco, Escape e retorno ao acionador.

O próprio React Aria cria um input date invisível para autofill e um input de validação. Eles não controlam a apresentação: o editor visível utiliza os segmentos oficiais. A aplicação não desenha texto sobre um input nativo.

## Competência mensal

`SilexMonthField` apresenta seleção explícita de mês com dois dígitos e edição numérica de ano, em ordem MM/AAAA. Mantém YYYY-MM, sem inventar dia persistido. O ano não tem intervalo fixo arbitrário; a positividade decorre do formato civil original. Limites recebidos são preservados. Edição incompleta bloqueia envio e não publica substituição do valor anterior.

## Limites

As verificações técnicas não substituem participação de usuários nem homologação com leitor de tela real. Impressões/CSV ISO e timestamps continuam sob seus contratos anteriores. C02 e SB-07D permanecem fora deste incremento.
