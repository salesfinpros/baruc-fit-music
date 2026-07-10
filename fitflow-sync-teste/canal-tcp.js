// Canal de mensagens JSON, uma por linha, sobre TCP local. Fica no lugar do
// WebSocket real do leitor Topdata (que também troca JSON com campos
// "cmd"/"ret") só pra podermos testar sem hardware. Trocar por WebSocket de
// verdade depois é reescrever só este arquivo — o resto (fitflow-sync.js,
// leitor-facial-simulador.js) fica igual.

const net = require("net");

function servidor(porta, { aoConectar }) {
  const srv = net.createServer((socket) => aoConectar(criarCanal(socket)));
  srv.listen(porta, "127.0.0.1", () => {
    console.log(`[canal] servidor ouvindo em 127.0.0.1:${porta}`);
  });
  return srv;
}

function cliente(porta, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port: porta, host }, () => resolve(criarCanal(socket)));
    socket.once("error", reject);
  });
}

function criarCanal(socket) {
  let buffer = "";
  const ouvintes = [];
  socket.setEncoding("utf8");
  socket.on("error", (err) => console.log(`[canal] conexão encerrada (${err.code || err.message})`));
  socket.on("data", (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const linha = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!linha.length) continue;
      try {
        const msg = JSON.parse(linha);
        ouvintes.forEach((fn) => fn(msg));
      } catch (e) {
        console.log("[canal] mensagem não é JSON válido:", linha);
      }
    }
  });
  return {
    enviar(msgObj) {
      socket.write(JSON.stringify(msgObj) + "\n");
    },
    aoReceber(fn) {
      ouvintes.push(fn);
    },
    fechar() {
      socket.end();
    },
  };
}

module.exports = { servidor, cliente };
