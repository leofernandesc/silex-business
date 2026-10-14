# Pendências e riscos — SB-04B

- Revisão explícita do incremento: composição, diferenças do C, links dos perfis e pacote técnico.
- Leitor de tela real e dispositivos físicos não homologados; validação automatizada usa Firefox local, teclado, DOM e contraste calculado. Não declarar certificação integral de acessibilidade.
- Configuração empresarial global preservada. Não há isolamento multitenant/selector empresarial; não anunciar como disponível.
- Home não executa consultas periódicas. Expiração no servidor é percebida na próxima requisição ou refresh, conforme arquitetura atual; não foi criado um mecanismo de sessão alternativo.
- Pendências P01/P02/P04–P07/P09 continuam no registro central. P03/P08 são revalidadas, sem mudanças em seus mecanismos. Dates/botão Nova despesa/templates pertencem a escopo posterior aprovado separadamente.
- Hospedagem externa precisa oferecer fallback de /entrar e /app; nenhum deploy/configuração externa realizado.
- Reversão deve conferir hashes finais e não sobrescrever trabalho posterior. O backup ensaiado é anterior ao SB-04B, não substitui backups operacionais do banco.
- Warning de depreciação Starlette/httpx na suíte backend é anterior; nenhuma dependência foi atualizada.

Próximo passo: revisar galeria/ZIP e aprovar ou solicitar ajustes. SB-05 permanece não iniciado. Após autorização própria, retomar planejamento financeiro do SB-01 e pendências relacionadas, sem ampliar o escopo automaticamente.
