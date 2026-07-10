// Finge ser a nuvem do Fitflow (o que hoje é a nuvem do SCA em sistemasca.com).
// Guarda os alunos em memória e expõe por HTTP simples — é daqui que o
// "Fitflow Sync" vai puxar matrículas novas/atualizadas.
//
// Comandos no terminal:
//   novo <nome>     -> simula uma matrícula nova aparecendo na nuvem
//   listar          -> mostra os alunos e se já tem biometria cadastrada

const http = require("http");
const readline = require("readline");

const PORTA = 4000;
let proximoId = 1;

const alunos = [
  { id: proximoId++, nome: "Marcos Andrade", matricula: "0001", planoAtivo: true, biometriaCadastrada: false },
  { id: proximoId++, nome: "Julia Ferreira", matricula: "0002", planoAtivo: true, biometriaCadastrada: false },
];

const servidor = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/alunos") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(alunos));
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/alunos/") && req.url.endsWith("/biometria-cadastrada")) {
    const id = Number(req.url.split("/")[2]);
    const aluno = alunos.find((a) => a.id === id);
    if (aluno) {
      aluno.biometriaCadastrada = true;
      console.log(`[cloud] recebida confirmação: biometria de "${aluno.nome}" cadastrada`);
      res.writeHead(200);
      res.end("ok");
    } else {
      res.writeHead(404);
      res.end("aluno não encontrado");
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`[cloud] "nuvem Fitflow" simulada em http://127.0.0.1:${PORTA}/alunos`);
  console.log('Digite "novo <nome>" para simular uma matrícula nova, ou "listar" para ver o estado.\n');
});

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (linha) => {
  const [cmd, ...resto] = linha.trim().split(" ");
  if (cmd === "novo") {
    const nome = resto.join(" ") || `Aluno ${proximoId}`;
    const aluno = {
      id: proximoId++,
      nome,
      matricula: String(proximoId).padStart(4, "0"),
      planoAtivo: true,
      biometriaCadastrada: false,
    };
    alunos.push(aluno);
    console.log(`[cloud] novo aluno cadastrado na nuvem: #${aluno.id} ${aluno.nome} (matrícula ${aluno.matricula})`);
  } else if (cmd === "listar") {
    console.table(alunos);
  } else if (linha.trim()) {
    console.log('Comando não reconhecido. Use "novo <nome>" ou "listar".');
  }
});
