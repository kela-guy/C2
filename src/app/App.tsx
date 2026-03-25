import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CUASDashboard } from "./components/CUASDashboard";

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CUASDashboard />} />
        </Routes>
      </BrowserRouter>
    </DndProvider>
  );
}
