import { BrowserRouter, Routes, Route } from "react-router-dom";
import { C2Dashboard } from "./components/C2Dashboard";
import { CUASDashboard } from "./components/CUASDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CUASDashboard />} />
        <Route path="/full-flow" element={<C2Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
