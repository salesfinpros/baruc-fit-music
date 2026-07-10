// Finge ser o leitor facial Topdata de São Luís do Curu. No protocolo real
// é ele quem inicia a conexão (é o "cliente" do WebSocket) e manda "reg" —
// reproduzido aqui em cima do canal TCP local.

const { cliente } = require("./canal-tcp");

const PORTA = 6060;

async function conectar(tentativas = 10) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      return await cliente(PORTA);
    } catch (e) {
      console.log(`[leitor] Fitflow Sync ainda não disponível (tentativa ${t}/${tentativas})...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("não foi possível conectar ao Fitflow Sync");
}

(async () => {
  const canal = await conectar();
  console.log("[leitor] conectado — enviando reg");
  canal.enviar({ cmd: "reg" });

  canal.aoReceber((msg) => {
    if (msg.ret === "reg") {
      console.log("[leitor] registro confirmado pelo servidor\n");
      return;
    }

    if (msg.cmd === "setuserinfo") {
      const { enrollid, nome, tipo } = msg;
      console.log(`[leitor] recebido cadastro: enrollid=${enrollid} nome="${nome}" tipo=${tipo}`);
      console.log(`[leitor] gravando template (${tipo})...`);
      setTimeout(() => {
        console.log(`[leitor] template de "${nome}" gravado com sucesso\n`);
        canal.enviar({ ret: "setuserinfo", enrollid, result: true });
      }, 1200); // simula o tempo de captura/gravação do template
      return;
    }

    console.log("[leitor] mensagem não reconhecida:", msg);
  });
})();

console.log("Simulador do leitor facial (São Luís do Curu) rodando. Ctrl+C para parar.");
