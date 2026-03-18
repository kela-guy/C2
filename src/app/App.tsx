import { BrowserRouter, Routes, Route } from "react-router-dom";
import { C2Dashboard } from "./components/C2Dashboard";
import { CUASDashboard } from "./components/CUASDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<C2Dashboard />} />
        <Route path="/cuas" element={<CUASDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
