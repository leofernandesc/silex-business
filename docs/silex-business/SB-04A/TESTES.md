# Testes SB-04A

Ambientes isolados em /tmp/silex-sb04a-vfz4n4gi, servidor FastAPI e SQLite de demonstração. Nenhuma dependência instalada, build no checkout ativo, banco persistente ou infraestrutura externa usados.

## Cobertura

- Baseline: build e 38 testes frontend existentes, antes das mudanças.
- Candidato: TypeScript/build, 48 testes frontend (incluindo fronteira de superfícies, allowlist e conteúdo conservador).
- Backend existente: 69 testes passaram; políticas de sessão/credenciais, origem, autorização, escopo de vendas/caixa e regras operacionais não mudam.
- E2E SB-03: 12 cenários × 3 larguras, com apenas preparação de login atualizada de / para /entrar, acesso ao novo manifesto isolado e nome da empresa fictícia do fixture.
- E2E público: 7 cenários × 3 larguras: público sem sessão, metadados/fontes/rede, âncoras/histórico/refresh, login/ERP/logout, sessão válida no público e retorno same-document, menu por teclado/breakpoint, tabela fictícia/scroll e movimento reduzido/zoom 200%.
- E2E operacional app.spec.ts: 9 cenários × 3 larguras; helper de login aponta a /entrar. As asserções de vendas, clientes, estoque, caixa, financeiro, PIX, serviços, OFX, recibo e estorno são preservadas.
- Capturas e contraste DOM em 1440, 768, 375; comparativos ERP antes/depois após carregar o CSS público no mesmo documento.
- Smoke Vite: fallback /,/entrar,/app, público sem API, âncora com refresh, login operador e logout /entrar.

Resultados finais, projetos, durações e logs: docs/evidence/sb04a/tests-summary.json e arquivos *-results.json. Projeto não possui script de lint dedicado; formatação verificada com Prettier disponível.

## Preservação da autenticação

Guest continua recebendo 401 e operador 403 dos endpoints protegidos. Retorno ao módulo permitido, links legados de 23 telas+alias, sessão válida/expirada, cookie HttpOnly/Strict, logout confirmado/401/rede, histórico e P03/P08 continuam testados. Logout permanece /entrar. /app#home continua indisponível.

No novo público, requests a /api são contadas no navegador: espera-se **zero**, tanto guest quanto com cookie válido. Nenhum nome da empresa privada fictícia, usuário ou registro operacional pode aparecer no DOM público. O teste cria sessão pela request API do harness; isso é distinguido dos requests da página.

## Tentativas e correções

Primeira rodada: 42 aprovados, 15 falhas. Seis falhas foram referências ao nome anterior da empresa fictícia em testes de navegação; corrigido o fixture esperado, mantendo as mesmas asserções. As outras falhas demonstraram overflow em celular e/ou zoom: spans acessíveis absolutos escapavam da tabela não positioned.

Correção: position:relative na região rolável, mantendo todas as colunas e acesso por teclado. Sem overflow-x:hidden global. Segunda rodada: 56 aprovados, uma falha no tablet ampliado: CTA final não quebrava de linha. Correção: flex-wrap e min-width/flex do conteúdo. Probe dedicado passou com scrollWidth=viewport em 1440/768/375 a 200%.

Na revisão do menu público, DOM foi organizado acionador→links→Entrar para Tab natural, preservando a disposição visual por CSS. A asserção agora exige que Tab após abrir chegue ao primeiro link; não apenas foco programático. Disclosure continua não modal e não prende foco.

Registros de tentativas ficam nos arquivos attempt-1/attempt-2, sem alterar evidências anteriores. A recuperação explícita da âncora após montagem lazy assegura deeplink/refresh; brand de loading usa variante escura sobre fundo azul.

## Limites

Zoom testado pelo mecanismo CSS zoom=2 no Firefox instalado, além das três larguras; isso não é homologação de todos os browsers/dispositivos físicos. Contraste calculado sobre cores sólidas no DOM; SVG oficial preservado, não redesenhado. Leitor de tela real e hosting externo não executados.

Pytest emitiu um aviso de depreciação Starlette/httpx, sem falha. Fixtures backend executam migrações apenas nos seus bancos temporários; nenhum comando de migração foi executado no banco real. Wrappers fetch de falha de rede/403 nos cenários herdados são exclusivos de teste, como no SB-03.

A inspeção das capturas encontrou espaço vertical excessivo no CTA de celular: flex-basis de linha era interpretado como altura quando a direção virava coluna. Ajuste restrito ao público: base automática abaixo de 700 px. Revalidação final dos 21 cenários públicos aprovada após esse ajuste, sem alterar fluxos operacionais. Seis consultas de negócio em fixtures equivalentes retornaram JSON integralmente idêntico, conforme business-responses.json.
