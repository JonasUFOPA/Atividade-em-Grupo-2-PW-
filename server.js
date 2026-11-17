const express = require("express");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const app = express();
const PORT = process.env.PORT || 3000;
const arquivoBanco = path.join(__dirname, "database.sqlite");
let db;

function salvarBanco() {
  const dados = db.export();
  fs.writeFileSync(arquivoBanco, Buffer.from(dados));
}

function consultarTodos(sql, parametros = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(parametros);
    const linhas = [];
    while (stmt.step()) linhas.push(stmt.getAsObject());
    return linhas;
  } finally {
    stmt.free();
  }
}

function consultarUm(sql, parametros = []) {
  return consultarTodos(sql, parametros)[0] || null;
}

function executar(sql, parametros = []) {
  db.run(sql, parametros);
  const alteracoes = db.getRowsModified();
  return alteracoes;
}

function validarJogo(dados) {
  const campos = ["titulo", "genero", "plataforma", "ano", "nota"];
  for (const campo of campos) {
    if (dados[campo] === undefined || dados[campo] === null || String(dados[campo]).trim() === "") {
      return `O campo "${campo}" é obrigatório.`;
    }
  }
  const ano = Number(dados.ano);
  const nota = Number(dados.nota);
  if (!Number.isInteger(ano) || ano < 1950 || ano > new Date().getFullYear() + 5) {
    return "Informe um ano válido.";
  }
  if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
    return "A nota deve estar entre 0 e 10.";
  }
  return null;
}

async function iniciarServidor() {
  const SQL = await initSqlJs({
    locateFile: (arquivo) => path.join(path.dirname(require.resolve("sql.js")), arquivo)
  });

  if (fs.existsSync(arquivoBanco)) {
    const dados = fs.readFileSync(arquivoBanco);
    db = new SQL.Database(new Uint8Array(dados));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS jogos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      genero TEXT NOT NULL,
      plataforma TEXT NOT NULL,
      ano INTEGER NOT NULL,
      nota REAL NOT NULL CHECK (nota >= 0 AND nota <= 10),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const quantidade = consultarUm("SELECT COUNT(*) AS total FROM jogos").total;
  if (quantidade === 0) {
    const jogosIniciais = [
      ["The Legend of Zelda: Breath of the Wild", "Aventura", "Nintendo Switch", 2017, 9.7],
      ["God of War Ragnarök", "Ação", "PlayStation 5", 2022, 9.5],
      ["Minecraft", "Sandbox", "Multiplataforma", 2011, 9.2],
      ["Elden Ring", "RPG", "PC", 2022, 9.8],
      ["The Last of Us Part I", "Aventura", "PlayStation 5", 2022, 9.3],
      ["Forza Horizon 5", "Corrida", "Xbox Series X|S", 2021, 9.0],
      ["Hollow Knight", "Metroidvania", "PC", 2017, 9.4],
      ["Stardew Valley", "Simulação", "Multiplataforma", 2016, 9.1],
      ["Cyberpunk 2077", "RPG", "PC", 2020, 8.7],
      ["Super Mario Odyssey", "Plataforma", "Nintendo Switch", 2017, 9.6]
    ];
    for (const jogo of jogosIniciais) {
      executar("INSERT INTO jogos (titulo, genero, plataforma, ano, nota) VALUES (?, ?, ?, ?, ?)", jogo);
    }
    salvarBanco();
  }

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/api/jogos", (req, res) => {
    res.json({ sucesso: true, dados: consultarTodos("SELECT * FROM jogos ORDER BY id DESC") });
  });

  app.get("/api/jogos/:id", (req, res) => {
    const jogo = consultarUm("SELECT * FROM jogos WHERE id = ?", [req.params.id]);
    if (!jogo) return res.status(404).json({ sucesso: false, mensagem: "Jogo não encontrado." });
    res.json({ sucesso: true, dados: jogo });
  });

  app.post("/api/jogos", (req, res) => {
    const erro = validarJogo(req.body || {});
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    try {
      executar("INSERT INTO jogos (titulo, genero, plataforma, ano, nota) VALUES (?, ?, ?, ?, ?)", [
        req.body.titulo.trim(), req.body.genero.trim(), req.body.plataforma.trim(), Number(req.body.ano), Number(req.body.nota)
      ]);
      const novoJogo = consultarUm("SELECT * FROM jogos WHERE id = last_insert_rowid()");
      salvarBanco();
      res.status(201).json({ sucesso: true, mensagem: "Jogo cadastrado com sucesso!", dados: novoJogo });
    } catch (erroBanco) {
      console.error("Erro ao cadastrar:", erroBanco.message);
      res.status(500).json({ sucesso: false, mensagem: "Não foi possível cadastrar o jogo." });
    }
  });

  app.put("/api/jogos/:id", (req, res) => {
    const erro = validarJogo(req.body || {});
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    const existente = consultarUm("SELECT id FROM jogos WHERE id = ?", [req.params.id]);
    if (!existente) return res.status(404).json({ sucesso: false, mensagem: "Jogo não encontrado." });
    try {
      executar("UPDATE jogos SET titulo = ?, genero = ?, plataforma = ?, ano = ?, nota = ? WHERE id = ?", [
        req.body.titulo.trim(), req.body.genero.trim(), req.body.plataforma.trim(), Number(req.body.ano), Number(req.body.nota), req.params.id
      ]);
      const jogoAtualizado = consultarUm("SELECT * FROM jogos WHERE id = ?", [req.params.id]);
      salvarBanco();
      res.json({ sucesso: true, mensagem: "Jogo atualizado com sucesso!", dados: jogoAtualizado });
    } catch (erroBanco) {
      console.error("Erro ao atualizar:", erroBanco.message);
      res.status(500).json({ sucesso: false, mensagem: "Não foi possível atualizar o jogo." });
    }
  });

  app.delete("/api/jogos/:id", (req, res) => {
    const alteracoes = executar("DELETE FROM jogos WHERE id = ?", [req.params.id]);
    if (alteracoes === 0) return res.status(404).json({ sucesso: false, mensagem: "Jogo não encontrado." });
    salvarBanco();
    res.json({ sucesso: true, mensagem: "Jogo excluído com sucesso!" });
  });

  app.use("/api", (req, res) => res.status(404).json({ sucesso: false, mensagem: "Rota da API não encontrada." }));
  app.use((erro, req, res, next) => {
    console.error("Erro na requisição:", erro.message);
    if (erro instanceof SyntaxError && erro.status === 400 && "body" in erro) {
      return res.status(400).json({ sucesso: false, mensagem: "JSON inválido no corpo da requisição." });
    }
    res.status(500).json({ sucesso: false, mensagem: "Erro interno do servidor." });
  });

  app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
    console.log("Banco de dados SQLite conectado (sql.js).");
  });
}

iniciarServidor().catch((erro) => {
  console.error("Não foi possível iniciar o servidor:", erro);
  process.exit(1);
});
