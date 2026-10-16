# SB-07E — inventário sensível e limites de segurança

A inspeção é básica, não pentest nem garantia de ausência de segredos. `security-inventory.json` registra somente caminhos/linhas/classes, nunca valores. Na abertura foram verificados493caminhos rastreados e584blobs históricos distintos. Os padrões usados cobrem chaves privadas, formatos conhecidos de tokens e credenciais demo; não cobrem qualquer formato possível, arquivos externos, vazamentos prévios ou toda autorização por objeto.

| Classe | Observação | Tratamento |
|---|---|---|
| Credencial fictícia conhecida | Presente em README, fixture/CLI e testes históricos | Valor omitido das evidências/ZIP. Não usar essas contas/senha em produção. Revisar antes de compartilhar histórico, mesmo em remoto privado |
| Chaves/tokens pelos padrões pesquisados | Nenhuma ocorrência real detectada além de demonstração | Não equivale a auditoria exaustiva. Scanner redige resultados; revisão de segurança posterior |
| Bancos, ambiente sensível, chaves e arquivos de credencial rastreados | Nenhum caminho detectado pelos padrões do inventário | `.gitignore` cobre.db/.sqlite,envsensível/chaves,backups,uploads,data. Não ler banco real para testes |
| Dependências/build/cache/temporários | Ignorados; nenhum arquivo rastreado maior que1MB na abertura | Não adicionar node_modules,dist,venv,traces,ZIP/bancos ao Git |
| Backups locais | Acervo anterior preservado; novo arquivo aprovado493 comSHA conferido | Uso local restrito. Contém fontes históricas com credencial fictícia; não é incluído no ZIP externo |
| Capturas | Apenas fixture sintética criada pelos construtores históricos | Não usar capturas com dados empresariais reais. Galeria rotula contexto/limitações |
| Sessão/cookies | Flags apenas: HttpOnly,SameSite,Secure e caminho; valores não exportados | Secure=false no HTTP local, configuração externa ainda não homologada |
| Npm | Consulta npm audit:0avisos; lockfile intacto | Resultado pontual, sem upgrade. Não cobre dependênciasPython ou código próprio |
| Python | Versões inventariadas na.venv; suite69 aprovada | Auditoria abrangente de avisos não executada; nenhuma ferramenta instalada para supri-la |

As12verificações de autorização incluem anônimo401,operador403 no financeiro,admin200 e página pública acessível; navegação/URL/backend são testados em fluxos adicionais. A página pública não fez requisiçõesAPI nas15sondas. Isso não comprova isolamento multiempresa: o modelo empresarial é global, sem tenants.

Nenhum pacote de produção foi publicado, nenhum remoto foi configurado e nenhuma credencial foi enviada a terceiros. A única consulta externa de dependências foi npm audit ao registro configurado; fontesW3C foram consultadas para critérios de referência. Não há analytics/rastreador instalado por este trabalho.
