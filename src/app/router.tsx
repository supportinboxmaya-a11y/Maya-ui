import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/Workspace/AppShell";
import { ChatPage } from "@/pages/ChatPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { ProvidersPage } from "@/pages/ProvidersPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { CommandsPage } from "@/pages/CommandsPage";
import { ReferencesPage } from "@/pages/ReferencesPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { PtyPage } from "@/pages/PtyPage";
import { SessionsPage } from "@/pages/SessionsPage";

function AppShellWrapper({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShellWrapper>
            <ChatPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/sessions"
        element={
          <AppShellWrapper>
            <SessionsPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/agents"
        element={
          <AppShellWrapper>
            <AgentsPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/providers"
        element={
          <AppShellWrapper>
            <ProvidersPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/skills"
        element={
          <AppShellWrapper>
            <SkillsPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/commands"
        element={
          <AppShellWrapper>
            <CommandsPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/references"
        element={
          <AppShellWrapper>
            <ReferencesPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/integrations"
        element={
          <AppShellWrapper>
            <IntegrationsPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/pty"
        element={
          <AppShellWrapper>
            <PtyPage />
          </AppShellWrapper>
        }
      />
      <Route
        path="/settings"
        element={
          <AppShellWrapper>
            <SettingsPage />
          </AppShellWrapper>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}