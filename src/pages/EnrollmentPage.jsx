import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar";
import { supabase } from "../lib/supabase";
import "./EnrollmentPage.css";

const GRADES = [
  { key: "0", label: "Kinder" },
  { key: "1", label: "Grade 1" },
  { key: "2", label: "Grade 2" },
  { key: "3", label: "Grade 3" },
  { key: "4", label: "Grade 4" },
  { key: "5", label: "Grade 5" },
  { key: "6", label: "Grade 6" },
  { key: "SNED", label: "SNED" },
];

const enrollmentTimestamp = (learner) =>
  learner.created_at || learner.enrolled_at || learner.enrollment_date || learner.date_enrolled;

const dateKey = (value) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const displayDate = (key) => new Intl.DateTimeFormat("en-PH", {
  year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila",
}).format(new Date(`${key}T00:00:00+08:00`));

const summarize = (learners) => ({
  total: learners.length,
  male: learners.filter((item) => (item.gender || item.sex)?.toLowerCase() === "male").length,
  female: learners.filter((item) => (item.gender || item.sex)?.toLowerCase() === "female").length,
});

const countBy = (learners, getValue) => Object.entries(
  learners.reduce((counts, learner) => {
    const value = getValue(learner)?.toString().trim() || "Not specified";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {}),
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const barangayOf = (learner) => {
  if (learner.barangay) return learner.barangay;
  const match = learner.address?.match(/Brgy\.\s*([^,]+)/i);
  return match?.[1] || learner.address;
};

function BreakdownCard({ title, rows }) {
  return <div className="demographic-card">
    <h3>{title}</h3>
    {rows.map(([label, count]) => <div className="demographic-row" key={label}>
      <span>{label}</span><strong>{count}</strong>
    </div>)}
  </div>;
}

const normalizedName = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const orgTeacherName = (teacher) =>
  [teacher.first_name, teacher.middle_name, teacher.family_name].filter(Boolean).join(" ") || teacher.name || "Unnamed adviser";
const adviserGradeKey = (value) => {
  const grade = String(value ?? "").toUpperCase().trim();
  if (grade === "KINDER" || grade === "KINDERGARTEN" || grade === "0") return "0";
  if (grade === "SNED" || grade === "SPED") return "SNED";
  const number = grade.match(/[1-6]/)?.[0];
  return number || grade;
};

export default function EnrollmentPage({ user, onLogout, onBack }) {
  const [learners, setLearners] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [orgAdvisers, setOrgAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAdviser, setSelectedAdviser] = useState(null);

  const fetchLearners = useCallback(async () => {
    setLoading(true);
    setError("");
    const [studentResult, profileResult, orgResult] = await Promise.all([
      supabase.from("students").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("org_chart").select("*"),
    ]);
    if (studentResult.error) setError(studentResult.error.message);
    else if (orgResult.error) setError(orgResult.error.message);
    else {
      setLearners(studentResult.data || []);
      setAdvisers((profileResult.data || []).filter((profile) =>
        profile.role === "adviser" || profile.section_assigned || profile.grade_level_assigned != null
      ));
      setOrgAdvisers((orgResult.data || []).filter((person) =>
        person.category === "teaching" && (String(person.teaching_type).toLowerCase() === "adviser" || person.is_grade_chairman)
      ));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLearners();
    const channel = supabase
      .channel("dashboard:enrollment")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, fetchLearners)
      .subscribe();
    const profileChannel = supabase
      .channel("dashboard:advisers")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchLearners)
      .subscribe();
    const orgChannel = supabase
      .channel("dashboard:org-advisers")
      .on("postgres_changes", { event: "*", schema: "public", table: "org_chart" }, fetchLearners)
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(profileChannel); supabase.removeChannel(orgChannel); };
  }, [fetchLearners]);

  const dailyRows = useMemo(() => {
    const grouped = learners.reduce((result, learner) => {
      const timestamp = enrollmentTimestamp(learner);
      if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) return result;
      const key = dateKey(timestamp);
      if (!result[key]) result[key] = [];
      result[key].push(learner);
      return result;
    }, {});
    return Object.entries(grouped)
      .map(([date, items]) => ({ date, items, ...summarize(items) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [learners]);

  useEffect(() => {
    if (!selectedDate && dailyRows.length) setSelectedDate(dailyRows[0].date);
  }, [dailyRows, selectedDate]);

  const totals = useMemo(() => summarize(learners), [learners]);
  const today = dateKey(new Date());
  const todayTotal = dailyRows.find((row) => row.date === today)?.total || 0;
  const selectedLearners = dailyRows.find((row) => row.date === selectedDate)?.items || [];

  const selectedGradeRows = GRADES.map((grade) => {
    const items = selectedLearners.filter((learner) => String(learner.grade_level).toUpperCase() === grade.key);
    return { ...grade, ...summarize(items) };
  });
  const overallGradeRows = GRADES.map((grade) => {
    const items = learners.filter((learner) => String(learner.grade_level).toUpperCase() === grade.key);
    return { ...grade, ...summarize(items) };
  });
  const readingCategories = ["Non-Reader", "Frustration", "Instructional", "Independent"];
  const readingGrades = GRADES.filter((grade) => Number(grade.key) >= 1 && Number(grade.key) <= 6);
  const readingCount = (category, gradeKey) => learners.filter((learner) =>
    String(learner.grade_level) === gradeKey && (learner.reading_level || "Non-Reader") === category
  ).length;
  const demographicRows = {
    religion: countBy(selectedLearners, (learner) => learner.religion),
    tribe: countBy(selectedLearners, (learner) => learner.tribe),
    barangay: countBy(selectedLearners, barangayOf),
  };
  const advisorySources = orgAdvisers.length ? orgAdvisers.map((teacher) => {
    const teacherName = orgTeacherName(teacher);
    const profile = advisers.find((candidate) => normalizedName(candidate.full_name || candidate.name) === normalizedName(teacherName));
    return {
      ...teacher,
      profile_id: profile?.id,
      full_name: teacherName,
      grade_level_assigned: teacher.grade_level,
      section_assigned: profile?.section_assigned || teacher.section || teacher.section_assigned,
      portal_profile: profile,
    };
  }) : advisers;

  const advisoryRows = advisorySources.map((adviser) => {
    const assignmentId = adviser.profile_id || adviser.id;
    const items = learners.filter((learner) => String(learner.adviser_id) === String(assignmentId));
    return { adviser, learners: items, ...summarize(items) };
  }).sort((a, b) =>
    String(adviserGradeKey(a.adviser.grade_level_assigned)).localeCompare(String(adviserGradeKey(b.adviser.grade_level_assigned)), undefined, { numeric: true }) ||
    String(a.adviser.section_assigned || "").localeCompare(String(b.adviser.section_assigned || ""))
  );
  const advisoryGradeGroups = GRADES.map((grade) => ({
    ...grade,
    rows: advisoryRows
      .filter((row) => adviserGradeKey(row.adviser.grade_level_assigned) === grade.key)
      .sort((a, b) => Number(Boolean(b.adviser.is_grade_chairman)) - Number(Boolean(a.adviser.is_grade_chairman))),
  }));

  return (
    <div className="enrollment-root">
      <Topbar user={user} onLogout={onLogout} onBack={onBack} title="Enrollment Monitoring" />
      <main className="enrollment-body">
        <div className="enrollment-heading">
          <div>
            <h1>Learner Enrollment</h1>
            <p>Live enrollment data submitted through the IECES Portal.</p>
          </div>
          <button onClick={fetchLearners} disabled={loading}>Refresh</button>
        </div>

        {error && <div className="enrollment-message error">{error}</div>}
        {loading && <div className="enrollment-message">Loading enrollment data…</div>}

        {!loading && !error && <>
          <section className="enrollment-stats">
            <div><span>Total Learners</span><strong>{totals.total}</strong></div>
            <div><span>Enrolled Today</span><strong>{todayTotal}</strong></div>
            <div><span>Male</span><strong>{totals.male}</strong></div>
            <div><span>Female</span><strong>{totals.female}</strong></div>
          </section>

          <section className="enrollment-panel advisory-highlight">
            <div className="panel-title"><div><h2>Advisory Classes</h2><p>Double-click an adviser to view the complete learner roster.</p></div></div>
            {advisoryRows.length === 0 ? <div className="enrollment-empty">No advisory class data is visible. Apply supabase-enrollment-dashboard-access.sql if advisers exist in the portal.</div> :
              <div className="advisory-groups">{advisoryGradeGroups.map((group) => <section className="advisory-grade-group" key={group.key}>
                <div className="advisory-grade-heading"><h3>{group.label}</h3><span>{group.rows.reduce((total, row) => total + row.total, 0)} learners</span></div>
                <div className="adviser-list">{group.rows.length === 0 ? <div className="adviser-empty">No adviser assigned</div> : group.rows.map((row) => {
                  const fullName = row.adviser.full_name || row.adviser.name || row.adviser.username || "Unnamed adviser";
                  const firstName = row.adviser.first_name || fullName.trim().split(/\s+/)[0];
                  return <div className={`adviser-row ${row.adviser.is_grade_chairman ? "chairman" : ""}`} key={row.adviser.id} onDoubleClick={() => setSelectedAdviser(row)} title="Double-click to view learners">
                    {row.adviser.photo_url ? <img src={row.adviser.photo_url} alt="" /> : <div className="adviser-avatar">👤</div>}
                    <div className="adviser-identity"><strong>{firstName}</strong><span>{fullName}</span>{row.adviser.section_assigned && <small>Section {row.adviser.section_assigned}</small>}</div>
                    {row.adviser.is_grade_chairman && <span className="chairman-badge">★ Grade Chairman</span>}
                    <div className="adviser-total"><strong>{row.total}</strong><span>Learners</span></div>
                  </div>;
                })}</div>
              </section>)}</div>}
          </section>

          <section className="enrollment-panel">
            <div className="panel-title"><div><h2>Enrollment by Grade Level</h2><p>Live school-wide totals from Kinder through Grade 6 and SNED.</p></div></div>
            <div className="grade-live-grid">{overallGradeRows.map((row) => <div className="grade-live-card" key={row.key}>
              <span>{row.label}</span><strong>{row.total}</strong><small>{row.male} Male · {row.female} Female</small>
            </div>)}</div>
          </section>

          <section className="enrollment-panel">
            <div className="panel-title"><div><h2>Reading Level Assessment</h2><p>Reader classification for Grades 1–6, matching the IECES Portal.</p></div></div>
            <div className="daily-table-wrap"><table className="enrollment-table">
              <thead><tr><th>Reading Category</th>{readingGrades.map((grade) => <th key={grade.key}>{grade.label}</th>)}<th>Total</th></tr></thead>
              <tbody>{readingCategories.map((category) => <tr key={category}>
                <td><strong>{category}</strong></td>
                {readingGrades.map((grade) => <td key={grade.key}>{readingCount(category, grade.key)}</td>)}
                <td><strong>{readingGrades.reduce((total, grade) => total + readingCount(category, grade.key), 0)}</strong></td>
              </tr>)}</tbody>
              <tfoot><tr><th>Grand Total</th>{readingGrades.map((grade) => <th key={grade.key}>{overallGradeRows.find((row) => row.key === grade.key)?.total || 0}</th>)}<th>{readingGrades.reduce((total, grade) => total + (overallGradeRows.find((row) => row.key === grade.key)?.total || 0), 0)}</th></tr></tfoot>
            </table></div>
          </section>

          <section className="enrollment-panel">
            <div className="panel-title"><div><h2>Daily Enrollment</h2><p>Select a date to view its grade breakdown.</p></div></div>
            {dailyRows.length === 0 ? <div className="enrollment-empty">
              {learners.length
                ? "Existing learner records have no enrollment date. Run supabase-enrollment-dates.sql so future submissions are recorded by date."
                : "No learner enrollment has been recorded yet."}
            </div> : (
              <div className="daily-table-wrap"><table className="enrollment-table daily-table">
                <thead><tr><th>Date Enrolled</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
                <tbody>{dailyRows.map((row) => <tr key={row.date} className={selectedDate === row.date ? "selected" : ""} onClick={() => setSelectedDate(row.date)}>
                  <td>{displayDate(row.date)}</td><td>{row.male}</td><td>{row.female}</td><td><strong>{row.total}</strong></td>
                </tr>)}</tbody>
              </table></div>
            )}
          </section>

          {selectedDate && <section className="enrollment-panel">
            <div className="panel-title"><div><h2>Breakdown for {displayDate(selectedDate)}</h2><p>{selectedLearners.length} learner{selectedLearners.length === 1 ? "" : "s"} enrolled on this date.</p></div></div>
            <div className="daily-table-wrap"><table className="enrollment-table">
              <thead><tr><th>Grade Level</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>
              <tbody>{selectedGradeRows.map((row) => <tr key={row.key}><td>{row.label}</td><td>{row.male}</td><td>{row.female}</td><td><strong>{row.total}</strong></td></tr>)}</tbody>
              <tfoot><tr><th>All Grades</th><th>{summarize(selectedLearners).male}</th><th>{summarize(selectedLearners).female}</th><th>{selectedLearners.length}</th></tr></tfoot>
            </table></div>
            <div className="demographic-grid">
              <BreakdownCard title="Religion" rows={demographicRows.religion} />
              <BreakdownCard title="Tribe" rows={demographicRows.tribe} />
              <BreakdownCard title="Barangay" rows={demographicRows.barangay} />
            </div>
          </section>}
        </>}
      </main>
      {selectedAdviser && <AdvisoryRoster row={selectedAdviser} onClose={() => setSelectedAdviser(null)} />}
    </div>
  );
}

const hiddenLearnerFields = new Set(["id", "adviser_id", "photo_url"]);
const fieldLabel = (key) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const learnerName = (learner) => [learner.family_name, learner.first_name, learner.middle_name].filter(Boolean).join(", ") || learner.name || "Unnamed learner";

function AdvisoryRoster({ row, onClose }) {
  const adviserName = row.adviser.full_name || row.adviser.name || row.adviser.username || "Adviser";
  return <div className="roster-overlay" onClick={onClose}>
    <div className="roster-modal" onClick={(event) => event.stopPropagation()}>
      <header><div><h2>{adviserName}</h2><p>{row.adviser.section_assigned || "Advisory Class"} · {row.total} learner{row.total === 1 ? "" : "s"}</p></div><button onClick={onClose}>✕</button></header>
      <div className="roster-body">
        {row.learners.length === 0 ? <div className="enrollment-empty">No learners are assigned to this adviser.</div> : row.learners.map((learner) =>
          <section className="learner-record" key={learner.id}>
            <div className="learner-record-heading">
              {learner.photo_url && <img src={learner.photo_url} alt="" />}
              <div><h3>{learnerName(learner)}</h3><p>{learner.gender || learner.sex || "Gender not specified"}</p></div>
            </div>
            <div className="learner-fields">{Object.entries(learner).filter(([key, value]) =>
              !hiddenLearnerFields.has(key) && value !== null && value !== "" && typeof value !== "object"
            ).map(([key, value]) => <div key={key}><span>{fieldLabel(key)}</span><strong>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</strong></div>)}</div>
          </section>
        )}
      </div>
    </div>
  </div>;
}
