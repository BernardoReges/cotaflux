# Escopo e evolução

## Público e tarefa

Pequena equipe de compras de uma única empresa. A tarefa central é transformar propostas de formatos diferentes em uma comparação de cesta completa, com dados conferidos e uma decisão explicável.

## Critérios de aceitação da primeira versão

- A cotação tem itens, quantidades e unidades e recebe propostas independentes.
- O documento permanece acessível somente a pessoas autenticadas e autorizadas.
- A leitura de IA não inicia sem consentimento e não confirma dados por conta própria.
- Quantidade por embalagem, preço por embalagem e unidade base ficam explícitos.
- Cada correspondência é confirmada por uma pessoa; produtos incompatíveis não entram no ranking como equivalentes.
- A comparação considera todas as linhas e frete uma vez; itens ausentes, validade desconhecida ou vencida e unidade divergente bloqueiam a elegibilidade.
- Uma decisão exige proposta elegível e justificativa; a cotação encerrada fica disponível para consulta.
- Dados sobrevivem à reinicialização e a falhas de leitura. Existe backup verificável.

## Fora desta entrega

Compra ou pagamento automático, negociação por e-mail/WhatsApp, ERP, emissão fiscal, busca de fornecedores na internet, cotação de moedas, imposto ou custo tributário, avaliação de reputação, certificação de produto e equivalência automática de marcas. A disponibilidade informada numa proposta não prova estoque atual.

## Piloto com resultado real

1. Encontrar uma pessoa que compare propostas no trabalho e autorize documentos sem dados sensíveis.
2. Selecionar tarefas equivalentes para comparação manual e assistida, alternando a ordem para reduzir aprendizado.
3. Medir tempo até a comparação conferida, quantidade de campos corrigidos e erros de embalagem/unidade encontrados.
4. Pedir à pessoa que repita uma tarefa sem ajuda do desenvolvedor.
5. Publicar contagens e limitações, separando simulação de documentos reais. Não anunciar horas economizadas antes disso.

O arquivo `piloto.csv` começa sem resultados, apenas com cabeçalho.

## Evolução priorizada

1. Testes externos de documentos, feedback por campo, histórico completo de versões e comparação de condições comerciais mais complexas.
2. Recuperação de senha, gestão do ciclo de vida dos usuários, retenção e exclusão de documentos, acompanhamento operacional e limites configuráveis.
3. Convites de acesso e integração de importação via e-mail com consentimento específico e processamento idempotente.
4. Conectores de ERP e aprovação por alçadas, após validar demanda real. PostgreSQL e objetos externos quando o volume justificar.

Não há compromisso de implementar essas etapas automaticamente ou promessa de uso em produção.
