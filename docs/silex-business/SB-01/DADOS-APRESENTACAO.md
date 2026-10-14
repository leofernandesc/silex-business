# Marca, identificação empresarial e datas — decisão SB-01 / SB-02.1

Escopo: decisão de nomenclatura e planejamento. A implementação SB-02.1 prepara apenas ativos, tokens, fontes e componente isolado. Nenhuma alteração de campo, contrato, banco, regra fiscal ou regra de datas.

**Decisão confirmada pelo usuário em 13/10/2026:** Silex Business é a marca fixa do software; `company_name` identifica a empresa cliente; `brand_name` é um nome de apresentação configurável, mantido por compatibilidade. `brand_name` não é tratado automaticamente como nome empresarial ou razão social. Esta decisão substitui a pendência de semântica registrada na revisão SB-01.

## 1. Relação atual entre brand_name e company_name

| Aspecto | brand_name | company_name |
| --- | --- | --- |
| Modelo `backend/app/models.py:42–43` | String de até 50 caracteres; default “Gestão” | String de até 150 caracteres; default vazio |
| Entrada `backend/app/schemas.py:37–38` | Mínimo 1, máximo 50; default “Gestão” | Máximo 150; vazio permitido |
| Formulário `frontend/src/settings.tsx:25–26` | “Nome provisório da aplicação *”, obrigatório | “Nome da empresa”, sem obrigatoriedade |
| Uso atual em `App.tsx` | Substitui marca do software no logo, breadcrumb e rodapés | Identifica a empresa na região workspace e sua inicial |
| API `api.py:114–132` | GET/PUT company-settings preservam a propriedade | Mesmo objeto e gravação, propriedade independente |

Não há relação de derivação, sincronização ou precedência automática entre esses campos no modelo/API. O formulário envia ambos separadamente. O código não valida se company_name é razão social fiscal. A identidade configurada é global; não existe seletor de empresa demonstrado.

Consequência: `brand_name` permanece editável como nome de apresentação, sem derivar nem sobrescrever `company_name`. Não reescrever “Gestão” no banco nem limpar valores existentes. A apresentação da marca fixa do software é independente dos dois campos. Até a migração do SB-03, os usos de `brand_name` existentes no App permanecem como estão para manter compatibilidade; este SB-02.1 não conecta o novo componente Brand ao shell.

## 2. Rótulos de referência

| Informação | Rótulo de referência futuro | Fonte | Observação |
| --- | --- | --- | --- |
| Produto | **Silex Business** | Constante/ativo oficial do frontend | Identidade fixa; não é campo gravável em Empresa e identidade |
| Nome empresarial | **Nome empresarial** | company_name | Identifica a empresa cliente. Manter limites e possibilidade de edição/vazio atuais; não prometer validação fiscal |
| Nome de apresentação | **Nome de apresentação** | brand_name | Campo configurável preservado por compatibilidade. Não substitui Silex Business, company_name ou dados fiscais |
| Documento e contatos | Rótulos existentes | company_document, phone, email, address | Não modificar valores, normalização ou contratos |

O campo brand_name continua obrigatório pelo contrato atual (min_length=1). Não rotulá-lo opcional, apagar ou enviar vazio. O formulário e seus rótulos não foram alterados no SB-02.1; uma futura mudança apenas de apresentação precisa conservar esse limite e identificar o valor como nome de apresentação, sem migrá-lo para company_name.

Recomendação: separar o campo de nome de apresentação dos dados empresariais no formulário futuro, mantendo-o editável e preservando o payload atual. Mostrar a marca do software como identificação não editável, sem persistir Silex Business em brand_name. Alterar o rótulo não transfere o valor para company_name nem para documentos.

## 3. Decisões de apresentação por contexto

| Contexto | Regra de apresentação |
| --- | --- |
| Marca do software: login, logo, cabeçalho institucional, assinatura | Sempre Silex Business; não consultar brand_name/company_name para determinar a marca |
| Identificação compacta da empresa cliente | company_name informado → exibir; vazio → “Minha empresa” |
| Detalhes da empresa na home/configuração | company_name informado → exibir; vazio → “Nome empresarial não informado”; documento/contatos vazios identificados, sem preenchimento inventado |
| Campo de nome de apresentação | Manter brand_name configurável e independente de company_name, conforme contrato vigente |
| Outros contextos de apresentação | Usar brand_name somente quando o contexto solicitar explicitamente o nome de apresentação; nunca como fallback automático do nome empresarial |
| Recibos, relatórios e impressões | Preservar a identificação empresarial e os campos já usados no documento; marca de software em assinatura separada. Nunca usar brand_name ou Silex Business como substitutos automáticos de emitente, documento ou razão social |

Para selecionar a identificação empresarial, considerar company_name vazio somente na apresentação, sem modificar o valor persistido. Não gerar razão social, documento ou nome empresarial a partir de brand_name, software, usuário, email ou outros cadastros. O software não assume a identidade do cliente e o cliente não define a marca do software.

Exemplos fictícios:

| company_name | brand_name | Marca do software | Identificação da empresa | Nome de apresentação |
| --- | --- | --- | --- | --- |
| Empresa Exemplo Ltda. | Gestão | Silex Business | Empresa Exemplo Ltda. | Gestão, apenas onde o nome de apresentação for solicitado |
| Empresa Exemplo Ltda. | Nome Curto Exemplo | Silex Business | Empresa Exemplo Ltda. | Nome Curto Exemplo, apenas onde o nome de apresentação for solicitado |
| vazio | Gestão | Silex Business | Minha empresa / nome empresarial não informado | Gestão, apenas onde o nome de apresentação for solicitado |
| vazio | Nome Curto Exemplo | Silex Business | Minha empresa / nome empresarial não informado | Nome Curto Exemplo, sem convertê-lo em identificação empresarial |

brand_name não tem precedência sobre company_name: os campos representam informações diferentes. Não inferir razão social, nome fantasia fiscal ou emitente com base no nome de apresentação. Qualquer nova estrutura fiscal ou novo campo exige escopo e aprovação próprios.

## 4. Datas: diagnóstico

`frontend/src/format.ts:15–16` já tem dateOnly, que representa datas ISO `aaaa-mm-dd` como `dd/mm/aaaa`. `dateTime` usa pt-BR e America/Manaus para instantes. `ledger.tsx:328,338` e demais formulários usam input nativo type=date: o valor permanece ISO, mas a aparência de dia/mês depende do navegador e do sistema. Definir html lang=pt-BR, sozinho, não garante uma apresentação uniforme dentro do controle nativo.

No estudo anterior, os filtros do D podiam aparecer como mês/dia/ano no Firefox do ambiente de renderização, enquanto tabela e legendas usavam dia/mês/ano. A revisão corrige apenas a maquete: De = **01/10/2026**, Até = **31/10/2026**, com os ISO originais `2026-10-01` e `2026-10-31` em data-iso. Controles são ilustrativos, somente leitura e sem consultas. Ícone de calendário é uma ação de apresentação, sem implementação de seletor real.

## 5. Solução futura recomendada para apresentação consistente

Propor um **DateField compartilhado**, com texto visível explicitamente brasileiro e adaptador para o mesmo valor ISO usado atualmente. Não alterar format.ts, regras do backend, presets ou datas persistidas no SB-01.

1. **Leitura:** data de calendário ISO → decompor ano/mês/dia por componentes e exibir dd/mm/aaaa. Conservar a representação já usada por dateOnly para os valores válidos; não converter data simples por new Date/UTC nem aplicar fuso, pois poderia deslocar o dia.
2. **Edição futura:** input textual dd/mm/aaaa com ajuda persistente e inputmode numeric; distinguir texto em edição do valor ISO aplicado. Dia/mês/ano digitados só devem converter para o mesmo ISO após validação estrutural e calendário válido, preservando os limites/opcionalidade/regras existentes. Texto incompleto ou impossível não aplica filtros nem dispara gravação; comunica erro acessível. Não criar novas restrições de períodos/vencimentos.
3. **Calendário:** botão acessível e seletor ligado ao mesmo ISO. Aproveitar o calendário nativo quando suportado; escolha retorna o valor ISO e atualiza o texto brasileiro. O controle nativo é auxiliar, não a fonte da aparência localizada. Sem suporte ao seletor, digitação continua disponível; não exigir nova biblioteca ou redesenhar calendário nesta etapa.
4. **Sem dupla entrada confusa:** um único campo textual na ordem principal de teclado; botão nomeado “Abrir calendário de De/Até”. Definir foco, anúncio da seleção e fallback antes de implementar. Sem sobrepor texto opaco a input nativo editável, prática que pode produzir duas leituras/edições divergentes.
5. **Saída/API:** manter `2026-10-01` e `2026-10-31`, mesmos nomes de propriedades, bases lançamento/competência e comportamento draft/applied/Enter. Nada de enviar dd/mm/aaaa à API, mudar timezone ou reformular filtros.
6. **Instantes:** continuar a apresentação de data/hora com America/Manaus já existente; não misturar timestamp com data sem hora. Em prints/relatórios visuais adotar dd/mm/aaaa onde necessário; CSV conserva contrato atual e não deve ser reformulado por efeito da identidade visual.

**Alternativa de menor esforço:** manter type=date visível e colocar uma legenda brasileira redundante. Preserva controle nativo, mas não garante uniformidade da aparência; por isso não é a recomendação para o objetivo solicitado. Simplesmente trocar para texto sem adaptador/validação também não é suficiente.

A implementação do DateField fica no SB-05, após autorização e provas de equivalência. O estudo readonly não substitui campos funcionais do ERP.

## 6. Rolagem horizontal e ações financeiras

- Nova despesa: botão secundário neutro, mesma família de Imprimir/Exportar. Entrada e saída mantêm cor/sinal nos indicadores e valores. Estornar continua semântica de ação potencialmente destrutiva e condições de acesso atuais.
- D em tablet/celular: faixa acima da tabela “Role horizontalmente para ver todas as colunas e ações”, com seta, região focável e descrição acessível. Preservar as seis colunas e todas as ações. Não esconder valor, origem ou estorno para caber na janela.
- Regra futura reutilizável: mostrar orientação somente quando scrollWidth exceder clientWidth (inclusive ao redimensionar), não apenas por tipo de dispositivo; scroll contido, acesso por toque/trackpad e setas com foco. Não substituir tabela por cartões que omitam informações.
- O protótipo D usa media query até 900 px: há transbordamento real da tabela nos 768/375 px estudados. A visibilidade dinâmica em qualquer dimensão e o acesso à última coluna devem entrar na revisão funcional do componente Table no SB-05.

## 7. Critérios para a implementação posterior

SB-02: conferir brand_name Gestão, personalizado e nome empresarial vazio/preenchido em banco separado; nenhum valor alterado pela renderização; marca fixa; rótulos e limites contratuais preservados.

SB-05: datas idênticas em tabela/filtro/print antes/depois da conversão, navegador em pt-BR/en-US, datas ambíguas como 01/10 e 10/01, ano bissexto, limites de mês, campos vazios/incompletos/inválidos, teclado/seleção de calendário; nenhum deslocamento por fuso nem parâmetro API alterado. Verificar todas as colunas/ações por scroll em 768/375 e teclado; neutralidade de Nova despesa e semântica de Estornar. Esses testes são planejados, não executados no ERP nesta revisão.
