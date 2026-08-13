import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { vmService } from "./vm/vmService";
import { DashboardPage } from "./pages/DashboardPage";
import { CategoryPage } from "./pages/CategoryPage";
import { SolvePage } from "./pages/SolvePage";
import { TerminalPage } from "./pages/TerminalPage";

export default function App() {
  useEffect(() => {
    vmService.boot();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          🐧 리눅스 실습 CBT
        </Link>
        <nav className="app-nav">
          <Link to="/">대시보드</Link>
          <Link to="/terminal">터미널</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/c/:id" element={<CategoryPage />} />
          <Route path="/p/:id" element={<SolvePage />} />
          <Route path="/terminal" element={<TerminalPage />} />
        </Routes>
      </main>
    </div>
  );
}
