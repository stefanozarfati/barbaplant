# BarbaPlant

App per la cura e l'identificazione delle piante. Riconosce la specie da una foto,
assegna una percentuale di salute e propone due piani di cura: rimedi casalinghi
e cure specialistiche. La collezione resta salvata sul dispositivo.

## Come è fatta

- `src/App.jsx` — tutta l'interfaccia (React + Tailwind)
- `api/analizza.js` — funzione sul server: riceve la foto e interroga Google Gemini
- La chiave Google **non è nel codice**: sta nelle variabili d'ambiente di Vercel

## Pubblicazione su Vercel

1. Carica questi file nella repository GitHub `BarbaPlant`.
2. Su vercel.com: **Add New → Project** e scegli la repository.
3. Nella schermata di importazione apri **Environment Variables** e aggiungi:
   - Nome: `GEMINI_API_KEY`
   - Valore: la chiave di Google AI Studio
4. Premi **Deploy**.

Vercel riconosce Vite da solo: non serve toccare le impostazioni di build.

### Dopo la pubblicazione (consigliato)

Aggiungi una seconda variabile per impedire che altri usino la tua quota:

- Nome: `ORIGINE_CONSENTITA`
- Valore: l'indirizzo del sito, per esempio `https://barbaplant.vercel.app`

## Uso in locale

```
npm install
npm run dev
```

L'analisi delle foto in locale non funziona (la funzione `api/` gira solo su Vercel):
l'app mostra una diagnosi dimostrativa.
