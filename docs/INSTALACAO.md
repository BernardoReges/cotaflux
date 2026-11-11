# Instalação e operação — CotaFlux

Este guia descreve a execução no próprio ambiente, a configuração da IA e a proteção dos dados. O repositório distribui o código; não inclui um serviço hospedado.

## Como experimentar

Requisito: **Node.js 24 LTS**. Não há dependências npm de runtime nem instalação obrigatória de pacotes. Na pasta do projeto, execute:

```sh
npm run demo
```

Abra **http://127.0.0.1:3060** e clique em **Entrar como empresa**. A demonstração usa pessoas e propostas fictícias. O acesso por botão só existe quando `DEMO=true`; ele não deve ser exposto publicamente ou usado para dados reais.

1. Abra a cotação de exemplo e confira o comparativo.
2. Adicione uma proposta e anexe um arquivo ou cole o texto recebido.
3. Marque a autorização e clique em **Ler documento com IA**.
4. Compare os campos com o original. Vincule cada item e confirme a equivalência.
5. Salve a conferência. Pendências continuam visíveis; elas não são convertidas em valores inventados.
6. Compare as propostas e, quando desejar, registre a escolha com justificativa.

Sem chave, cadastro, preenchimento manual, cálculo e exportação funcionam. A tentativa de leitura explica a falta da configuração; não há resposta de IA simulada.

## Instalação própria

Copie `.env.example` para `.env`, configure sua própria chave e uma pasta de dados privada:

```dotenv
GEMINI_API_KEY=sua_chave_somente_no_arquivo_local
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_VISION_MODEL=gemini-3.5-flash-lite
DATA_DIR=./data/real
DEMO=false
```

```sh
npm start
```

Na primeira abertura, crie o acesso da empresa com senha de pelo menos 12 caracteres. Não existe senha padrão de produção. O administrador cadastra compradores pela área Equipe e entrega a senha inicial por canal privado. A troca de senha própria está disponível em Minha conta e encerra outras sessões. Recuperação de senha e MFA ainda não estão implementadas; não exponha uma instalação real antes de adequar a gestão de identidades.

O adaptador também aceita `LLM_API_KEY` como variável de compatibilidade em uma configuração privada existente. Esse arquivo externo e a chave do desenvolvedor não acompanham o repositório. Cada instalação deve usar sua própria conta do provedor.

### Docker

`docker compose up --build` disponibiliza uma instalação vazia em **http://localhost:3060**, com volume próprio. Configure a chave no ambiente. O compose restringe a porta ao loopback. A receita está incluída, mas a execução em Docker não foi homologada nesta entrega; a validação funcional foi feita com Node no Windows.

Para uso remoto, utilize domínio, proxy HTTPS, `APP_ORIGIN` exato e `SECURE_COOKIES=true`, com demonstração desligada. Nenhum servidor público, domínio ou regra de firewall foi criado.

## Onde os dados ficam

`DATA_DIR/app.sqlite` contém usuários, sessões, cotações, propostas, anexos, tarefas e eventos. O padrão sem configuração é `./data`; a demonstração via `npm run demo` usa `./data/demo`. Não misture a pasta demonstrativa com a instalação real.

O comando de demonstração usa `DEMO_DATA_DIR`, independente de `DATA_DIR`. O banco registra o modo e o produto da instalação e recusa abertura por outro modo ou aplicativo. Assim, uma pasta de dados reais não ganha o acesso demonstrativo sem senha por uma troca de configuração. No Windows, você pode escolher uma pasta externa como `D:/DadosProjetos/cotaflux-real`.

Os anexos são BLOBs privados no SQLite, sem URLs públicas estáticas. Os limites atuais são 8 MB por arquivo e 500 documentos por instalação. Uma instalação representa uma empresa; compradores compartilham as cotações dessa empresa. Não há isolamento de várias empresas no mesmo banco.

```sh
npm run backup -- ./backups
```

O comando copia a base apontada por `DATA_DIR`; para salvar uma demonstração, aponte essa variável explicitamente para a pasta demonstrativa. O backup usa a API online do SQLite, inclui anexos e confere integridade. Para restaurar, pare o servidor, preserve a pasta atual, use uma pasta nova e copie o backup como `app.sqlite`; depois aponte `DATA_DIR` para ela. Não substitua bancos enquanto o aplicativo estiver aberto. Nunca envie banco, backup, CSV privado ou `.env` ao GitHub.
