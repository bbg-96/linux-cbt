import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { serialBus } from "./vm/serialBus";
import { vmService } from "./vm/vmService";
import { terminalService } from "./terminal/terminalService";

if (import.meta.env.DEV) {
  // 개발 콘솔에서 시리얼 프로토콜을 직접 검증하기 위한 훅
  (window as unknown as Record<string, unknown>).__cbt = { serialBus, vmService, terminalService };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
