import { useEffect, useMemo, useState } from "react";
import { useToast } from "@chakra-ui/react";
import { Navigate, Route, Routes } from "react-router-dom";

import { fetchAuthProviders, fetchCurrentUser, login, logout, type AuthProviders, type AuthUser } from "./api";
import { AppLayout } from "./components/AppLayout";
import { useLibraryData } from "./hooks/useLibraryData";
import { ConfigPage } from "./pages/ConfigPage";
import { EditionsPage } from "./pages/EditionsPage";
import { LoginPage } from "./pages/LoginPage";
import { SourcesPage } from "./pages/SourcesPage";

export default function App() {
  const toast = useToast();
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const notify = useMemo(
    () =>
      (status: "success" | "error" | "info", title: string, description?: string) => {
        toast({
          title,
          description,
          status,
          duration: 3000,
          isClosable: true,
          position: "top-right"
        });
      },
    [toast]
  );

  useEffect(() => {
    void (async () => {
      try {
        const nextProviders = await fetchAuthProviders();
        setProviders(nextProviders);
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  async function handleLogin(loginValue: string, password: string) {
    setLoginLoading(true);
    setAuthError("");
    try {
      const currentUser = await login(loginValue, password);
      setUser(currentUser);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось выполнить вход");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const result = await logout();
      setUser(null);
      if (result.redirect_url) {
        window.location.href = result.redirect_url;
      }
    } catch (error) {
      notify("error", "Не удалось выйти", error instanceof Error ? error.message : undefined);
    }
  }

  if (authLoading) {
    return <LoginPage error="" isLoading={true} providers={providers} onLogin={handleLogin} />;
  }

  if (!user) {
    return <LoginPage error={authError} isLoading={loginLoading} providers={providers} onLogin={handleLogin} />;
  }

  return <AuthenticatedApp user={user} onLogout={handleLogout} onNotify={notify} />;
}

function AuthenticatedApp({
  onLogout,
  onNotify,
  user
}: {
  onLogout: () => Promise<void>;
  onNotify: (status: "success" | "error" | "info", title: string, description?: string) => void;
  user: AuthUser;
}) {
  const library = useLibraryData();

  return (
    <Routes>
      <Route
        path="/"
        element={<AppLayout isLoading={library.isLoading} onLogout={onLogout} onRescan={library.rescan} user={user} />}
      >
        <Route
          index
          element={<SourcesPage sources={library.sources} lookups={library.lookups} onChanged={library.reload} onNotify={onNotify} />}
        />
        <Route
          path="editions"
          element={<EditionsPage editions={library.editions} lookups={library.lookups} onChanged={library.reload} onNotify={onNotify} />}
        />
        <Route path="config" element={<ConfigPage config={library.config} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
