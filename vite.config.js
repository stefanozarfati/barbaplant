import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/* Timbro della versione, calcolato al momento della build: non si aggiorna a
   mano, altrimenti prima o poi si scorda. Su Vercel si usa il commit vero;
   in locale la data e ora. */
const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const VERSIONE = sha ? sha.slice(0, 7) : "locale-" + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

/* Scrive `versione.json` accanto alla pagina: e' il file che l'app interroga
   per sapere se la copia che sta girando sul telefono e' ancora quella giusta. */
function timbroVersione() {
  return {
    name: "timbro-versione",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "versione.json",
        source: JSON.stringify({ versione: VERSIONE }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), timbroVersione()],
  define: { __VERSIONE__: JSON.stringify(VERSIONE) },
});
