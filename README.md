# Financas Pessoais

Aplicativo desktop para controle financeiro pessoal, pensado para acompanhar o dinheiro do mes com clareza: contas, lancamentos, cartoes de credito, fluxo de caixa, previsoes e indicadores em um unico lugar.

O projeto combina uma interface React com backend Express e banco SQLite local, empacotado com Electron para uso como aplicativo Windows.

## Proposta do projeto

O Financas Pessoais foi criado para resolver um problema comum em planilhas: entender o que ja aconteceu, o que ainda vai acontecer e quanto dinheiro realmente sobra depois dos compromissos.

Ele foi desenvolvido para quem quer sair da planilha e acompanhar o dinheiro com mais confianca: o que ja foi pago, o que ainda vai vencer, quanto existe de saldo real e qual sera o saldo ao final do mes.

Muitos controles financeiros misturam saldo bancario com dinheiro investido, compra no cartao com pagamento da fatura, saldo atual com saldo previsto e meses futuros com valores ja realizados. O Financas Pessoais organiza essas camadas para mostrar uma imagem mais fiel da vida financeira.

Principais objetivos:

- mostrar saldo realizado e saldo previsto de forma separada;
- planejar meses futuros com base em lancamentos pendentes;
- controlar faturas de cartao sem duplicar despesas;
- separar dinheiro de giro mensal de contas de investimento;
- transformar erros e avisos em notificacoes discretas;
- permitir uma visao anual por categoria, incluindo compras no cartao nas categorias corretas.

## Diferenciais

- **Fluxo de caixa projetado:** meses futuros usam saldo inicial previsto e fecham com saldo final previsto, permitindo planejamento real dos proximos meses.
- **Cartao de credito sem dupla contagem:** compras aparecem nas categorias originais, enquanto o pagamento da fatura evita duplicidade no resumo.
- **Pagamento parcial de fatura:** pagamentos parciais reduzem o valor em aberto; pagamento total nao cria lancamentos duplicados.
- **Transferencias com impacto correto:** transferencia e despesa na conta de origem e receita na conta de destino.
- **Contas de investimento fora dos totais operacionais:** investimentos continuam visiveis, mas nao inflam saldo, receitas ou despesas do mes.
- **Indicadores explicaveis:** cards e linhas importantes possuem tooltips explicando como cada numero foi calculado.
- **Alertas em popup:** mensagens de erro, sucesso e aviso aparecem como notificacoes no canto inferior esquerdo, sem poluir o meio da tela.
- **Build desktop limpa:** o empacotamento Electron publica o instalador sem manter a pasta `win-unpacked` como artefato final.

## Beneficios praticos

- **Clareza do mes atual:** separa valores pagos, recebidos e pendentes.
- **Planejamento dos proximos meses:** usa saldo previsto para calcular o futuro.
- **Controle real de cartao de credito:** faturas, parcelas, pagamentos parciais e estornos sem duplicidade.
- **Categorias mais fieis:** compras no cartao aparecem nas categorias corretas, nao como uma despesa generica de cartao.
- **Investimentos separados do dinheiro de giro:** contas de investimento ficam visiveis, mas fora dos totais operacionais.
- **Interface limpa:** tabelas densas, cards objetivos e notificacoes discretas.

## Funcionalidades

### Home

- saldo atual operacional;
- saldo previsto;
- receitas e despesas do mes;
- comprometimento da renda;
- valor investido no mes;
- pendencias a receber, a pagar e saldo liquido pendente;
- despesas fixas e variaveis;
- saldo projetado por dia;
- faturas proximas;
- variacao de despesas por categoria em relacao ao mes anterior;
- categorias no ano, unificando lancamentos normais e compras no cartao;
- ranking mensal de despesas por categoria.

### Fluxo de caixa

- filtros por mes, ano e conta;
- visao por conta ou todas as contas;
- saldo inicial normal ou previsto, conforme o periodo selecionado;
- separacao entre receitas recebidas, despesas pagas, receitas previstas e despesas previstas;
- saldo final previsto para meses futuros;
- transferencias tratadas como saida na origem e entrada no destino.

O fluxo ajuda a responder perguntas como: quanto sobrara no mes que vem, quais vencimentos vao pesar mais no caixa e se uma receita prevista cobre as despesas pendentes.

### Lancamentos

- cadastro de receitas, despesas e transferencias;
- edicao, exclusao e marcacao de pagamento;
- suporte a recorrencias e parcelamentos;
- filtros e organizacao por vencimento;
- uso de categorias, contas e bancos cadastrados.

### Cartoes de credito

- cadastro de cartoes;
- lancamento de compras no cartao com parcelas;
- escolha da primeira fatura;
- faturas mensais por cartao;
- ajustes, estornos e pagamentos;
- pagamento parcial com manutencao do saldo em aberto;
- pagamento total sem duplicar lancamentos;
- parcelas consideradas nos resumos pelas categorias reais da compra.

### Configuracoes

- cadastro de bancos, com logo;
- cadastro de contas;
- cadastro de categorias;
- cadastro de tipos de conta;
- cadastro de cartoes de credito;
- ativacao e desativacao de registros.

## Stack

- React 19
- Vite 8
- React Router
- Express 5
- SQLite
- Electron
- Electron Builder
- ESLint

## Para quem serve

Este projeto serve para:

- controle financeiro pessoal;
- demonstracao de produto desktop com React e Electron;
- portfolio de desenvolvimento full stack;
- base para evoluir para um sistema financeiro familiar;
- estudo de regras financeiras reais em aplicacoes de gestao.

## Como rodar em desenvolvimento

Instale as dependencias:

```bash
npm install
```

Suba frontend e backend juntos:

```bash
npm run dev
```

Ou rode separadamente:

```bash
npm run dev:web
npm run dev:server
```

Portas padrao:

- Frontend Vite: `http://127.0.0.1:5173`
- Backend Express: `http://localhost:3000`
- Chamadas do frontend usam proxy com prefixo `/api`.

## Scripts principais

```bash
npm run dev
npm run build
npm run lint
npm run dev:server
npm run electron
npm run build:electron
```

Scripts de banco e empacotamento:

```bash
npm run db:producao
npm run clean:electron
```

## Build desktop

Para gerar o instalador Windows:

```bash
npm run build:electron
```

O processo:

1. limpa artefatos antigos do Electron;
2. cria o banco SQLite de producao;
3. gera o build Vite;
4. empacota o app com Electron Builder;
5. publica apenas os artefatos finais esperados.

## Estrutura principal

```text
electron/
  main.cjs
scripts/
  limparBuildElectron.js
  publicarBuildElectron.js
src/
  backend/
    app.js
    db.js
    rotas/
  componentes/
  paginas/
  styles/
  utilitarios/
```

Paginas principais:

- `/` - Home
- `/fluxo-caixa` - Fluxo de caixa
- `/cartao-credito` - Cartoes de credito
- `/lancamentos` - Lancamentos
- `/configuracoes` - Configuracoes

## Banco de dados

O projeto usa SQLite local.

Banco de desenvolvimento:

```text
src/backend/db.sqlite
```

Banco usado no build de producao:

```text
src/backend/db.producao.sqlite
```

Tabelas relevantes:

- `lancamentos`
- `categoria`
- `conta`
- `tipo_conta`
- `banco`
- `cartao_credito`
- `fatura_cartao`
- `compras_cartao`
- `parcelas_cartao`
- `ajustes_fatura_cartao`

## Convencoes importantes

- O frontend sempre chama APIs com prefixo `/api`.
- Rotas visuais usam `HashRouter`, adequado para Electron.
- Contas do tipo investimento nao entram nos totais operacionais da Home.
- A categoria `Cartao de credito` nao deve aparecer nos resumos anuais de despesa; as parcelas aparecem nas categorias reais das compras.
- Mensagens de sistema devem usar o provedor global de notificacoes.
- O visual segue uma linha limpa de dashboard financeiro: fundo claro, cards objetivos, tabelas densas e foco em leitura.

## Validacao

Comandos recomendados antes de publicar uma versao:

```bash
npm run lint
npm run build
npm run build:electron
```
