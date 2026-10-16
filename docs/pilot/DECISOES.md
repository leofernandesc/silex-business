# PILOT-00 — Decisões e limites

Base: `07ed8c25885f6f117945ba138fa0268b34fd8bd3`. O [PLANO.md](PLANO.md) contém a proposta executável; este documento registra o que falta decidir. Nenhuma instalação ou homologação foi executada no PILOT-00.

## Aprovado

- Uma empresa em instância/banco/configurações exclusivos, com acesso apenas aos participantes autorizados e dados fictícios iniciais.
- Preservar ERP multissetorial, implementação própria e ControlMax como referência funcional consultada por MCP. Empresa-piloto não redefine módulos nem arquitetura.
- Manter a stack atual e avaliar SQLite; sem `tenant_id`, migração preventiva, assinaturas ou multitenancy.
- IMP01, F01 e F02 corrigidas/integradas. Este incremento altera somente dois documentos e propõe a próxima etapa; PR não autoriza implantação ou dados reais.

## Decisões do proprietário antes da demonstração fictícia

| Decisão | Proposta preliminar / o que confirmar |
| --- | --- |
| Forma de acesso | C: servidor exclusivo, VPN e HTTPS privado. Confirmar se acesso será remoto, presencial ou ambos; se houver apenas avaliação presencial pontual, considerar A |
| Dispositivo da avaliadora | SO/browser, rede disponível, permissão para VPN, necessidade de acesso sem supervisão, impressão/dispositivo físico e necessidades assistivas. Não presumir mesma LAN |
| Host, custo e administração | Equipamento/fornecedor/localização, teto mensal e responsável por conta, atualizações e incidentes. Referência de custo no plano não é cotação aprovada |
| Participantes e perfis | Lista autorizada e quais tarefas exigem admin; financeiro/estoque têm restrições existentes. Não criar permissão nova para acomodar piloto. Contas próprias, credencial entregue fora do Git |
| Operação e backup | Responsável e substituto, destino fora do host, chave de criptografia, retenção e RPO/RTO propostos, horários e canal de suporte |
| Próxima autorização | Aprovar PILOT-01 com escopo de segurança/configuração conforme modo escolhido. Aprovar separadamente host/serviços e execução PILOT-02; não há autorização de compra, DNS, VPN ou deploy neste PR |
| Sessão de avaliação | Agenda e fluxos prioritários do ERP existente, consentimento para observação, política de evidências sem informação privada e critério de interrupção |

## Condições antes de permitir dados reais

- Aceite explícito dos fluxos essenciais pela avaliadora, sem divergência financeira ou bloqueio de acesso; registrar resultados humanos reais, inclusive datas/calendário. Homologação assistiva é necessária se fizer parte das condições de uso; a lacuna A01 não equivale a defeito já reproduzido.
- Aprovar segurança do modo efetivamente escolhido: transporte, cookies, hosts/origens, proxy, dispositivos, usuários/permissões, acesso aos anexos e recuperação de conta. Para acesso remoto, S01 precisa de ajuste e validação antes da liberação, mesmo em VPN.
- Completar O01 no host escolhido: restauração banco+comprovantes, cópia externa criptografada, responsabilidade pelas chaves, retenção, logs, atualização, indisponibilidade e tempo de recuperação. Definir revogação das sessões após restauração; ZIP e Git não substituem continuidade operacional.
- Autorizar finalidade e dados permitidos, responsáveis por acesso/privacidade, consentimentos aplicáveis, retenção/exclusão e comunicação de incidentes. Isso é decisão operacional/contratual, não parecer jurídico emitido pelo piloto.
- Criar banco exclusivo novo sem contas/senhas/lançamentos demo, via comandos existentes; definir cadastro inicial, conferência dos saldos e quais anexos serão aceitos. Não converter automaticamente a fixture fictícia em base real ou importar dados sem projeto autorizado.
- Aprovar separadamente o uso real supervisionado e seus limites de suporte. Um piloto não substitui sistemas fiscais/obrigações existentes nem autoriza venda do SaaS.

## Bloqueios por finalidade e evidência

| Item | Constatação e natureza | Demonstração fictícia | Dados reais |
| --- | --- | --- | --- |
| S01 — configuração local | Código confirma Secure=false e hosts fixos de loopback; não é vazamento demonstrado. URL remota padrão não está preparada | Bloqueia B/C até preparação autorizada e verificada. Não impede A com isolamento local validado | Bloqueia acesso remoto até aceite da configuração segura e das permissões; não há segurança produtiva comprovada |
| O01 — operação | Há comandos de backup/bundle; serviço supervisionado, cópia externa, alertas e restauração no host futuro não foram homologados | Bloqueia disponibilização sem responsável, isolamento e recuperação mínima. A preparação documental atual está concluída, o ensaio futuro não | Bloqueia até ensaio operacional, metas/retenção aceitas e recuperação de sessões definida |
| Aceite humano/A01 | Avaliadora, leitor real e dispositivos ainda não observados neste piloto | A sessão fictícia serve para obter esse resultado; não exigir homologação humana prévia para poder demonstrar. Se controle essencial for inacessível, parar o fluxo | Fluxos essenciais precisam de aceite observado; validar assistência/dispositivo conforme necessidade real. Sem alegar WCAG integral |
| M01 — configuração global | Uma empresa global por instalação; não há isolamento interno entre empresas ou assinaturas | Não bloqueia instância exclusiva de uma empresa | Não bloqueia empresa única exclusiva; bloqueia oferecer SaaS multiempresa sem projeto próprio |
| Uso de dados privados | Nenhum banco/participante real foi utilizado neste incremento | Somente dados sintéticos e anexos de teste; credenciais e registros da avaliadora não entram em evidências/Git | Exige as decisões de privacidade, contas e base nova acima; ainda não autorizado |

Bloqueios são relativos ao acesso e ao uso proposto. Não foi demonstrada falha nova de cálculo, persistência ou autorização nesta inspeção. Capacidade, recuperação no host escolhido e compreensão humana são testes pendentes, sem resultado antecipado.

## Adiado, sem reabrir escopo

- **P05 parcial:** campos civis/mensais corrigidos tecnicamente; saídas CSV e homologação humana/assistiva ainda pendentes. Avaliar interpretação nos fluxos usados; não converter contratos CSV. IMP01 já integrada, sem nova otimização dos relatórios de 39 campos.
- **P07:** dívida técnica controlada; sem refatoração CSS.
- **V01/T01:** em acompanhamento sem nova reprodução comprovada. Coletar contexto se ocorrer na sessão; não abrir bateria genérica agora.
- **Q01:** manter fixtures de caixa independentes quando houver automação que altera caixa; não é falha financeira comprovada do produto.
- **E01:** limites da automação Firefox/Playwright preservados; ensaio automatizado não substitui ação humana/zoom real.
- Leitor de tela, dispositivo físico e impressora permanecem sem homologação onde não executados. Histórico de testes em [SB-07E](../silex-business/SB-07E/TESTES.md), limites no [roteiro manual](../silex-business/SB-07E/HOMOLOGACAO-MANUAL.md) e estado vigente em [PENDENCIAS.md](../silex-business/PENDENCIAS.md).
- Segurança de publicação, alta disponibilidade, oferta comercial, NF-e/TEF, integração bancária automática e multiempresa não são entregas deste piloto. Não criar recursos ausentes para completar o roteiro.

## Encerramento do PILOT-00

Inspeção dirigida de documentação e código, conferência Git, revisão dos dois documentos, links relativos e `git diff --check`. Sem novas suítes do ERP, criação de banco, instalações, cópia de dados persistentes ou mudanças de infraestrutura. O próximo passo depende da revisão deste Draft PR e das decisões do proprietário; nenhum incremento seguinte está iniciado.
