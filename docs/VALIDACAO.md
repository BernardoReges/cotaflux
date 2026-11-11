# Validação — 11 de novembro de 2026

## Resultado desta entrega

Aplicação local executada com Node.js 24 no Windows. O banco demonstrativo passou em `PRAGMA integrity_check` após uma queda de energia real entre as sessões de desenvolvimento. Os três registros de proposta, a cotação e a tarefa concluída foram preservados. Isso documenta este incidente observado; não é uma garantia contra qualquer tipo de perda ou falha de armazenamento.

## Revisão para publicação — versão 0.1.1

A revisão acrescentou identificação persistente de modo e produto no banco. A demonstração passou a ignorar DATA_DIR real, usando DEMO_DATA_DIR. São bloqueadas as trocas demo/real, o acesso demonstrativo a banco antigo com dados e a reutilização do banco por outro produto. Os testes verificam que uma recusa não altera usuários, registros ou tarefas. As duas demonstrações locais existentes foram identificadas após backup, com integridade e preservação de dados conferidas.

## Testes determinísticos

**28 testes aprovados, zero falhas na rodada final.** O conjunto cobre cálculo por embalagem, seis casas decimais nas quantidades, frete, unidade incompatível, propostas vencidas ou não conferidas, senha, sessão e expiração, troca de senha e revogação, CSRF, origem externa, permissão administrativa, transação, arquivos inválidos/duplicados, limites, falha de provedor, edição obsoleta e encerramento durante uma leitura.

Uma leitura que termina depois da decisão não pode alterar a proposta encerrada. O comparativo da decisão é guardado com fornecedor, total e linhas calculadas, preservando os valores da escolha mesmo quando a validade da proposta expirar. A verificação de validade usa o dia de Brasília.

## Ensaios reais com IA

Documentos sintéticos, escritos no próprio projeto. Os resultados não equivalem a um conjunto de avaliação externo.

| Ensaio                                  | Verificação                                                     | Resultado registrado                                      |
| --------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| Proposta em texto com embalagem e frete | 100 unidades, R$ 18,90/pacote, frete R$ 35,00, prazo e validade | 5/5 campos esperados no ensaio final                      |
| Proposta com condições ausentes         | Frete, prazo e validade desconhecidos permanecem null           | 3/3 campos esperados                                      |
| Proposta em PDF                         | Embalagem, preço, frete e validade                              | 4/4 campos esperados                                      |
| Texto colado pela interface             | Criação, fila, leitura, conferência e vínculo dos dois itens    | Proposta entrou no comparativo por R$ 480,00 após revisão |

Relatórios: `ai-evaluation.json` e `ai-pdf-evaluation.json`. O PDF foi gerado como documento fictício, renderizado e conferido visualmente. Os ensaios finais isolados levaram aproximadamente 1,6 a 3,0 segundos, sem estabelecer garantia de latência.

O primeiro ensaio textual retornou uma data no formato brasileiro em vez do ISO esperado. Esse resultado foi preservado em `ai-evaluation-inicial.json`. O esquema foi reforçado com formato de data e o ensaio passou com as mesmas instruções usadas pelo aplicativo. A validação do servidor rejeita uma data inválida antes de guardar uma extração como concluída.

## Verificação da interface

- Painel, comparação das três propostas fictícias e proposta conferida com documento vinculado.
- Inclusão e remoção de itens preservando a linha restante; IDs de campos sem duplicidade no formulário observado.
- Navegação em 1366 × 900 e 412 × 915, sem transbordamento horizontal nas medições de DOM observadas.
- Botão Sair acessível no layout compacto; conta de demonstração não permite trocar senha.
- Sessões independentes do Rota Recibos no mesmo navegador.

Capturas: `painel.png`, `comparacao.png`, `mobile.png`. As imagens representam etapas distintas da demonstração, com dados fictícios. Não houve teste físico em celular.

## Credenciais e distribuição

A chave usada nos ensaios permanece em configuração privada externa. Código e arquivos preparados para distribuição foram conferidos para ocorrências das credenciais dessa configuração. O resultado verificável está em `credential-review.json`, sem valores de chaves. Bancos, anexos reais e backups ficam fora do código. O adaptador do provedor usa cabeçalho de autenticação, sem devolver a chave à API do navegador.

## Limites

Não houve piloto com equipe de compras, medição de economia de tempo, avaliação ampla de documentos, auditoria independente ou homologação de produção. O Docker e o workflow remoto de CI estão preparados, mas não foram executados nesta entrega. Não houve publicação no GitHub ou implantação pública. O próximo experimento está em `ESCOPO.md` e o arquivo `piloto.csv` contém apenas o cabeçalho.
