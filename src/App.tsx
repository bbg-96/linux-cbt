import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { vmService } from "./vm/vmService";
import { ProblemListPage } from "./pages/ProblemListPage";
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
          <Link to="/">문제</Link>
          <Link to="/terminal">터미널</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
        </Routes>
      </main>
    </div>
  );
}
