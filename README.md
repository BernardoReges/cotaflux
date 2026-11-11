# CotaFlux

Compare propostas de fornecedores com leitura assistida por IA e cálculo verificável.

![Node.js 24](https://img.shields.io/badge/Node.js-24-43853d) ![SQLite](https://img.shields.io/badge/SQLite-local-316192) ![JavaScript](https://img.shields.io/badge/JavaScript-ES_modules-f7df1e) ![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)

![Comparativo de propostas com dados fictícios](docs/painel.png)

## Por que existe

Propostas em PDFs, fotos e mensagens usam embalagens, unidades e condições diferentes. O CotaFlux reúne os documentos, organiza a conferência e compara o custo completo da compra.

## Funcionalidades

- Cotações com vários itens, quantidades e unidades.
- Leitura de PDF, imagem e texto com Gemini; preenchimento manual disponível.
- Conferência de embalagem, preço, frete, prazo, validade e equivalência.
- Comparação em centavos, com arredondamento para embalagens inteiras.
- Decisão com justificativa, histórico preservado e exportação CSV.
- Acessos de administração e compras, anexos privados e backup.

## Como funciona

**Cotação → propostas → extração por IA → conferência → comparação → decisão registrada.**

A IA propõe os campos do documento. As pessoas conferem os dados; as regras do servidor validam permissões, estados e valores. Nenhuma despesa ou proposta é aprovada automaticamente.

## Tecnologias

Node.js 24, HTTP nativo, SQLite, JavaScript no navegador e API Gemini. Aplicação cliente-servidor responsiva, sem dependências npm de runtime.

## Executar

Requisito: **Node.js 24 LTS**.

```sh
git clone https://github.com/BernardoReges/cotaflux.git
cd cotaflux
npm run demo
```

Abra o endereço informado no terminal. A demonstração usa dados fictícios. Para habilitar a leitura por IA, configure **sua própria chave** no servidor conforme o [guia de instalação](docs/INSTALACAO.md). O fluxo manual funciona sem chave.

## Validação

```sh
npm test
```

**28 testes aprovados** na versão 0.1.1, cobrindo regras de negócio, permissões, sessões, arquivos e isolamento dos dados demonstrativos. Os ensaios com IA usam documentos sintéticos. Consulte os [resultados, imagens e limites](docs/VALIDACAO.md); ainda não houve piloto com usuários reais.

## Documentação

| Guia                               | Conteúdo                                 |
| ---------------------------------- | ---------------------------------------- |
| [Instalação](docs/INSTALACAO.md)   | Configuração, IA, Docker, dados e backup |
| [Arquitetura](docs/ARQUITETURA.md) | Componentes e decisões técnicas          |
| [API](docs/API.md)                 | Rotas, contratos e permissões            |
| [Escopo](docs/ESCOPO.md)           | Critérios e evolução planejada           |
| [Segurança](SECURITY.md)           | Credenciais, privacidade e operação      |
| [Contribuição](CONTRIBUTING.md)    | Como colaborar                           |

## Licença e autoria

[MIT](LICENSE) · [BernardoReges](https://github.com/BernardoReges). Desenvolvimento assistido por IA. A infraestrutura inicial de autenticação, persistência e extração é compartilhada com Rota Recibos; os fluxos e testes de negócio são próprios de cada projeto.

Somente exemplos fictícios acompanham o código. Chaves de API, bancos, backups e documentos privados ficam fora do repositório.
