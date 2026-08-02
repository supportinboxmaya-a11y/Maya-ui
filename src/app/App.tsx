import { BrowserRouter } from "react-router-dom";

import { AppRouter } from "@/app/router";
import { AppShell } from "@/components/Workspace/AppShell";

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <AppRouter />
      </AppShell>
    </BrowserRouter>
  );
}
