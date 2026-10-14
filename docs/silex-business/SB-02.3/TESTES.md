# Testes, resultados e limitações

## Resultados finais comprovados

| Grupo | Resultado | Evidência |
| --- | --- | --- |
| Frontend Vitest, após correção | 19/19, 3 arquivos | unit-tests-final.log |
| TypeScript + Vite, cópia isolada | Passou, 1.759 módulos | build-final.log |
| E2E existentes, 9 cenários × 3 larguras | 27/27 passaram | casos app.spec.ts em e2e-final.json |
| Empresa e identidade, 3 larguras | 3/3 passaram | casos Empresa e identidade em shared-components-final.json |
| Clientes, roteiro final, 3 larguras | 3/3 passaram | customer-final.json |
| Auditoria das 23 telas + Login | 72 estados por versão | initial-audit.json / final-audit.json |
| Equivalência de consultas em fixtures iguais | 4/4 JSON idênticos | readonly-equivalence.json |
| SVGs oficiais | 5/5 XML e hashes idênticos aos originais | assets-validation.json |

São 33 cenários E2E finais, agrupados de forma explícita em tests-summary.json. Eles provêm dos grupos bem-sucedidos de três execuções; não foi afirmado que o arquivo e2e-final.json sozinho contém 33 passes.

## Comandos executados

Dentro de cópias descartáveis do checkout:

```sh
npm run build
npm test
./node_modules/.bin/playwright test --config=audit.playwright.config.ts
./node_modules/.bin/playwright test tests/shared-components.spec.ts --config=shared.playwright.config.ts
./node_modules/.bin/playwright test tests/shared-components.spec.ts --grep 'Clientes —' --config=customer.playwright.config.ts
```

Os configs customizados usam o Firefox já instalado e banco/servidor temporários. Os cenários existentes de cadastros/PIX, sessão/teclado, estoque/venda/estorno, títulos/baixa, serviços/pedidos, operador/caixa, recorrência/anexos/OFX e livro caixa passaram nas três larguras.

Clientes adicional percorre páginas até o limite, confere controles desabilitados, cria/edita registro, exporta CSV, rola a tabela por teclado até a última coluna e aciona edição com Enter. Confere Form em estado ocupado, vazio e erro simulado. Empresa e identidade salva apenas dados fictícios no banco descartável, verifica required/maxLength, marca fixa, nome empresarial vazio/preenchido, campos restantes preservados, persistência e logout.

## Tentativas e falhas do roteiro

1. Uma tentativa concorrente foi interrompida após pressão de memória/swap e timeout; o registro esperado aparecia no snapshot posterior. Não usada para concluir regressão.
2. O primeiro roteiro de captura podia medir antes de terminar consultas na navegação por hash. Foi corrigido para aguardar estabilização das requests; a coleta inicial válida completa foi repetida.
3. Na rodada ampla, os 27 casos existentes e 3 de Empresa passaram; 3 casos novos de Clientes falharam porque o roteiro exigia foco em Nome. O baseline e candidato mostraram foco inicial em Fechar janela, dentro do diálogo. O requisito do roteiro foi corrigido para foco dentro do modal, sem alterar aplicação.
4. Firefox local rejeitou `page.route` com propriedade `bypassServiceWorker` não reconhecida pelo protocolo. Roteiro final usa wrapper de fetch somente no contexto de teste para segurar POST ou simular erro de GET; o cadastro/edição efetivos são encaminhados à API real do banco temporário. Nenhuma dependência foi instalada/alterada.
5. `toBeDisabled` aplicado diretamente a fieldset retornou enabled apesar de registrar `<fieldset disabled>` e o botão já desabilitado. O roteiro foi corrigido para verificar o atributo do grupo e a desabilitação efetiva do input. Os três casos Clientes foram repetidos e passaram.
6. A leitura de scroll de Categorias após 180 ms foi zero nas duas versões; no probe dedicado com 500 ms e duas setas, chegou ao fim em ambas. Não foi tratada como regressão do produto.

Logs, JSONs, screenshots e traces dessas tentativas estão preservados. Nenhuma dessas falhas motivou mudança de autenticação, API, formulário ou regra financeira.

## Verificações não homologadas

- Lint dedicado: o projeto não define script/dependência de lint.
- Leitor de tela e auditoria externa completa WCAG não foram executados; o scanner local de contraste não substitui essa revisão.
- Gradientes foram avaliados por extremos onde indicado; não foi medido todo pixel/antialiasing.
- Clipboard nativo do sistema: o teste PIX existente usa um stub de clipboard; transferência real para o sistema operacional não foi homologada.
- Matriz completa de sessão expirada, logout com falha de rede, autorização de todos os atalhos, retorno protegido, paths públicos e histórico continua para SB-03.
- Não houve teste de deploy ou ambiente de produção. Os bancos temporários foram removidos e servidores encerrados (cleanup.json).
