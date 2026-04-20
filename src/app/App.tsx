import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DialRoot } from "dialkit";
import "dialkit/styles.css";
import { Dashboard } from "./components/Dashboard";
import FovTestPage from "./components/FovTestPage";
import StyleguidePage from "./components/StyleguidePage";

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fov-test" element={<FovTestPage />} />
          <Route path="/styleguide" element={<StyleguidePage />} />
        </Routes>
      </BrowserRouter>
      <DialRoot position="bottom-right" />
    </DndProvider>
  );
}
