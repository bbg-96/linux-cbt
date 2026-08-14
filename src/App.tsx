import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { vmService } from "./vm/vmService";
import { CatalogLayout } from "./components/CatalogLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CategoryPage } from "./pages/CategoryPage";
import { SolvePage } from "./pages/SolvePage";
import { TerminalPage } from "./pages/TerminalPage";

export default function App() {
  useEffect(() => {
    vmService.boot();
  }, []);

  return (
    <Routes>
      <Route element={<CatalogLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/c/:id" element={<CategoryPage />} />
        <Route path="/p/:id" element={<SolvePage />} />
        <Route path="/terminal" element={<TerminalPage />} />
      </Route>
    </Routes>
  );
}
