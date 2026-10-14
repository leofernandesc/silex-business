# Próximo incremento recomendado — SB-04B

Após revisão explícita de SB-04A:

1. Criar a página inicial autenticada real em /app#home, usando company_name, identificação do usuário e informações realmente autorizadas.
2. Derivar atalhos e cartões do registro único de rotas; testar admin/operator, sem criar novas permissões ou selector multitenant fictício.
3. Preservar /app#dashboard, indicadores, consultas, filtros e ações atuais; home não copia integralmente a Visão Geral.
4. Somente com a home implementada decidir sua ativação como entrada padrão, preservando prioridade do retorno protegido e compatibilidade de links antigos.
5. Revalidar público com sessão válida, ausência de dados/APIs privados, Entrar, refresh, histórico, 401/403 e logout. SB-04A mantém logout em /entrar conforme SB-03; eventual mudança exige decisão explícita.
6. Usar Brand/Inter/tokens, sem refatorar shell ou regras financeiras. Manter as demais pendências em incrementos próprios.

Publicação externa, domínio/HTTPS, comercial/jurídico e SEO prerenderizado pertencem a decisões específicas. Não iniciar esses trabalhos automaticamente com SB-04B.
