import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { avviaControlloVersione } from "./aggiornamento.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* L'app controlla da sola se esiste una versione piu' recente e si aggiorna. */
avviaControlloVersione();
