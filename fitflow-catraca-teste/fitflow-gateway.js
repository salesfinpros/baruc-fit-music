// Finge ser o gateway do Fitflow: recebe a leitura de cartão da catraca,
// decide se libera (hoje com uma regra local mockada — no Fitflow real
// isso vira uma chamada ao backend consultando matrícula/plano) e responde
// com o comando OC acionando o relé certo.

const { tcpCliente } = require("./transporte");
const { decodeLeitura, encodeOC } = require("./protocolo");

const PORTA = 5050;

// TODO(fitflow): trocar por chamada real, ex.:
//   const resp = await fetch(`${FITFLOW_API}/acesso/verificar`, { method: "POST", body: JSON.stringify({ codigo }) });
//   return resp.ok && (await resp.json()).liberado;
function regraDeAcessoMock(codigo) {
  // regra de teste: matrícula "42" (final do cartão) está com plano ativo
  return codigo.trim().endsWith("42");
}

async function conectar(tentativas = 10) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      return await tcpCliente(PORTA);
    } catch (e) {
      console.log(`[gateway] catraca ainda não disponível (tentativa ${t}/${tentativas})...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("não foi possível conectar ao simulador da catraca");
}

(async () => {
  const canal = await conectar();
  console.log("[gateway] conectado à catraca de Umirim (simulada)\n");

  canal.aoReceber((pacote) => {
    let leitura;
    try {
      leitura = decodeLeitura(pacote);
    } catch (e) {
      console.log("[gateway] pacote não reconhecido:", pacote);
      return;
    }

    console.log(`[gateway] leitura recebida: código="${leitura.codigo}" leitor=${leitura.leitor} data=${leitura.data} hora=${leitura.hora}`);

    const liberado = regraDeAcessoMock(leitura.codigo);
    const resposta = liberado
      ? encodeOC({ rele1Ms: 800, msg: "ACESSO LIBERADO" })
      : encodeOC({ msg: "ACESSO NEGADO" });

    console.log(`[gateway] decisão: ${liberado ? "LIBERAR" : "NEGAR"} -> enviando OC`);
    canal.enviar(resposta);
  });
})();
