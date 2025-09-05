import React, { useMemo, useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

const sampleRowsBase = [
  { id: 1, imageUrl: "/assets/quiz_img/football.png", label: "Footballs" },
  { id: 2, imageUrl: "/assets/quiz_img/cat.png", label: "Cats" },
  { id: 3, imageUrl: "/assets/quiz_img/cake.png", label: "Cakes" },
  { id: 4, imageUrl: "/assets/quiz_img/tree.png", label: "Trees" },
  { id: 5, imageUrl: "/assets/quiz_img/lion.png", label: "Lions" },
  { id: 6, imageUrl: "/assets/quiz_img/chocolate.png", label: "Chocolates" },
];

type Row = { id: number; imageUrl: string; count: number; label: string };

const STORAGE_KEY = "quiz_rows_v1";

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QuizPrintable: React.FC = () => {
  const [rows, setRows] = useState<Row[] | null>(null);

  // watermark URL (public asset). use window.location.origin for absolute URL.
  const watermarkUrl =
    typeof window !== "undefined" ? `${window.location.origin}/assets/logo1.png` : "/assets/logo1.png";

  // generate a randomized quiz (order + counts)
  const generateRows = (): Row[] => {
    const shuffled = shuffle(sampleRowsBase);
    return shuffled.map((r, idx) => ({
      id: idx + 1,
      imageUrl: r.imageUrl,
      label: r.label,
      count: Math.floor(Math.random() * 5) + 2, // 2..6
    }));
  };

  // initialize from sessionStorage or create once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        setRows(JSON.parse(raw) as Row[]);
        return;
      }
    } catch {
      // ignore parse errors
    }
    const newRows = generateRows();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRows));
    setRows(newRows);
  }, []);

  const regenerate = () => {
    const newRows = generateRows();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newRows));
    setRows(newRows);
  };

  const buildPayload = () => {
    if (!rows) return { title: "Counting Quiz", questions: [], watermarkUrl };
    return {
      title: "Football Counting",
      watermarkUrl,
      questions: rows.map((r) => ({
        id: r.id,
        name: r.label,
        imageUrl: r.imageUrl.startsWith("http") ? r.imageUrl : `${window.location.origin}${r.imageUrl}`,
        count: r.count,
        images: new Array(r.count).fill(
          r.imageUrl.startsWith("http") ? r.imageUrl : `${window.location.origin}${r.imageUrl}`
        ),
      })),
    };
  };

  const handleExportPdf = async () => {
    try {
      const payload = buildPayload();
      const res = await fetch(`${API_BASE}/api/render-quiz-pdf/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();

      if (!res.ok) {
        const text = await res.text();
        console.error("Export failed response:", res.status, text);
        alert(`Export failed: server responded ${res.status}. See console for details.`);
        return;
      }

      if (!contentType.includes("application/pdf")) {
        const text = await res.text();
        console.error("Unexpected response (not PDF):", text);
        alert("Export failed: server returned non-PDF response. See console and backend logs.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "counting_quiz.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export PDF failed (fetch error):", err);
      alert("Export failed — check console and backend logs.");
    }
  };

  if (!rows) return <div className="p-6">Loading quiz...</div>;

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900">
      <div className="max-w-3xl mx-auto border p-6" style={{ position: "relative" }}>
        {/* Watermark preview on page */}
        <img
          src={watermarkUrl}
          alt="watermark"
          style={{
            position: "absolute",
            left: "50%",
            top: "45%",
            transform: "translate(-50%, -50%)",
            opacity: 0.12,
            pointerEvents: "none",
            width: 220,
            zIndex: 0,
          }}
        />

        <header className="text-center mb-4" style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, margin: 0 }}>Football Counting</h1>
          <p style={{ marginTop: 6, color: "#4b5563" }}>Count the number of each item and write the number in the box</p>
        </header>

        <div style={{ position: "relative", zIndex: 1 }}>
          {rows.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 8px",
                borderBottom: "2px solid #e6f2ea",
              }}
            >
              <div style={{ width: 36, fontWeight: 700, fontSize: 18 }}>{i + 1}.</div>

              <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {Array.from({ length: r.count }).map((_, idx) => (
                  <img key={idx} src={r.imageUrl} alt={r.label} style={{ width: 60, height: 60, objectFit: "contain" }} />
                ))}
              </div>

              <div
                style={{
                  width: 66,
                  height: 66,
                  border: "3px solid #1aa76b",
                  borderRadius: 6,
                  marginLeft: 12,
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center" style={{ position: "relative", zIndex: 1 }}>
          <small style={{ color: "#6b7280" }}>© 247 School</small>
          <div className="flex gap-3">
            <button
              onClick={regenerate}
              style={{
                background: "#ef4444",
                color: "white",
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Regenerate Quiz
            </button>
            <button
              onClick={handleExportPdf}
              style={{
                background: "#0ea5a3",
                color: "white",
                padding: "10px 14px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPrintable;