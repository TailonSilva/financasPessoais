# Finanças Pessoais

Aplicação de controle financeiro pessoal com frontend em React/Vite e backend Express usando SQLite.

## Scripts principais

```bash
npm run dev
npm run build
npm run dev:server
```

## Portas

- Frontend Vite: `http://127.0.0.1:5173`
- Backend Express: `http://localhost:3000`
- Chamadas do frontend para o backend devem passar pelo proxy `/api`.

Exemplo:

```js
fetch('/api/db-lancamentos')
```

## Direção visual

O layout de referência é um dashboard financeiro limpo, parecido com o estilo "Minhas Finanças":

- interface desktop, sem necessidade de adaptação mobile;
- fundo geral cinza muito claro: `var(--color-page-bg)`;
- áreas principais em branco, com bordas suaves e sombras discretas;
- visual leve, arejado e com bastante alinhamento;
- azul como cor de destaque para seleção, ações e estados ativos;
- cartões de resumo com cores fortes apenas para indicadores principais;
- tabelas limpas, com linhas leves e boa leitura horizontal;
- evitar visual escuro dominante, gradientes pesados ou excesso de decoração.

## Paleta global

As cores mais usadas do projeto ficam em `src/index.css` como variáveis CSS.

Indicadores principais inspirados nos cartões do dashboard:

- `--color-brand-blue: #1e96f2` para contas, seleção, botões e estados ativos;
- `--color-brand-green: #18a661` para receitas e valores positivos;
- `--color-brand-red: #e54b3f` para despesas, alertas e valores negativos;
- `--color-brand-yellow: #f7b801` para movimentação, avisos e estados neutros;
- `--color-brand-indigo: #3478dd` para cartões de crédito e indicadores secundários.

Base da interface:

- `--color-brand-blue-soft: #e8f3ff` para fundos ativos suaves;
- `--color-surface: #ffffff` para painéis, cards e cabeçalhos;
- `--color-page-bg: #f6f8fb` para fundo geral da aplicação;
- `--color-border: #e7edf5` para divisórias leves;
- `--color-text: #243247` para texto principal;
- `--color-muted: #526173` para texto secundário e ícones neutros.

## Navegação

O menu principal deve permanecer como sidebar lateral fixa somente com ícones:

- largura base: `56px`;
- fundo branco;
- borda direita clara;
- ícones escuros em estado normal;
- item ativo com fundo azul claro e ícone azul;
- sem texto visível nos itens, usando `title` e `aria-label` para acessibilidade;
- sem versão mobile/bottom bar.

Arquivos principais:

- `src/componentes/Sidebar.jsx`
- `src/styles/sidebar.css`

## Cabeçalho das páginas

Todas as páginas devem começar com um cabeçalho padrão usando o componente `PageHeader`:

- lado esquerdo com ícone do projeto e nome `Minhas Finanças`;
- lado direito reservado para ações específicas da página;
- ações devem usar botões compactos, preferencialmente com ícones;
- quando houver filtro de mês, usar o padrão visual do seletor em formato pill;
- a Home usa o seletor de mês no lado direito como referência inicial do padrão.

Arquivos principais:

- `src/componentes/PageHeader.jsx`
- `src/styles/pageHeader.css`

## Convenções de API

As rotas de API podem ter nomes próprios no backend, mas no frontend devem usar sempre o prefixo `/api` para evitar conflito com rotas do React Router.

Exemplo:

- rota visual React: `/lancamentos`
- rota backend real: `/db-lancamentos`
- chamada frontend: `/api/db-lancamentos`

## Banco de dados

Banco SQLite em:

```text
src/backend/db.sqlite
```

Tabela principal de lançamentos:

```sql
"lançamentos"
```

Campos importantes usados na listagem:

- `dia_vencimento`
- `mes_vencimento`
- `ano_vencimento`
- `tipo_lancamento_id`
- `categoria_id`
- `conta_id`
- `valor`

Tabelas auxiliares relevantes:

- `meses`
- `tipo_lancamentos`
- `categoria`
- `conta`
- `tipo_conta`
- `banco`
