/* Controllo automatico della versione.
   L'app installata sulla Home di un telefono resta volentieri su una versione
   vecchia: "ricarica la pagina" non e' una cosa che si possa chiedere a chi la
   usa. Quindi l'app se ne accorge da sola e si ricarica.

   Come funziona: al momento della build viene scritto in `dist/versione.json`
   lo stesso timbro che finisce dentro il codice (__VERSIONE__). Se il file sul
   server dice una cosa diversa da quella incorporata, la copia aperta e'
   vecchia: si svuotano le cache e si ricarica una volta sola. */

export const VERSIONE = __VERSIONE__;

const CHIAVE = "bp-versione-ricaricata";
const DISTANZA_MINIMA = 30000; // non interrogare il server piu' di una volta ogni 30 secondi
let ultimoControllo = 0;

/* Le analisi durano qualche secondo: ricaricare proprio mentre Google sta
   rispondendo butterebbe via la foto e il lavoro fatto. Allora si aspetta.
   Tutte e tre le operazioni (diagnosi, commestibilita', stagione) passano da
   `conPazienza` in App.jsx, che segna qui l'inizio e la fine. */
let operazioniInCorso = 0;
let aggiornamentoRimandato = null;

export function segnaOccupato() {
  operazioniInCorso += 1;
}
export function segnaLibero() {
  operazioniInCorso = Math.max(0, operazioniInCorso - 1);
  if (operazioniInCorso === 0 && aggiornamentoRimandato) {
    const versione = aggiornamentoRimandato;
    aggiornamentoRimandato = null;
    applica(versione);
  }
}

async function applica(versione) {
  /* Una bandierina per versione: se il ricaricamento non bastasse (per esempio
     il server sta ancora distribuendo la versione nuova) non si finisce in un
     ciclo di ricaricamenti infiniti. */
  try {
    if (sessionStorage.getItem(CHIAVE) === versione) return;
    sessionStorage.setItem(CHIAVE, versione);
  } catch {
    /* navigazione privata: si ricarica comunque, una volta sola per apertura */
  }
  try {
    if (window.caches) {
      const nomi = await caches.keys();
      await Promise.all(nomi.map((n) => caches.delete(n)));
    }
  } catch {
    /* se le cache non si possono svuotare si ricarica comunque */
  }
  window.location.reload();
}

export async function controllaVersione() {
  if (Date.now() - ultimoControllo < DISTANZA_MINIMA) return;
  ultimoControllo = Date.now();
  let versione;
  try {
    const risposta = await fetch("/versione.json?t=" + Date.now(), { cache: "no-store" });
    if (!risposta.ok) return;
    versione = (await risposta.json()).versione;
  } catch {
    return; // senza rete non si fa niente: l'app continua a funzionare
  }
  if (!versione || versione === VERSIONE) return;
  if (operazioniInCorso > 0) {
    aggiornamentoRimandato = versione; // si aggiorna appena l'analisi ha finito
    return;
  }
  applica(versione);
}

/* All'apertura e ogni volta che l'app torna in primo piano: su un telefono
   l'app non viene mai chiusa davvero, viene solo messa da parte, quindi senza
   questo controllo potrebbe restare vecchia per settimane. */
export function avviaControlloVersione() {
  controllaVersione();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") controllaVersione();
  });
  window.addEventListener("online", () => {
    ultimoControllo = 0; // tornata la rete, si ricontrolla subito
    controllaVersione();
  });
}
