# Fluxo de desenvolvimento — Silex Business

Este guia mantém a `main` estável e torna cada mudança rastreável por branch e Pull Request. A `main` está atualmente sem proteção automática no GitHub; até nova configuração, o processo depende de disciplina operacional.

## 1. Começar uma tarefa

1. Confirme o repositório e leia as instruções e pendências pertinentes.
2. Atualize as referências sem mudar arquivos de trabalho:

   ```bash
   git switch main
   git fetch origin
   git status --short --branch
   git pull --ff-only origin main
   ```

3. Se houver diferenças locais inesperadas, pare e investigue; não use reset/clean para descartá-las.
4. Crie uma branch curta a partir da `main` atualizada:

   ```bash
   git switch -c <tipo>/<descricao-curta>
   ```

Use `feat/` para funcionalidades, `fix/` para correções, `refactor/` para refatorações, `test/` para testes, `docs/` para documentação e `chore/` para manutenção. Exemplos: `feat/multiempresa-base`, `fix/impressao-datas-ptbr`, `docs/workflow-codex`. Evite branches longas. Se uma dependência de outra branch foi aprovada explicitamente, registre-a no PR.

## 2. Implementar e testar proporcionalmente

Inspecione o código e seus consumidores antes de editar. Defina um plano curto, mantenha o diff no escopo e não altere backend, dados ou contratos sem autorização aplicável.

- **Nível 1 — baixo risco:** documentação, texto ou estilo localizado. Rode verificações estáticas e testes diretamente afetados; faça build se mexeu no código frontend.
- **Nível 2 — risco moderado:** formulários, componentes compartilhados, navegação ou várias telas. Rode TypeScript, build, testes unitários relevantes, E2E afetados, regressões selecionadas e verificações de acessibilidade pertinentes.
- **Nível 3 — alto risco:** autenticação, permissões, banco, API, cálculos financeiros, segurança ou migrações. Faça revisão arquitetural antes de implementar; cubra unitários, integração, contratos, regressões amplas, segurança, backup e recuperação. Apresente a solução para revisão explícita antes de integrar.

Se houver dúvida entre níveis, escolha o mais alto e explique o motivo. Use ambiente isolado e dados fictícios para operações persistentes. Não rode a suíte extensa a cada ajuste trivial sem risco que justifique.

## 3. Commits

Use mensagens objetivas, preferencialmente Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`). Cada commit deve representar uma unidade coerente.

Antes de cada commit:

```bash
git diff --check
git diff
git status --short
git diff --cached
```

Revise explicitamente os caminhos staged e procure dados privados, segredos, bancos, caches e builds. Adicione arquivos por caminho, não indiscriminadamente. Não inclua credenciais ou dados reais.

## 4. Revisar e integrar

Faça uma revisão técnica própria: comportamento, contratos, regressões, segurança, acessibilidade quando pertinente, duplicações, dependências novas e arquivos fora do escopo. Abra um PR para `main`, usando o template do repositório. Prefira Draft enquanto a revisão está incompleta.

Informe no PR o objetivo, diff, testes, limitações e riscos. Aguarde revisão e autorização explícita para integrar. Não faça push direto à `main`, não use force push e não exclua a `main`. Não execute merge automaticamente. Escolha o método de merge caso a caso, preservando o histórico rastreável.

## 5. Proteção operacional da main

A branch ainda não tem proteção automática configurada. Até que isso seja revisto e habilitado separadamente:

- trabalhe em branches e proponha tudo por PR;
- não envie commits diretamente à `main`;
- não faça force push nem exclua a branch;
- integre somente após revisão e autorização explícita.

Esse procedimento depende de disciplina; não substitui regras aplicadas pelo GitHub. A configuração de proteção está sujeita às opções do plano e à aprovação do proprietário. Não altere visibilidade ou plano para contornar limitações.

## 6. Recuperação

Antes de mudança de risco alto, identifique o commit aprovado e prepare backup verificável dos arquivos e referências relevantes; banco exige backup operacional separado. Registre hashes e mantenha cópia restrita fora do workspace. Ensaie a restauração em diretório temporário. Para recuperar código, restaure os arquivos ou referências a partir do backup/clonagem isolada após conferir hashes; não reescreva histórico compartilhado nem substitua o workspace ativo sem aprovação.

## 7. Uso proporcional de modelos de IA

- **Luna 6 Max:** documentação, tarefas isoladas, CSS localizado, testes simples e implementação de baixo risco.
- **Sol 6.1 High:** arquitetura, autenticação, permissões, banco, operações financeiras, segurança, migrações e auditorias de alto risco.

Não alterne modelos sem benefício concreto. Evite revisões recursivas e loops automáticos indefinidos. O responsável pela mudança verifica o diff e os resultados; evidência automatizada não substitui homologação humana quando ela for necessária.

## 8. CI futura

Nenhuma CI ou pipeline de deploy é configurada por este guia. Uma proposta futura pode começar por TypeScript, build e testes frontend/backend. Antes de habilitar GitHub Actions em repositório privado, estime minutos disponíveis, custo, dependências e duração; execute E2E extensos somente quando o risco justificar. Não faça deploy automático sem decisão separada.
