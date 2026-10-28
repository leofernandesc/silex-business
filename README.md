# Silex Business

**ERP B2B experimental · Gestão operacional e financeira · Projeto em desenvolvimento**

Silex Business é um projeto de gestão empresarial que reúne cadastros, estoque, vendas, caixa e rotinas financeiras em uma aplicação web. Seu objetivo é explorar como reunir processos frequentemente dispersos em ferramentas separadas, com uma interface consistente.

Este repositório é uma **versão de desenvolvimento e demonstração**. Não representa um serviço comercial publicado, homologado para uso com dados reais ou uma solução fiscal.

## O que foi construído

- Cadastros de clientes, produtos, serviços e fornecedores.
- Gestão de estoque, vendas, caixa e movimentações.
- Lançamentos financeiros, contas a pagar e a receber, relatórios e orçamento.
- Autenticação, perfis e testes automatizados para fluxos selecionados.
- Recursos de importação e exportação de dados para avaliação local.

As funcionalidades podem variar conforme o estágio de desenvolvimento. Consulte o código e os testes para conhecer seu comportamento atual.

## Como a IA foi utilizada

O desenvolvimento utiliza ferramentas e agentes de IA para apoiar o planejamento de incrementos, a implementação, a revisão de código, a criação de testes e a documentação.

**O uso de IA faz parte do processo de engenharia do produto**: não significa que o ERP tenha um assistente inteligente embarcado ou que suas operações dependam de um LLM.

A estratégia de trabalho combina especificação humana, execução assistida, verificações automatizadas e revisão dos resultados.

## Tecnologias

React, TypeScript, Python, FastAPI, SQLAlchemy, SQLite e ferramentas de teste do ecossistema.

## Execução para desenvolvimento local

Requisitos: Python 3.12+, Node.js 22.12+, npm e Make.

```bash
git clone https://github.com/leofernandesc/silex-business.git
cd silex-business
make setup
make seed-demo
make build
make run
```

A aplicação local fica em `http://127.0.0.1:8000`. O comando `seed-demo` destina-se **apenas a ambientes isolados e com dados fictícios**.

Para executar as suítes de testes configuradas:

```bash
make test
```

## Limites e responsabilidade

- Não utilize dados pessoais, financeiros ou documentos reais em ambientes de demonstração.
- Não exponha a aplicação de desenvolvimento diretamente à internet.
- Funcionalidades e integrações de produção exigem validação adicional de segurança, privacidade e operação.
- Nenhuma afirmação de implantação comercial ou redução de custos deve ser inferida apenas deste repositório.

O portfólio público deste projeto deve mostrar apenas interfaces com **dados fictícios**, decisões gerais de produto e resultados verificáveis.
