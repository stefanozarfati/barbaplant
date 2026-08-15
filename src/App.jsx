import React, { useState, useRef, useMemo, useEffect } from "react";

/* ============================================================
   BarbaPlant — cura e identificazione delle piante
   File unico: App.jsx  (React + Tailwind)
   ============================================================
   NOTE IMPORTANTI
   - I colori sono applicati con style inline (non con classi Tailwind
     tipo bg-[#f4f6f0]) così il file funziona sia in Vite sia in ambienti
     dove Tailwind non compila i valori arbitrari.
   - L'analisi foto tenta una chiamata reale all'API Anthropic; se non
     è disponibile (es. Vite in locale senza proxy/chiave) passa
     automaticamente a una diagnosi simulata coerente.
   - I dati vivono nello state React: chiudendo la pagina si azzerano.
     Per renderli permanenti vedi la nota finale nella risposta.
   ============================================================ */

/* ---------------------- 1. TOKEN VISIVI ---------------------- */

const C = {
  bg: "#f4f6f0",       // sfondo salvia chiarissimo
  testo: "#2d3b2d",    // testo scuro
  primario: "#879b7d", // verde salvia
  salute: "#2e7d32",   // accento stato di salute
  card: "#ffffff",
  soft: "#6b7a68",     // testo secondario
  bordo: "#e4e9dd",
  velo: "#eef2e8",     // riempimenti tenui
  allerta: "#b3541e",  // avvisi / errori
  oro: "#c9a227",      // livello profilo
};

const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

function stagioneCorrente(d = new Date()) {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return "primavera";
  if (m >= 5 && m <= 7) return "estate";
  if (m >= 8 && m <= 10) return "autunno";
  return "inverno";
}

const STAGIONI = {
  primavera: {
    emoji: "🌸",
    titolo: "Primavera",
    claim: "Risveglio: si riprende a concimare e si rinvasa.",
    punti: [
      "Riprendi la concimazione ogni 15 giorni, a mezza dose per il primo mese.",
      "È il momento giusto per rinvasare chi ha le radici che escono dal foro di drenaggio.",
      "Aumenta gradualmente le annaffiature seguendo la nuova vegetazione.",
      "Controlla i germogli teneri: sono il bersaglio preferito degli afidi.",
    ],
  },
  estate: {
    emoji: "☀️",
    titolo: "Estate",
    claim: "Massima crescita, massimo consumo d'acqua.",
    punti: [
      "Annaffia la mattina presto o dopo il tramonto, mai nelle ore calde.",
      "Sposta i vasi dal sole diretto delle 12–16 se le foglie si accartocciano.",
      "Nebulizza le tropicali per alzare l'umidità, evitando i fiori.",
      "Ragnetto rosso in agguato: ambiente secco e caldo è il suo paradiso.",
    ],
  },
  autunno: {
    emoji: "🍂",
    titolo: "Autunno",
    claim: "Si rallenta: meno acqua, ultimo concime.",
    punti: [
      "Riduci le annaffiature di circa un terzo rispetto all'estate.",
      "Ultima concimazione entro fine settembre, poi stop fino a marzo.",
      "Rientra in casa le piante sensibili prima che si scenda sotto i 10 °C.",
      "Pulisci le foglie dalla polvere: con meno luce ogni raggio conta.",
    ],
  },
  inverno: {
    emoji: "❄️",
    titolo: "Inverno",
    claim: "Riposo vegetativo: il rischio numero uno è annaffiare troppo.",
    punti: [
      "Annaffia solo quando i primi 3–4 cm di terra sono asciutti.",
      "Allontana i vasi dai termosifoni e dagli spifferi delle finestre.",
      "Niente concime: le radici ferme non lo assorbono e il terriccio si saluta.",
      "Avvicina le piante alla finestra più luminosa, la luce cala del 60%.",
    ],
  },
};

/* ---------------------- 2. DATI INIZIALI ---------------------- */

const oggiISO = () => new Date().toISOString().slice(0, 10);

function dataLeggibile(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

const PIANTE_INIZIALI = [
  {
    id: "p-monstera",
    nome: "Monstera del salotto",
    specie: "Monstera deliciosa",
    emoji: "🌿",
    foto: null,
    salute: 88,
    dataAggiunta: "2025-03-12",
    diagnosi: {
      nomeComune: "Monstera",
      nomeScientifico: "Monstera deliciosa",
      salute: 88,
      sintesi:
        "Pianta in buona forma. Qualche punta bruna sulle foglie più vecchie: aria secca e acqua troppo calcarea.",
      problemi: [
        { titolo: "Punte brune", gravita: "lieve", descrizione: "Umidità dell'aria bassa e calcare nell'acqua del rubinetto." },
      ],
      curaCasalinga: [
        { titolo: "Acqua a riposo", dettaglio: "Lascia l'acqua in una brocca aperta per 24 ore prima di annaffiare: il cloro evapora e il calcare si deposita sul fondo." },
        { titolo: "Sottovaso con argilla", dettaglio: "Argilla espansa bagnata nel sottovaso, senza che il vaso tocchi l'acqua: alza l'umidità intorno alla pianta." },
        { titolo: "Foglie pulite", dettaglio: "Passa un panno morbido inumidito ogni 15 giorni: più luce assorbita e meno rifugi per il ragnetto rosso." },
      ],
      curaProfessionale: [
        { titolo: "Concime NPK 3-1-2", dettaglio: "Formulazione ricca di azoto per il fogliame, 1 ml/l a ogni seconda annaffiatura da marzo a settembre." },
        { titolo: "Substrato aroide", dettaglio: "Miscela di corteccia di pino 40%, perlite 20%, torba 30%, fibra di cocco 10% al prossimo rinvaso." },
        { titolo: "Tutore in muschio", dettaglio: "Un tutore mantenuto umido stimola le radici aeree e foglie nuove più grandi e fenestrate." },
      ],
      consiglioStagionale: "",
    },
    storico: [
      { data: "2025-03-12", tipo: "aggiunta", salute: 80, nota: "Arrivata a casa, tre foglie ingiallite alla base." },
      { data: "2025-06-02", tipo: "analisi", salute: 88, nota: "Due foglie nuove fenestrate. Punte brune in miglioramento." },
    ],
  },
  {
    id: "p-basilico",
    nome: "Basilico del balcone",
    specie: "Ocimum basilicum",
    emoji: "🌱",
    foto: null,
    salute: 61,
    dataAggiunta: "2025-05-20",
    diagnosi: {
      nomeComune: "Basilico",
      nomeScientifico: "Ocimum basilicum",
      salute: 61,
      sintesi:
        "Fusto che si allunga e foglie piccole: la pianta sta andando a fiore e riceve poca luce diretta.",
      problemi: [
        { titolo: "Filatura", gravita: "media", descrizione: "Poche ore di sole diretto, la pianta si allunga cercando luce." },
        { titolo: "Fioritura precoce", gravita: "media", descrizione: "Le infiorescenze bloccano la produzione di foglie nuove." },
      ],
      curaCasalinga: [
        { titolo: "Cima i fiori", dettaglio: "Taglia le punte fiorite sopra la seconda coppia di foglie: la pianta torna a produrre foglie e si allarga." },
        { titolo: "Sposta al sole", dettaglio: "Servono almeno 5 ore di sole diretto. Sul balcone, il lato est o sud è il posto giusto." },
        { titolo: "Acqua dal basso", dettaglio: "Riempi il sottovaso e svuotalo dopo 20 minuti: le foglie restano asciutte e la peronospora non attecchisce." },
      ],
      curaProfessionale: [
        { titolo: "Concime NPK 5-3-8", dettaglio: "Specifico per aromatiche, ogni 10 giorni a mezza dose: sostiene le foglie senza gonfiarle d'acqua." },
        { titolo: "Vaso da 18 cm", dettaglio: "Il basilico da supermercato sta in 8–10 piante nello stesso pane di terra: dividile in vasi più grandi." },
        { titolo: "Sapone potassico", dettaglio: "Alla prima comparsa di afidi, trattamento serale ogni 5 giorni per tre volte." },
      ],
      consiglioStagionale: "",
    },
    storico: [
      { data: "2025-05-20", tipo: "aggiunta", salute: 70, nota: "Comprato al supermercato, vaso molto stretto." },
      { data: "2025-07-14", tipo: "analisi", salute: 61, nota: "Prime infiorescenze, foglie più piccole." },
    ],
  },
];

/* ---------------------- MEMORIA SUL DISPOSITIVO ---------------------- */

const CHIAVE_ARCHIVIO = "barbaplant:v1";
const HA_ARCHIVIO = (() => {
  try {
    window.localStorage.setItem("bp:test", "1");
    window.localStorage.removeItem("bp:test");
    return true;
  } catch {
    return false;
  }
})();

function leggiArchivio() {
  if (!HA_ARCHIVIO) return null;
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_ARCHIVIO);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch {
    return null;
  }
}
function scriviArchivio(dati) {
  if (!HA_ARCHIVIO) return;
  try {
    window.localStorage.setItem(CHIAVE_ARCHIVIO, JSON.stringify(dati));
  } catch {
    /* memoria piena: si continua senza salvare */
  }
}

/* Riduce la foto prima di spedirla: gli scatti da telefono sono troppo pesanti. */
function ridimensiona(dataUrl, latoMax = 1024, qualita = 0.82) {
  return new Promise((risolvi) => {
    const img = new Image();
    img.onload = () => {
      const scala = Math.min(1, latoMax / Math.max(img.width, img.height));
      if (scala === 1 && dataUrl.length < 900000) return risolvi(dataUrl);
      const tela = document.createElement("canvas");
      tela.width = Math.round(img.width * scala);
      tela.height = Math.round(img.height * scala);
      const ctx = tela.getContext("2d");
      ctx.drawImage(img, 0, 0, tela.width, tela.height);
      try {
        risolvi(tela.toDataURL("image/jpeg", qualita));
      } catch {
        risolvi(dataUrl);
      }
    };
    img.onerror = () => risolvi(dataUrl);
    img.src = dataUrl;
  });
}

/* ---------------------- 3. MOTORE DI ANALISI ---------------------- */

const ESITI_SIMULATI = [
  {
    nomeComune: "Pothos",
    nomeScientifico: "Epipremnum aureum",
    salute: 74,
    sintesi:
      "Pianta vitale ma con foglie basse ingiallite: il terriccio resta bagnato troppo a lungo.",
    problemi: [
      { titolo: "Ingiallimento basale", gravita: "media", descrizione: "Eccesso d'acqua e drenaggio insufficiente." },
      { titolo: "Internodi lunghi", gravita: "lieve", descrizione: "Luce scarsa: i rami si allungano verso la finestra." },
    ],
    curaCasalinga: [
      { titolo: "Prova del dito", dettaglio: "Infila il dito per 3 cm nel terriccio: se esce umido, aspetta ancora due o tre giorni." },
      { titolo: "Svuota il sottovaso", dettaglio: "Dieci minuti dopo l'annaffiatura butta via l'acqua residua: le radici che stagnano marciscono." },
      { titolo: "Taglia e ripianta", dettaglio: "Le talee con due nodi radicano in acqua in due settimane: rimetti le radicate nello stesso vaso per infoltirlo." },
    ],
    curaProfessionale: [
      { titolo: "Concime NPK 20-20-20", dettaglio: "Idrosolubile bilanciato, 0,5 g/l ogni 20 giorni nel periodo vegetativo." },
      { titolo: "Terriccio alleggerito", dettaglio: "Terriccio universale con 30% di perlite e 10% di corteccia per drenare più in fretta." },
      { titolo: "Fungicida a base di rame", dettaglio: "Solo se compaiono macchie scure molli sul colletto, un trattamento sul terriccio." },
    ],
  },
  {
    nomeComune: "Ficus benjamino",
    nomeScientifico: "Ficus benjamina",
    salute: 66,
    sintesi:
      "Caduta di foglie diffusa: la pianta ha subito uno spostamento o una corrente d'aria fredda.",
    problemi: [
      { titolo: "Defogliazione da stress", gravita: "media", descrizione: "Cambio di posizione, sbalzi termici o correnti d'aria." },
      { titolo: "Aria secca", gravita: "lieve", descrizione: "Vicinanza a fonti di calore diretto." },
    ],
    curaCasalinga: [
      { titolo: "Fermo dove sta", dettaglio: "Scegli una posizione e non spostarlo più: il ficus impiega settimane ad adattarsi." },
      { titolo: "Via dagli spifferi", dettaglio: "Almeno un metro da porte, finestre che si aprono spesso e termosifoni." },
      { titolo: "Nebulizzazione mattutina", dettaglio: "Acqua a temperatura ambiente sulla chioma, mai la sera, per non favorire le muffe." },
    ],
    curaProfessionale: [
      { titolo: "Concime NPK 7-3-6", dettaglio: "Per piante verdi da appartamento, ogni 15 giorni da aprile a settembre." },
      { titolo: "Olio bianco minerale", dettaglio: "Contro cocciniglia sui rami legnosi, trattamento in giornata coperta." },
      { titolo: "Rinvaso ogni 2 anni", dettaglio: "Vaso di 4 cm più largo, con strato drenante di argilla espansa sul fondo." },
    ],
  },
  {
    nomeComune: "Sansevieria",
    nomeScientifico: "Dracaena trifasciata",
    salute: 91,
    sintesi:
      "Ottima forma. Foglie turgide e dritte, nessun segno di marciume alla base.",
    problemi: [],
    curaCasalinga: [
      { titolo: "Annaffia poco", dettaglio: "Una volta ogni 3 settimane d'estate, una volta al mese d'inverno. Nel dubbio, salta un turno." },
      { titolo: "Mai acqua nel cuore", dettaglio: "Bagna il terriccio ai bordi del vaso, non al centro della rosetta." },
      { titolo: "Ruota il vaso", dettaglio: "Un quarto di giro ogni due settimane per una crescita dritta e simmetrica." },
    ],
    curaProfessionale: [
      { titolo: "Concime NPK 4-6-8", dettaglio: "Formulazione per succulente, 2 volte l'anno a maggio e a luglio." },
      { titolo: "Substrato per cactacee", dettaglio: "Terriccio con 50% di sabbia silicea o pomice: drenaggio rapido garantito." },
      { titolo: "Vaso in terracotta", dettaglio: "Traspira e asciuga più in fretta della plastica: riduce il rischio di marciume radicale." },
    ],
  },
];

function analisiSimulata(seed = 0) {
  const base = ESITI_SIMULATI[Math.abs(seed) % ESITI_SIMULATI.length];
  return { ...base, consiglioStagionale: STAGIONI[stagioneCorrente()].claim, simulata: true };
}

// Chiude un JSON troncato a metà, così una risposta tagliata resta utilizzabile.
function chiudiJSON(txt) {
  let out = "";
  const pila = [];
  let inStr = false, esc = false;
  for (const ch of txt) {
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === "{" || ch === "[") { pila.push(ch); out += ch; continue; }
    if (ch === "}" || ch === "]") { pila.pop(); out += ch; continue; }
    out += ch;
  }
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  out = out.replace(/,\s*"[^"]*"\s*:?\s*$/, "");
  out = out.replace(/\{\s*"[^"]*"\s*:?\s*$/, "{");
  out = out.replace(/,\s*$/, "");
  while (pila.length) out += pila.pop() === "{" ? "}" : "]";
  return out;
}

function estraiJSON(testo) {
  if (!testo) return null;
  const pulito = testo.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inizio = pulito.indexOf("{");
  if (inizio === -1) return null;
  const fine = pulito.lastIndexOf("}");
  if (fine > inizio) {
    try { return JSON.parse(pulito.slice(inizio, fine + 1)); } catch { /* provo a riparare */ }
  }
  try { return JSON.parse(chiudiJSON(pulito.slice(inizio))); } catch { return null; }
}

const PROMPT_DIAGNOSI = `Sei un agronomo esperto di piante da appartamento, orto e balcone.
Analizza la foto e rispondi SOLO con JSON valido, senza testo prima o dopo, senza backtick. Tutto in italiano.
Sii sintetico: "sintesi" massimo 25 parole, ogni "dettaglio" massimo 18 parole. Massimo 2 problemi.
{
 "nomeComune":"",
 "nomeScientifico":"",
 "salute":0,
 "sintesi":"",
 "problemi":[{"titolo":"","gravita":"lieve|media|grave","descrizione":""}],
 "curaCasalinga":[{"titolo":"","dettaglio":"acqua, luce, potatura o rimedi con cose di casa"}],
 "curaProfessionale":[{"titolo":"","dettaglio":"concime NPK con dose, antiparassitario, substrato o rinvaso"}],
 "consiglioStagionale":""
}
"salute" e' un intero 0-100. Metti 3 voci in curaCasalinga e 3 in curaProfessionale.
Se nella foto non c'e' una pianta: nomeComune "Nessuna pianta riconosciuta", salute 0.`;

/* Configurazione IA. La chiave la inserisce l'utente dal Profilo: non sta nel codice. */
const CFG = { chiave: "", proxy: "" };
const MODELLI_CLAUDE = ["claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];
const MODELLI_GEMINI = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

async function chiamaProxy(contenuto) {
  let ultimo = new Error("Nessun modello disponibile");
  for (const modello of MODELLI_CLAUDE) {
    const risposta = await fetch(CFG.proxy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modello, max_tokens: 1200, messages: [{ role: "user", content: contenuto }] }),
    }).catch((e) => {
      throw new Error("Connessione al proxy non riuscita: " + e.message);
    });
    const corpo = await risposta.text();
    let dati;
    try { dati = JSON.parse(corpo); } catch { throw new Error("Il proxy ha risposto qualcosa di non leggibile: " + corpo.slice(0, 120)); }
    if (dati.error || !dati.content) {
      const msg = String((dati.error && (dati.error.message || dati.error)) || "errore sconosciuto");
      ultimo = new Error("Proxy: " + msg.slice(0, 160));
      if (/model/i.test(msg)) continue;
      throw ultimo;
    }
    return (dati.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }
  throw ultimo;
}

async function chiamaModello(contenuto) {
  if (CFG.proxy) return chiamaProxy(contenuto);
  const risposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: contenuto }],
    }),
  });
  if (!risposta.ok) throw new Error("Risposta del servizio: " + risposta.status);
  const dati = await risposta.json();
  return (dati.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/* Quando l'app e' pubblicata online, la chiave sta sul server: qui non serve. */
let SERVER_DISPONIBILE = true;

async function chiamaServer(corpo) {
  const risposta = await fetch("/api/analizza", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const testo = await risposta.text();
  let dati;
  try { dati = JSON.parse(testo); } catch { throw new Error("Il server ha risposto in modo non leggibile"); }
  if (!risposta.ok || dati.errore) throw new Error(dati.errore || "Errore del server " + risposta.status);
  return dati.testo;
}

async function chiamaGemini(parti) {
  let ultimo = new Error("Nessun modello disponibile");
  for (const modello of MODELLI_GEMINI) {
    const risposta = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + modello + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": CFG.chiave },
        body: JSON.stringify({
          contents: [{ role: "user", parts: parti }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 3000, responseMimeType: "application/json" },
        }),
      }
    ).catch((e) => {
      throw new Error("Connessione a Google non riuscita: " + e.message);
    });

    const corpo = await risposta.text();
    if (!risposta.ok) {
      const saltaModello = risposta.status === 404 || /not found|not supported|is not available/i.test(corpo);
      ultimo = new Error("Google ha risposto " + risposta.status + ": " + corpo.slice(0, 140));
      if (saltaModello) continue;
      throw ultimo;
    }
    let dati;
    try { dati = JSON.parse(corpo); } catch { throw new Error("Risposta di Google non leggibile"); }
    const testo = ((dati.candidates && dati.candidates[0] && dati.candidates[0].content && dati.candidates[0].content.parts) || [])
      .map((x) => x.text || "")
      .join("");
    if (!testo) { ultimo = new Error("Risposta vuota dal modello " + modello); continue; }
    return testo;
  }
  throw ultimo;
}

/* Un solo punto per il testo semplice: usa Gemini se c'e' la chiave, altrimenti Claude. */
async function chiamaTesto(prompt) {
  if (!CFG.proxy && CFG.chiave) return chiamaGemini([{ text: prompt }]);
  return chiamaModello(prompt);
}

function normalizza(json, stagione) {
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => x && x.titolo) : []);
  return {
    nomeComune: json.nomeComune,
    nomeScientifico: json.nomeScientifico || "—",
    salute: typeof json.salute === "number" ? Math.max(0, Math.min(100, Math.round(json.salute))) : 60,
    sintesi: json.sintesi || "",
    problemi: Array.isArray(json.problemi) ? json.problemi.filter((x) => x && x.titolo) : [],
    curaCasalinga: lista(json.curaCasalinga),
    curaProfessionale: lista(json.curaProfessionale),
    consiglioStagionale: json.consiglioStagionale || STAGIONI[stagione].claim,
    simulata: false,
    motore: SERVER_DISPONIBILE ? "Gemini" : CFG.proxy ? "Claude" : CFG.chiave ? "Gemini" : "Claude",
  };
}

async function unTentativo(dataUrl, contesto) {
  const mediaType = dataUrl.slice(5, dataUrl.indexOf(";"));
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const stagione = stagioneCorrente();
  const istruzioni = `${PROMPT_DIAGNOSI}\n\nStagione attuale: ${stagione}.\nContesto fornito dall'utente: ${contesto || "nessuno"}.`;

  let testo;

  if (SERVER_DISPONIBILE) {
    try {
      testo = await chiamaServer({ tipo: "diagnosi", immagine: base64, mediaType, contesto, stagione });
    } catch (e) {
      SERVER_DISPONIBILE = false;
    }
  }

  if (testo) {
    const j = estraiJSON(testo);
    if (!j || !j.nomeComune) throw new Error("Risposta non leggibile");
    return normalizza(j, stagione);
  }

  if (!CFG.proxy && CFG.chiave) {
    testo = await chiamaGemini([
      { inline_data: { mime_type: mediaType, data: base64 } },
      { text: istruzioni },
    ]);
  } else {
    testo = await chiamaModello([
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: istruzioni },
    ]);
  }

  const json = estraiJSON(testo);
  if (!json || !json.nomeComune) throw new Error("Risposta non leggibile");
  return normalizza(json, stagione);
}

async function analizzaFoto(dataUrl, contesto = "") {
  let ultimoErrore;
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    try {
      return await unTentativo(dataUrl, contesto);
    } catch (err) {
      ultimoErrore = err;
    }
  }
  throw ultimoErrore;
}

async function provaProxy(url) {
  const precedente = CFG.proxy;
  CFG.proxy = url.trim();
  try {
    const t = await chiamaProxy('Rispondi solo con {"ok":true}');
    if (!estraiJSON(t)) throw new Error("Risposta inattesa dal proxy");
    return true;
  } catch (e) {
    CFG.proxy = precedente;
    throw e;
  }
}

async function provaChiave(chiave) {
  const precedente = CFG.chiave;
  CFG.chiave = chiave.trim();
  try {
    const t = await chiamaGemini([{ text: 'Rispondi solo con {"ok":true}' }]);
    if (!estraiJSON(t)) throw new Error("Risposta inattesa");
    return true;
  } catch (e) {
    CFG.chiave = precedente;
    throw e;
  }
}

async function ricalibraStagione(pianta, stagione) {
  if (SERVER_DISPONIBILE) {
    try {
      const t = await chiamaServer({ tipo: "stagione", pianta: { nome: pianta.nome, specie: pianta.specie, salute: pianta.salute }, stagione });
      const j = estraiJSON(t);
      if (j) return j;
    } catch (e) {
      SERVER_DISPONIBILE = false;
    }
  }
  const testo = await chiamaTesto(
    `Sei un agronomo. La pianta si chiama "${pianta.nome}", specie ${pianta.specie}. Stato di salute rilevato: ${pianta.salute}%.
Siamo in ${stagione}. Aggiorna il piano di cura per questa stagione.
Rispondi SOLO con JSON valido, in italiano, senza backtick:
{"consiglioStagionale":"tre frasi operative per la stagione","curaCasalinga":[{"titolo":"","dettaglio":""}],"curaProfessionale":[{"titolo":"","dettaglio":""}]}
Metti 3 voci per ciascuna lista.`
  );
  const json = estraiJSON(testo);
  if (!json) throw new Error("Formato non valido");
  return json;
}


/* ---------------------- ICONE A LINEE ---------------------- */

function Svg({ s = 24, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoFoglia = (p) => (
  <Svg {...p}>
    <path d="M4 20C4 11 10 5 20 4c1 10-5 16-16 16z" />
    <path d="M4.5 19.5c3.5-4.5 7-7.5 12-9.5" />
  </Svg>
);
const IcoVaso = (p) => (
  <Svg {...p}>
    <path d="M5.5 10h13l-1.3 8.2a2.5 2.5 0 0 1-2.5 2.1H9.3a2.5 2.5 0 0 1-2.5-2.1L5.5 10z" />
    <path d="M12 10c0-3.3 2.2-5.5 5.5-5.5C17.5 7.8 15.3 10 12 10z" />
    <path d="M12 10C12 7.2 10.1 5.3 7.3 5.3 7.3 8.1 9.2 10 12 10z" />
  </Svg>
);
const IcoBussola = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2 5.2-2z" />
  </Svg>
);
const IcoPersona = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20c.6-3.6 3.5-5.6 7.2-5.6s6.6 2 7.2 5.6" />
  </Svg>
);
const IcoFotocamera = (p) => (
  <Svg {...p}>
    <path d="M3 9.2a2 2 0 0 1 2-2h1.8L8.2 5h7.6l1.4 2.2H19a2 2 0 0 1 2 2v8.3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13.4" r="3.4" />
  </Svg>
);
const IcoCollezione = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M9.2 10v9.5" />
  </Svg>
);
const IcoLibro = (p) => (
  <Svg {...p}>
    <path d="M4 5.6A2.1 2.1 0 0 1 6.1 3.5H19v14H6.1A2.1 2.1 0 0 0 4 19.6z" />
    <path d="M8 7.8h7M8 11.3h7" />
  </Svg>
);

function ScorciatoiaCard({ icona, titolo, sotto, onClick }) {
  return (
    <button onClick={onClick} className="rounded-3xl p-3 text-left transition active:scale-95 shadow-sm"
            style={{ backgroundColor: C.card, border: `1px solid ${C.bordo}` }}>
      <span className="rounded-full flex items-center justify-center mb-2"
            style={{ width: 38, height: 38, backgroundColor: C.velo, color: C.primario }}>
        {icona}
      </span>
      <p className="text-xs font-bold leading-tight" style={{ color: C.testo }}>{titolo}</p>
      {sotto && <p className="text-xs mt-1" style={{ color: C.soft }}>{sotto}</p>}
    </button>
  );
}

function giorniFa(iso) {
  if (!iso) return "mai";
  const g = Math.round((Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000);
  if (g <= 0) return "oggi";
  if (g === 1) return "ieri";
  if (g < 30) return g + " giorni fa";
  if (g < 60) return "un mese fa";
  return Math.round(g / 30) + " mesi fa";
}
function ultimaData(p) {
  if (!p.storico || p.storico.length === 0) return p.dataAggiunta;
  return p.storico[p.storico.length - 1].data;
}

/* ---------------------- 4. COMPONENTI DI BASE ---------------------- */

function coloreSalute(v) {
  if (v >= 75) return C.salute;
  if (v >= 45) return "#c98a1e";
  return C.allerta;
}

function etichettaSalute(v) {
  if (v >= 85) return "In forma";
  if (v >= 70) return "Buona";
  if (v >= 45) return "Da seguire";
  if (v > 0) return "Sofferente";
  return "Da valutare";
}

function AnelloSalute({ valore = 0, dimensione = 92, spessore = 8, mostraEtichetta = true }) {
  const r = (dimensione - spessore) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, valore)) / 100) * c;
  const col = coloreSalute(valore);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dimensione, height: dimensione }}>
      <svg width={dimensione} height={dimensione} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={dimensione / 2} cy={dimensione / 2} r={r} fill="none" stroke={C.velo} strokeWidth={spessore} />
        <circle
          cx={dimensione / 2}
          cy={dimensione / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={spessore}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-bold leading-none" style={{ color: col, fontSize: dimensione * 0.26 }}>
          {valore}%
        </span>
        {mostraEtichetta && (
          <span className="leading-none mt-1" style={{ color: C.soft, fontSize: dimensione * 0.12 }}>
            {etichettaSalute(valore)}
          </span>
        )}
      </div>
    </div>
  );
}

function Spinner({ dimensione = 22, colore = "#ffffff" }) {
  return (
    <span
      className="inline-block rounded-full animate-spin"
      style={{
        width: dimensione,
        height: dimensione,
        border: `2.5px solid ${colore}40`,
        borderTopColor: colore,
      }}
    />
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-3xl shadow-sm ${className}`}
      style={{ backgroundColor: C.card, border: `1px solid ${C.bordo}`, ...style }}
    >
      {children}
    </div>
  );
}

function Bottone({ children, onClick, variante = "pieno", disabled, className = "", type = "button" }) {
  const stili = {
    pieno: { backgroundColor: C.primario, color: "#fff", border: "1px solid transparent" },
    scuro: { backgroundColor: C.testo, color: "#fff", border: "1px solid transparent" },
    vuoto: { backgroundColor: "transparent", color: C.testo, border: `1px solid ${C.bordo}` },
    tenue: { backgroundColor: C.velo, color: C.testo, border: "1px solid transparent" },
  }[variante];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${className}`}
      style={stili}
    >
      {children}
    </button>
  );
}

function Etichetta({ testo, colore = C.primario }) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: colore + "1f", color: colore }}
    >
      {testo}
    </span>
  );
}

function Avviso({ testo, onChiudi }) {
  if (!testo) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm flex items-start gap-2"
      style={{ backgroundColor: C.allerta + "14", color: C.allerta, border: `1px solid ${C.allerta}33` }}
    >
      <span>⚠️</span>
      <span className="flex-1">{testo}</span>
      {onChiudi && (
        <button onClick={onChiudi} className="font-bold opacity-60">
          ✕
        </button>
      )}
    </div>
  );
}

function MiniFoto({ pianta, dimensione = 56, raggio = "rounded-2xl" }) {
  return (
    <div
      className={`${raggio} flex items-center justify-center overflow-hidden shrink-0`}
      style={{ width: dimensione, height: dimensione, backgroundColor: C.velo }}
    >
      {pianta.foto ? (
        <img src={pianta.foto} alt={pianta.nome} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize: dimensione * 0.5 }}>{pianta.emoji || "🪴"}</span>
      )}
    </div>
  );
}

function BloccoCura({ titolo, sottotitolo, icona, voci, colore }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: colore + "12", border: `1px solid ${colore}26` }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icona}</span>
        <div>
          <p className="text-sm font-bold" style={{ color: colore }}>{titolo}</p>
          <p className="text-xs" style={{ color: C.soft }}>{sottotitolo}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-3">
        {voci && voci.length > 0 ? (
          voci.map((v, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 shrink-0 rounded-full" style={{ width: 6, height: 6, backgroundColor: colore }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: C.testo }}>{v.titolo}</p>
                <p className="text-xs leading-relaxed" style={{ color: C.soft }}>{v.dettaglio}</p>
              </div>
            </li>
          ))
        ) : (
          <li className="text-xs" style={{ color: C.soft }}>Nessuna indicazione disponibile.</li>
        )}
      </ul>
    </div>
  );
}

function SchedaDiagnosi({ diagnosi }) {
  if (!diagnosi) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <AnelloSalute valore={diagnosi.salute} />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold leading-tight" style={{ color: C.testo }}>{diagnosi.nomeComune}</p>
          <p className="text-xs italic" style={{ color: C.soft }}>{diagnosi.nomeScientifico}</p>
          <div className="mt-2">
            {diagnosi.simulata
              ? <Etichetta testo="Diagnosi dimostrativa" colore={C.soft} />
              : diagnosi.motore && <Etichetta testo={"Analisi " + diagnosi.motore} colore={C.primario} />}
          </div>
        </div>
      </div>

      {diagnosi.sintesi && (
        <p className="text-sm leading-relaxed" style={{ color: C.testo }}>{diagnosi.sintesi}</p>
      )}

      {diagnosi.problemi && diagnosi.problemi.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.soft }}>Cosa non va</p>
          {diagnosi.problemi.map((p, i) => (
            <div key={i} className="rounded-2xl px-3 py-2" style={{ backgroundColor: C.velo }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold" style={{ color: C.testo }}>{p.titolo}</p>
                <Etichetta
                  testo={p.gravita || "lieve"}
                  colore={p.gravita === "grave" ? C.allerta : p.gravita === "media" ? "#c98a1e" : C.primario}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: C.soft }}>{p.descrizione}</p>
            </div>
          ))}
        </div>
      )}

      <BloccoCura
        titolo="Rimedi casalinghi"
        sottotitolo="Con quello che hai già in casa"
        icona="🏠"
        voci={diagnosi.curaCasalinga}
        colore={C.primario}
      />
      <BloccoCura
        titolo="Cure specialistiche"
        sottotitolo="Prodotti mirati e interventi tecnici"
        icona="🧪"
        voci={diagnosi.curaProfessionale}
        colore={C.salute}
      />

      {diagnosi.consiglioStagionale && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: C.testo }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.primario }}>
            {STAGIONI[stagioneCorrente()].emoji} Nota di stagione
          </p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "#f2f5ee" }}>{diagnosi.consiglioStagionale}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------- 5. APP ---------------------- */

export default function App() {
  const [scheda, setScheda] = useState("bacheca");
  const [piante, setPiante] = useState(() => {
    const salvato = leggiArchivio();
    return salvato && Array.isArray(salvato.piante) ? salvato.piante : PIANTE_INIZIALI;
  });
  const [profilo, setProfilo] = useState(() => {
    const salvato = leggiArchivio();
    return (salvato && salvato.profilo) || { nome: "Giardiniere", avatar: "🧑‍🌾", citta: "Roma" };
  });
  const [chiaveIA, setChiaveIA] = useState("");

  const [indirizzoProxy, setIndirizzoProxy] = useState("");

  function salvaChiave(v) {
    setChiaveIA(v);
    CFG.chiave = v.trim();
  }
  function salvaProxy(v) {
    setIndirizzoProxy(v);
    CFG.proxy = v.trim();
  }

  // flusso analisi in bacheca
  const [fotoCorrente, setFotoCorrente] = useState(null);
  const [contesto, setContesto] = useState("");
  const [analisi, setAnalisi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState("");
  const [salvata, setSalvata] = useState(false);

  // modali
  const [modaleAggiungi, setModaleAggiungi] = useState(false);
  const [piantaAperta, setPiantaAperta] = useState(null); // id

  const inputFotocamera = useRef(null);
  const inputGalleria = useRef(null);
  const carosello = useRef(null);
  const [indiceCard, setIndiceCard] = useState(0);

  function aggiornaIndice(e) {
    const el = e.target;
    const passo = el.clientWidth + 16;
    setIndiceCard(Math.round(el.scrollLeft / passo));
  }

  useEffect(() => {
    scriviArchivio({ piante, profilo });
  }, [piante, profilo]);

  const stagione = stagioneCorrente();
  const analisiTotali = useMemo(
    () => piante.reduce((acc, p) => acc + p.storico.filter((s) => s.tipo === "analisi").length, 0),
    [piante]
  );
  const saluteMedia = useMemo(
    () => (piante.length ? Math.round(piante.reduce((a, p) => a + p.salute, 0) / piante.length) : 0),
    [piante]
  );

  /* ---- gestione file ---- */
  function leggiFile(file) {
    return new Promise((risolvi, rifiuta) => {
      const lettore = new FileReader();
      lettore.onload = () => risolvi(lettore.result);
      lettore.onerror = () => rifiuta(new Error("Non è stato possibile leggere il file."));
      lettore.readAsDataURL(file);
    });
  }

  async function gestisciFoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrore("Il file scelto non è un'immagine. Seleziona una foto in formato JPG o PNG.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrore("La foto supera 8 MB. Scattala di nuovo a risoluzione più bassa.");
      return;
    }
    try {
      const dataUrl = await ridimensiona(await leggiFile(file));
      setFotoCorrente(dataUrl);
      setAnalisi(null);
      setErrore("");
      setSalvata(false);
      setScheda("bacheca");
    } catch (err) {
      setErrore(err.message);
    }
  }

  async function avviaAnalisi() {
    if (!fotoCorrente) return;
    setCaricamento(true);
    setErrore("");
    setAnalisi(null);
    try {
      const esito = await analizzaFoto(fotoCorrente, contesto);
      setAnalisi(esito);
    } catch (err) {
      const ripiego = analisiSimulata(fotoCorrente.length);
      setAnalisi(ripiego);
      setErrore(
        "Il servizio di riconoscimento non ha risposto (" +
          err.message +
          "). Qui sotto trovi una diagnosi dimostrativa."
      );
    } finally {
      setCaricamento(false);
    }
  }

  function salvaAnalisiInCollezione() {
    if (!analisi) return;
    const nuova = {
      id: "p-" + Date.now(),
      nome: analisi.nomeComune,
      specie: analisi.nomeScientifico,
      emoji: "🪴",
      foto: fotoCorrente,
      salute: analisi.salute,
      dataAggiunta: oggiISO(),
      diagnosi: analisi,
      storico: [
        { data: oggiISO(), tipo: "aggiunta", salute: analisi.salute, nota: "Aggiunta dalla diagnosi con foto." },
      ],
    };
    setPiante((p) => [nuova, ...p]);
    setSalvata(true);
  }

  function aggiungiPiantaManuale(dati) {
    const nuova = {
      id: "p-" + Date.now(),
      nome: dati.nome,
      specie: dati.specie || "Specie da identificare",
      emoji: dati.emoji || "🪴",
      foto: dati.foto,
      salute: dati.salute,
      dataAggiunta: oggiISO(),
      diagnosi: null,
      storico: [{ data: oggiISO(), tipo: "aggiunta", salute: dati.salute, nota: dati.nota || "Inserita manualmente." }],
    };
    setPiante((p) => [nuova, ...p]);
    setModaleAggiungi(false);
    setScheda("piante");
  }

  function aggiornaPianta(id, modifica) {
    setPiante((lista) => lista.map((p) => (p.id === id ? { ...p, ...modifica } : p)));
  }

  function eliminaPianta(id) {
    setPiante((lista) => lista.filter((p) => p.id !== id));
    setPiantaAperta(null);
  }

  const piantaSelezionata = piante.find((p) => p.id === piantaAperta) || null;

  /* ---------------------- SCHERMATE ---------------------- */

  const Bacheca = (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold leading-tight" style={{ color: C.testo }}>
          Le nostre piante
        </h1>
        <button
          onClick={() => setModaleAggiungi(true)}
          className="rounded-full flex items-center justify-center shrink-0 text-2xl transition active:scale-90"
          style={{ width: 44, height: 44, backgroundColor: C.primario, color: "#fff" }}
          aria-label="Aggiungi una pianta"
        >
          +
        </button>
      </div>

      {piante.length > 0 ? (
        <div>
          <div
            ref={carosello}
            onScroll={aggiornaIndice}
            className="flex gap-4 overflow-x-auto"
            style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
          >
            {piante.map((p) => (
              <button
                key={p.id}
                onClick={() => setPiantaAperta(p.id)}
                className="text-left"
                style={{ minWidth: "100%", scrollSnapAlign: "start" }}
              >
                <Card className="overflow-hidden">
                  <div className="relative" style={{ height: 190, backgroundColor: C.velo }}>
                    {p.foto ? (
                      <img src={p.foto} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 76 }}>
                        {p.emoji}
                      </div>
                    )}
                    <div
                      className="absolute rounded-3xl shadow-sm flex items-center justify-center"
                      style={{ top: 14, right: 14, padding: 8, backgroundColor: "#ffffffee" }}
                    >
                      <AnelloSalute valore={p.salute} dimensione={84} spessore={8} />
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-base font-bold truncate" style={{ color: C.testo }}>
                      {p.nome} <span className="font-normal" style={{ color: C.soft }}>· {p.specie}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.soft }}>
                      Ultimo aggiornamento: {giorniFa(ultimaData(p))}
                    </p>
                  </div>
                </Card>
              </button>
            ))}
          </div>

          {piante.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {piante.map((_, i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === indiceCard ? 18 : 7,
                    height: 7,
                    backgroundColor: i === indiceCard ? C.primario : C.bordo,
                    transition: "width 250ms",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-4xl">🪴</p>
          <p className="text-sm font-bold mt-3" style={{ color: C.testo }}>La collezione è vuota</p>
          <p className="text-xs mt-1" style={{ color: C.soft }}>
            Scatta una foto o aggiungi una pianta a mano per iniziare a seguirla.
          </p>
        </Card>
      )}

      <div>
        <button
          onClick={() => inputFotocamera.current && inputFotocamera.current.click()}
          className="w-full rounded-full py-4 flex items-center justify-center gap-3 shadow-sm transition active:scale-95"
          style={{ backgroundColor: C.primario, color: "#fff" }}
        >
          <IcoFotocamera s={22} />
          <span className="text-base font-bold tracking-wide">SCATTA UNA FOTO</span>
        </button>
        <button
          onClick={() => inputGalleria.current && inputGalleria.current.click()}
          className="w-full text-center text-xs font-semibold mt-2"
          style={{ color: C.soft }}
        >
          oppure scegli dalla galleria
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ScorciatoiaCard
          icona={<IcoVaso s={20} />}
          titolo="Aggiungi nuova pianta"
          onClick={() => setModaleAggiungi(true)}
        />
        <ScorciatoiaCard
          icona={<IcoCollezione s={20} />}
          titolo="Le mie piante"
          sotto={piante.length + (piante.length === 1 ? " seguita" : " seguite")}
          onClick={() => setScheda("piante")}
        />
        <ScorciatoiaCard
          icona={<IcoLibro s={20} />}
          titolo="Consigli di cura"
          sotto={STAGIONI[stagione].titolo}
          onClick={() => setScheda("esplora")}
        />
      </div>

      {fotoCorrente && (
        <Card className="p-5">
          <p className="text-sm font-bold" style={{ color: C.testo }}>Foto pronta per l'analisi</p>
          <div className="rounded-3xl overflow-hidden mt-3" style={{ border: `1px solid ${C.bordo}` }}>
            <img src={fotoCorrente} alt="Foto da analizzare" className="w-full object-cover" style={{ maxHeight: 260 }} />
          </div>
          <input
            value={contesto}
            onChange={(e) => setContesto(e.target.value)}
            placeholder="Aggiungi un dettaglio: dove sta, da quanto, cosa noti"
            className="w-full mt-3 rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: C.velo, color: C.testo, border: `1px solid ${C.bordo}` }}
          />
          <div className="flex gap-2 mt-3">
            <Bottone onClick={avviaAnalisi} disabled={caricamento} className="flex-1 flex items-center justify-center gap-2">
              {caricamento ? (<><Spinner /> Analisi in corso</>) : "Analizza la pianta"}
            </Bottone>
            <Bottone
              variante="vuoto"
              onClick={() => { setFotoCorrente(null); setAnalisi(null); setErrore(""); setContesto(""); setSalvata(false); }}
            >
              Rimuovi
            </Bottone>
          </div>
        </Card>
      )}

      {errore && <Avviso testo={errore} onChiudi={() => setErrore("")} />}

      {caricamento && (
        <Card className="p-8 flex flex-col items-center gap-3">
          <Spinner dimensione={34} colore={C.primario} />
          <p className="text-sm font-semibold" style={{ color: C.testo }}>Sto leggendo foglie e portamento…</p>
          <p className="text-xs text-center" style={{ color: C.soft }}>
            Identificazione della specie, stato di salute e piano di cura.
          </p>
        </Card>
      )}

      {analisi && !caricamento && (
        <Card className="p-5">
          <SchedaDiagnosi diagnosi={analisi} />
          <div className="mt-4">
            {salvata ? (
              <div className="rounded-2xl px-4 py-3 text-sm text-center font-semibold"
                   style={{ backgroundColor: C.salute + "14", color: C.salute }}>
                Salvata nella collezione ✓
              </div>
            ) : (
              <Bottone variante="scuro" onClick={salvaAnalisiInCollezione} className="w-full">
                Salva nella collezione
              </Bottone>
            )}
          </div>
        </Card>
      )}
    </div>
  );

  const TuttePiante = (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: C.testo }}>La tua collezione</h2>
          <p className="text-sm" style={{ color: C.soft }}>
            {piante.length} {piante.length === 1 ? "pianta seguita" : "piante seguite"}
          </p>
        </div>
        <Bottone onClick={() => setModaleAggiungi(true)}>+ Aggiungi</Bottone>
      </div>

      {piante.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-4xl">🪴</p>
          <p className="text-sm font-bold mt-3" style={{ color: C.testo }}>Qui non c'è ancora niente</p>
          <p className="text-xs mt-1" style={{ color: C.soft }}>
            Aggiungi la prima pianta per seguirne la storia nel tempo.
          </p>
          <div className="mt-4 flex justify-center">
            <Bottone onClick={() => setModaleAggiungi(true)}>Aggiungi una pianta</Bottone>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {piante.map((p) => (
            <Card key={p.id} className="p-4">
              <button onClick={() => setPiantaAperta(p.id)} className="w-full flex items-center gap-4 text-left">
                <MiniFoto pianta={p} dimensione={68} />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold truncate" style={{ color: C.testo }}>{p.nome}</p>
                  <p className="text-xs italic truncate" style={{ color: C.soft }}>{p.specie}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Etichetta testo={etichettaSalute(p.salute)} colore={coloreSalute(p.salute)} />
                    <span className="text-xs" style={{ color: C.soft }}>
                      {p.storico.length} {p.storico.length === 1 ? "voce" : "voci"} nel registro
                    </span>
                  </div>
                </div>
                <AnelloSalute valore={p.salute} dimensione={56} spessore={6} mostraEtichetta={false} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const Esplora = (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: C.testo }}>Esplora</h2>
        <p className="text-sm" style={{ color: C.soft }}>Guide pratiche e calendario di cura.</p>
      </div>

      <Card className="p-5" style={{ backgroundColor: C.testo, border: "none" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.primario }}>
          Cosa fare adesso
        </p>
        <h3 className="text-xl font-bold mt-1" style={{ color: "#f2f5ee" }}>
          {STAGIONI[stagione].emoji} {STAGIONI[stagione].titolo}
        </h3>
        <ul className="mt-3 space-y-2">
          {STAGIONI[stagione].punti.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm" style={{ color: "#dfe6d8" }}>
              <span style={{ color: C.primario }}>—</span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(STAGIONI).map(([chiave, s]) => (
          <Card key={chiave} className="p-4" style={chiave === stagione ? { borderColor: C.primario } : {}}>
            <p className="text-2xl">{s.emoji}</p>
            <p className="text-sm font-bold mt-1" style={{ color: C.testo }}>{s.titolo}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: C.soft }}>{s.claim}</p>
          </Card>
        ))}
      </div>

      <GuidePratiche />
    </div>
  );

  const Profilo = (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <div
          className="mx-auto rounded-full flex items-center justify-center"
          style={{ width: 88, height: 88, backgroundColor: C.velo, fontSize: 44 }}
        >
          {profilo.avatar}
        </div>
        <input
          value={profilo.nome}
          onChange={(e) => setProfilo({ ...profilo, nome: e.target.value })}
          className="mt-3 w-full text-center text-xl font-bold outline-none rounded-xl py-1"
          style={{ color: C.testo, backgroundColor: "transparent" }}
        />
        <p className="text-xs" style={{ color: C.soft }}>{profilo.citta}</p>

        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {["🧑‍🌾", "👩‍🌾", "🌻", "🌵", "🍀", "🦋"].map((a) => (
            <button
              key={a}
              onClick={() => setProfilo({ ...profilo, avatar: a })}
              className="rounded-2xl transition active:scale-90"
              style={{
                width: 42,
                height: 42,
                fontSize: 22,
                backgroundColor: profilo.avatar === a ? C.primario + "33" : C.velo,
                border: profilo.avatar === a ? `1px solid ${C.primario}` : "1px solid transparent",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </Card>

      <LivelloPollice piante={piante.length} analisi={analisiTotali} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { v: piante.length, e: "Piante" },
          { v: analisiTotali, e: "Analisi" },
          { v: saluteMedia + "%", e: "Salute media" },
        ].map((s, i) => (
          <Card key={i} className="p-4 text-center">
            <p className="text-xl font-bold" style={{ color: C.testo }}>{s.v}</p>
            <p className="text-xs mt-1" style={{ color: C.soft }}>{s.e}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm font-bold" style={{ color: C.testo }}>Promemoria di cura</p>
        <p className="text-xs mt-1" style={{ color: C.soft }}>
          In {STAGIONI[stagione].titolo.toLowerCase()} le tue {piante.length} piante seguono questi ritmi.
        </p>
        <div className="mt-3 space-y-2">
          {piante.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2" style={{ backgroundColor: C.velo }}>
              <MiniFoto pianta={p} dimensione={38} />
              <span className="text-sm flex-1 truncate" style={{ color: C.testo }}>{p.nome}</span>
              <span className="text-xs" style={{ color: C.soft }}>
                {stagione === "inverno" ? "acqua ogni 14 gg" : stagione === "estate" ? "acqua ogni 3 gg" : "acqua ogni 7 gg"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <ImpostazioniIA chiave={chiaveIA} onCambia={salvaChiave} proxy={indirizzoProxy} onCambiaProxy={salvaProxy} />

      <Card className="p-5">
        <p className="text-sm font-bold" style={{ color: C.testo }}>Sui dati</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: C.soft }}>
          Le foto restano nel browser per la durata della sessione e non vengono conservate. Le diagnosi sono un
          supporto: per malattie gravi o piante da frutto rivolgiti a un agronomo o a un vivaio di fiducia.
        </p>
      </Card>
    </div>
  );

  /* ---------------------- LAYOUT ---------------------- */

  const SCHEDE = [
    { id: "bacheca", ico: IcoFoglia, testo: "Bacheca" },
    { id: "piante", ico: IcoVaso, testo: "Piante" },
    { id: "esplora", ico: IcoBussola, testo: "Esplora" },
    { id: "profilo", ico: IcoPersona, testo: "Profilo" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: C.bg, color: C.testo, fontFamily: 'ui-rounded, "SF Pro Rounded", "Nunito", "Quicksand", system-ui, sans-serif' }}>
      <input ref={inputFotocamera} type="file" accept="image/*" capture="environment" onChange={gestisciFoto} className="hidden" />
      <input ref={inputGalleria} type="file" accept="image/*" onChange={gestisciFoto} className="hidden" />

      <div className="mx-auto w-full" style={{ maxWidth: 450 }}>
        {/* intestazione */}
        <header
          className="sticky top-0 z-20 px-5 py-3 flex items-center justify-center"
          style={{ backgroundColor: C.bg + "f2", backdropFilter: "blur(8px)" }}
        >
          <p className="text-lg font-bold tracking-wide" style={{ color: C.soft }}>BarbaPlant</p>
        </header>

        <main className="px-5 pt-5" style={{ paddingBottom: 110 }}>
          {scheda === "bacheca" && Bacheca}
          {scheda === "piante" && TuttePiante}
          {scheda === "esplora" && Esplora}
          {scheda === "profilo" && Profilo}
        </main>
      </div>

      {/* navigazione fissa */}
      <nav className="fixed bottom-0 left-0 right-0 z-30" style={{ backgroundColor: C.card, borderTop: `1px solid ${C.bordo}` }}>
        <div className="mx-auto flex" style={{ maxWidth: 450 }}>
          {SCHEDE.map((s) => {
            const attiva = scheda === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScheda(s.id)}
                className="flex-1 py-3 flex flex-col items-center gap-1 transition"
                style={{ color: attiva ? C.salute : C.soft }}
              >
                <s.ico s={23} />
                <span className="text-xs font-semibold">
                  {s.testo}
                  {s.id === "piante" && piante.length > 0 ? ` (${piante.length})` : ""}
                </span>
                <span className="rounded-full" style={{ width: 18, height: 3, backgroundColor: attiva ? C.salute : "transparent" }} />
              </button>
            );
          })}
        </div>
      </nav>

      {modaleAggiungi && (
        <ModaleAggiungi onChiudi={() => setModaleAggiungi(false)} onSalva={aggiungiPiantaManuale} leggiFile={leggiFile} />
      )}

      {piantaSelezionata && (
        <DettaglioPianta
          pianta={piantaSelezionata}
          stagione={stagione}
          onChiudi={() => setPiantaAperta(null)}
          onAggiorna={aggiornaPianta}
          onElimina={eliminaPianta}
          leggiFile={leggiFile}
        />
      )}
    </div>
  );
}

/* ---------------------- 6. LIVELLO PROFILO ---------------------- */

const LIVELLI = [
  { nome: "Germoglio", min: 0, emoji: "🌱" },
  { nome: "Apprendista", min: 3, emoji: "🌿" },
  { nome: "Coltivatore", min: 7, emoji: "🍀" },
  { nome: "Pollice Verde", min: 12, emoji: "🌳" },
  { nome: "Maestro Botanico", min: 20, emoji: "🏆" },
];

function LivelloPollice({ piante, analisi }) {
  const punti = piante * 3 + analisi * 2;
  let indice = 0;
  LIVELLI.forEach((l, i) => { if (punti >= l.min) indice = i; });
  const attuale = LIVELLI[indice];
  const prossimo = LIVELLI[indice + 1];
  const percentuale = prossimo
    ? Math.min(100, Math.round(((punti - attuale.min) / (prossimo.min - attuale.min)) * 100))
    : 100;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.soft }}>Livello</p>
          <p className="text-xl font-bold" style={{ color: C.testo }}>{attuale.emoji} {attuale.nome}</p>
        </div>
        <span className="text-sm font-bold" style={{ color: C.oro }}>{punti} pt</span>
      </div>
      <div className="mt-3 rounded-full overflow-hidden" style={{ backgroundColor: C.velo, height: 10 }}>
        <div
          className="h-full rounded-full"
          style={{ width: percentuale + "%", backgroundColor: C.salute, transition: "width 700ms ease" }}
        />
      </div>
      <p className="text-xs mt-2" style={{ color: C.soft }}>
        {prossimo
          ? `Ancora ${prossimo.min - punti} punti per diventare ${prossimo.nome}. Ogni pianta seguita vale 3 punti, ogni analisi 2.`
          : "Hai raggiunto il livello massimo. Le tue piante ringraziano."}
      </p>
    </Card>
  );
}

const PROXY_SUGGERITO = "https://oservicemeteo-proxy.vercel.app/api/proxy";

function ImpostazioniIA({ chiave, onCambia, proxy, onCambiaProxy }) {
  const [urlProxy, setUrlProxy] = useState(proxy || PROXY_SUGGERITO);
  const [statoProxy, setStatoProxy] = useState("");
  const [msgProxy, setMsgProxy] = useState("");

  const [testo, setTesto] = useState(chiave);
  const [stato, setStato] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [mostra, setMostra] = useState(false);

  async function collegaProxy() {
    setStatoProxy("prova");
    setMsgProxy("");
    try {
      await provaProxy(urlProxy);
      onCambiaProxy(urlProxy);
      setStatoProxy("ok");
      setMsgProxy("Proxy collegato: l'app funziona ora anche fuori da Claude.");
    } catch (e) {
      setStatoProxy("errore");
      setMsgProxy(e.message);
    }
  }
  function staccaProxy() {
    onCambiaProxy("");
    setStatoProxy("");
    setMsgProxy("Proxy scollegato.");
  }

  async function verifica() {
    setStato("prova");
    setMessaggio("");
    try {
      await provaChiave(testo);
      onCambia(testo);
      setStato("ok");
      setMessaggio("Chiave valida: le analisi passano da Google Gemini.");
    } catch (e) {
      setStato("errore");
      setMessaggio(e.message);
    }
  }
  function scollega() {
    setTesto("");
    onCambia("");
    setStato("");
    setMessaggio("Chiave rimossa.");
  }

  const motore = proxy ? "Server Vercel" : chiave ? "Google Gemini" : "Claude interno";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: C.testo }}>Motore di riconoscimento</p>
        <Etichetta testo={motore} colore={proxy || chiave ? C.salute : C.primario} />
      </div>

      <p className="text-xs mt-3 font-bold" style={{ color: C.testo }}>1. Server con la tua chiave (consigliato)</p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: C.soft }}>
        L'indirizzo del tuo proxy su Vercel. La chiave resta sul server, non entra mai nell'app.
      </p>
      <input
        value={urlProxy}
        onChange={(e) => setUrlProxy(e.target.value)}
        placeholder="https://.../api/proxy"
        className="w-full mt-2 rounded-2xl px-4 py-3 text-sm outline-none"
        style={{ backgroundColor: C.velo, color: C.testo, border: `1px solid ${C.bordo}` }}
      />
      <div className="flex gap-2 mt-2">
        <Bottone onClick={collegaProxy} disabled={!urlProxy.trim() || statoProxy === "prova"} className="flex-1 flex items-center justify-center gap-2">
          {statoProxy === "prova" ? <><Spinner /> Prova in corso</> : "Collega il server"}
        </Bottone>
        {proxy && <Bottone variante="vuoto" onClick={staccaProxy}>Stacca</Bottone>}
      </div>
      {msgProxy && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: statoProxy === "errore" ? C.allerta : C.salute }}>{msgProxy}</p>
      )}

      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.bordo}` }}>
        <p className="text-xs font-bold" style={{ color: C.testo }}>2. Chiave Google Gemini (alternativa)</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: C.soft }}>
          Si usa solo se il server sopra non è collegato. Resta su questo dispositivo.
        </p>
        <div className="flex gap-2 mt-2">
          <input
            type={mostra ? "text" : "password"}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="AIza..."
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: C.velo, color: C.testo, border: `1px solid ${C.bordo}` }}
          />
          <button onClick={() => setMostra(!mostra)} className="text-xs font-semibold px-2" style={{ color: C.soft }}>
            {mostra ? "nascondi" : "mostra"}
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <Bottone variante="tenue" onClick={verifica} disabled={!testo.trim() || stato === "prova"} className="flex-1 flex items-center justify-center gap-2">
            {stato === "prova" ? <><Spinner colore={C.testo} /> Verifica in corso</> : "Verifica e collega"}
          </Bottone>
          {chiave && <Bottone variante="vuoto" onClick={scollega}>Scollega</Bottone>}
        </div>
        {messaggio && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: stato === "errore" ? C.allerta : C.salute }}>{messaggio}</p>
        )}
      </div>
    </Card>
  );
}

/* ---------------------- 7. GUIDE PRATICHE ---------------------- */

const GUIDE = [
  {
    icona: "💧",
    titolo: "Quanta acqua serve davvero",
    testo:
      "Non esiste un calendario valido per tutte. Infila il dito nel terriccio per 3 cm: se esce pulito e asciutto, annaffia; se esce umido, aspetta. Bagna finché l'acqua esce dal foro di drenaggio, poi svuota il sottovaso dopo dieci minuti. Il 70% delle piante da appartamento muore per troppa acqua, non per troppo poca.",
  },
  {
    icona: "☀️",
    titolo: "Leggere la luce di casa",
    testo:
      "Mettiti dove sta la pianta a mezzogiorno e guarda la tua ombra sul muro: netta e definita significa luce forte, sfumata significa luce media, quasi assente significa luce scarsa. A un metro dalla finestra la luce è già dimezzata rispetto al davanzale.",
  },
  {
    icona: "🐛",
    titolo: "Riconoscere i parassiti",
    testo:
      "Ragnatele sottili tra i rami e foglie punteggiate: ragnetto rosso. Batuffoli bianchi cotonosi all'ascella delle foglie: cocciniglia farinosa. Piccoli insetti verdi o neri sui germogli teneri: afidi. Melata appiccicosa sulle foglie: quasi sempre cocciniglia o afidi più in alto.",
  },
  {
    icona: "🪴",
    titolo: "Quando rinvasare",
    testo:
      "Le radici escono dal foro di drenaggio, l'acqua scorre via subito senza inzuppare, la pianta si asciuga in un giorno: è ora. Scegli un vaso 3–4 cm più largo, non di più. Meglio a fine inverno o inizio primavera, mai durante la fioritura.",
  },
  {
    icona: "🧪",
    titolo: "Capire i numeri NPK",
    testo:
      "Le tre cifre sull'etichetta sono azoto, fosforo, potassio. Azoto alto (primo numero) per il fogliame, fosforo per radici e fiori, potassio per frutti e resistenza. Le verdi da appartamento vogliono un 3-1-2, le fiorite un 5-10-5, le aromatiche un equilibrato a mezza dose.",
  },
  {
    icona: "✂️",
    titolo: "Potare senza paura",
    testo:
      "Taglia sempre appena sopra un nodo, con forbici pulite con alcol. Rimuovi le foglie secche alla base e cima le punte per stimolare i rami laterali. Su una pianta sana puoi togliere fino a un terzo della chioma senza problemi.",
  },
];

function GuidePratiche() {
  const [aperta, setAperta] = useState(null);
  return (
    <Card className="p-2">
      {GUIDE.map((g, i) => (
        <div key={i} style={{ borderBottom: i < GUIDE.length - 1 ? `1px solid ${C.bordo}` : "none" }}>
          <button
            onClick={() => setAperta(aperta === i ? null : i)}
            className="w-full flex items-center gap-3 px-3 py-4 text-left"
          >
            <span className="text-xl">{g.icona}</span>
            <span className="flex-1 text-sm font-semibold" style={{ color: C.testo }}>{g.titolo}</span>
            <span style={{ color: C.soft, transform: aperta === i ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
              ⌄
            </span>
          </button>
          {aperta === i && (
            <p className="px-3 pb-4 text-sm leading-relaxed" style={{ color: C.soft }}>{g.testo}</p>
          )}
        </div>
      ))}
    </Card>
  );
}

/* ---------------------- 8. MODALE AGGIUNGI PIANTA ---------------------- */

function ModaleAggiungi({ onChiudi, onSalva, leggiFile }) {
  const [nome, setNome] = useState("");
  const [specie, setSpecie] = useState("");
  const [nota, setNota] = useState("");
  const [salute, setSalute] = useState(75);
  const [emoji, setEmoji] = useState("🪴");
  const [foto, setFoto] = useState(null);
  const [errore, setErrore] = useState("");
  const inputFoto = useRef(null);

  async function scegliFoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrore("Serve un'immagine JPG o PNG."); return; }
    try { setFoto(await ridimensiona(await leggiFile(file))); setErrore(""); }
    catch { setErrore("Lettura del file non riuscita. Prova con un'altra foto."); }
  }

  function invia() {
    if (!nome.trim()) { setErrore("Dai un nome alla pianta: ti servirà per ritrovarla."); return; }
    onSalva({ nome: nome.trim(), specie: specie.trim(), nota: nota.trim(), salute, emoji, foto });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "#2d3b2d80" }} onClick={onChiudi}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-4"
        style={{ maxWidth: 450, backgroundColor: C.card, maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: C.testo }}>Aggiungi una pianta</h3>
          <button onClick={onChiudi} className="text-xl" style={{ color: C.soft }}>✕</button>
        </div>

        <Avviso testo={errore} onChiudi={() => setErrore("")} />

        <div className="flex items-center gap-3">
          <button
            onClick={() => inputFoto.current && inputFoto.current.click()}
            className="rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
            style={{ width: 84, height: 84, backgroundColor: C.velo, border: `1px dashed ${C.primario}` }}
          >
            {foto ? <img src={foto} alt="Anteprima" className="w-full h-full object-cover" /> : <span className="text-2xl">📷</span>}
          </button>
          <div className="flex-1">
            <p className="text-xs" style={{ color: C.soft }}>Foto (facoltativa)</p>
            <p className="text-xs mt-1" style={{ color: C.soft }}>Senza foto viene usata l'emoji che scegli qui sotto.</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["🪴", "🌿", "🌵", "🌱", "🌺", "🍋"].map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="rounded-xl"
                  style={{
                    width: 34, height: 34, fontSize: 18,
                    backgroundColor: emoji === e ? C.primario + "33" : C.velo,
                    border: emoji === e ? `1px solid ${C.primario}` : "1px solid transparent",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <input ref={inputFoto} type="file" accept="image/*" onChange={scegliFoto} className="hidden" />

        <Campo etichetta="Nome che le dai tu" valore={nome} onCambia={setNome} placeholder="Es. Ficus dell'ingresso" />
        <Campo etichetta="Specie" valore={specie} onCambia={setSpecie} placeholder="Es. Ficus lyrata" />

        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: C.soft }}>
            Come sta oggi: <span style={{ color: coloreSalute(salute) }}>{salute}% · {etichettaSalute(salute)}</span>
          </p>
          <input type="range" min="0" max="100" value={salute} onChange={(e) => setSalute(Number(e.target.value))} className="w-full" />
        </div>

        <Campo etichetta="Prima nota nel registro" valore={nota} onCambia={setNota} placeholder="Es. regalo di mia sorella, vaso da 20 cm" />

        <div className="flex gap-2 pt-1">
          <Bottone variante="vuoto" onClick={onChiudi} className="flex-1">Annulla</Bottone>
          <Bottone onClick={invia} className="flex-1">Salva nella collezione</Bottone>
        </div>
      </div>
    </div>
  );
}

function Campo({ etichetta, valore, onCambia, placeholder }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color: C.soft }}>{etichetta}</p>
      <input
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
        style={{ backgroundColor: C.velo, color: C.testo, border: `1px solid ${C.bordo}` }}
      />
    </div>
  );
}

/* ---------------------- 9. DETTAGLIO PIANTA ---------------------- */

function DettaglioPianta({ pianta, stagione, onChiudi, onAggiorna, onElimina, leggiFile }) {
  const [vista, setVista] = useState("cura");
  const [caricamento, setCaricamento] = useState(false);
  const [azione, setAzione] = useState("");
  const [errore, setErrore] = useState("");
  const [nota, setNota] = useState("");
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const inputNuovaFoto = useRef(null);

  async function nuovaAnalisi(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setCaricamento(true);
    setAzione("analisi");
    setErrore("");
    try {
      const dataUrl = await ridimensiona(await leggiFile(file));
      let esito;
      try {
        esito = await analizzaFoto(dataUrl, `La pianta si chiama ${pianta.nome}, specie dichiarata ${pianta.specie}.`);
      } catch (err) {
        esito = analisiSimulata(dataUrl.length);
        setErrore("Servizio non raggiungibile: diagnosi dimostrativa (" + err.message + ").");
      }
      onAggiorna(pianta.id, {
        foto: dataUrl,
        salute: esito.salute,
        specie: esito.nomeScientifico !== "—" ? esito.nomeScientifico : pianta.specie,
        diagnosi: esito,
        storico: [
          ...pianta.storico,
          { data: oggiISO(), tipo: "analisi", salute: esito.salute, nota: esito.sintesi || "Nuova analisi con foto." },
        ],
      });
      setVista("cura");
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricamento(false);
      setAzione("");
    }
  }

  async function ricalibra() {
    setCaricamento(true);
    setAzione("stagione");
    setErrore("");
    try {
      let esito;
      try {
        esito = await ricalibraStagione(pianta, stagione);
      } catch (err) {
        esito = {
          consiglioStagionale: STAGIONI[stagione].punti.slice(0, 2).join(" "),
          curaCasalinga: (pianta.diagnosi && pianta.diagnosi.curaCasalinga) || analisiSimulata(0).curaCasalinga,
          curaProfessionale: (pianta.diagnosi && pianta.diagnosi.curaProfessionale) || analisiSimulata(0).curaProfessionale,
        };
        setErrore("Servizio non raggiungibile: consigli di stagione dalla guida interna.");
      }
      const base = pianta.diagnosi || {
        nomeComune: pianta.nome,
        nomeScientifico: pianta.specie,
        salute: pianta.salute,
        sintesi: "",
        problemi: [],
        simulata: true,
      };
      onAggiorna(pianta.id, {
        diagnosi: {
          ...base,
          consiglioStagionale: esito.consiglioStagionale,
          curaCasalinga: esito.curaCasalinga || base.curaCasalinga,
          curaProfessionale: esito.curaProfessionale || base.curaProfessionale,
        },
        storico: [
          ...pianta.storico,
          { data: oggiISO(), tipo: "stagione", salute: pianta.salute, nota: `Piano di cura ricalibrato per ${stagione}.` },
        ],
      });
    } finally {
      setCaricamento(false);
      setAzione("");
    }
  }

  function aggiungiNota() {
    if (!nota.trim()) return;
    onAggiorna(pianta.id, {
      storico: [...pianta.storico, { data: oggiISO(), tipo: "nota", salute: pianta.salute, nota: nota.trim() }],
    });
    setNota("");
  }

  function cambiaSalute(v) {
    onAggiorna(pianta.id, {
      salute: v,
      storico: [...pianta.storico, { data: oggiISO(), tipo: "controllo", salute: v, nota: "Stato aggiornato a mano." }],
    });
  }

  const iconaEvento = { aggiunta: "🌱", analisi: "🔍", nota: "✏️", stagione: "🔄", controllo: "📋" };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ backgroundColor: C.bg }}>
      <input ref={inputNuovaFoto} type="file" accept="image/*" onChange={nuovaAnalisi} className="hidden" />
      <div className="mx-auto w-full" style={{ maxWidth: 450 }}>
        <div className="relative">
          <div style={{ height: 220, backgroundColor: C.velo }} className="flex items-center justify-center overflow-hidden">
            {pianta.foto ? (
              <img src={pianta.foto} alt={pianta.nome} className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontSize: 84 }}>{pianta.emoji}</span>
            )}
          </div>
          <button
            onClick={onChiudi}
            className="absolute top-4 left-4 rounded-full flex items-center justify-center shadow-sm"
            style={{ width: 38, height: 38, backgroundColor: C.card, color: C.testo }}
          >
            ←
          </button>
        </div>

        <div className="px-5 pb-24 -mt-8 relative">
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold leading-tight" style={{ color: C.testo }}>{pianta.nome}</h2>
                <p className="text-xs italic" style={{ color: C.soft }}>{pianta.specie}</p>
                <p className="text-xs mt-2" style={{ color: C.soft }}>
                  Nella collezione dal {dataLeggibile(pianta.dataAggiunta)}
                </p>
              </div>
              <AnelloSalute valore={pianta.salute} dimensione={78} spessore={7} />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Bottone
                onClick={() => inputNuovaFoto.current && inputNuovaFoto.current.click()}
                disabled={caricamento}
                className="flex items-center justify-center gap-2"
              >
                {caricamento && azione === "analisi" ? <Spinner /> : "🔍"} Nuova analisi
              </Bottone>
              <Bottone
                variante="tenue"
                onClick={ricalibra}
                disabled={caricamento}
                className="flex items-center justify-center gap-2"
              >
                {caricamento && azione === "stagione" ? <Spinner colore={C.testo} /> : STAGIONI[stagione].emoji} Adatta alla stagione
              </Bottone>
            </div>
          </Card>

          {errore && <div className="mt-3"><Avviso testo={errore} onChiudi={() => setErrore("")} /></div>}

          <div className="flex gap-2 mt-4">
            {[
              { id: "cura", t: "Piano di cura" },
              { id: "storia", t: "Registro" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVista(v.id)}
                className="flex-1 rounded-2xl py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: vista === v.id ? C.testo : "transparent",
                  color: vista === v.id ? "#fff" : C.soft,
                  border: vista === v.id ? "1px solid transparent" : `1px solid ${C.bordo}`,
                }}
              >
                {v.t}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {vista === "cura" ? (
              pianta.diagnosi ? (
                <Card className="p-5"><SchedaDiagnosi diagnosi={pianta.diagnosi} /></Card>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-3xl">🔍</p>
                  <p className="text-sm font-bold mt-2" style={{ color: C.testo }}>Nessuna diagnosi ancora</p>
                  <p className="text-xs mt-1" style={{ color: C.soft }}>
                    Scatta una foto per ottenere identificazione, stato di salute e piano di cura.
                  </p>
                </Card>
              )
            ) : (
              <div className="space-y-3">
                <Card className="p-5">
                  <p className="text-sm font-bold" style={{ color: C.testo }}>Aggiorna lo stato</p>
                  <p className="text-xs mt-1" style={{ color: C.soft }}>
                    Sposta il cursore se noti un miglioramento o un peggioramento: il valore finisce nel registro.
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pianta.salute}
                    onChange={(e) => cambiaSalute(Number(e.target.value))}
                    className="w-full mt-3"
                  />
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-bold" style={{ color: C.testo }}>Aggiungi una nota</p>
                  <div className="flex gap-2 mt-2">
                    <input
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && aggiungiNota()}
                      placeholder="Es. rinvasata, foglia nuova, trattata contro afidi"
                      className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{ backgroundColor: C.velo, color: C.testo, border: `1px solid ${C.bordo}` }}
                    />
                    <Bottone onClick={aggiungiNota}>Salva</Bottone>
                  </div>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-bold mb-3" style={{ color: C.testo }}>Storia della pianta</p>
                  <div className="space-y-4">
                    {[...pianta.storico].reverse().map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className="rounded-full flex items-center justify-center text-sm"
                            style={{ width: 30, height: 30, backgroundColor: C.velo }}
                          >
                            {iconaEvento[s.tipo] || "•"}
                          </span>
                          {i < pianta.storico.length - 1 && (
                            <span style={{ width: 1, flex: 1, backgroundColor: C.bordo, marginTop: 4 }} />
                          )}
                        </div>
                        <div className="pb-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold" style={{ color: C.soft }}>{dataLeggibile(s.data)}</p>
                            <span className="text-xs font-bold" style={{ color: coloreSalute(s.salute) }}>{s.salute}%</span>
                          </div>
                          <p className="text-sm mt-1 leading-relaxed" style={{ color: C.testo }}>{s.nota}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  {confermaEliminazione ? (
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.testo }}>
                        Rimuovere {pianta.nome} dalla collezione?
                      </p>
                      <p className="text-xs mt-1" style={{ color: C.soft }}>Il registro va perso e non si recupera.</p>
                      <div className="flex gap-2 mt-3">
                        <Bottone variante="vuoto" onClick={() => setConfermaEliminazione(false)} className="flex-1">
                          Tieni la pianta
                        </Bottone>
                        <button
                          onClick={() => onElimina(pianta.id)}
                          className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold"
                          style={{ backgroundColor: C.allerta, color: "#fff" }}
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfermaEliminazione(true)}
                      className="text-sm font-semibold"
                      style={{ color: C.allerta }}
                    >
                      Rimuovi dalla collezione
                    </button>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
