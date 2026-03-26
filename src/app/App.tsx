import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CUASDashboard } from "./components/CUASDashboard";
import FovTestPage from "./components/FovTestPage";
import ButtonsPlayground from "./components/ButtonsPlayground";
import StyleguidePage from "./components/StyleguidePage";

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CUASDashboard />} />
          <Route path="/fov-test" element={<FovTestPage />} />
          <Route path="/buttons" element={<ButtonsPlayground />} />
          <Route path="/styleguide" element={<StyleguidePage />} />
        </Routes>
      </BrowserRouter>
    </DndProvider>
  );
}
