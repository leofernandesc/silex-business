# Silex Business — SB-04B

**Implementação concluída para revisão explícita. SB-05 não iniciado.**

## Implementado

Página Inicial autenticada em /app#home: boas-vindas com usuário da sessão, identificação empresarial real disponível, oito atalhos rápidos administrativos/quatro do operador, áreas de módulos com links compactos, Administração quando autorizada e acesso claro à Visão Geral independente.

home é rota principal no registro central. Login normal e /app sem destino abrem Início; retorno protegido válido/autorizado mantém prioridade. Sidebar exibe Início antes de Visão geral e identifica corretamente a rota ativa. Histórico, refresh, hashes/alias legados, guard, logout, 401/403 e menu móvel P03 foram revalidados. Logout permanece /entrar conforme SB-03.

Home usa user/company já disponíveis e acompanha loading/erro da consulta empresarial existente. Não consulta dashboard/financeiro/estoque/vendas, não copia indicadores e não inventa dados. Marca fixa Silex Business; company_name identifica o cliente; brand_name continua legado editável sem fallback. Não há seleção de empresas ou multitenancy.

## Código e preservação

Três fontes existentes mudaram: App.tsx (montagem/menu/status empresarial), routes.ts (home/default) e useAppNavigation.ts (default sem retorno). Cinco testes existentes foram adaptados. Novos: AuthenticatedHome.tsx, model.ts, home.css e dois testes. [Lista completa](ARQUIVOS.md), [arquitetura](ARQUITETURA.md), [diff](../../evidence/sb04b/production.diff).

Visão Geral/Login no App, módulos operacionais, backend, banco, contratos, credenciais, permissões, regras/cálculos, impressão, CSS global, SVGs/Inter/tokens, página pública e evidências anteriores permanecem intactos. Dos 1.489 arquivos iniciais, 1.481 mantiveram os hashes e oito sofreram alterações autorizadas; nenhum removido. As dez consultas comparadas coincidiram.

Backup externo de 60 originais, verificações SHA-256 e restauração completa em diretório temporário, incluindo remoção dos cinco novos arquivos. Cobre todos os oito alterados. Checkout continua sem Git. [Preservação/reversão](PRESERVACAO.md), [manifesto](../../evidence/sb04b/preservation-test.json).

## Testes

TypeScript, build Vite, 54 testes frontend, 69 backend e **108 E2E** aprovados: 24 Home + 36 navegação/auth + 21 público + 27 operacionais, em 1440/768/375 px. Sem skips/retries na rodada final. Administrador e operador, todos os atalhos, recusa backend, sessão expirada em Home, prioridade de retorno, logout, refresh, histórico e menu por teclado incluídos.

Capturas antes/depois, Home por perfil, texto ampliado 200%, contraste calculado, Inter local, overflow e cinco SVGs oficiais conferidos. Tentativa inicial e correções do harness estão documentadas, sem omitir falhas. [Detalhes/testes](TESTES.md), [matriz](../../evidence/sb04b/test-matrix.json), [resumo](../../evidence/sb04b/tests-summary.json).

## Revisão visual

- [Galeria HTML](../../evidence/sb04b/galeria.html).
- Início administrador: [1440](../../evidence/sb04b/screenshots/candidate-admin-home-1440.png), [768](../../evidence/sb04b/screenshots/candidate-admin-home-768.png), [375](../../evidence/sb04b/screenshots/candidate-admin-home-375.png).
- Operador: [1440](../../evidence/sb04b/screenshots/candidate-operator-home-1440.png), [768](../../evidence/sb04b/screenshots/candidate-operator-home-768.png), [375](../../evidence/sb04b/screenshots/candidate-operator-home-375.png).
- [ZIP para revisão externa](../../evidence/sb04b/SB-04B-review.zip).
- [Prévia local](http://127.0.0.1:18029/app#home), em banco fictício. [Reprodução](REPRODUCAO.md).

## Diferenças do C e limites

Removidos dados/barra de estudo; campos reais substituem os exemplos, sem inventar setor/cidade/data. Área de serviços foi ampliada para o agrupamento Comercial/operações existente. Links restantes aparecem compactos, sem repetir os atalhos; Administração é uma faixa menor. Mobile usa uma coluna para manter títulos completos e legíveis. Administrador mantém três cartões; operador somente áreas permitidas. Comparativos na galeria evidenciam essas adaptações.

Leitor de tela real/dispositivos físicos pendentes; probe de texto ampliado não homologa todos os modos de zoom. Expiração ociosa é percebida na próxima verificação/requisição, sem polling novo. Configuração continua global. P01/P02/P04–P07/P09 permanecem no registro central; P03/P08 foram revalidadas. [Pendências e recomendação de próximo ciclo](PENDENCIAS.md).

Aprovação necessária: revisar composição/adaptações, perfis e evidências deste incremento antes de autorizar trabalho seguinte. Nenhum deploy, merge, SB-05 ou modificação de funcionalidades operacionais realizado.
