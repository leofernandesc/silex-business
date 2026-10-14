# Recomendações para SB-04 — não iniciado

1. Revisar/aprovar SB-03: diff, backup, matriz de sessão/histórico/admin/operator e painel móvel nas três larguras. Verificar manualmente leitores de tela e dispositivos reais antes de declarar acessibilidade integral.
2. Implementar página comercial real em `/`, com navegação por âncoras públicas e sem consultas/identificações empresariais. Manter compatibilidade apenas para IDs operacionais antigos reconhecidos, incluindo alias.
3. Implementar home real em `/app#home`, usando empresa global realmente disponível e atalhos derivados de canAccessRoute. Dashboard continua independente; não duplicar cálculos ou indicadores.
4. Só então ativar o destino padrão home e logout para a página pública, e substituir o tratamento transitório de `/` e #home. Conservar retorno prioritário à rota protegida solicitada.
5. Reexecutar matriz completa contra os novos destinos público/login/home/dashboard/módulos, incluindo sessão válida visitando público, ausência de dados privados no HTML/DOM/requisições públicas, back/forward, refresh e logout com falha.
6. Homologar textos/módulos comerciais disponíveis; dados fictícios claramente identificados. Não anunciar emissão fiscal, transferência PIX, integrações ou multitenancy não implementadas.
7. Validar fallback no hosting escolhido antes de publicação. O SB-03 comprova FastAPI e Vite locais; não configura infraestrutura externa.
8. P01/P02/P04–P07/P09 continuam no registro central, com incrementos próprios e aprovação. Não ampliar escopo para refatorar CSS, regras ou templates durante SB-04.

Nenhuma página pública/home, contratação, novo módulo, deploy ou merge foi iniciada neste incremento. A próxima implementação depende da revisão explícita do usuário.
