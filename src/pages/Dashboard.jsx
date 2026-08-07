import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import "./Dashboard.css";

const MODULES = [
  {
    id: "enrollment",
    icon: "📋",
    label: "Enrollment",
    desc: "View and manage student enrollment data per grade level and school year.",
    badge: "wip",
    badgeText: "🚧 Under Construction",
  },
  {
    id: "mooe",
    icon: "📊",
    label: "MOOE Report",
    desc: "Encode monthly MOOE expenses and liquidation reports for budget transparency.",
    badge: "active",
    badgeText: "✅ Active",
  },
];

export default function Dashboard({ user, onLogout, onNavigate }) {
  const [recentMooe, setRecentMooe] = useState([]);
  const [enrollModal, setEnrollModal] = useState(false);

  useEffect(() => {
    window.ipc.mooe.getAll().then((all) => {
      const sorted = [...all].sort(
        (a, b) => new Date(b.savedAt) - new Date(a.savedAt),
      );
      setRecentMooe(sorted.slice(0, 5));
    });
  }, []);

  const handleCard = (id) => {
    if (id === "enrollment") {
      setEnrollModal(true);
      return;
    }
    onNavigate(id);
  };

  return (
    <div className="dash-root">
      <Topbar user={user} onLogout={onLogout} />
      <div className="dash-body">
        <div className="dash-welcome">
          <div>
            <div className="dw-title">
              Welcome back, {user?.name || "Admin"} 👋
            </div>
            <div className="dw-sub">Isabela East Central Elementary School</div>
          </div>
        </div>

        <div className="module-grid">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="module-card"
              onClick={() => handleCard(m.id)}
            >
              <div className="mc-icon">{m.icon}</div>
              <div className="mc-label">{m.label}</div>
              <div className="mc-desc">{m.desc}</div>
              <span className={`mc-badge badge-${m.badge}`}>{m.badgeText}</span>
            </div>
          ))}
        </div>

        <div className="dash-section">
          <div className="ds-header">
            <span className="ds-title">Recent MOOE Entries</span>
            {recentMooe.length > 0 && (
              <button className="ds-link" onClick={() => onNavigate("mooe")}>
                View All →
              </button>
            )}
          </div>
          {recentMooe.length === 0 ? (
            <div className="ds-empty">
              No MOOE entries yet. Click the MOOE Report card to start encoding.
            </div>
          ) : (
            <div className="recent-list">
              {recentMooe.map((r, i) => (
                <div key={i} className="recent-card">
                  <div className="rc-left">
                    <div className="rc-period">
                      {r.month} — {r.sy}
                    </div>
                    <div className="rc-meta">
                      {r.items?.length || 0} items · By {r.liquidatedBy || "—"}
                    </div>
                  </div>
                  <div className="rc-right">
                    <div className="rc-total">
                      ₱
                      {Number(r.total || 0).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className={`rc-bal ${r.balance < 0 ? "neg" : ""}`}>
                      Balance: ₱
                      {Number(r.balance || 0).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enrollment WIP Modal */}
      {enrollModal && (
        <div className="modal-overlay" onClick={() => setEnrollModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hdr">
              <span>📋 Enrollment</span>
              <button onClick={() => setEnrollModal(false)}>✕</button>
            </div>
            <div className="wip-body">
              <div className="wip-icon">🚧</div>
              <h3>Under Construction</h3>
              <p>
                Enrollment data management is currently being developed. Check
                back on the next version.
              </p>
              <div className="wip-badge">Coming Soon</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
