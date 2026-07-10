# Protótipo — Fitflow Sync (substituto do SCA-sincronizador.exe)

Simula o fluxo de São Luís do Curu descrito por você: nuvem → sincronização → busca do aluno → cadastro de facial/digital no leitor. Três peças, três terminais.

## Rodar manualmente

Abra três terminais nesta pasta, nesta ordem:

```
node fitflow-cloud-simulador.js
```
```
node fitflow-sync.js
```
```
node leitor-facial-simulador.js
```

Depois abra **http://127.0.0.1:6070** no navegador — é a tela do Fitflow Sync: status do leitor, botão de sincronizar, busca de aluno e os botões de cadastrar facial/digital. É a cara real que o app vai ter.

Ou, se preferir, dá pra fazer tudo isso digitando no terminal do **fitflow-sync**:

- `buscar Marcos` — mostra os alunos já sincronizados (equivale ao campo de pesquisa do SCA-sincronizador)
- `cadastrar 1 facial` — cadastra a facial do aluno #1 no leitor conectado
- `sync` — força uma sincronização agora (equivale ao botão)

No terminal do **fitflow-cloud-simulador**, digite:

- `novo Pedro Lima` — simula uma matrícula nova aparecendo na nuvem (dá pra ver ela chegar no próximo `sync` do fitflow-sync)
- `listar` — mostra o estado atual dos alunos, incluindo se a biometria já foi confirmada

## Ou rodar tudo de uma vez (demonstração automática)

```
node teste-automatico.js
```

Sobe os três processos, simula um `buscar` + `cadastrar`, depois um `novo` aluno + `sync` manual, e encerra tudo — é só pra ver o fluxo ponta a ponta sem digitar nada.

## O que isso valida

- A separação de papéis: nuvem (cadastro/plano) → sync local (ponte) → leitor (grava template).
- Sincronização automática (aqui a cada 10s, em produção seria 5 min) **e** manual, exatamente como você descreveu o botão do SCA-sincronizador.
- Confirmação de volta: depois que o leitor confirma que gravou o template, o Fitflow Sync avisa a nuvem — isso é novo em relação ao SCA (rastreabilidade de quem já tem biometria cadastrada).

## O que ainda é suposição (precisa do manual real da Topdata)

- `canal-tcp.js` é um TCP local fazendo o papel do WebSocket real do leitor — a troca de mensagens (`reg`, `setuserinfo`, campos `cmd`/`ret`) segue o que a documentação pública da Topdata descreve, mas o **payload exato de cadastro de template facial/digital** (como a imagem/template é enviado, tamanho, formato) só está no manual completo — atrás do cadastro de integrador em integrador.topdata.com.br.
- `fitflow-cloud-simulador.js` é só um mock HTTP — a API real do Fitflow ainda não existe; a forma (`GET /alunos`, campo `biometriaCadastrada`) é um ponto de partida razoável, não uma decisão final.

## Arquivos

| Arquivo | Papel |
|---|---|
| `canal-tcp.js` | Canal JSON sobre TCP local — troca por WebSocket real depois |
| `fitflow-cloud-simulador.js` | Finge ser a nuvem do Fitflow (hoje é a nuvem do SCA) |
| `fitflow-sync.js` | O protótipo em si — puxa da nuvem, busca, cadastra no leitor |
| `leitor-facial-simulador.js` | Finge ser o leitor facial Topdata |
| `teste-automatico.js` | Roda o fluxo inteiro sozinho, só para demonstração |
| `public/` | A telinha (HTML/CSS/JS) que aparece em http://127.0.0.1:6070 |

## Sobre virar executável de verdade

Hoje isso roda com `node arquivo.js` — é só JavaScript. Pra virar um `.exe` instalável no computador de São Luís do Curu (como o `SCA-sincronizador.exe` é hoje), o caminho mais direto é empacotar esse mesmo código com algo como [Electron](https://www.electronjs.org/) ou [Tauri](https://tauri.app/) — a tela já é HTML/CSS/JS, então reaproveita quase tudo; só troca os mocks (`fitflow-cloud-simulador.js` → API real do Fitflow, `leitor-facial-simulador.js` → leitor Topdata de verdade) pelos serviços reais.
