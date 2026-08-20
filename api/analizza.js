// api/analizza.js — funzione sul server di Vercel.
// Riceve la foto dall'app, aggiunge la chiave Google (che sta solo qui) e
// interroga Gemini. La chiave non viaggia mai dentro il telefono dell'utente.

const MODELLI = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

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
  return `Sei un agronomo esperto di piante da appartamento, orto e balcone.
Analizza la foto e rispondi SOLO con JSON valido, in italiano, senza testo prima o dopo.
Sii sintetico: "sintesi" massimo 25 parole, ogni "dettaglio" massimo 18 parole. Massimo 2 problemi.
${SCHEMA}
"salute" e' un intero 0-100. Metti 3 voci in curaCasalinga e 3 in curaProfessionale.
Se nella foto non c'e' una pianta: nomeComune "Nessuna pianta riconosciuta", salute 0.
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
        animali: { type: "STRING" },
        partiTossiche: { type: "STRING" },
      },
      required: ["livello", "persone", "animali"],
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
        properties: { nome: { type: "STRING" }, comeDistinguerlo: { type: "STRING" } },
        required: ["nome", "comeDistinguerlo"],
      },
    },
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
  required: ["certezza", "specieConfermata", "tossicita", "commestibilita"],
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
- "tossicita.animali": rischio per cani e gatti.
- "commestibilita": una voce per parte (foglie, fiori, frutti, semi, radici, fusto). "stato" e' una fra: commestibile, solo cotta, non commestibile, tossica.
- "sosia": specie con cui si confonde, con il segno pratico che le distingue. Se esiste un sosia velenoso mettilo per primo. Se non ce ne sono, lista vuota.
- "usiTradizionali": uso storico o popolare (tisane, decotti, impacchi, succo fresco, cucina). Scrivi sempre "usata tradizionalmente per", mai "cura" o "guarisce" una malattia.
- "usiTradizionali[].preparazione": come si prepara in pratica (es. infuso 10 minuti, decotto, impacco sulla pelle, succo fresco). Indica le quantita' SOLO se "tossicita.livello" e' nessuna o lieve. Se il livello e' media o alta scrivi "nessuna dose indicata: pianta tossica".
- "cautele": 2-4 avvertenze pratiche fra gravidanza e allattamento, allergie, fotosensibilita', uso prolungato, interazione con farmaci. Se non ne conosci, lista vuota.
- Se la pianta e' tossica dillo anche nelle parti indicate come commestibili.
Massimo 6 voci in commestibilita, 3 in sosia, 4 in usiTradizionali, 4 in cautele. Ogni testo massimo 22 parole.`;
}

function promptStagione(pianta, stagione) {
  const p = pianta || {};
  return `Sei un agronomo. La pianta si chiama "${p.nome || "senza nome"}", specie ${p.specie || "non identificata"}.
Stato di salute rilevato: ${p.salute != null ? p.salute : "sconosciuto"}%. Siamo in ${stagione || "questa stagione"}.
Aggiorna il piano di cura per questa stagione. Rispondi SOLO con JSON valido, in italiano:
{"consiglioStagionale":"tre frasi operative","curaCasalinga":[{"titolo":"","dettaglio":""}],"curaProfessionale":[{"titolo":"","dettaglio":""}]}
Metti 3 voci per ciascuna lista, ogni dettaglio massimo 18 parole.`;
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
    parti = [
      { inline_data: { mime_type: mediaType || "image/jpeg", data: immagine } },
      { text: promptDiagnosi(stagione, contesto) },
    ];
    schema = SCHEMA_DIAGNOSI;
  }

  let ultimo = "Nessun modello disponibile";
  for (const modello of MODELLI) {
    try {
      const risposta = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + modello + ":generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": chiave },
          body: JSON.stringify({
            contents: [{ role: "user", parts: parti }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: tipo === "sicurezza" ? 4000 : 3000,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
        }
      );

      const grezzo = await risposta.text();
      if (!risposta.ok) {
        ultimo = "Google ha risposto " + risposta.status + ": " + grezzo.slice(0, 200);
        if (risposta.status === 404 || /not found|not supported|is not available/i.test(grezzo)) continue;
        return res.status(502).json({ errore: ultimo });
      }

      const dati = JSON.parse(grezzo);
      const testo = ((dati.candidates && dati.candidates[0] && dati.candidates[0].content && dati.candidates[0].content.parts) || [])
        .map((x) => x.text || "")
        .join("");

      if (!testo) { ultimo = "Risposta vuota dal modello " + modello; continue; }
      return res.status(200).json({ testo, modello });
    } catch (e) {
      ultimo = e.message;
    }
  }

  return res.status(502).json({ errore: ultimo });
}
