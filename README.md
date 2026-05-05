<h1 align="center">Finanças Pessoais</h1>

<p align="center">
  Aplicação desktop e web para organizar receitas, despesas, categorias e relatórios financeiros pessoais.
</p>

<p align="center">
  <strong>Next.js</strong> ·
  <strong>React</strong> ·
  <strong>TypeScript</strong> ·
  <strong>SQLite</strong> ·
  <strong>Electron</strong>
</p>

---

## Sobre o Projeto

O **Finanças Pessoais** é uma aplicação local-first para controle financeiro, pensada para funcionar tanto no navegador quanto em uma janela desktop com Electron.

A arquitetura foi organizada para separar interface, regras de negócio, acesso ao banco e utilitários compartilhados desde o início do projeto.

## Tecnologias

| Tecnologia | Uso no projeto |
| --- | --- |
| Next.js | Rotas, páginas, APIs e build web |
| React | Interface da aplicação |
| TypeScript | Tipagem e segurança no desenvolvimento |
| SQLite | Banco de dados local |
| Electron | Execução como aplicativo desktop |
| ESLint | Padronização e correções automáticas de código |

## Estrutura

```text
financasPessoais/
  electron/
  scripts/
  data/
  src/
    app/
    components/
    features/
    hooks/
    lib/
      db/
      utils/
    server/
      repositories/
      services/
    types/
```

## Responsabilidades

| Pasta | Responsabilidade |
| --- | --- |
| `src/app` | Páginas, layouts, rotas e APIs do Next.js. |
| `src/components` | Componentes visuais reutilizáveis. |
| `src/features` | Funcionalidades por domínio, como contas, categorias e transações. |
| `src/hooks` | Hooks React compartilhados. |
| `src/lib/db` | Conexão, configuração e utilitários do SQLite. |
| `src/lib/utils` | Funções auxiliares genéricas. |
| `src/server/repositories` | Acesso direto ao banco de dados. |
| `src/server/services` | Regras de negócio da aplicação. |
| `src/types` | Tipos TypeScript compartilhados. |
| `electron` | Configuração principal do aplicativo desktop. |
| `scripts` | Automações de desenvolvimento. |
| `data` | Arquivos locais de dados, incluindo o banco SQLite. |

## Começando

Instale as dependências:

```bash
npm install
```

Rode o projeto no navegador:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Rodando com Electron

Para abrir a aplicação como desktop:

```bash
npm run devLocal
```

Esse comando:

- inicia o servidor Next.js em desenvolvimento;
- abre uma janela Electron;
- carrega a aplicação em `http://127.0.0.1:3000`;
- usa o mesmo código web, servidor e banco SQLite.

## Build

```bash
npm run build
```

O build executa:

- validação com ESLint;
- geração do build web de produção com Next.js.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o desenvolvimento web. |
| `npm run dev:web` | Inicia apenas o servidor Next.js. |
| `npm run devLocal` | Inicia Next.js e Electron juntos. |
| `npm run electron` | Abre apenas o Electron. |
| `npm run build` | Roda lint e build web. |
| `npm run build:web` | Gera apenas o build web. |
| `npm run lint` | Executa o ESLint. |
| `npm run lint:fix` | Executa o ESLint com correções automáticas. |
| `npm run fix` | Atalho para `npm run lint:fix`. |

## Snippets do VS Code

O projeto inclui snippets locais para acelerar a criação de arquivos.

### `basePage`

Cria uma página usando o nome da pasta atual + `Page`.

```tsx
export default function NomeDaPastaPage() {
  return (
    <div>

    </div>
  );
}
```

### `baseComponent`

Cria um componente usando o nome do arquivo atual.

```tsx
export default function NomeDoArquivo() {
  return (
    <div>

    </div>
  );
}
```

## Convenções

- Componentes e páginas seguem a estrutura JSX corrigida automaticamente pelo ESLint.
- Código de banco deve ficar em `src/lib/db` e `src/server/repositories`.
- Regras de negócio devem ficar em `src/server/services`.
- Componentes genéricos devem ficar em `src/components`.
- Funcionalidades específicas devem ficar em `src/features`.

## Status

Projeto em fase inicial de estruturação.
