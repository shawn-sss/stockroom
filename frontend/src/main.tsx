import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    const buildId = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`/service-worker.js?build=${buildId}`);
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }
}
