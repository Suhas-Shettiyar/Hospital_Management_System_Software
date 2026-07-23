import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ExampleHelloPage from "./ExampleHelloPage";

/** Standalone preview harness - lets a developer work on this remote
 * (npm run dev, port 5174) without the web-shell host running at all. This
 * is NOT what gets loaded by the host; the host loads module.tsx directly. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <MemoryRouter initialEntries={["/example-hello"]}>
        <Routes>
          <Route path="/example-hello" element={<ExampleHelloPage />} />
        </Routes>
      </MemoryRouter>
    </ConfigProvider>
  </StrictMode>
);
