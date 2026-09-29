// api/analizza.js — funzione sul server di Vercel.
// Riceve la foto dall'app, aggiunge la chiave Google (che sta solo qui) e
// interroga Gemini. La chiave non viaggia mai dentro il telefono dell'utente.

// gemini-2.5-flash non e' piu' disponibile per i nuovi utenti (Google, settembre 2026).
const MODELLI = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"];

const SCHEMA = `{
 "nomeComune":"",
 "nomeScientifico":"",
 "salute":0,
 "sintesi":"",
 "problemi":[{"titolo":"","gravita":"lieve|media|grave","descrizione":""}],
 "curaCasalinga":[{"titolo":"","dettaglio":"acqua, luce, potatura o rimedi con cose di casa"}],
 "curaProfessionale":[{"titolo":"","dettaglio":"concime NPK con dose, antiparassitario, substrato o rinvaso"}],
 "consiglioStagionale":""
}`;

function promptDiagnosi(stagione, contesto) {
  return `Sei un botanico e agronomo esperto di ogni tipo di pianta: da appartamento, orto e balcone, ma anche alberi, arbusti, piante spontanee, erbe selvatiche e flora mediterranea ed europea.
Analizza la foto e rispondi SOLO con JSON valido, in italiano, senza testo prima o dopo.
Per riconoscere la specie usa ogni indizio visibile: forma e margine delle foglie, disposizione, corteccia, portamento, fiori, frutti, ambiente.
Se la foto mostra un albero intero o una pianta ripresa da lontano, riconoscila comunque dal portamento e dai dettagli visibili.
Dai SEMPRE l'ipotesi piu' probabile anche se non sei sicuro; in quel caso dillo nella "sintesi" (es. "Probabile leccio: per conferma fotografa una foglia da vicino").
Per alberi e piante in piena terra adatta le cure: niente rinvaso, consigli di potatura, irrigazione e concimazione adatti.
Sii sintetico: "sintesi" massimo 25 parole, ogni "dettaglio" massimo 18 parole. Massimo 2 problemi.
${SCHEMA}
"salute" e' un intero 0-100. Metti 3 voci in curaCasalinga e 3 in curaProfessionale.
Usa nomeComune "Nessuna pianta riconosciuta" (salute 0) SOLO se nella foto non c'e' alcuna pianta.
Stagione attuale: ${stagione || "non indicata"}.
Contesto fornito dall'utente: ${contesto || "nessuno"}.`;
}

// Struttura obbligatoria: Google riempie sempre questi campi, niente risposte a metà.
const VOCE_CURA = {
  type: "OBJECT",
  properties: { titolo: { type: "STRING" }, dettaglio: { type: "STRING" } },
  required: ["titolo", "dettaglio"],
};
const SCHEMA_DIAGNOSI = {
  type: "OBJECT",
  properties: {
    nomeComune: { type: "STRING" },
    nomeScientifico: { type: "STRING" },
    salute: { type: "INTEGER" },
    sintesi: { type: "STRING" },
    problemi: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titolo: { type: "STRING" },
          gravita: { type: "STRING" },
          descrizione: { type: "STRING" },
        },
        required: ["titolo", "descrizione"],
      },
    },
    curaCasalinga: { type: "ARRAY", items: VOCE_CURA },
    curaProfessionale: { type: "ARRAY", items: VOCE_CURA },
    consiglioStagionale: { type: "STRING" },
  },
  required: ["nomeComune", "nomeScientifico", "salute", "sintesi", "curaCasalinga", "curaProfessionale", "consiglioStagionale"],
};
const SCHEMA_STAGIONE = {
  type: "OBJECT",
  properties: {
    consiglioStagionale: { type: "STRING" },
    curaCasalinga: { type: "ARRAY", items: VOCE_CURA },
    curaProfessionale: { type: "ARRAY", items: VOCE_CURA },
  },
  required: ["consiglioStagionale", "curaCasalinga", "curaProfessionale"],
};

const SCHEMA_SICUREZZA = {
  type: "OBJECT",
  properties: {
    certezza: { type: "INTEGER" },
    specieConfermata: { type: "STRING" },
    tossicita: {
      type: "OBJECT",
      properties: {
        livello: { type: "STRING" },
        persone: { type: "STRING" },
        partiTossiche: { type: "STRING" },
      },
      required: ["livello", "persone"],
    },
    commestibilita: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          parte: { type: "STRING" },
          stato: { type: "STRING" },
          nota: { type: "STRING" },
        },
        required: ["parte", "stato"],
      },
    },
    sosia: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { nome: { type: "STRING" }, pericolo: { type: "STRING" }, comeDistinguerlo: { type: "STRING" } },
        required: ["nome", "pericolo", "comeDistinguerlo"],
      },
    },
    proveConferma: { type: "ARRAY", items: { type: "STRING" } },
    usiTradizionali: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titolo: { type: "STRING" },
          dettaglio: { type: "STRING" },
          preparazione: { type: "STRING" },
        },
        required: ["titolo", "dettaglio"],
      },
    },
    cautele: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["certezza", "specieConfermata", "tossicita", "commestibilita", "sosia", "proveConferma"],
};

function promptSicurezza(pianta) {
  const p = pianta || {};
  return `Sei un botanico ed etnobotanico. Nella foto dovrebbe esserci "${p.nome || "pianta non identificata"}" (${p.specie || "specie ignota"}).
Verifica tu stesso l'identificazione guardando la foto, poi compila la scheda di sicurezza.
Rispondi SOLO con JSON valido, in italiano, senza testo prima o dopo.
Regole obbligatorie:
- "certezza": intero 0-100, quanto sei sicuro della specie basandoti solo sulla foto. Sii severo: se vedi poche foglie o manca il fiore, abbassa il valore.
- "specieConfermata": il nome scientifico che ritieni corretto, anche se diverso da quello proposto.
- "tossicita.livello": una parola fra nessuna, lieve, media, alta.
- "commestibilita": una voce per parte (foglie, fiori, frutti, semi, radici, fusto). "stato" e' una fra: commestibile, solo cotta, non commestibile, tossica.
- "sosia": specie con cui si confonde, con il segno pratico che le distingue. Se esiste un sosia velenoso mettilo per primo. Se non ce ne sono, lista vuota.
- "sosia[].pericolo": una parola fra mortale, tossico, innocuo. Pensa soprattutto alle confusioni classiche della raccolta spontanea (es. ombrellifere con cicuta, aglio orsino con colchico o mughetto, borragine con digitale).
- "proveConferma": 2-4 controlli pratici sul campo che la foto non mostra (odore della foglia strofinata, fusto, peluria, macchie, radice o bulbo, habitat). Frasi brevi e operative, es. "Strofina una foglia: deve sapere d'aglio, altrimenti non raccoglierla".
- "usiTradizionali": uso storico o popolare (tisane, decotti, impacchi, succo fresco, cucina). Scrivi sempre "usata tradizionalmente per", mai "cura" o "guarisce" una malattia.
- "usiTradizionali[].preparazione": come si prepara in pratica (es. infuso 10 minuti, decotto, impacco sulla pelle, succo fresco). Indica le quantita' SOLO se "tossicita.livello" e' nessuna o lieve. Se il livello e' media o alta scrivi "nessuna dose indicata: pianta tossica".
- "cautele": 2-4 avvertenze pratiche fra gravidanza e allattamento, allergie, fotosensibilita', uso prolungato, interazione con farmaci. Se non ne conosci, lista vuota.
- Se la pianta e' tossica dillo anche nelle parti indicate come commestibili.
Massimo 6 voci in commestibilita, 3 in sosia, 4 in proveConferma, 4 in usiTradizionali, 4 in cautele. Ogni testo massimo 22 parole.`;
}

function promptStagione(pianta, stagione) {
  const p = pianta || {};
  return `Sei un agronomo. La pianta si chiama "${p.nome || "senza nome"}", specie ${p.specie || "non identificata"}.
Stato di salute rilevato: ${p.salute != null ? p.salute : "sconosciuto"}%. Siamo in ${stagione || "questa stagione"}.
Aggiorna il piano di cura per questa stagione. Rispondi SOLO con JSON valido, in italiano:
{"consiglioStagionale":"tre frasi operative","curaCasalinga":[{"titolo":"","dettaglio":""}],"curaProfessionale":[{"titolo":"","dettaglio":""}]}
Metti 3 voci per ciascuna lista, ogni dettaglio massimo 18 parole.`;
}

// ---------------- Pl@ntNet: riconoscimento specializzato della specie ----------------
// Se la chiave PLANTNET_API_KEY c'e' su Vercel, Pl@ntNet decide CHE pianta e';
// Gemini poi si occupa di salute e cure. Senza chiave tutto funziona come prima.
const SOGLIA_PLANTNET = 0.3; // sotto il 30% Pl@ntNet non decide da solo: propone candidati a Gemini

async function chiediPlantNet(immagine, mediaType) {
  const chiave = process.env.PLANTNET_API_KEY;
  if (!chiave || !immagine) return null;
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), 15000);
  try {
    const modulo = new FormData();
    const dati = Buffer.from(immagine, "base64");
    modulo.append("images", new Blob([dati], { type: mediaType || "image/jpeg" }), "foto.jpg");
    modulo.append("organs", "auto");
    const indirizzo =
      "https://my-api.plantnet.org/v2/identify/all?lang=it&nb-results=3&include-related-images=false&api-key=" +
      encodeURIComponent(chiave);
    const risposta = await fetch(indirizzo, { method: "POST", body: modulo, signal: controllo.signal });
    if (!risposta.ok) return null; // 404 = nessuna pianta trovata; altri errori: si prosegue solo con Gemini
    const json = await risposta.json();
    const risultati = (json.results || []).filter((r) => r && r.species);
    if (!risultati.length) return null;
    const voce = (r) => ({
      nomeComune: (r.species.commonNames || [])[0] || "",
      nomeScientifico: r.species.scientificNameWithoutAuthor || r.species.scientificName || "",
      famiglia: (r.species.family && (r.species.family.scientificNameWithoutAuthor || r.species.family.scientificName)) || "",
      certezza: Math.round((r.score || 0) * 100),
    });
    const [primo, ...altri] = risultati.map(voce);
    return { fonte: "Pl@ntNet", ...primo, alternative: altri.slice(0, 2) };
  } catch {
    return null; // Pl@ntNet lento o non raggiungibile: non blocca l'analisi
  } finally {
    clearTimeout(timer);
  }
}

function contestoPlantNet(pn) {
  if (!pn) return "";
  const nome = (v) => `${v.nomeComune ? v.nomeComune + " " : ""}(${v.nomeScientifico}, ${v.certezza}%)`;
  if (pn.certezza / 100 >= SOGLIA_PLANTNET) {
    return `\nIDENTIFICAZIONE GIA' FATTA da Pl@ntNet, servizio botanico specializzato: ${nome(pn)}.
Usa questa specie per nomeComune e nomeScientifico e basa salute e cure su di essa. Non cambiarla.`;
  }
  const lista = [pn, ...pn.alternative].map(nome).join("; ");
  return `\nPl@ntNet, servizio botanico specializzato, e' incerto. Candidati: ${lista}.
Scegli fra questi quello coerente con la foto (o un altro solo se sei sicuro) e scrivi nella "sintesi" che il riconoscimento e' incerto.`;
}

function unisciPlantNet(testo, pn) {
  if (!pn) return testo;
  let j;
  try { j = JSON.parse(testo); } catch { return testo; }
  if (pn.certezza / 100 >= SOGLIA_PLANTNET) {
    j.nomeScientifico = pn.nomeScientifico;
    if (pn.nomeComune) j.nomeComune = pn.nomeComune;
    else if (!j.nomeComune || /nessuna pianta/i.test(j.nomeComune)) j.nomeComune = pn.nomeScientifico;
  }
  j.identificazione = pn;
  return JSON.stringify(j);
}

export default async function handler(req, res) {
  // Se pubblichi su un dominio tuo, metti quell'indirizzo nella variabile ORIGINE_CONSENTITA
  res.setHeader("Access-Control-Allow-Origin", process.env.ORIGINE_CONSENTITA || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ errore: "Metodo non consentito" });

  const chiave = process.env.GEMINI_API_KEY;
  if (!chiave) {
    return res.status(500).json({ errore: "Manca GEMINI_API_KEY nelle impostazioni di Vercel" });
  }

  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { tipo, immagine, mediaType, contesto, pianta, stagione } = corpo;

  let parti, schema;
  let plantnet = null;
  if (tipo === "sicurezza") {
    if (!immagine) return res.status(400).json({ errore: "Manca la foto da analizzare" });
    parti = [
      { inline_data: { mime_type: mediaType || "image/jpeg", data: immagine } },
      { text: promptSicurezza(pianta) },
    ];
    schema = SCHEMA_SICUREZZA;
  } else if (tipo === "stagione") {
    parti = [{ text: promptStagione(pianta, stagione) }];
    schema = SCHEMA_STAGIONE;
  } else {
    if (!immagine) return res.status(400).json({ errore: "Manca la foto da analizzare" });
    plantnet = await chiediPlantNet(immagine, mediaType);
    parti = [
      { inline_data: { mime_type: mediaType || "image/jpeg", data: immagine } },
      { text: promptDiagnosi(stagione, contesto) + contestoPlantNet(plantnet) },
    ];
    schema = SCHEMA_DIAGNOSI;
  }

  let ultimo = "Nessun modello disponibile";
  let sovraccarico = "";
  // Tempo massimo complessivo: meglio un messaggio chiaro che una rotellina infinita.
  const inizio = Date.now();
  const LIMITE_TOTALE = 55000; // ms per tutti i tentativi
  const LIMITE_MODELLO = 25000; // ms per singolo modello
  for (const modello of MODELLI) {
    const restante = LIMITE_TOTALE - (Date.now() - inizio);
    if (restante < 8000) break;
    const controllo = new AbortController();
    const timer = setTimeout(() => controllo.abort(), Math.min(LIMITE_MODELLO, restante));
    // gemini-3.8-flash: niente temperature (Google chiede di toglierla) e ragionamento "low" per rispondere prima.
    const config38 = modello.startsWith("gemini-3.8");
    try {
      const risposta = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + modello + ":generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": chiave },
          signal: controllo.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: parti }],
            generationConfig: {
              ...(config38 ? { thinkingConfig: { thinkingLevel: "low" } } : { temperature: 0.4 }),
              maxOutputTokens: config38 ? 8000 : tipo === "sicurezza" ? 4000 : 3000,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
        }
      );

      const grezzo = await risposta.text();
      if (!risposta.ok) {
        ultimo = "Google ha risposto " + risposta.status + ": " + grezzo.slice(0, 200);
        // 503 = modello sovraccarico, 429 = troppe richieste, 500 = errore di Google:
        // sono problemi temporanei di quel modello, quindi si prova subito il successivo.
        if (risposta.status === 429 || risposta.status >= 500) {
          ultimo = "Google è sovraccarico in questo momento (" + risposta.status + "): riprova tra un minuto";
          sovraccarico = ultimo;
          continue;
        }
        if (risposta.status === 404 || /not found|not supported|is not available/i.test(grezzo)) continue;
        return res.status(502).json({ errore: ultimo });
      }

      const dati = JSON.parse(grezzo);
      const testo = ((dati.candidates && dati.candidates[0] && dati.candidates[0].content && dati.candidates[0].content.parts) || [])
        .map((x) => x.text || "")
        .join("");

      if (!testo) { ultimo = "Risposta vuota dal modello " + modello; continue; }
      return res.status(200).json({ testo: tipo === "diagnosi" ? unisciPlantNet(testo, plantnet) : testo, modello });
    } catch (e) {
      if (e.name === "AbortError") {
        ultimo = "Google è sovraccarico: il modello " + modello + " non ha risposto in tempo";
        sovraccarico = ultimo;
      } else {
        ultimo = e.message;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  // Se almeno un modello era solo sovraccarico, e' quello il messaggio utile (l'app riprova da sola).
  if (sovraccarico) ultimo = sovraccarico;
  if (plantnet) {
    const nome = plantnet.nomeComune ? `${plantnet.nomeComune} (${plantnet.nomeScientifico})` : plantnet.nomeScientifico;
    ultimo = `Pianta riconosciuta da Pl@ntNet: ${nome}, certezza ${plantnet.certezza}%. Salute e cure non disponibili: ${ultimo}`;
  }
  return res.status(502).json({ errore: ultimo });
}
