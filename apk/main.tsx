import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuroraIdol } from "../src/components/slot-game";
import "./fonts.css";
import "../src/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuroraIdol />
    </StrictMode>,
  );
}
