# BarbaPlant

App per riconoscere le piante da una foto e sapere se si possono mangiare. Da una foto ricava la specie, una percentuale di salute, due piani di cura (rimedi casalinghi e cure specialistiche) e una scheda di commestibilità con i sosia pericolosi. La collezione resta sul telefono.

**Online**: https://barbaplant.vercel.app — **repo**: `stefanozarfati/barbaplant` — **cartella di lavoro**: `~/Documents/BarbaPlant`

**Utente**: Stefano Zarfati, **non è un programmatore**. Vuole risposte brevi e senza spiegazioni tecniche, passi semplici, e che le cose siano collaudate davvero (non solo lette nel codice) prima di dirgli che funzionano. Per le pubblicazioni vale la regola generale: a lavoro finito e collaudato si fa commit e push su `main` da soli, dicendo poi cosa si è pubblicato e come verificarlo.

## Come è fatta

- `src/App.jsx` — tutta l'interfaccia, un solo file (React + Tailwind, build con Vite)
- `api/analizza.js` — la funzione sul server di Vercel: riceve la foto, interroga Pl@ntNet e Gemini, restituisce JSON
- `src/aggiornamento.js` — il controllo automatico della versione (vedi sotto)
- `vercel.json` — `maxDuration: 60` (insidia nº3) e le regole di cache per `/`, `/index.html`, `/versione.json`, `/manifest.json`
- Le chiavi stanno **solo** nelle variabili d'ambiente di Vercel: `GEMINI_API_KEY`, `PLANTNET_API_KEY`, `ORIGINE_CONSENTITA`

Tre tipi di chiamata, tutte verso `/api/analizza` con un campo `tipo`:
`diagnosi` (specie, salute, cure) · `sicurezza` (commestibilità, tossicità, sosia) · `stagione` (ricalibra le cure).

Chi decide la specie: se `PLANTNET_API_KEY` è presente, **Pl@ntNet** la decide (sopra il 30% di certezza la impone a Gemini, sotto propone tre candidati); Gemini si occupa di salute e cure. Senza quella chiave decide Gemini da solo.

## Stato attuale (aggiornato 2026-10-31)

Tempi misurati sul server vero, tre giri di fila: **diagnosi 2,4-2,7 s · commestibilità 2,3-2,5 s · stagione 1,5-1,7 s**. Prima del 30/10 la commestibilità prendeva una cinquantina di secondi e falliva spesso.

Fatto in precedenza (dal registro dei commit): riconoscimento con Pl@ntNet affiancato a Gemini, pagina di controllo `?prova=1`, scheda sicurezza con sosia e prove di conferma sul campo, foto dal rullino iPhone senza limite di 8 MB, archivio con foto ridotte, identità grafica e schermata di apertura, niente diagnosi finte quando l'identificazione fallisce.

## L'app si aggiorna da sola

Regola fissa per tutte le app di Stefano: deve accorgersi da sola che esiste una versione più recente e aggiornarsi, senza che lui faccia niente. Qui è fatta così (dal 2026-10-31):

- `vite.config.js` calcola un **timbro di versione** al momento della build: su Vercel i primi 7 caratteri del commit, in locale la data e ora. Finisce in due posti: dentro il codice (`__VERSIONE__`) e in `dist/versione.json`, scritto da un piccolo plugin. **Non si aggiorna a mano**, quindi non si può scordare.
- `src/aggiornamento.js` all'apertura, a ogni ritorno in primo piano e al ritorno della rete scarica `versione.json` con `cache: "no-store"`. Se è diverso da quello incorporato, svuota le cache e ricarica — **una volta sola per versione** (bandierina in `sessionStorage`), così non si finisce in un ciclo.
- `vercel.json` mette `no-store, must-revalidate` su `/` **e** su `/index.html` (la regola su `/` è quella che si dimentica: è l'indirizzo che l'app apre davvero), più su `versione.json` e `manifest.json`.
- Se un'analisi è in corso **l'aggiornamento si rimanda** a quando ha finito, altrimenti si butterebbe via la foto. Il conteggio passa da `conPazienza` in App.jsx, unico punto da cui passano tutte e tre le operazioni.
- Nel Profilo c'è una riga "Versione … · si aggiorna da sola": serve per sapere al telefono quale copia sta girando.

**Qui non c'è e non va aggiunto un service worker.** La regola generale ne prevede uno, ma BarbaPlant non l'ha mai avuto: aggiungerlo creerebbe il problema della cache invece di risolverlo. Vite dà già nomi con l'impronta ai file, quindi basta che `index.html` non sia in cache.

**Pubblicare**: qui non serve un `pubblica.sh`. Vercel ricostruisce a ogni push su `main` e il timbro si ricalcola da sé dal commit. Dopo il deploy, verificare con
`curl -sI https://barbaplant.vercel.app/ | grep -i cache-control` e `curl -s https://barbaplant.vercel.app/versione.json`.

## La catena dei modelli: la regola che conta

**Non scegliere i modelli dal nome. Misurare.** I nomi più nuovi di Gemini sono spesso i più lenti, e la quota giornaliera conta quanto la velocità.

Ordine attuale in `api/analizza.js`, deciso su misure vere del 30/10/2026 (scheda commestibilità, foto vera):

| modello | tempo misurato | quota gratuita |
|---|---|---|
| `gemini-3.5-flash-lite` | **2,2 - 3,0 s** | 500 al giorno |
| `gemini-3.1-flash-lite` | 3,2 - 3,4 s | 500 al giorno |
| `gemini-3.6-flash` | 5 - 8 s | 20 al giorno |
| `gemini-3.5-flash` | 5 s | 20 al giorno |

Scartati: `gemini-3.8-flash` (oltre 25 secondi, scadeva sempre), `gemini-3.7-flash` (risponde 503 "high demand"), `gemini-flash-latest` (**162 secondi** misurati), `gemini-2.5-flash` (404, non esiste più per i nuovi utenti).

Prima i Lite perché sono insieme i più rapidi **e** gli unici con quota larga.

**Qualità**: i Lite sono un po' meno precisi sulla specie (su una foto di prova hanno detto *Pinus pinaster* dove il 3.6 diceva *Pinus pinea*). Conta poco finché Pl@ntNet decide la specie. Se Stefano segnala nomi sbagliati, la mossa è rimettere un Flash davanti — accettando che dopo una decina di piante al giorno la quota finisca.

## Insidie (cose che non si indovinano)

1. **Il `thinkingLevel: "low"` va su TUTTI i modelli.** Senza, il modello "ragiona" prima di rispondere: misurati 15,6 secondi con 1639 token di ragionamento contro 7,8 secondi senza, **con la stessa risposta**. Fino al 30/10 era impostato solo su `gemini-3.8`, quindi tutti gli altri pagavano quel prezzo. Il campo `usageMetadata.thoughtsTokenCount` nella risposta di Google dice se è successo.

2. **I modelli Flash hanno 20 richieste al giorno** sul piano gratuito, i Flash-Lite 500. Due chiamate per pianta: con i Flash davanti bastava una decina di piante per esaurirli, e da quel momento ogni analisi attraversava dei 429 prima di arrivare ai Lite. Succede anche durante i collaudi: è facile esaurire un Flash misurando.

3. **`vercel.json` con `maxDuration: 60` è necessario.** Il codice si dà 40 secondi di budget totale: senza quel file la funzione di Vercel viene tagliata molto prima e tutto fallisce a metà. Se si alza `LIMITE_TOTALE` in `api/analizza.js`, va alzato anche `maxDuration`, e viceversa.

4. **Ridurre i pixel della foto non migliora il riconoscimento.** Google conta **gli stessi 1399 token** per una foto da 1024 px e una da 2048 px. Ridurre accorcia solo il caricamento da telefono (1,15 MB → 0,32 MB), e per questo si manda a 1024 px. Non aspettarsi guadagni di qualità da foto più grandi, né perdite da foto più piccole.

5. **Le latenze di Google variano molto** fra una chiamata e l'altra (visto lo stesso modello fare 7,8 s e poi scadere a 25 s). **Servono almeno 3 campioni per modello** prima di concludere qualcosa. Una misura singola non vale.

6. **La cartella `~/Desktop/barbaplant` è una versione VECCHIA dell'app.** Serve solo perché contiene la chiave Gemini di prova nel suo `.env`. Il codice vero è in `~/Documents/BarbaPlant`.

7. **Controllare `git fetch` prima di toccare il codice.** Il 30/10 la copia locale era **12 commit** dietro a `origin/main`: tutto un primo giro di modifiche è stato fatto su codice sorpassato e buttato via. Stefano a volte pubblica da altre strade (ci sono commit "Add files via upload" fatti dall'interfaccia di GitHub), quindi la copia locale non è mai da dare per aggiornata.

8. **Il pannello del browser integrato riporta `visibilityState: "hidden"`** anche quando la scheda è in primo piano. Per questo il controllo della versione al ritorno in primo piano **non si può collaudare lì**: l'evento viene (giustamente) ignorato dalla guardia. Si collauda importando `src/aggiornamento.js` in node con document, window, sessionStorage, caches e fetch finti — 10 scenari, compresi il ciclo di ricaricamenti e l'analisi in corso. Il percorso "all'apertura" invece si vede bene nel browser: `performance.getEntriesByType('navigation')[0].type` diventa `"reload"`.

9. **Pl@ntNet non si può provare in locale**: la sua chiave sta solo su Vercel. Se scade (8 secondi) l'analisi continua comunque con Gemini: la funzione `chiediPlantNet` restituisce `null` e non blocca niente.

## Come collaudare senza Vercel e senza telefono

`api/analizza.js` si importa in node e si chiama con un `req`/`res` finti: così si collauda **il codice vero del server**, non una copia.

```js
process.env.GEMINI_API_KEY = /* da ~/Desktop/barbaplant/.env */;
const handler = (await import('./api/analizza.js')).default;
function finto(){const r={code:0,body:null};r.setHeader=()=>r;r.status=c=>{r.code=c;return r};
  r.json=b=>{r.body=b;return r};r.send=b=>{r.body=b;return r};r.end=()=>r;return r;}
const res = finto();
await handler({ method:'POST', body:{ tipo:'sicurezza', immagine: base64, mediaType:'image/jpeg',
  pianta:{ nome:'Pino domestico', specie:'Pinus pinea' } } }, res);
```

Foto di prova: `sips -Z 1024 -s format jpeg -s formatOptions 82 public/albero-iniziale.png --out prova.jpg`, poi `base64`.

Dal vivo, a app pubblicata: `https://barbaplant.vercel.app/api/analizza?prova=1` interroga ogni modello della catena con una domanda minuscola e stampa codice, tempo in millisecondi e messaggio vero di Google. Le chiavi non vengono mai mostrate. È il primo posto dove guardare quando l'app rallenta.

`npm run build` prima di pubblicare: `node --check` non sa leggere il JSX, quindi la build è l'unico controllo di sintassi su `src/App.jsx`.

## Da decidere con Stefano

- **Precisione della specie**: tenere i Lite davanti (veloce, quota larga) o rimettere un Flash (più preciso, 20 piante al giorno). Vedi la tabella sopra.
