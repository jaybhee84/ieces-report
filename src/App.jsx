import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MooePage from "./pages/MooePage";

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get existing session on launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setPage("dashboard");
      setLoading(false);
    });

    // 2. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setPage((prev) => (prev === "login" ? "dashboard" : prev));
      } else {
        setPage("login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (userSession) => {
    setSession(userSession);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPage("login");
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#7B1C1C] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (page === "login" || !session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (page === "mooe") {
    return (
      <MooePage
        onBack={() => setPage("dashboard")}
        onLogout={handleLogout}
        user={session?.user}
      />
    );
  }

  return (
    <Dashboard
      user={session?.user}
      session={session}
      onLogout={handleLogout}
      onNavigate={setPage}
    />
  );
}
