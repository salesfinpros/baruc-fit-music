// Protótipo do "Fitflow Sync" — o que vai substituir o SCA-sincronizador.exe
// em São Luís do Curu:
//   1. puxa alunos da nuvem Fitflow (polling automático + botão manual)
//   2. deixa buscar um aluno sincronizado
//   3. cadastra a facial/digital dele no leitor Topdata (aqui, simulado)
//
// Tem uma tela em http://127.0.0.1:6070 — é a cara que o app real teria.
// (o terminal continua aceitando os mesmos comandos de antes, se preferir)

const http = require("http");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { servidor } = require("./canal-tcp");

const PORTA_LEITOR = 6060;
const PORTA_UI = 6070;
const CLOUD_URL = "http://127.0.0.1:4000/alunos";
const INTERVALO_SYNC_MS = 10_000; // em produção seria 5 min (300_000)

let cacheAlunos = [];
let canalLeitor = null;
let ultimaSincronizacao = null;
const aguardandoAck = new Map(); // enrollid -> resolve()
const clientesSSE = new Set();

function log(msg) {
  console.log(msg);
  const linha = `data: ${JSON.stringify({ tipo: "log", msg, hora: new Date().toISOString() })}\n\n`;
  clientesSSE.forEach((res) => res.write(linha));
}

function avisarEstado() {
  const linha = `data: ${JSON.stringify({ tipo: "estado", ...estadoAtual() })}\n\n`;
  clientesSSE.forEach((res) => res.write(linha));
}

function estadoAtual() {
  return {
    alunos: cacheAlunos,
    leitorConectado: !!canalLeitor,
    ultimaSincronizacao,
    intervaloSyncMs: INTERVALO_SYNC_MS,
  };
}

function buscarNaNuvem() {
  return new Promise((resolve, reject) => {
    http
      .get(CLOUD_URL, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function sincronizar({ manual = false } = {}) {
  try {
    const alunosNuvem = await buscarNaNuvem();
    const novos = alunosNuvem.filter((a) => !cacheAlunos.some((c) => c.id === a.id));
    const atualizados = alunosNuvem.filter((a) => {
      const local = cacheAlunos.find((c) => c.id === a.id);
      return local && JSON.stringify(local) !== JSON.stringify(a);
    });
    cacheAlunos = alunosNuvem;
    ultimaSincronizacao = new Date().toISOString();

    const origem = manual ? "manual (botão)" : "automática (5 min)";
    if (novos.length || atualizados.length) {
      log(`sincronização ${origem}: ${novos.length} novo(s), ${atualizados.length} atualizado(s)`);
      novos.forEach((a) => log(`  + ${a.nome} (matrícula ${a.matricula})`));
    } else {
      log(`sincronização ${origem}: nada novo`);
    }
    avisarEstado();
  } catch (e) {
    log(`falha ao falar com a nuvem Fitflow: ${e.message}`);
  }
}

servidor(PORTA_LEITOR, {
  aoConectar(canal) {
    log("leitor facial conectado");
    canalLeitor = canal;
    avisarEstado();

    canal.aoReceber((msg) => {
      if (msg.cmd === "reg") {
        canal.enviar({ ret: "reg", result: true });
        return;
      }
      if (msg.ret === "setuserinfo" && aguardandoAck.has(msg.enrollid)) {
        aguardandoAck.get(msg.enrollid)(msg.result);
        aguardandoAck.delete(msg.enrollid);
      }
    });
  },
});

function cadastrarBiometria(id, tipo) {
  const aluno = cacheAlunos.find((a) => a.id === id);
  if (!aluno) return log(`aluno #${id} não encontrado no cache sincronizado — rode "sync" primeiro`);
  if (!canalLeitor) return log("nenhum leitor facial conectado agora");
  if (!["facial", "digital"].includes(tipo)) return log('tipo inválido, use "facial" ou "digital"');

  log(`enviando cadastro de ${tipo} para "${aluno.nome}" (enrollid ${aluno.id})...`);
  canalLeitor.enviar({ cmd: "setuserinfo", enrollid: aluno.id, nome: aluno.nome, tipo });

  aguardandoAck.set(aluno.id, (result) => {
    if (result) {
      aluno.biometriaCadastrada = true;
      aluno.tipoBiometria = tipo;
      log(`confirmado: "${aluno.nome}" está com ${tipo} cadastrada no leitor`);
      const req = http.request(`${CLOUD_URL}/${aluno.id}/biometria-cadastrada`, { method: "POST" }, () => {});
      req.end();
    } else {
      log(`leitor recusou o cadastro de "${aluno.nome}"`);
    }
    avisarEstado();
  });
}

// --- servidor web da telinha ---

const PUBLIC_DIR = path.join(__dirname, "public");
const TIPOS_MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };

const servidorUI = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/estado" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(estadoAtual()));
    return;
  }

  if (url.pathname === "/api/eventos" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ tipo: "estado", ...estadoAtual() })}\n\n`);
    clientesSSE.add(res);
    req.on("close", () => clientesSSE.delete(res));
    return;
  }

  if (url.pathname === "/api/sync" && req.method === "POST") {
    sincronizar({ manual: true });
    res.writeHead(202);
    res.end();
    return;
  }

  if (url.pathname === "/api/cadastrar" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { id, tipo } = JSON.parse(body);
        cadastrarBiometria(Number(id), tipo);
        res.writeHead(202);
      } catch (e) {
        res.writeHead(400);
      }
      res.end();
    });
    return;
  }

  // arquivos estáticos
  let arquivo = url.pathname === "/" ? "/index.html" : url.pathname;
  const caminho = path.join(PUBLIC_DIR, arquivo);
  if (!caminho.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(caminho, (err, conteudo) => {
    if (err) {
      res.writeHead(404);
      return res.end("não encontrado");
    }
    res.writeHead(200, { "Content-Type": TIPOS_MIME[path.extname(caminho)] || "application/octet-stream" });
    res.end(conteudo);
  });
});

servidorUI.listen(PORTA_UI, "127.0.0.1", () => {
  console.log(`\nTela do Fitflow Sync: http://127.0.0.1:${PORTA_UI}\n`);
});

log("Fitflow Sync rodando (substituto do SCA-sincronizador.exe).");
console.log('Comandos no terminal (opcional): "sync" | "buscar <termo>" | "cadastrar <id> facial|digital"\n');

setInterval(() => sincronizar({ manual: false }), INTERVALO_SYNC_MS);
sincronizar({ manual: false });

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (linha) => {
  const [cmd, ...resto] = linha.trim().split(" ");
  if (cmd === "sync") {
    sincronizar({ manual: true });
  } else if (cmd === "buscar") {
    const termo = resto.join(" ").toLowerCase();
    const achados = cacheAlunos.filter((a) => a.nome.toLowerCase().includes(termo) || a.matricula.includes(termo));
    if (!achados.length) console.log("[sync] nenhum aluno encontrado");
    else achados.forEach((a) => console.log(`  #${a.id} ${a.nome} — matrícula ${a.matricula} — biometria: ${a.biometriaCadastrada ? "cadastrada" : "pendente"}`));
  } else if (cmd === "cadastrar") {
    const [idStr, tipo] = resto;
    cadastrarBiometria(Number(idStr), tipo);
  } else if (linha.trim()) {
    console.log('Comando não reconhecido. Use "sync", "buscar <termo>" ou "cadastrar <id> facial|digital".');
  }
});
