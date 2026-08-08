/**
 * OrgChartPage.jsx
 * Electron admin page — manage IECES organizational chart.
 * Supabase table:  org_chart
 * Storage bucket:  org-photos
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import Topbar from "../components/Topbar";
import "./OrgChartPage.css";

// ─── constants ────────────────────────────────────────────────────────────────
const BUCKET = "org-photos";
const TABLE = "org_chart";

const ADMIN_POSITIONS = [
  "Principal",
  "Assistant Principal",
  "Head Teacher I",
  "Head Teacher II",
  "Head Teacher III",
  "Head Teacher IV",
  "Head Teacher V",
  "Head Teacher VI",
  "Administrative Officer II (AO II)",
  "Planning & Development Officer I (PDO I)",
  "Administrative Assistant III (Senior Bookkeeper)",
  "Administrative Assistant II (Disbursing Officer)",
  "Administrative Aide (Job Order)",
];

// Positions that can be "designated" (acting, not permanent)
const DESIGNATABLE = [
  "Assistant Principal",
  "Head Teacher I",
  "Head Teacher II",
  "Head Teacher III",
  "Head Teacher IV",
  "Head Teacher V",
  "Head Teacher VI",
];

const GRADE_LEVELS = [
  "SPED",
  "Kinder",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

// DepEd official teaching position ladder (EO 174 / DO 019 s.2025)
const TEACHING_POSITIONS = [
  "Teacher I",
  "Teacher II",
  "Teacher III",
  "Teacher IV",
  "Teacher V",
  "Teacher VI",
  "Teacher VII",
  "Master Teacher I",
  "Master Teacher II",
  "Master Teacher III",
  "Master Teacher IV",
  "Master Teacher V",
];

const TEACHING_TYPES = ["Adviser", "Subject Teacher"];

// ─── helpers ──────────────────────────────────────────────────────────────────
function isSubExpired(person) {
  if (person.status !== "substitute" || !person.sub_expiry_end) return false;
  const expiry = new Date(person.sub_expiry_end);
  expiry.setHours(23, 59, 59, 999);
  return new Date() > expiry;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Returns ★ badges based on admin position rank
function getAdminStars(position) {
  if (!position) return null;
  if (position === "Principal") return "★★★";
  if (position === "Assistant Principal") return "★★";
  if (position.startsWith("Head Teacher")) return "★";
  return null;
}

// ─── empty form ───────────────────────────────────────────────────────────────
const EMPTY = {
  name: "",
  category: "teaching", // admin | teaching | non-teaching
  admin_position: "",
  is_designated: false,
  teaching_position: "Teacher I",
  teaching_type: "Adviser",
  grade_level: "Grade 1",
  is_grade_chairman: false,
  status: "alive", // alive | substitute
  sub_expiry_start: "",
  sub_expiry_end: "",
  photo_url: "",
};

// ─── StaffCard mini ──────────────────────────────────────────────────────────
function StaffCard({ person, onEdit, onDelete }) {
  const expired = isSubExpired(person);
  return (
    <div className={`oc-staff-card ${expired ? "oc-expired" : ""}`}>
      <div className="oc-photo-wrap">
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} />
        ) : (
          <div className="oc-no-photo">👤</div>
        )}
        {expired && <div className="oc-expired-badge">Expired</div>}
        {person.is_grade_chairman && (
          <div className="oc-chairman-badge">⭐ Grade Chairman</div>
        )}
      </div>
      <div className="oc-info">
        <div className="oc-name">{person.name}</div>
        <div className="oc-pos">
          {person.category === "admin" ? (
            <span className="oc-pos-admin">
              {getAdminStars(person.admin_position) && (
                <span className="oc-stars">
                  {getAdminStars(person.admin_position)}
                </span>
              )}
              {person.is_designated
                ? `Designated ${person.admin_position}`
                : person.admin_position}
            </span>
          ) : person.category === "teaching" ? (
            `${person.teaching_position || ""} · ${person.grade_level} — ${person.teaching_type}`
          ) : (
            person.admin_position || "Non-Teaching"
          )}
        </div>
        {person.status === "substitute" && (
          <div className="oc-sub-tag">
            Substitute · {formatDate(person.sub_expiry_start)} –{" "}
            {formatDate(person.sub_expiry_end)}
          </div>
        )}
      </div>
      <div className="oc-actions">
        <button className="oc-btn-edit" onClick={() => onEdit(person)}>
          ✏️
        </button>
        <button className="oc-btn-del" onClick={() => onDelete(person)}>
          🗑️
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgChartPage({
  onBack,
  onLogout,
  user,
  addToast,
  showConfirm,
}) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileRef = useRef();

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      addToast("Failed to load staff: " + error.message, "error");
    } else setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // ── open modal ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY);
    setEditId(null);
    setPhotoFile(null);
    setPhotoPreview("");
    setShowModal(true);
  };

  const openEdit = (person) => {
    setForm({
      name: person.name || "",
      category: person.category || "teaching",
      admin_position: person.admin_position || "",
      is_designated: person.is_designated || false,
      teaching_position: person.teaching_position || "Teacher I",
      teaching_type: person.teaching_type || "Adviser",
      grade_level: person.grade_level || "Grade 1",
      is_grade_chairman: person.is_grade_chairman || false,
      status: person.status || "alive",
      sub_expiry_start: person.sub_expiry_start || "",
      sub_expiry_end: person.sub_expiry_end || "",
      photo_url: person.photo_url || "",
    });
    setEditId(person.id);
    setPhotoFile(null);
    setPhotoPreview(person.photo_url || "");
    setShowModal(true);
  };

  // ── photo pick ─────────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast("Name is required.", "warning");
      return;
    }
    if (form.category === "admin" && !form.admin_position) {
      addToast("Select an admin position.", "warning");
      return;
    }
    if (form.status === "substitute" && !form.sub_expiry_end) {
      addToast("Set a substitute expiry date.", "warning");
      return;
    }
    setSaving(true);

    let photo_url = form.photo_url;

    // upload photo if new file chosen
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `staff/${Date.now()}_${form.name.replace(/\s+/g, "_")}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, photoFile, { upsert: true });
      if (upErr) {
        addToast("Photo upload failed: " + upErr.message, "error");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      admin_position: form.category !== "teaching" ? form.admin_position : null,
      is_designated:
        form.category === "admin" && DESIGNATABLE.includes(form.admin_position)
          ? form.is_designated
          : false,
      teaching_position:
        form.category === "teaching" ? form.teaching_position : null,
      teaching_type: form.category === "teaching" ? form.teaching_type : null,
      grade_level: form.category === "teaching" ? form.grade_level : null,
      is_grade_chairman:
        form.category === "teaching" && form.grade_level !== "SPED"
          ? form.is_grade_chairman
          : false,
      status: form.status,
      sub_expiry_start:
        form.status === "substitute" ? form.sub_expiry_start || null : null,
      sub_expiry_end:
        form.status === "substitute" ? form.sub_expiry_end || null : null,
      photo_url,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from(TABLE).update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from(TABLE).insert(payload));
    }

    if (error) {
      addToast("Save failed: " + error.message, "error");
    } else {
      addToast(editId ? "Staff updated!" : "Staff added!", "success");
      setShowModal(false);
      fetchStaff();
    }
    setSaving(false);
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (person) => {
    const ok = await showConfirm(
      `Remove "${person.name}" from the org chart?\n\nTheir photo and data will be kept in storage but removed from the chart.`,
    );
    if (!ok) return;
    const { error } = await supabase.from(TABLE).delete().eq("id", person.id);
    if (error) addToast("Delete failed: " + error.message, "error");
    else {
      addToast(`${person.name} removed.`, "info");
      fetchStaff();
    }
  };

  // ── grouped views ──────────────────────────────────────────────────────────
  const adminStaff = staff.filter((s) => s.category === "admin");
  const teachingStaff = staff.filter((s) => s.category === "teaching");
  const nonTeaching = staff.filter((s) => s.category === "non-teaching");

  const f = form; // shorthand
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="oc-root">
      <Topbar
        user={user}
        onLogout={onLogout}
        onBack={onBack}
        title="Organizational Chart"
      />

      <div className="oc-body">
        {/* Header row */}
        <div className="oc-page-hdr">
          <div>
            <div className="oc-page-title">Staff & Organizational Chart</div>
            <div className="oc-page-sub">
              {staff.length} staff member{staff.length !== 1 ? "s" : ""} ·
              Isabela East Central Elementary School
            </div>
          </div>
          <button className="oc-add-btn" onClick={openAdd}>
            + Add Staff
          </button>
        </div>

        {loading ? (
          <div className="oc-loading">Loading staff…</div>
        ) : (
          <>
            {/* ADMIN */}
            <div className="oc-section">
              <div className="oc-section-hdr">🏫 School Administration</div>
              {adminStaff.length === 0 ? (
                <div className="oc-empty">No admin staff added yet.</div>
              ) : (
                adminStaff.map((p) => (
                  <StaffCard
                    key={p.id}
                    person={p}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* TEACHING by grade */}
            <div className="oc-section">
              <div className="oc-section-hdr">📚 Teaching Force</div>
              {GRADE_LEVELS.map((gl) => {
                const gradeTeachers = teachingStaff.filter(
                  (t) => t.grade_level === gl,
                );
                if (gradeTeachers.length === 0) return null;
                const chairman = gradeTeachers.find((t) => t.is_grade_chairman);
                return (
                  <div key={gl} className="oc-grade-group">
                    <div className="oc-grade-label">
                      {gl}
                      {chairman && (
                        <span className="oc-chairman-inline">
                          ⭐ {chairman.name} (Grade Chairman)
                        </span>
                      )}
                    </div>
                    {gradeTeachers.map((p) => (
                      <StaffCard
                        key={p.id}
                        person={p}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                );
              })}
              {teachingStaff.length === 0 && (
                <div className="oc-empty">No teaching staff added yet.</div>
              )}
            </div>

            {/* NON-TEACHING */}
            <div className="oc-section">
              <div className="oc-section-hdr">🗂️ Non-Teaching Staff</div>
              {nonTeaching.length === 0 ? (
                <div className="oc-empty">No non-teaching staff added yet.</div>
              ) : (
                nonTeaching.map((p) => (
                  <StaffCard
                    key={p.id}
                    person={p}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="modal-box oc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-hdr">
              <span>{editId ? "✏️ Edit Staff" : "➕ Add Staff"}</span>
              <button onClick={() => !saving && setShowModal(false)}>✕</button>
            </div>

            <div className="oc-form-body">
              {/* Photo */}
              <div className="oc-photo-section">
                <div
                  className="oc-photo-preview"
                  onClick={() => fileRef.current.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" />
                  ) : (
                    <div className="oc-photo-placeholder">
                      📷
                      <br />
                      Click to upload photo
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoChange}
                />
                <button
                  className="oc-change-photo"
                  onClick={() => fileRef.current.click()}
                >
                  {photoPreview ? "Change Photo" : "Upload Photo"}
                </button>
              </div>

              {/* Name */}
              <div className="oc-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. MARIA SANTOS"
                  value={f.name}
                  onChange={(e) => set("name", e.target.value.toUpperCase())}
                />
              </div>

              {/* Category */}
              <div className="oc-field">
                <label>Category *</label>
                <select
                  value={f.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  <option value="admin">Administration</option>
                  <option value="teaching">Teaching</option>
                  <option value="non-teaching">Non-Teaching</option>
                </select>
              </div>

              {/* Admin Position */}
              {(f.category === "admin" || f.category === "non-teaching") && (
                <div className="oc-field">
                  <label>Position *</label>
                  {f.category === "admin" ? (
                    <select
                      value={f.admin_position}
                      onChange={(e) => set("admin_position", e.target.value)}
                    >
                      <option value="">— Select position —</option>
                      {ADMIN_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Security Guard, Utility Worker"
                      value={f.admin_position}
                      onChange={(e) => set("admin_position", e.target.value)}
                    />
                  )}
                </div>
              )}

              {/* Designated toggle — only for designatable admin positions */}
              {f.category === "admin" &&
                DESIGNATABLE.includes(f.admin_position) && (
                  <div className="oc-field oc-checkbox-field">
                    <label className="oc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={f.is_designated}
                        onChange={(e) => set("is_designated", e.target.checked)}
                      />
                      <span>Designated (Acting) only</span>
                    </label>
                    <div className="oc-field-hint">
                      Check if this person is designated to the position
                      temporarily, not permanently appointed. Position will
                      display as "Designated {f.admin_position}".
                    </div>
                  </div>
                )}

              {/* Teaching fields */}
              {f.category === "teaching" && (
                <>
                  <div className="oc-field">
                    <label>DepEd Position *</label>
                    <select
                      value={f.teaching_position}
                      onChange={(e) => set("teaching_position", e.target.value)}
                    >
                      {TEACHING_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="oc-field">
                    <label>Teacher Type</label>
                    <select
                      value={f.teaching_type}
                      onChange={(e) => set("teaching_type", e.target.value)}
                    >
                      {TEACHING_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="oc-field">
                    <label>Grade Level / Assignment</label>
                    <select
                      value={f.grade_level}
                      onChange={(e) => set("grade_level", e.target.value)}
                    >
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grade Chairman — only for non-SPED */}
                  {f.grade_level !== "SPED" && (
                    <div className="oc-field oc-checkbox-field">
                      <label className="oc-checkbox-label">
                        <input
                          type="checkbox"
                          checked={f.is_grade_chairman}
                          onChange={(e) =>
                            set("is_grade_chairman", e.target.checked)
                          }
                        />
                        <span>⭐ Grade Chairman for {f.grade_level}</span>
                      </label>
                      <div className="oc-field-hint">
                        The Grade Chairman is the head/leader for this grade
                        level.
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Status */}
              <div className="oc-field">
                <label>Status</label>
                <div className="oc-radio-group">
                  <label
                    className={`oc-radio ${f.status === "alive" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="alive"
                      checked={f.status === "alive"}
                      onChange={() => set("status", "alive")}
                    />
                    Regular / Active
                  </label>
                  <label
                    className={`oc-radio ${f.status === "substitute" ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="substitute"
                      checked={f.status === "substitute"}
                      onChange={() => set("status", "substitute")}
                    />
                    Substitute
                  </label>
                </div>
              </div>

              {/* Substitute dates */}
              {f.status === "substitute" && (
                <div className="oc-sub-dates">
                  <div className="oc-field">
                    <label>Substitute From</label>
                    <input
                      type="date"
                      value={f.sub_expiry_start}
                      onChange={(e) => set("sub_expiry_start", e.target.value)}
                    />
                  </div>
                  <div className="oc-field">
                    <label>Substitute Until *</label>
                    <input
                      type="date"
                      value={f.sub_expiry_end}
                      onChange={(e) => set("sub_expiry_end", e.target.value)}
                    />
                    <div className="oc-field-hint">
                      After this date, this substitute will be automatically
                      hidden from the public org chart. Their data and photo
                      will still be kept.
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="oc-form-actions">
                <button
                  className="oc-btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="oc-btn-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : editId ? "Update Staff" : "Add Staff"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
