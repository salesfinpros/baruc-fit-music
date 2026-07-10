// Protocolo do coletor Trix (catraca Umirim), reconstruído a partir do
// ONLINE.BAS encontrado em C:\SistemaSCA. O arquivo é um .BAS tokenizado
// (não texto puro), então os NOMES DOS CAMPOS e o FLUXO abaixo são
// confiáveis (vieram dos comentários preservados no tokenizado), mas o
// EMPACOTAMENTO EXATO EM BYTES (separadores, larguras) é a nossa melhor
// leitura e deve ser confirmado assim que houver acesso real à porta COM
// de Umirim — use serial-sniffer.js para isso antes de confiar cegamente
// nestas larguras em produção.

const CODE_LEN = 26; // "código lido com 26 caracteres" (completa com brancos)
const DATE_LEN = 6; // DDMMAA
const TIME_LEN = 6; // HHMMSS

const LEITORES = {
  TECLADO: "1",
  BA1: "2",
  BA2: "3",
  MG1: "4",
  MG2: "5",
};

function pad(str, len) {
  return str.toString().slice(0, len).padEnd(len, " ");
}

function hojeDDMMAA() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${aa}`;
}

function agoraHHMMSS() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}${mi}${ss}`;
}

// Coletor -> PC: leitura de cartão/crachá.
// TX$ = "O" + código(26) + leitor(1) + data(6) + hora(6) + reservado(10)
function encodeLeitura({ codigo, leitor = LEITORES.BA1, data = hojeDDMMAA(), hora = agoraHHMMSS() }) {
  return "O" + pad(codigo, CODE_LEN) + leitor + pad(data, DATE_LEN) + pad(hora, TIME_LEN) + "0".repeat(10);
}

function decodeLeitura(pacote) {
  if (!pacote.startsWith("O")) throw new Error(`Pacote não começa com 'O': ${pacote}`);
  let i = 1;
  const codigo = pacote.slice(i, i + CODE_LEN).trimEnd();
  i += CODE_LEN;
  const leitor = pacote.slice(i, i + 1);
  i += 1;
  const data = pacote.slice(i, i + DATE_LEN);
  i += DATE_LEN;
  const hora = pacote.slice(i, i + TIME_LEN);
  return { codigo, leitor, data, hora };
}

// PC -> Coletor: comando OC (aciona relé / mostra mensagem).
// Formato provisório para teste de lógica: "OC;REL1=<ms>;REL2=<ms>;MSG=<texto>"
// (o byte-a-byte real do XTM Quick ainda não foi confirmado — ver aviso no topo do arquivo)
function encodeOC({ rele1Ms = 0, rele2Ms = 0, msg = "" }) {
  return `OC;REL1=${rele1Ms};REL2=${rele2Ms};MSG=${msg}`;
}

function decodeOC(comando) {
  if (!comando.startsWith("OC;")) throw new Error(`Comando não é OC: ${comando}`);
  const partes = Object.fromEntries(
    comando
      .slice(3)
      .split(";")
      .map((p) => p.split("="))
      .map(([k, v]) => [k, v])
  );
  return {
    rele1Ms: Number(partes.REL1 || 0),
    rele2Ms: Number(partes.REL2 || 0),
    msg: partes.MSG || "",
  };
}

module.exports = {
  CODE_LEN,
  DATE_LEN,
  TIME_LEN,
  LEITORES,
  encodeLeitura,
  decodeLeitura,
  encodeOC,
  decodeOC,
};
