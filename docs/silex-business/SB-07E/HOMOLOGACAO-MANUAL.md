# SB-07E — roteiro de homologação humana e assistiva

**Não executada com participantes ou leitor de tela real.** Orca 46.1 instalado, processo inativo. A sessão gráfica privada Xvfb não fornece uma sessão assistiva confiável com áudio, AT-SPI e usuário observador. Não iniciamos o leitor no desktop do usuário nem caracterizamos DOM/ARIA como leitura real.

## Preparação pelo responsável

Usar Ubuntu 24.04/Orca 46.1 e Firefox 155.0 inicialmente, registrando versões efetivas do navegador/SO/leitor no dia. Uma segunda sessão com Windows/NVDA e Chrome deve ser registrada separadamente se disponível; versões ainda não observadas. Ativar suporte assistivo e confirmar anúncios em aplicação de referência antes do ERP. Utilizar headset/áudio e participante que opere o leitor. Ambiente isolado loopback, SQLite descartável, empresas/pessoas fictícias; credencial entregue fora do roteiro e fora do ZIP.

Registrar participante por código consentido, data, sistema, navegador, leitor, rota, ações, anúncio **observado**, resultado esperado, dificuldades, evidência e aprovado/reprovado/não executado. Não preencher resultados antecipadamente.

| Fluxo | Ações sem orientação adicional | Resultado esperado / critério de aceite |
|---|---|---|
| Login | Ler título e rótulos, entrar inválido e válido por teclado | Campo/senha e erro anunciados; foco lógico e retorno à rota solicitada |
| Menu móvel | Em 375/320, abrir, Tab/Shift+Tab, submenus, Escape | Nome e expandido anunciados; conteúdo encoberto inacessível; foco retorna ao acionador |
| Início/Visão Geral | Navegar por títulos/links; abrir indicador/atalho permitido | Telas distintas, empresa identificada, nomes completos, ordem coerente, operador sem links administrativos |
| Cadastro/Modal | Novo cliente, editar, cancelar/X/Escape e salvar | Título/diálogo/erro anunciados; foco contido e restaurado, sem envio indesejado |
| Calendário em Modal | Serviços: editar 04/03/2026, abrir calendário, setas, selecionar; Escape em duas camadas | Segmentos dia/mês/ano compreensíveis; confirmação mantém ISO2026-03-04; foco volta ao botão do calendário e depois ao acionador do modal |
| Inválida/obrigatória | 29/02/2025, parcial e vazio obrigatório; corrigir para29/02/2024 | Erros associados e anunciados, valor parcial não enviado, correção editável |
| Competência | Selecionar03/2026, alterar ano, limpar quando opcional | Anúncio mês/ano, YYYY-MM preservado; nenhum dia artificial |
| Financeiro | Buscar por Tab/Enter, ler cabeçalhos/células, rolar até ações; alta/baixa apenas em fixture | Foco visível, dados/cents completos, estados por texto, relações tabela/cabeçalho compreensíveis |
| Gráficos | Acessar gráfico e alternativa tabular do Dashboard financeiro | Mesmos meses/séries/valores compreendidos sem depender de cores ou visão |
| Erro/expiração | Expirar só a sessão temporária pelo instrumento; seguir retorno/login | Nenhum dado privado após expiração; mensagem e destino compreensíveis |
| Zoom/toque | Repetir calendários e tabelas200/400; verificar aparelho físico se disponível | Sem perda de controles/informação; nenhuma sobreposição ou alvo ambíguo |

## Avaliação humana das datas

Pedir que a pessoa diga qual data está selecionada sem sugerir interpretação. Criar serviço em04/03/2026, editar29/02/2024, recarregar, gerar títulos31/12/2026 e competência01/01/2027. Comparar interpretação com dado salvo; registrar palavras da pessoa e dúvidas. Repetir em navegador pt-BR/en-US. A apresentação controlada atual tem ordem brasileira, mas compreensão/anúncio assistivo exigem observação real.

## Aprovação

Reprovar o fluxo se controle essencial ficar inacessível, erro não puder ser compreendido/corrigido, houver perda de foco impeditiva ou interpretação financeira equivocada. Classificar e propor correção antes de alterar produto. Guardar resultado por fluxo e dispositivo; não extrapolar uma aprovação parcial para WCAG integral ou todos os usuários. Até execução real, todos os resultados humanos/assistivos deste roteiro ficam **pendentes**.
