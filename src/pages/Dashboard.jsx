/**
 * Dashboard.jsx — updated
 * Replaced "Recent MOOE" section with Org Chart module card.
 */
import { useState } from "react";
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
  {
    id: "orgchart",
    icon: "🏫",
    label: "Org Chart",
    desc: "Manage the school's organizational chart — add staff photos, positions, grade assignments, and substitutes.",
    badge: "active",
    badgeText: "✅ Active",
  },
];

export default function Dashboard({ user, onLogout, onNavigate, addToast, showConfirm }) {
  const [enrollModal, setEnrollModal] = useState(false);

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
            <div className="dw-title">Welcome back, {user?.name || "Admin"} 👋</div>
            <div className="dw-sub">Isabela East Central Elementary School</div>
          </div>
        </div>

        <div className="module-grid module-grid-3">
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

        {/* Quick tips */}
        <div className="dash-section">
          <div className="ds-header">
            <span className="ds-title">Quick Tips</span>
          </div>
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">🏫</div>
              <div className="tip-text">
                <strong>Org Chart:</strong> Add staff photos, assign grade levels, mark Grade Chairmen, and set substitute expiry dates. Expired substitutes auto-hide on the public website.
              </div>
            </div>
            <div className="tip-card">
              <div className="tip-icon">📊</div>
              <div className="tip-text">
                <strong>MOOE Report:</strong> Encode monthly liquidation entries. Upload official receipts for transparency and audit compliance.
              </div>
            </div>
          </div>
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
