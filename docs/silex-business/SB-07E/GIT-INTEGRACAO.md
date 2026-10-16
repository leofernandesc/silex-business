# SB-07E — histórico e proposta de integração

## Resultado observado

Base aprovada: `62083832fff50c7641efbe61d54d0259dbea0476`. Checkout limpo antes do trabalho; criada `test/sb07e-integrated-validation` diretamente dessa base. `git fsck --full` aprovado. Primeiro commit/main: `61c744f4ea291a7f2872c8f3d78f4346e3943ce2`, consolidado SB-04B, sem representar um histórico individual dos incrementos anteriores à inicialização Git.

Na abertura havia **77 commits à frente e zero exclusivos da main**. Todas as branches anteriores são ancestrais da base aprovada: SB-05, SB-06A/B/C/D.1/D.2/E e SB-07A/B/C/D. A árvore acumulada contém as mudanças aprovadas. `git-audit.json` discrimina hashes, branches, commits, caminhos e diff completo desde main. O fechamento adiciona somente instrumentos e documentação SB-07E.

**Fast-forward tecnicamente possível**, desde que main e a branch continuem nessa relação no momento da execução. Isso não autoriza integração. Nenhum remoto configurado; nenhum push/merge/rebase/squash/cherry-pick executado. Main preservada.

Dependências adicionadas no histórico: React Aria Components 1.22.1 e @internationalized/date 3.12.4, com lockfile aprovado; não foram alteradas neste incremento. Os demais pacotes são os registrados em package/lock e requirements. Testes de datas, navegação, acessibilidade e famílias financeiras fazem parte da cadeia. `git-final.json`/`file-inventory.json` relacionam os arquivos deste incremento; `git-audit.json` relaciona o acumulado.

## Proposta sujeita a autorização futura

1. Parar gravações, conferir workspace limpo, HEAD exato aceito e `git fsck --full`. Revisar o inventário de dados sensíveis, incluindo credenciais **fictícias conhecidas**, antes de compartilhar o histórico. Não apagar/regravar commits para saneamento incidental.
2. Criar backup local completo do diretório Git/arquivos locais necessários em destino com acesso restrito. Adicionalmente, `git bundle create <backup>.bundle --all` e `git bundle verify <backup>.bundle`; calcular SHA-256 e ensaiar clone isolado do bundle, confirmando refs/objetos. Um bundle não contém arquivos ignorados, uploads ou banco: estes requerem backup consistente separado. **Não executado neste incremento**; apenas o backup dos arquivos rastreados foi preparado e restaurado.
3. Preservar o HEAD aprovado em uma ref/tag de segurança **somente após autorização**. Registrar SHA completo, não depender de nomes móveis de branch.
4. Reconfirmar `git merge-base --is-ancestor main <HEAD-aceito>`. Em checkout limpo da main: `git merge --ff-only <HEAD-aceito>`. Se falhar, parar e avaliar divergência; não substituir por merge forçado ou reset. Usar o SHA aprovado, não uma branch que possa receber mudanças posteriores.
5. Reexecutar TypeScript/build/unitários e seleção de login/expiração/permissões, datas/modais e financeiro em banco descartável; conferir hashes de produção contra o HEAD aceito. Registrar novos testes pós-integração.
6. Considerar tag anotada de marco do rebranding, com nome/versão acordados; sem alegar lançamento comercial. Criar somente após aceite dos testes.
7. Definir repositório privado, proprietário, permissões, política de branches e proteção de main. Revisar segredos no histórico e excluir demonstrações de qualquer implantação produtiva. Configuração do remoto e primeiro push exigem autorização própria; não presumir URL.

## Recuperação proposta

Antes de fast-forward, manter o SHA antigo de main e backup verificável. Se os testes posteriores falharem, suspender publicação, conservar ambos os estados e pedir decisão sobre recuperação. Não executar reset/rewrite automático de main. Um novo checkout isolado do SHA anterior permite investigação sem destruir o histórico.

A integração Git organiza o estado local; não instala o sistema, não valida TLS e não cria isolamento entre empresas. A proposta não realiza qualquer alteração de main, remotos ou tags.
