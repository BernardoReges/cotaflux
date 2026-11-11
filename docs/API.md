# API HTTP

Todas as rotas são da mesma origem. POST exige `Content-Type: application/json` e `X-Requested-With: app`. Use o cookie emitido pelo servidor; nenhum token precisa ficar no localStorage. Campos monetários usam centavos inteiros.

## Identidade e administração

| Método e rota        | Acesso                    | Função                                                         |
| -------------------- | ------------------------- | -------------------------------------------------------------- |
| GET `/api/session`   | Público                   | Perfil atual, instalação vazia, modo demo e configuração de IA |
| POST `/api/setup`    | Instalação vazia          | Criar primeiro administrador: `name`, `email`, `password`      |
| POST `/api/login`    | Público                   | Entrar com `email` e `password`                                |
| POST `/api/logout`   | Sessão atual              | Invalidar sessão                                               |
| POST `/api/password` | Autenticado, fora de demo | `currentPassword` e `newPassword`; revoga sessões anteriores   |
| POST `/api/demo`     | Somente demo habilitada   | Acesso à pessoa fictícia                                       |
| GET `/api/users`     | Autenticado               | Administrador vê equipe; comprador vê próprio perfil           |
| POST `/api/users`    | Administrador             | Criar comprador: `name`, `email`, `password`                   |
| GET `/api/audit`     | Administrador             | Últimos 100 eventos                                            |

## Compras

| Método e rota                      | Função                                               |
| ---------------------------------- | ---------------------------------------------------- |
| GET `/api/state`                   | Cotações, propostas e tarefas da empresa             |
| POST `/api/requests`               | `title`, `items: [{name, quantity, unit}]`           |
| POST `/api/requests/:id/proposals` | `supplier`, `file` opcional                          |
| POST `/api/proposals/:id/read`     | `consent: true`; cria tarefa persistente             |
| POST `/api/proposals/:id/review`   | Campos conferidos, itens vinculados e `version`      |
| GET `/api/requests/:id/comparison` | Custo, linhas calculadas, elegibilidade e pendências |
| GET `/api/requests/:id/export`     | Comparativo CSV                                      |
| POST `/api/requests/:id/close`     | `proposalId` elegível e `note`                       |
| GET `/api/files/:id`               | Download privado do original                         |

Arquivo: `{name, mime, data}`, com `data` em base64 canônico. Aceitos `image/jpeg`, `image/png`, `application/pdf` e `text/plain`. Limite de 8 MB por arquivo. O documento não entra no diretório público.

Conferência de proposta: `{version, supplier, freightCents, deadlineDays, validUntil, items}`. Cada item contém `description`, `unit`, `packUnits`, `packPriceCents`, `requestItemId`, `confirmed` e `evidence`. `evidence` é o trecho proposto, não uma certificação de extração correta.

Respostas de erro: `{error: "mensagem"}`. Códigos relevantes: 400 validação, 401 sessão ausente, 403 permissão/origem, 404 registro/rota ausente, 409 versão/estado/duplicidade e 429 limite de requisições. A leitura é assíncrona: consulte os estados das tarefas em `/api/state`; um 200 de enfileiramento não significa extração concluída.
