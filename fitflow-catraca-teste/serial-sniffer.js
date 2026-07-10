// Uso futuro, quando houver acesso à porta COM real de Umirim.
// Não assume NADA sobre o formato do pacote — só abre a porta e mostra
// cru (hex + texto) tudo que chegar. Isso é o primeiro teste real a fazer
// no local: confirma se a leitura bate com o que reconstruímos em
// protocolo.js antes de confiarmos nele para acionar relé de verdade.
//
// Requer: npm install serialport
//
// Uso: node serial-sniffer.js COM3 9600

const path = process.argv[2];
const baudRate = Number(process.argv[3] || 9600);

if (!path) {
  console.log("Uso: node serial-sniffer.js <PORTA_COM> [BAUD_RATE]");
  console.log("Exemplo: node serial-sniffer.js COM3 9600");
  console.log("\nDica: no Gerenciador de Dispositivos do Windows, em 'Portas (COM e LPT)',");
  console.log("veja qual porta está associada à catraca (geralmente um adaptador USB-Serial).");
  process.exit(1);
}

let SerialPort;
try {
  ({ SerialPort } = require("serialport"));
} catch (e) {
  console.error("Pacote 'serialport' não instalado. Rode: npm install serialport");
  process.exit(1);
}

const porta = new SerialPort({ path, baudRate });

porta.on("open", () => {
  console.log(`Porta ${path} aberta a ${baudRate} baud. Escutando (Ctrl+C para parar)...`);
  console.log("IMPORTANTE: se o SCA já estiver rodando e usando essa porta, esta conexão vai falhar");
  console.log("(a porta serial só aceita um dono por vez) — pare o SCA antes, ou use um tap/splitter físico.\n");
});

porta.on("data", (chunk) => {
  const hex = chunk.toString("hex").match(/../g)?.join(" ") ?? "";
  const ascii = chunk.toString("latin1").replace(/[^\x20-\x7E]/g, ".");
  console.log(`[${new Date().toISOString()}] HEX: ${hex}`);
  console.log(`  ASCII: ${ascii}`);
});

porta.on("error", (err) => {
  console.error("Erro na porta serial:", err.message);
});
