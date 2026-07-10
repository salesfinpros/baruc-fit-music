// Script só para validar o fluxo ponta a ponta sem digitar nada manualmente.
// Não faz parte do protótipo em si — é só o "teste automatizado" desta rodada.
const { spawn } = require("child_process");
const path = require("path");

function iniciar(nome, arquivo) {
  const p = spawn(process.execPath, [arquivo], { cwd: __dirname });
  p.stdout.on("data", (d) => process.stdout.write(`${d}`));
  p.stderr.on("data", (d) => process.stderr.write(`[${nome} ERRO] ${d}`));
  return p;
}

(async () => {
  const cloud = iniciar("cloud", "fitflow-cloud-simulador.js");
  await new Promise((r) => setTimeout(r, 800));

  const sync = iniciar("sync", "fitflow-sync.js");
  await new Promise((r) => setTimeout(r, 1000));

  const leitor = iniciar("leitor", "leitor-facial-simulador.js");
  await new Promise((r) => setTimeout(r, 1000));

  // simula o operador buscando e cadastrando a biometria do aluno #1
  sync.stdin.write("buscar Marcos\n");
  await new Promise((r) => setTimeout(r, 500));
  sync.stdin.write("cadastrar 1 facial\n");
  await new Promise((r) => setTimeout(r, 2500));

  // simula uma matrícula nova aparecendo na nuvem, depois sync manual
  cloud.stdin.write("novo Pedro Lima\n");
  await new Promise((r) => setTimeout(r, 500));
  sync.stdin.write("sync\n");
  await new Promise((r) => setTimeout(r, 1500));

  console.log("\n=== FIM DO TESTE AUTOMATIZADO — encerrando processos ===");
  cloud.kill();
  sync.kill();
  leitor.kill();
  process.exit(0);
})();
