# Silex Business — SB-02.3

**Estado:** validação concluída para revisão; aprovação do SB-02.2 e autorização exclusiva do SB-02.3 recebidas do usuário. SB-03 permanece pendente de autorização.

## Resultado

Foi comprovada e corrigida uma regressão visual introduzida pelo SB-02.2: o contorno de foco azul claro ficou fraco sobre fundos claros. A alteração de produção é limitada a `frontend/src/styles.css`: foco azul médio nos controles claros e na busca de Clientes, mantendo azul claro no menu e no banner escuros. [Diff completo](../../evidence/sb02-3/diffs/styles.css.diff).

A revisão cobriu as 23 telas inventariadas, mais Login, em 1440, 768 e 375 px. Foram comparadas versões antes/depois do SB-02.2 e a versão corrigida, com os mesmos dados fictícios em bancos separados. Nas 72 combinações finais não houve overflow horizontal da página, controles visíveis sem nome acessível nem falha de carregamento da Inter local. Os conteúdos operacionais, tabelas e ações permanecem funcionais; a adoção de todos os tokens em todos os módulos ainda é gradual.

## Medições da correção

| Contexto | Antes do SB-02.2 | SB-02.2 aprovado | SB-02.3 |
| --- | --- | --- | --- |
| Busca Clientes sobre branco | 3,964:1 | 2,026:1 | 4,974:1 |
| Contorno primário sobre canvas | 2,865:1 | 1,872:1 | 4,597:1 |
| Contorno no menu | 3,182:1 sobre branco | 6,680:1 sobre azul profundo | 6,680:1 preservado |

O contorno antigo sobre o canvas já ficava abaixo de 3:1, mas o SB-02.2 reduziu ainda mais seu contraste. A troca utiliza o azul médio aprovado. No banner, o azul claro foi mantido, com mínimo calculado de 3,146:1 nos extremos do gradiente. [Medição antes](../../evidence/sb02-3/initial-focus-probe.json), [medição depois](../../evidence/sb02-3/final-focus-probe.json).

## Cobertura e evidências

- [Galeria comparativa](../../evidence/sb02-3/galeria.html): selecione tela e largura; imagens antes do SB-02.2, SB-02.2 e SB-02.3; comparativo dedicado do foco.
- [Matriz de acessibilidade e responsividade](MATRIZ.md), [JSON](../../evidence/sb02-3/matrix.json) e [CSV](../../evidence/sb02-3/matrix.csv).
- Contatos das 24 telas: [1440](../../evidence/sb02-3/contact-sheet-1440.png), [768](../../evidence/sb02-3/contact-sheet-768.png), [375](../../evidence/sb02-3/contact-sheet-375.png). Mostram o viewport inicial; as capturas individuais são de página inteira quando necessário.
- [Problemas, gravidade e origem](PROBLEMAS.md), [seletores e componentes](SELETORES.md), [identificação empresarial](IDENTIFICACAO-EMPRESARIAL.md).
- [Testes, tentativas e limites](TESTES.md), [preservação e recuperação](PRESERVACAO.md), [recomendações SB-03](RECOMENDACOES-SB03.md).

42 diálogos foram verificados nas três larguras: foco dentro do diálogo ao abrir, contenção em 12 Tabs e Escape funcionaram. O retorno ao acionador ao fechar falhou tanto antes como depois: problema P01, preservado e documentado. A rolagem das tabelas foi verificada por teclado; Categorias precisou de probe dedicado com espera maior, que confirmou deslocamento de 41 e 69 px até o limite no celular.

## Problemas anteriores e diferenças planejadas

Permanecem pendências de acessibilidade: retorno de foco dos modais, gerenciamento de foco no menu móvel, foco ausente no campo Busca de Pagar/Receber e contrastes legados. Sua origem anterior está documentada e a correção exige aprovação própria. O botão Nova despesa é atualmente primário azul, como antes; a hierarquia secundária/neutra aprovada no protótipo pertence ao SB-05. Datas nativas localizadas e densidade de controles também permanecem para revisão posterior.

## Preparação, proteção e limites

Foram lidos os relatórios e decisões do SB-01, SB-02.1 e SB-02.2, registrados 273 hashes iniciais e validados os backups. O checkout segue sem Git; não há branch ou status Git disponível. Novo checkpoint de fontes foi criado antes da correção e a restauração de styles.css foi ensaiada fora do checkout.

TypeScript/Vite e os 19 testes frontend passaram em uma cópia isolada. A suíte E2E existente passou nos 27 cenários nas três larguras; os testes adicionais e todas as tentativas constam em TESTES.md. Quatro respostas JSON de consulta — dashboard, financeiro, vendas e estoque — coincidiram integralmente entre baseline e candidato em fixtures equivalentes.

Os três servidores usaram somente loopback e bancos descartáveis em `/tmp`. O build foi executado nas cópias isoladas: `frontend/dist` e `tsconfig.tsbuildinfo` do checkout não foram alterados. Não houve instalação de dependências, migração Alembic, deploy ou merge. Banco persistente, backend, contratos, autenticação, rotas, permissões, formulários e regras financeiras foram preservados.

O relatório registra auditoria por DOM, CSS calculado, teclado, capturas e cenários existentes. Leitor de tela, clipboard nativo do sistema, todos os gradientes por pixel e matriz completa de sessão/autorização/histórico não foram homologados. As pendências observadas impedem uma declaração de acessibilidade integral.

A entrega aguarda revisão explícita. Nenhum incremento seguinte foi iniciado.
