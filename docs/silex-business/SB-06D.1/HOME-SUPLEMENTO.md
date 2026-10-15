# Suplemento documental da Home — evidência SB-06C

O arquivo histórico `docs/evidence/sb06c/screenshots/baseline-home-375.png` mostra o login com **Salvando…**, enquanto a candidata mostra a Home autenticada. A própria coleta histórica `baseline-audit.json` registra textos do login para essa linha. A comparação histórica não é válida como antes/depois da Home.

O coletor histórico `audit.cjs` clica Entrar e depois executa `ready()`, cujo predicado aceita tanto `.app-shell main h1` quanto `.login-card h2`. Enquanto o login ainda está em andamento, esse predicado pode satisfazer a espera pelo título de login. `networkidle` e fontes não comprovam, por si só, a transição React para a rota autenticada. Não havia registro histórico de URL/status de sessão junto à captura.

O defeito de sincronização está confirmado no instrumento. A imagem é compatível com captura prematura; **perda de sessão não foi comprovada** e o registro histórico não permite reconstruir toda a temporização. Nenhuma alteração na autenticação foi feita.

## Comparação suplementar correta

- Antes do SB-06C: `c2696e3f130b216aca9c12c6d6c3cad0fc79bb3f`, cópia `historical-c269`.
- Depois do SB-06C / baseline deste incremento: `aa4964d48c51fb8f56f29daf3b3a20401d2df2bb`, cópia `baseline`.
- Candidata SB-06D.1: comparativo adicional próprio, não substitui a história.

O coletor novo aguarda POST login 200, URL exata `/app#home`, shell montado, login removido, título **Página inicial**, fontes e GET `/api/auth/me` 200. Registra eventos de navegação/status sem cookies/credenciais. A captura final estabiliza também a posição do ponteiro. `home-supplement.json` contém os hashes históricos e os sete estados autenticados verificados.

Os arquivos e o ZIP SB-06C permanecem intactos. As novas imagens estão somente em `docs/evidence/sb06d1/screenshots/`; a galeria distingue explicitamente a comparação histórica suplementar e o antes/depois deste incremento. Este documento corrige a evidência, não declara uma correção funcional de sessão.
