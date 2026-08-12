import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar";
import { supabase, TABLE } from "../lib/supabase";
import "./MediaManagerPage.css";

const FILTERS = ["pending", "approved", "rejected", "all"];

export default function MediaManagerPage({ user, onLogout, onBack, addToast, showConfirm }) {
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from(TABLE)
      .select("id,author,title,category,description,photos,day,month,year,created_at,status")
      .order("created_at", { ascending: false });

    if (queryError) {
      const missingStatus = queryError.message?.toLowerCase().includes("status");
      setError(missingStatus
        ? "The approval database migration has not been applied yet. Run supabase-news-approval.sql in the Supabase SQL Editor."
        : queryError.message);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArticles();
    const channel = supabase
      .channel("dashboard:news-approval")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, fetchArticles)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchArticles]);

  const counts = useMemo(() => articles.reduce((total, article) => {
    const status = article.status || "approved";
    total[status] = (total[status] || 0) + 1;
    return total;
  }, { pending: 0, approved: 0, rejected: 0 }), [articles]);

  const visibleArticles = filter === "all"
    ? articles
    : articles.filter((article) => (article.status || "approved") === filter);

  const setStatus = async (article, status) => {
    const action = status === "approved" ? "approve" : "reject";
    const confirmed = await showConfirm(`Are you sure you want to ${action} “${article.title}”?`);
    if (!confirmed) return;

    setUpdatingId(article.id);
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ status })
      .eq("id", article.id);

    if (updateError) {
      addToast(`Could not ${action} article: ${updateError.message}`, "error", 5000);
    } else {
      setArticles((current) => current.map((item) =>
        item.id === article.id ? { ...item, status } : item
      ));
      addToast(`Article ${status}.`, "success");
    }
    setUpdatingId(null);
  };

  return (
    <div className="media-root">
      <Topbar user={user} onLogout={onLogout} onBack={onBack} title="Article Approval" />
      <main className="media-body">
        <section className="media-heading">
          <div>
            <h1>IECES Media Manager</h1>
            <p>Approve articles before they are displayed on the IECES website.</p>
          </div>
          <button className="media-refresh" onClick={fetchArticles} disabled={loading}>Refresh</button>
        </section>

        <div className="media-filters" role="tablist" aria-label="Article status">
          {FILTERS.map((status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {status[0].toUpperCase() + status.slice(1)}
              <span>{status === "all" ? articles.length : counts[status]}</span>
            </button>
          ))}
        </div>

        {error && <div className="media-message media-error">{error}</div>}
        {loading && <div className="media-message">Loading articles…</div>}
        {!loading && !error && visibleArticles.length === 0 && (
          <div className="media-message">No {filter === "all" ? "" : filter} articles found.</div>
        )}

        {!loading && !error && (
          <div className="article-list">
            {visibleArticles.map((article) => {
              const status = article.status || "approved";
              const photo = article.photos?.[0];
              return (
                <article className="approval-card" key={article.id}>
                  {photo ? <img src={photo} alt="" className="approval-photo" /> : <div className="approval-photo empty">📰</div>}
                  <div className="approval-content">
                    <div className="approval-meta">
                      <span className={`approval-status status-${status}`}>{status}</span>
                      <span>{article.category}</span>
                      <span>{article.author ? `By ${article.author}` : "No author"}</span>
                    </div>
                    <h2>{article.title}</h2>
                    <p>{article.description}</p>
                    <div className="approval-footer">
                      <span>
                        {[article.month, article.day, article.year].filter(Boolean).join(" ") ||
                          new Date(article.created_at).toLocaleDateString()}
                      </span>
                      <div className="approval-actions">
                        {status !== "rejected" && (
                          <button className="reject" disabled={updatingId === article.id} onClick={() => setStatus(article, "rejected")}>Reject</button>
                        )}
                        {status !== "approved" && (
                          <button className="approve" disabled={updatingId === article.id} onClick={() => setStatus(article, "approved")}>Approve & Publish</button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
