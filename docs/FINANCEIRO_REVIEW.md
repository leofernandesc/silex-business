# Revisão do Financeiro — Sprints 9–13

Os incrementos seguintes estão em [PLANO_FIDELIDADE_CONTROLMAX.md](PLANO_FIDELIDADE_CONTROLMAX.md). A Sprint 14 acrescentou beneficiários/PIX; o roteiro está ao final desta página.

## Ambiente e limites

Use a aplicação em `http://127.0.0.1:8000` com o banco de demonstração e dados fictícios. A conta administrativa é `demo.admin`; a senha da demonstração local está documentada no `README.md`. Nenhum fluxo precisa de dados da conta real.

OFX é somente leitura de um arquivo escolhido e enviado à instância local. Não há conexão com banco nem baixa automática. Para avaliar, use o exemplo fictício ao final desta página. Comprovantes ficam dentro do banco SQLite e devem ser incluídos no backup.

## Sprint 9 — títulos e recorrência

1. Abra **Financeiro → Contas a Receber → Novo lançamento**.
2. Cadastre um título com valor R$ 100, documento e competência; opcionalmente associe um cliente.
3. Confira que o saldo da conta continua igual enquanto o título está em aberto.
4. Crie uma série de três títulos mensais de R$ 100 e confirme que cada ocorrência tem o valor integral e a numeração própria.
5. Repita em **Contas a Pagar** com um fornecedor.

## Sprint 10 — baixas, estornos e anexos

1. Abra um título em aberto e registre uma baixa parcial, por exemplo principal R$ 25, juros R$ 1,50, multa R$ 0,50 e desconto R$ 2.
2. Confira o principal pago/restante, a composição e o valor líquido no histórico.
3. Anexe um PDF pequeno de teste ao título ou à baixa, descarregue-o e confira que o arquivo é igual ao original.
4. Estorne a baixa com um motivo e confira que a situação e o principal pendente voltam ao valor esperado. Repita a chamada e confira que não aparece outro estorno.
5. Use um arquivo maior que 5 MB ou com extensão/conteúdo incompatível para conferir a rejeição.

## Sprint 11 — conciliação OFX

1. Abra **Conciliação Bancária**, selecione **Conta digital** e importe este exemplo com a data de hoje:

```ofx
OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST><STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261013120000[-4:AMT]
<TRNAMT>-12.34
<FITID>DEMO-FITID-001
<NAME>Fornecedor de demonstração
<MEMO>Teste local de conciliação
</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
```

2. Troque `20261013` pelo dia atual em formato `AAAAMMDD`, se estiver repetindo o roteiro em outra data.
3. Confira a prévia; importe o mesmo conteúdo uma segunda vez e verifique a linha duplicada.
4. Para a primeira importação, associe um título a pagar de R$ 12,34 ou crie um lançamento novo. Confirme manualmente e veja a linha conciliada/lançada.
5. Em outra linha, confira que ignorar exige motivo.

## Sprint 12 — painel financeiro

Abra **Financeiro → Dashboard**. Ajuste as datas e confira entradas, saídas e resultado do período; títulos abertos/vencidos; saldos por conta; movimentos dos 12 meses e grupos de resultado. Títulos ainda não baixados não devem alterar saldo.

## Sprint 13 — relatórios e orçamento

1. Abra **Relatórios Financeiros** e confirme que o catálogo mostra 26 opções.
2. Gere um relatório com intervalo, conta e categoria; navegue as páginas, exporte CSV e use a impressão do navegador.
3. Cadastre uma meta mensal por categoria, compare meta/realizado/disponível e altere ou desative a meta.
4. Execute `make backup-bundle OUTPUT=/caminho/novo/gestao-completa.zip`; confirme que o ZIP contém o banco, `attachments-manifest.csv` e as cópias dos comprovantes.

## Testes automatizados

Os testes técnicos não dependem desta conferência manual. Execute `make test` e `make test-e2e`; o E2E usa banco temporário e cobre desktop, tablet e celular. As capturas de validação ficam em `evidence/sprint9-13/` e os totais exatos estão em [VALIDACAO.md](VALIDACAO.md).

Esta página é uma Review preparada para avaliação local. A semelhança visual/funcional com áreas do sistema original segue limitada pelas evidências disponíveis; valores, regras e contatos da demonstração são fictícios.

## Sprint 14 — novos beneficiários e PIX

1. Em Cadastros → Diaristas, crie um prestador com nome, contato e PIX opcional; confira a persistência e edite os dados.
2. Repita em Cadastros → Frete Subcontratado. O cadastro representa o prestador, não cada contratação.
3. Em Contas a Pagar, crie um título escolhendo esse beneficiário. Confira que o título está em aberto e não muda o saldo.
4. Abra a quitação por PIX e confira chave/titular. Copiar a chave deve somente copiar; ainda não registra baixa.
5. Confirme a baixa manualmente apenas para registrar um pagamento efetuado. O sistema não envia uma transferência.
6. Inative o cadastro; seus títulos/baixas continuam no histórico e o prestador sai da seleção de novos títulos.

## Sprints 15–18 — revisão da implementação

As melhorias de navegação, cadastros, consulta financeira e serviço/pedido estão implementadas e passaram pela validação técnica em [VALIDACAO.md](VALIDACAO.md). Abaixo fica uma Review opcional das premissas de operação; não é necessária para repetir os testes automatizados.

### Conferir títulos e período financeiro

1. Abra **Financeiro → Contas a Pagar** ou **Contas a Receber**. Cada tela mantém sua direção fixa e mostra filtros de situação, beneficiário, documento e base de data.
2. Use **Pesquisar** após editar filtros. A lista e os cards devem representar o mesmo recorte; a soma não deve mudar ao trocar de página.
3. A faixa “vence em 7 dias” inclui títulos que vencem hoje e no sétimo dia; o oitavo dia fica fora. Em aberto/parcial, o card soma apenas o principal restante.
4. Exporte CSV ou abra **Imprimir** e confira que as linhas correspondem ao mesmo filtro. A impressão abre uma página HTML para o navegador imprimir/salvar; não gera PDF automaticamente.

### Conferir serviço/pedido e resultado

1. Cadastre um cliente, uma diarista e um prestador de frete, ou use registros fictícios existentes.
2. Em **Movimentações → Serviços e pedidos**, informe receita negociada e associe custos contratados. Exemplo: receita R$ 1.000, diária R$ 125 × 2 e frete R$ 80 resulta em R$ 670 previstos.
3. O valor padrão do cadastro é só uma sugestão: altere a quantidade e confirme o recálculo automático; depois edite o valor acordado para confirmar que sua escolha é preservada.
4. Antes de gerar títulos, o cadastro de custos não cria contas nem movimenta saldos. Use **Gerar títulos** explicitamente, informe conta, vencimento e competência. Repetir a ação não deve duplicar títulos.
5. Baixe parcialmente um recebível ou quite uma conta a pagar e atualize o serviço para conferir o realizado. O cálculo considera pagamentos assinados e estornos, separado da margem contratada.
6. Cancele um serviço fictício. Os títulos abertos são cancelados, baixas reversíveis ganham registros de estorno e o histórico do serviço/custos continua consultável. Regras do caixa, inclusive caixa fechado, continuam valendo.

As decisões de lançamento manual, valor padrão opcional/editável e custos por serviço são premissas adotadas para avançar sem dados operacionais da empresa. A Sprint 19 — acesso por HTTPS, operação em rede, banco compartilhado, backup automático e restauração — permanece fora desta entrega.
