import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MooePage from "./pages/MooePage";
import "./App.css"; // <-- Added import here

// ── Toast Notification ──
function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === "success" && "✓"}
            {t.type === "error" && "✕"}
            {t.type === "info" && "ℹ"}
            {t.type === "warning" && "⚠"}
          </span>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Confirm Dialog ──
function ConfirmDialog({ confirm, onConfirm, onCancel }) {
  if (!confirm) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div className="confirm-icon">🚪</div>
        <p className="confirm-title">Confirm Action</p>
        <p className="confirm-message">{confirm.message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="confirm-btn confirm-btn-confirm"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("login");
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
  };

  const showConfirm = (message) =>
    new Promise((resolve) => {
      setConfirm({ message, resolve });
    });

  const handleConfirm = () => {
    confirm?.resolve(true);
    setConfirm(null);
  };

  const handleCancel = () => {
    confirm?.resolve(false);
    setConfirm(null);
  };

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      setSession(null);
      setPage("login");
      setLoading(false);
    });

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
    const ok = await showConfirm("Are you sure you want to logout?");
    if (!ok) return;
    await supabase.auth.signOut();
    setSession(null);
    setPage("login");
    addToast("Logged out successfully", "info");
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

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog
        confirm={confirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {(page === "login" || !session) && (
        <LoginPage onLoginSuccess={handleLoginSuccess} addToast={addToast} />
      )}

      {page === "mooe" && session && (
        <MooePage
          onBack={() => setPage("dashboard")}
          onLogout={handleLogout}
          user={session?.user}
          addToast={addToast}
          showConfirm={showConfirm}
        />
      )}

      {page === "dashboard" && session && (
        <Dashboard
          user={session?.user}
          session={session}
          onLogout={handleLogout}
          onNavigate={setPage}
          addToast={addToast}
          showConfirm={showConfirm}
        />
      )}
    </>
  );
}
