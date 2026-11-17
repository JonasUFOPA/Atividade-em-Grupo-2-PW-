const API_URL = "/api/jogos";

const listaJogos = document.getElementById("lista-jogos");
const modal = document.getElementById("modal");
const formulario = document.getElementById("form-jogo");
const mensagem = document.getElementById("mensagem");
const pesquisa = document.getElementById("pesquisa");
const filtroGenero = document.getElementById("filtro-genero");
const toast = document.getElementById("toast");

let jogos = [];
let jogoEmEdicao = null;
let temporizadorToast;

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes
  });

  let resultado;
  try {
    resultado = await resposta.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }

  if (!resposta.ok || resultado.sucesso === false) {
    throw new Error(resultado.mensagem || "Ocorreu um erro na requisição.");
  }
  return resultado;
}

function mostrarToast(texto, tipo = "success") {
  toast.textContent = texto;
  toast.className = `toast show ${tipo === "error" ? "error" : ""}`;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("show"), 3500);
}

function mostrarMensagem(texto = "", tipo = "") {
  mensagem.textContent = texto;
  mensagem.className = `message ${tipo}`;
}

function atualizarEstatisticas() {
  document.getElementById("total-jogos").textContent = jogos.length;
  document.getElementById("total-generos").textContent = new Set(jogos.map(j => j.genero)).size;
  const media = jogos.length ? jogos.reduce((soma, j) => soma + Number(j.nota), 0) / jogos.length : 0;
  document.getElementById("nota-media").textContent = jogos.length ? media.toFixed(1) : "—";
}

function atualizarFiltro() {
  const selecionado = filtroGenero.value;
  const generos = [...new Set(jogos.map(j => j.genero))].sort((a, b) => a.localeCompare(b));
  filtroGenero.innerHTML = '<option value="">Todos os gêneros</option>';
  generos.forEach(genero => {
    const option = document.createElement("option");
    option.value = genero;
    option.textContent = genero;
    filtroGenero.appendChild(option);
  });
  filtroGenero.value = generos.includes(selecionado) ? selecionado : "";
}

function criarCard(jogo) {
  const article = document.createElement("article");
  article.className = "game-card";

  const topo = document.createElement("div");
  topo.className = "card-top";
  const icone = document.createElement("div");
  icone.className = "game-icon";
  icone.textContent = "🎮";
  const nota = document.createElement("div");
  nota.className = "rating";
  nota.textContent = `★ ${Number(jogo.nota).toFixed(1)} `;
  const pequena = document.createElement("small");
  pequena.textContent = "/ 10";
  nota.appendChild(pequena);
  topo.append(icone, nota);

  const titulo = document.createElement("h3");
  titulo.textContent = jogo.titulo;
  const ano = document.createElement("p");
  ano.className = "game-meta";
  ano.textContent = `Lançamento · ${jogo.ano}`;

  const tags = document.createElement("div");
  tags.className = "tags";
  [jogo.genero, jogo.plataforma].forEach(valor => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = valor;
    tags.appendChild(tag);
  });

  const acoes = document.createElement("div");
  acoes.className = "card-actions";
  const editar = document.createElement("button");
  editar.className = "icon-button";
  editar.type = "button";
  editar.title = "Editar jogo";
  editar.setAttribute("aria-label", `Editar ${jogo.titulo}`);
  editar.textContent = "✎";
  editar.addEventListener("click", () => abrirEdicao(jogo));

  const excluir = document.createElement("button");
  excluir.className = "icon-button delete";
  excluir.type = "button";
  excluir.title = "Excluir jogo";
  excluir.setAttribute("aria-label", `Excluir ${jogo.titulo}`);
  excluir.textContent = "⌫";
  excluir.addEventListener("click", () => excluirJogo(jogo));

  acoes.append(editar, excluir);
  article.append(topo, titulo, ano, tags, acoes);
  return article;
}

function renderizarJogos() {
  const termo = pesquisa.value.trim().toLocaleLowerCase("pt-BR");
  const genero = filtroGenero.value;
  const filtrados = jogos.filter(jogo => {
    const correspondeTexto = [jogo.titulo, jogo.genero, jogo.plataforma]
      .some(valor => valor.toLocaleLowerCase("pt-BR").includes(termo));
    return correspondeTexto && (!genero || jogo.genero === genero);
  });

  listaJogos.replaceChildren();
  document.getElementById("contador-resultados").textContent =
    `${filtrados.length} ${filtrados.length === 1 ? "resultado" : "resultados"}`;

  if (!filtrados.length) {
    const vazio = document.createElement("div");
    vazio.className = "empty";
    vazio.textContent = jogos.length ? "Nenhum jogo corresponde à sua busca." : "Seu catálogo está vazio. Adicione o primeiro jogo!";
    listaJogos.appendChild(vazio);
    return;
  }
  filtrados.forEach(jogo => listaJogos.appendChild(criarCard(jogo)));
}

async function carregarJogos() {
  listaJogos.innerHTML = '<div class="loading">Carregando catálogo...</div>';
  try {
    const resultado = await requisicao(API_URL);
    jogos = resultado.dados;
    atualizarEstatisticas();
    atualizarFiltro();
    renderizarJogos();
    mostrarMensagem();
  } catch (erro) {
    listaJogos.innerHTML = '<div class="empty">Não foi possível carregar os jogos. Verifique se o servidor está em execução.</div>';
    mostrarMensagem(erro.message, "error");
  }
}

function abrirModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  formulario.elements.titulo.focus();
}

function fecharModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  formulario.reset();
  jogoEmEdicao = null;
  document.getElementById("modal-titulo").textContent = "Adicionar jogo";
  document.getElementById("salvar").textContent = "Salvar jogo";
}

function abrirEdicao(jogo) {
  jogoEmEdicao = jogo.id;
  document.getElementById("modal-titulo").textContent = "Editar jogo";
  document.getElementById("salvar").textContent = "Salvar alterações";
  for (const campo of ["titulo", "genero", "plataforma", "ano", "nota"]) {
    formulario.elements[campo].value = jogo[campo];
  }
  abrirModal();
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dados = Object.fromEntries(new FormData(formulario).entries());
  dados.ano = Number(dados.ano);
  dados.nota = Number(dados.nota);

  const botao = document.getElementById("salvar");
  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    const edicao = jogoEmEdicao !== null;
    const url = edicao ? `${API_URL}/${jogoEmEdicao}` : API_URL;
    const resultado = await requisicao(url, {
      method: edicao ? "PUT" : "POST",
      body: JSON.stringify(dados)
    });
    fecharModal();
    mostrarToast(resultado.mensagem);
    await carregarJogos();
  } catch (erro) {
    mostrarToast(erro.message, "error");
  } finally {
    botao.disabled = false;
    botao.textContent = jogoEmEdicao !== null ? "Salvar alterações" : "Salvar jogo";
  }
});

async function excluirJogo(jogo) {
  if (!confirm(`Deseja realmente excluir "${jogo.titulo}"?`)) return;
  try {
    const resultado = await requisicao(`${API_URL}/${jogo.id}`, { method: "DELETE" });
    mostrarToast(resultado.mensagem);
    await carregarJogos();
  } catch (erro) {
    mostrarToast(erro.message, "error");
  }
}

document.getElementById("abrir-modal").addEventListener("click", abrirModal);
document.getElementById("fechar-modal").addEventListener("click", fecharModal);
document.getElementById("cancelar").addEventListener("click", fecharModal);
modal.addEventListener("click", evento => { if (evento.target === modal) fecharModal(); });
document.addEventListener("keydown", evento => { if (evento.key === "Escape") fecharModal(); });
pesquisa.addEventListener("input", renderizarJogos);
filtroGenero.addEventListener("change", renderizarJogos);

carregarJogos();
