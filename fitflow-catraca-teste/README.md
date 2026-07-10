# Teste de integração — catraca de Umirim (serial)

Simula a conversa entre a catraca de Umirim e o gateway do Fitflow **sem precisar de hardware nenhum**, usando TCP local no lugar da porta COM. Quando houver acesso à porta real, é uma troca de uma peça só (ver "Indo para hardware real" abaixo).

## Rodar a simulação agora

Em dois terminais, dentro desta pasta:

```
node catraca-simulador.js
```

```
node fitflow-gateway.js
```

O simulador "passa um cartão" a cada 4 segundos. O gateway recebe, decide (regra de teste: só libera cartão terminado em `42`) e manda o comando de volta. Você vai ver nos dois terminais o pacote indo e voltando, e se o relé 1 (entrada) foi acionado ou não.

Se o gateway não responder em 5 segundos, o simulador acusa `COLETOR OFF-LINE` — esse timeout é real, está descrito no firmware original (`ONLINE.BAS`).

## O que é validado aqui

- O fluxo completo: leitura de cartão → decisão de acesso → comando de relé → confirmação.
- A separação de responsabilidades: quem decide liberar é o "backend" (gateway), não a catraca.
- A resiliência a timeout (catraca não trava esperando resposta pra sempre).

## O que **não** é validado ainda

- O formato exato dos bytes no fio (`protocolo.js` tem uma nota no topo sobre isso — o `ONLINE.BAS` é um `.BAS` tokenizado, não texto puro, então os nomes de campo e o fluxo são confiáveis, mas separadores/larguras exatas precisam ser confirmados contra tráfego real).
- Baud rate, paridade e bits de parada reais da porta COM de Umirim.

## Indo para hardware real (quando tiver acesso a Umirim)

1. **Não gere risco à operação.** O SCA já está usando a porta COM — duas aplicações não conseguem abrir a mesma porta serial ao mesmo tempo. Para não derrubar o sistema em produção, ou (a) teste fora do horário de funcionamento com o SCA fechado, ou (b) use um tap/splitter serial físico para escutar sem tirar o SCA do ar.
2. Descubra a porta no Gerenciador de Dispositivos → "Portas (COM e LPT)".
3. Instale o driver serial: `npm install serialport`
4. Rode **primeiro** o sniffer cru, sem nenhuma suposição de formato:
   ```
   node serial-sniffer.js COM3 9600
   ```
   Passe um cartão de verdade e veja o que chega, em hex e ascii. Compare com o que `protocolo.js` espera e ajuste `CODE_LEN`/`DATE_LEN`/`TIME_LEN`/separadores conforme o que você realmente observar.
5. Só depois disso troque `transporte.js`: em vez de `tcpCliente`, use `serialCliente` (código já deixado comentado no fim do arquivo) — nem `catraca-simulador.js` nem `fitflow-gateway.js` (a lógica de decisão) precisam mudar.

## Arquivos

| Arquivo | Papel |
|---|---|
| `protocolo.js` | Codifica/decodifica os pacotes (leitura de cartão, comando `OC`) |
| `transporte.js` | TCP local hoje; troca para `SerialPort` depois, sem mexer no resto |
| `catraca-simulador.js` | Finge ser a catraca de Umirim |
| `fitflow-gateway.js` | Finge ser o backend do Fitflow decidindo o acesso |
| `serial-sniffer.js` | Ferramenta pronta para o primeiro teste com hardware real |
