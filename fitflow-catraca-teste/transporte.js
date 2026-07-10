// Abstração de transporte: hoje é TCP local (sem hardware). Quando houver
// acesso à porta COM real de Umirim, troque tcpServidor/tcpCliente por
// serialServidor/serialCliente (ver comentário no fim) — o resto do
// código (protocolo, regra de negócio) não muda uma linha.

const net = require("net");

function tcpServidor(porta, { onConexao }) {
  const servidor = net.createServer((socket) => {
    onConexao(criarCanal(socket));
  });
  servidor.listen(porta, "127.0.0.1", () => {
    console.log(`[transporte] servidor TCP ouvindo em 127.0.0.1:${porta}`);
  });
  return servidor;
}

function tcpCliente(porta, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port: porta, host }, () => {
      resolve(criarCanal(socket));
    });
    socket.once("error", reject);
  });
}

function criarCanal(socket) {
  let buffer = "";
  const ouvintes = [];
  socket.setEncoding("utf8");
  socket.on("error", (err) => {
    console.log(`[transporte] conexão encerrada (${err.code || err.message})`);
  });
  socket.on("data", (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const linha = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (linha.length) ouvintes.forEach((fn) => fn(linha));
    }
  });
  return {
    enviar(msg) {
      socket.write(msg + "\n");
    },
    aoReceber(fn) {
      ouvintes.push(fn);
    },
    fechar() {
      socket.end();
    },
  };
}

module.exports = { tcpServidor, tcpCliente };

// --- Quando for para a porta COM real (precisa: npm install serialport) ---
//
// const { SerialPort } = require("serialport");
// const { ReadlineParser } = require("@serialport/parser-readline");
//
// function serialCliente(caminho, baudRate = 9600) {
//   const porta = new SerialPort({ path: caminho, baudRate });
//   const parser = porta.pipe(new ReadlineParser({ delimiter: "\n" }));
//   const ouvintes = [];
//   parser.on("data", (linha) => ouvintes.forEach((fn) => fn(linha)));
//   return {
//     enviar(msg) { porta.write(msg + "\n"); },
//     aoReceber(fn) { ouvintes.push(fn); },
//     fechar() { porta.close(); },
//   };
// }
// module.exports.serialCliente = serialCliente;
