import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { useLanguageStore } from "./stores/language.store";

// After a redeploy, old chunk hashes 404 for already-open tabs — reload once to pick up the new build.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

// Eagerly initialize language so <html lang> is accurate for browser translation.
useLanguageStore.getState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
