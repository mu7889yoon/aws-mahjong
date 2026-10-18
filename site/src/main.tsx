import React from "react";
import { createRoot } from "react-dom/client";
import "@cloudscape-design/global-styles/index.css";
import "./styles.css";
import { App } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("アプリケーションのルート要素がありません。");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
