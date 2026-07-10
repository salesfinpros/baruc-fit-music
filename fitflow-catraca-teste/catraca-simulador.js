// Finge ser o coletor Trix de Umirim: manda leituras de cartão de tempos em
// tempos e espera o comando OC do "PC" (o gateway do Fitflow) em até 5s —
// exatamente o timeout descrito no ONLINE.BAS. Se estourar, loga
// "COLETOR OFF-LINE", igual ao sistema real faria.

const { tcpServidor } = require("./transporte");
const { encodeLeitura, decodeOC, LEITORES } = require("./protocolo");

const PORTA = 5050;
const TIMEOUT_MS = 5000;

const CARTOES_DE_TESTE = ["000000001234567890123456", "000000000000000000000042", "CARTAOINVALIDODESCONHECI"];
let i = 0;

tcpServidor(PORTA, {
  onConexao(canal) {
    console.log("[catraca] gateway conectado");
    let timer = null;

    canal.aoReceber((linha) => {
      if (timer) clearTimeout(timer);
      try {
        const { rele1Ms, rele2Ms, msg } = decodeOC(linha);
        if (rele1Ms > 0) console.log(`[catraca] RELÉ 1 acionado por ${rele1Ms}ms — giro liberado (entrada)`);
        else if (rele2Ms > 0) console.log(`[catraca] RELÉ 2 acionado por ${rele2Ms}ms — giro liberado (saída)`);
        else console.log("[catraca] nenhum relé acionado — acesso negado");
        if (msg) console.log(`[catraca] display mostra: "${msg}"`);
      } catch (e) {
        console.log("[catraca] resposta não reconhecida:", linha);
      }
    });

    function passarCartao() {
      const codigo = CARTOES_DE_TESTE[i % CARTOES_DE_TESTE.length];
      i++;
      const pacote = encodeLeitura({ codigo, leitor: LEITORES.BA1 });
      console.log(`\n[catraca] cartão passado: "${codigo.trim()}" -> enviando pacote`);
      canal.enviar(pacote);

      timer = setTimeout(() => {
        console.log("[catraca] *** COLETOR OFF-LINE *** (gateway não respondeu em 5s)");
      }, TIMEOUT_MS);
    }

    // simula um cartão passando a cada 4s, como alguém entrando na academia
    setInterval(passarCartao, 4000);
    passarCartao();
  },
});

console.log("Simulador da catraca de Umirim rodando. Ctrl+C para parar.");
