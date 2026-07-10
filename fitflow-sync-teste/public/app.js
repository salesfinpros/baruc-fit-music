const elTabela = document.getElementById("corpoTabela");
const elBusca = document.getElementById("busca");
const elLog = document.getElementById("log");
const elUltimaSync = document.getElementById("ultimaSync");
const elIntervalo = document.getElementById("intervalo");
const elStatusLeitor = document.getElementById("statusLeitor");
const elBtnSync = document.getElementById("btnSync");

let alunos = [];

function formatarHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderTabela() {
  const termo = elBusca.value.trim().toLowerCase();
  const filtrados = alunos.filter(
    (a) => !termo || a.nome.toLowerCase().includes(termo) || a.matricula.includes(termo)
  );

  if (!filtrados.length) {
    elTabela.innerHTML = `<tr><td colspan="4" class="vazio">${
      alunos.length ? "nenhum aluno encontrado" : "sincronizando…"
    }</td></tr>`;
    return;
  }

  elTabela.innerHTML = filtrados
    .map((a) => {
      const cadastrada = a.biometriaCadastrada;
      const pill = cadastrada
        ? `<span class="pill cadastrada">cadastrada · ${a.tipoBiometria}</span>`
        : `<span class="pill pendente">pendente</span>`;
      return `
        <tr>
          <td class="nome">${escapeHtml(a.nome)}</td>
          <td class="matricula">${escapeHtml(a.matricula)}</td>
          <td>${pill}</td>
          <td>
            <div class="acoes">
              <button class="botao-mini" data-id="${a.id}" data-tipo="facial" ${cadastrada ? "disabled" : ""}>Facial</button>
              <button class="botao-mini" data-id="${a.id}" data-tipo="digital" ${cadastrada ? "disabled" : ""}>Digital</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

elTabela.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  btn.disabled = true;
  fetch("/api/cadastrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: Number(btn.dataset.id), tipo: btn.dataset.tipo }),
  });
});

elBusca.addEventListener("input", renderTabela);

elBtnSync.addEventListener("click", () => {
  elBtnSync.disabled = true;
  elBtnSync.textContent = "Sincronizando…";
  fetch("/api/sync", { method: "POST" }).finally(() => {
    setTimeout(() => {
      elBtnSync.disabled = false;
      elBtnSync.textContent = "Sincronizar agora";
    }, 600);
  });
});

function adicionarLog(msg, hora) {
  const div = document.createElement("div");
  div.className = "linha";
  div.innerHTML = `<span class="h">${formatarHora(hora)}</span>${escapeHtml(msg)}`;
  elLog.appendChild(div);
  elLog.scrollTop = elLog.scrollHeight;
}

function aplicarEstado(estado) {
  alunos = estado.alunos || [];
  elUltimaSync.textContent = formatarHora(estado.ultimaSincronizacao);
  elIntervalo.textContent = `${Math.round(estado.intervaloSyncMs / 1000)}s (produção: 5 min)`;

  elStatusLeitor.classList.toggle("conectado", estado.leitorConectado);
  elStatusLeitor.classList.toggle("desconectado", !estado.leitorConectado);
  elStatusLeitor.classList.toggle("pendente", false);
  elStatusLeitor.querySelector(".texto").textContent = estado.leitorConectado
    ? "leitor facial conectado"
    : "leitor facial desconectado";

  renderTabela();
}

const es = new EventSource("/api/eventos");
es.onmessage = (ev) => {
  const dado = JSON.parse(ev.data);
  if (dado.tipo === "estado") aplicarEstado(dado);
  else if (dado.tipo === "log") adicionarLog(dado.msg, dado.hora);
};

fetch("/api/estado")
  .then((r) => r.json())
  .then(aplicarEstado);
