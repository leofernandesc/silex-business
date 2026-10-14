# Silex Business — SB-01

Data da elaboração: 13/10/2026. Estado: SB-01 aprovado conceitualmente; SB-02.1 concluído como infraestrutura visual isolada. SB-02.2 aguarda revisão e autorização explícita.

Revisão atual: [resumo dos ajustes finais](AJUSTES-FINAIS.md) e [proposta de nomes empresariais e datas](DADOS-APRESENTACAO.md).

## Entregáveis

| Entrega | Arquivo |
| --- | --- |
| Identidade, inventário e tokens | [IDENTIDADE.md](IDENTIDADE.md), [inventário com SHA-256](inventario-ativos.json), [tokens JSON](design-tokens.json) |
| Arquitetura atual, componentes, telas e marca | [AUDITORIA.md](AUDITORIA.md) |
| Navegação, autenticação e duas novas páginas | [ARQUITETURA-NAVEGACAO.md](ARQUITETURA-NAVEGACAO.md) |
| Rótulos/precedência de nomes; datas brasileiras | [DADOS-APRESENTACAO.md](DADOS-APRESENTACAO.md) |
| Quatro estudos responsivos A–D | [Galeria HTML](prototipos/index.html) |
| Migração, SB-02 a SB-06, aceite, revisão e riscos | [INCREMENTOS.md](INCREMENTOS.md) |
| Implementação SB-02.1 e evidências | [Relatório SB-02.1](../SB-02.1/RELATORIO.md) |
| Evidência de preservação e renderização | [VERIFICACAO.md](VERIFICACAO.md), [baseline de hashes](preservacao-antes.json) |

Os protótipos podem ser abertos diretamente no navegador. Para servi-los isoladamente: `python3 -m http.server 8031 --bind 127.0.0.1 --directory docs/silex-business/SB-01/prototipos`, na raiz do projeto. Acessar `http://127.0.0.1:8031/`. Isso não inicia o ERP nem a API. Nenhum mockup deve receber credenciais reais.

### Estudos e imagens

| Estudo | HTML | Desktop | Tablet | Celular |
| --- | --- | --- | --- | --- |
| A — Comercial | [Abrir](prototipos/a-publica.html) | [PNG](renders/a-publica-desktop.png) | [PNG](renders/a-publica-tablet.png) | [PNG](renders/a-publica-mobile.png) |
| B — Login | [Abrir](prototipos/b-login.html) | [PNG](renders/b-login-desktop.png) | [PNG](renders/b-login-tablet.png) | [PNG](renders/b-login-mobile.png) |
| C — Inicial autenticada | [Abrir](prototipos/c-inicial.html) | [PNG](renders/c-inicial-desktop.png) | [PNG](renders/c-inicial-tablet.png) | [PNG](renders/c-inicial-mobile.png) |
| D — Lançamentos | [Abrir](prototipos/d-lancamentos.html) | [PNG](renders/d-lancamentos-desktop.png) | [PNG](renders/d-lancamentos-tablet.png) | [PNG](renders/d-lancamentos-mobile.png) |

## Resultado da análise

React/TypeScript/Vite com CSS global e navegação por fragmentos; FastAPI serve o frontend e a API. Há 23 destinos de menu e um alias legado. O login ocupa duas colunas. Não existem hoje página comercial pública nem página inicial autenticada independente. A Visão Geral está em `#dashboard`.

Existem componentes reutilizáveis em `ui.tsx`; a migração deve preservar suas propriedades, eventos e operações. Há CSS repetido e sobrescritas globais. A marca provisória está misturada à identidade empresarial. Os cadastros de Diaristas e Frete Subcontratado, PIX e vínculos com serviços/pedidos já têm componentes próprios; não são funcionalidades a recriar neste ciclo.

O diretório refinado indicado pelo usuário contém os 12 arquivos oficiais esperados. Todos foram inventariados e copiados sem alteração para os estudos. As propostas antigas em Documents foram excluídas da base visual.

## Direção de navegação aprovada conceitualmente

Separar por pathname: `/` público, `/entrar` login e `/app` ERP. Dentro de `/app`, conservar os hashes operacionais atuais e reservar um novo identificador `#home` para a página inicial, mediante registro explícito. Assim `/#modulos` é âncora comercial e `/app#finance` é rota operacional. Manter `#dashboard` como Visão Geral independente. Planejar compatibilidade para links antigos `/#finance` e demais rotas reconhecidas.

Após login, retornar a uma rota operacional previamente solicitada e permitida; sem retorno válido, abrir `/app#home`. Os endpoints, cookie, duração de sessão e política de autorização existentes permanecem como contratos preservados. A implementação futura depende da autorização do SB-03 e dos testes previstos de rotas, autenticação, autorização, histórico, sessão e logout. A aprovação de planejamento não os substitui.

## Aprovações e pendências

1. **Aprovados conceitualmente:** identidade, design system, estrutura A, composições B/C e estratégia `/`, `/entrar`, `/app#home`, `/app#dashboard`, demais hashes e compatibilidade legada.
2. **Ajustes disponíveis:** segunda demonstração A com Vendas; D com Nova despesa neutra, datas brasileiras e indicação de rolagem. B/C mantêm seus HTMLs sem alteração.
3. **Decisão registrada:** Silex Business é fixa; company_name identifica a empresa cliente; brand_name é nome de apresentação configurável, preservado por compatibilidade e sem substituição automática de nome empresarial ou fiscal. Detalhes em [DADOS-APRESENTACAO.md](DADOS-APRESENTACAO.md).
4. **Homologação posterior:** publicar apenas módulos confirmados/homologados; textos do estudo não constituem aprovação de oferta, preços, suporte, contratação ou disponibilidade em produção. Implementação de navegação e de datas exige os testes previstos.

Próximo incremento recomendado: **SB-02 — fundamentos visuais e separação de marca**, após autorização explícita. Planejamento visual não equivale à preparação de hospedagem, segurança de rede ou operação; a antiga Sprint 19 continua em trilha separada.

## Limites

Auditoria por leitura do código e evidências locais anteriores; sem nova navegação no ControlMax ou execução da aplicação. Os mockups não implementam login, consultas, filtros, pagamentos, exportações ou impressão. Apenas links entre estudos e controles de apresentação funcionam. Dados ilustrativos foram criados para este pacote e não extraídos de banco, capturas privadas ou sessões.
