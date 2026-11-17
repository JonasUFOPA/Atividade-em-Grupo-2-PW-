# PixelVault — Catálogo de Jogos

Aplicação web de catálogo de jogos com operações CRUD (Create, Read, Update e Delete). O front-end utiliza HTML, CSS e JavaScript puro; o back-end é construído manualmente com Node.js e Express; os dados são armazenados em SQLite.

## 1. Requisitos

- Node.js 18 ou superior (recomendado: versão LTS).
- npm (instalado junto com o Node.js).
- Navegador atualizado.

Não é necessário instalar ou configurar um servidor de banco de dados separado.

## 2. Estrutura do projeto

```text
catalogo-jogos/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── database.sqlite       # criado automaticamente na primeira execução
├── package.json
├── server.js
└── README.md
```

## 3. Como executar

1. Extraia o arquivo ZIP.
2. Abra a pasta `catalogo-jogos` no VS Code.
3. Abra o terminal integrado do VS Code (**Terminal > Novo Terminal**).
4. Confira a instalação do Node.js:

   ```bash
   node -v
   npm -v
   ```

5. Instale as dependências:

   ```bash
   npm install
   ```

6. Inicie o servidor:

   ```bash
   npm start
   ```

7. Abra no navegador:

   **http://localhost:3000**

O Express serve a página e a API na mesma origem. Assim, o navegador acessa a API pelo caminho `/api/jogos` e não é necessário configurar CORS para esta execução.

Para encerrar o servidor, volte ao terminal e pressione `Ctrl + C`.

## 4. Banco de dados e justificativa

Foi escolhido o **SQLite**, um banco de dados relacional que armazena as informações em um arquivo (`database.sqlite`). A escolha se justifica porque:

- é gratuito e não exige um serviço de banco separado;
- utiliza SQL, permitindo demonstrar operações relacionais;
- é simples de configurar em um projeto local;
- mantém os registros entre reinicializações do servidor;
- atende bem ao volume de dados de um catálogo acadêmico.

A tabela `jogos` possui os campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INTEGER | Identificador único, chave primária |
| `titulo` | TEXT | Nome do jogo (obrigatório) |
| `genero` | TEXT | Gênero (obrigatório) |
| `plataforma` | TEXT | Plataforma (obrigatório) |
| `ano` | INTEGER | Ano de lançamento (obrigatório) |
| `nota` | REAL | Nota de 0 a 10 (obrigatório) |
| `criado_em` | TEXT | Data/hora de criação |

Na primeira inicialização, o servidor cria a tabela, caso ela ainda não exista, e insere 10 jogos de exemplo se a tabela estiver vazia. Isso evita duplicar os registros iniciais em reinicializações posteriores.

O arquivo `database.sqlite` é criado automaticamente na raiz do projeto. O sql.js carrega esse arquivo ao iniciar e grava novamente após cada cadastro, edição ou exclusão. **Não o apague** se quiser preservar os dados cadastrados.

## 5. Rotas da API

Todas as rotas respondem em JSON.

| Método | Rota | Operação |
|---|---|---|
| GET | `/api/jogos` | Lista todos os jogos |
| GET | `/api/jogos/:id` | Consulta um jogo |
| POST | `/api/jogos` | Cadastra um jogo |
| PUT | `/api/jogos/:id` | Atualiza um jogo |
| DELETE | `/api/jogos/:id` | Exclui um jogo |

### Exemplo de corpo JSON para cadastro/edição

```json
{
  "titulo": "Hades",
  "genero": "Roguelike",
  "plataforma": "PC",
  "ano": 2020,
  "nota": 9.5
}
```

### Exemplos de respostas

Sucesso:

```json
{
  "sucesso": true,
  "mensagem": "Jogo cadastrado com sucesso!",
  "dados": {
    "id": 11,
    "titulo": "Hades",
    "genero": "Roguelike",
    "plataforma": "PC",
    "ano": 2020,
    "nota": 9.5
  }
}
```

Erro de validação:

```json
{
  "sucesso": false,
  "mensagem": "O campo \"titulo\" é obrigatório."
}
```

## 6. Validações e tratamento de erros

- O servidor recusa campos obrigatórios vazios.
- O ano e a nota são validados no back-end.
- As consultas SQL utilizam parâmetros, reduzindo o risco de SQL injection.
- Erros de validação retornam HTTP 400.
- Registros inexistentes retornam HTTP 404.
- Erros inesperados retornam HTTP 500 em JSON.
- Uma requisição inválida não encerra o processo do servidor.

A validação no servidor é essencial: não se confia apenas nos atributos `required` do HTML, pois requisições também podem ser enviadas diretamente à API.

## 7. Como o front-end se comunica com o servidor

O arquivo `public/app.js` utiliza `fetch()` para enviar requisições HTTP à API. A interface não consulta nem altera o SQLite diretamente. O fluxo é:

1. O usuário realiza uma ação na página.
2. O JavaScript envia uma requisição com `fetch()`.
3. O Express recebe a requisição e executa a operação SQL.
4. O servidor retorna o resultado em JSON.
5. O JavaScript atualiza os cards, estatísticas e mensagens sem recarregar a página.

## 8. Roteiro de testes

Faça os testes com o servidor em execução:

1. **Listagem:** abra a página e confirme que os 10 jogos iniciais aparecem.
2. **Cadastro:** adicione um jogo, por exemplo, Hades. Confirme que o card aparece e o total aumenta.
3. **Persistência:** atualize o navegador. O jogo cadastrado deve continuar aparecendo.
4. **Edição:** altere a nota ou a plataforma de um jogo. Confirme a atualização na tela.
5. **Exclusão:** exclua um jogo e confirme que ele desaparece.
6. **Validação:** tente enviar uma requisição com campo vazio. O servidor deve responder com erro JSON e continuar funcionando.
7. **Reinicialização:** encerre o servidor com `Ctrl + C`, inicie novamente com `npm start` e confira se as alterações continuam salvas.

Para testar a validação diretamente no PowerShell, com o servidor ligado:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/jogos -Method Post -ContentType "application/json" -Body '{"titulo":"","genero":"Ação","plataforma":"PC","ano":2024,"nota":8}'
```

A resposta deve informar que o campo `titulo` é obrigatório. A página e a API continuam disponíveis depois desse teste.

## 9. Observação sobre CORS

A página é servida pelo próprio Express na porta 3000 e chama a API na mesma origem. Por isso, CORS não é necessário nesta configuração. Se o front-end for executado em outra origem/porta, será necessário instalar e configurar o middleware `cors` no servidor, liberando a origem do front-end.

## 10. Tecnologias utilizadas

- HTML5 — estrutura da página.
- CSS3 — layout e responsividade.
- JavaScript — eventos, DOM e Fetch API.
- Node.js — ambiente de execução do back-end.
- Express — servidor HTTP e rotas.
- SQLite / sql.js — persistência e operações SQL em WebAssembly, sem compilação C++.

---
Projeto desenvolvido para demonstrar a comunicação entre front-end, servidor próprio e banco de dados.
#
