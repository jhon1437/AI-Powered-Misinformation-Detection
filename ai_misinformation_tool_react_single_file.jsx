import React, { useState, useRef } from "react";

/**
 * AI-Powered Tool for Combating Misinformation
 * Single-file React component (default export) ready to paste into a CRA/Vite React app.
 * - Uses Tailwind CSS utility classes for styling (no extra color declarations)
 * - Contains mock analysis logic so it runs locally without backend (but clearly marked places to integrate a real AI/API)
 * - Accessible, mobile-friendly, and person-friendly language/UX
 *
 * How to use:
 * 1. Create a React app (Vite or CRA).
 * 2. Install Tailwind and configure it per Tailwind docs.
 * 3. Paste this file as src/App.jsx and start the dev server.
 * 4. To connect a real backend/AI: replace `mockAnalyze` with a call to your server or OpenAI endpoint.
 */

// --- Utility helpers ---
function clamp(n, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function fakeConfidenceFromSignals(signals) {
  // Simple deterministic-ish mapping for the demo.
  let score = 50;
  if (signals.includes("many-contradictions")) score -= 30;
  if (signals.includes("authoritative-sources")) score += 25;
  if (signals.includes("fabricated-dates")) score -= 20;
  if (signals.includes("no-sources")) score -= 15;
  if (signals.includes("image-manipulated")) score -= 25;
  return clamp(score, 0, 100);
}

// Mock analyzer - replace this with real AI / backend call.
async function mockAnalyze({ type, content }) {
  // small delay to simulate network/processing
  await new Promise((res) => setTimeout(res, 650));

  // extremely naive checks for demo purposes
  const lower = (content || "").toString().toLowerCase();
  const signals = [];

  if (!content || lower.trim().length < 10) {
    signals.push("too-short");
  }
  if (lower.includes("shocking") || lower.includes("you won't believe")) {
    signals.push("clickbait-y");
  }
  if (lower.includes("according to our sources") && !lower.includes("https")) {
    signals.push("no-sources");
  }
  if (lower.match(/\d{4}-\d{2}-\d{2}/)) {
    // accept dates but check for suspicious future dates
    const futureDate = lower.match(/(20\d{2}-\d{2}-\d{2})/);
    if (futureDate) {
      const d = new Date(futureDate[1]);
      if (d > new Date()) signals.push("fabricated-dates");
    }
  }
  if (lower.includes("deepfake") || lower.includes("ai-generated")) {
    signals.push("image-manipulated");
  }
  if (lower.includes("cdc") || lower.includes("who") || lower.includes("nyt")) {
    signals.push("authoritative-sources");
  }
  if (lower.includes("contradictory") || lower.includes("but then")) {
    signals.push("many-contradictions");
  }

  const confidence = fakeConfidenceFromSignals(signals);
  const verdict = confidence >= 60 ? "Likely Real" : confidence <= 35 ? "Likely Fake" : "Unclear / Needs Review";

  const explanation = [];
  if (signals.includes("too-short")) explanation.push("The text is very short — short claims often lack context or sources.");
  if (signals.includes("clickbait-y")) explanation.push("Language matches clickbait patterns; be cautious of exaggerated claims.");
  if (signals.includes("no-sources")) explanation.push("Claims use vague 'sources' without links — prefer named verifiable sources.");
  if (signals.includes("fabricated-dates")) explanation.push("The text references dates that appear to be in the future or inconsistent.");
  if (signals.includes("authoritative-sources")) explanation.push("Mentions recognized organizations — try to verify via their official channels.");
  if (signals.includes("image-manipulated")) explanation.push("Mentions AI-generation or manipulation; images/video may be altered.");
  if (signals.includes("many-contradictions")) explanation.push("The text contains contradictory statements — check multiple reputable sources.");

  if (explanation.length === 0) explanation.push("No strong heuristic red flags detected in the quick demo check.");

  return {
    verdict,
    confidence,
    signals,
    explanation,
    recommendedActions: [
      "Cross-check with 2 reputable outlets (official organizations, verified news sites)",
      "Search for the exact claim text in quotes — see if original context exists",
      "If image/video is claimed, reverse-image-search it or inspect metadata",
      "Prefer primary sources (official statements, reports) over social posts"
    ]
  };
}

export default function App() {
  const [tab, setTab] = useState("text");
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const fileRef = useRef();

  async function analyze() {
    setLoading(true);
    setResult(null);
    try {
      const payload = tab === "text" ? { type: "text", content: input } : tab === "url" ? { type: "url", content: url } : { type: "image", content: file ? file.name : "" };

      // Attempt to call backend; if it fails, use mockAnalyze.
      let resData = null;
      try {
        // NOTE: Replace /api/analyze with your real endpoint that performs robust AI checks.
        const resp = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (resp.ok) {
          resData = await resp.json();
        } else {
          // server returned an error -> fallback
          resData = await mockAnalyze(payload);
        }
      } catch (e) {
        // network failure -> fallback
        resData = await mockAnalyze(payload);
      }

      setResult(resData);
      setHistory((h) => [{ id: Date.now(), query: payload, timestamp: new Date().toISOString(), res: resData }, ...h].slice(0, 10));
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e) {
    const f = e.target.files[0];
    setFile(f || null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">TruthLens — AI Help to Spot Misinformation</h1>
            <p className="text-sm text-gray-600">Friendly, explanatory checks for text, URLs and images. Demo mode included.</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Demo Mode — No external keys required</div>
            <div className="mt-1">Tip: For production, connect to a verified fact-checking backend.</div>
          </div>
        </header>

        <main className="bg-white rounded-2xl shadow p-6">
          <nav className="flex gap-2 mb-4">
            {[
              { id: "text", label: "Text" },
              { id: "url", label: "URL" },
              { id: "image", label: "Image" }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1 rounded-xl text-sm ${tab === t.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </nav>

          <section className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {tab === "text" && (
                <div>
                  <label className="text-sm font-medium">Paste a claim or text to analyze</label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Examples:\n- "A new law will ban X from 2026-01-01"\n- "Celeb said Y"\n- paste tweet or paragraph here`}
                    className="mt-2 w-full min-h-[160px] p-3 rounded-lg border border-gray-200 resize-vertical"
                  />
                </div>
              )}

              {tab === "url" && (
                <div>
                  <label className="text-sm font-medium">Enter the URL you want checked</label>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="mt-2 w-full p-3 rounded-lg border border-gray-200" />
                  <p className="text-xs text-gray-500 mt-2">The app will try to fetch the page and scan for claims, but in Demo mode we run a quick heuristic check.</p>
                </div>
              )}

              {tab === "image" && (
                <div>
                  <label className="text-sm font-medium">Upload an image (or screenshot of a claim)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="mt-2" />
                  {file && (
                    <div className="mt-3 flex items-center gap-3">
                      <img alt="uploaded preview" src={URL.createObjectURL(file)} className="w-28 h-20 object-cover rounded-md border" />
                      <div>
                        <div className="text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button onClick={analyze} disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 text-white shadow">
                  {loading ? "Analyzing…" : "Analyze"}
                </button>
                <button
                  onClick={() => {
                    setInput("");
                    setUrl("");
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800">
                  Clear
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold">Quick Safety Tips</h3>
                <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                  <li>Always check the original source — official press releases and organization sites are best.</li>
                  <li>Watch for sensational language, missing sources, or images without metadata.</li>
                  <li>If uncertain, wait for multiple reputable outlets to confirm before sharing.</li>
                </ul>
              </div>
            </div>

            <aside className="md:col-span-1 bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium">History (recent)</h4>
              <div className="mt-2 space-y-3 text-xs">
                {history.length === 0 && <div className="text-gray-500">No checks yet — try analyzing something.</div>}
                {history.map((h) => (
                  <div key={h.id} className="bg-white p-2 rounded border">
                    <div className="font-medium">{h.query.type.toUpperCase()}</div>
                    <div className="text-gray-500 truncate">{(h.query.content || "(file)").toString().slice(0, 60)}</div>
                    <div className="text-gray-400 mt-1">{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          {/* Result area */}
          <section className="mt-6">
            {!result && (
              <div className="text-gray-500">Analysis results will appear here after you click Analyze. The demo returns a quick, explainable verdict and actions.</div>
            )}

            {result && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{result.verdict}</div>
                    <div className="text-xs text-gray-500">Confidence: {result.confidence}%</div>
                  </div>
                  <div className="text-sm">
                    <div className="mb-1">Signal badges:</div>
                    <div className="flex gap-2">
                      {result.signals.length === 0 && <span className="px-2 py-1 rounded-full bg-green-50 text-green-800 text-xs">No flags</span>}
                      {result.signals.map((s) => (
                        <span key={s} className="px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 text-xs capitalize">{s.replace(/-/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium">Why we think this</h5>
                    <ul className="mt-2 text-sm space-y-2">
                      {result.explanation.map((e, i) => (
                        <li key={i} className="text-gray-700">• {e}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium">Recommended next steps</h5>
                    <ol className="mt-2 text-sm list-decimal pl-5 space-y-2">
                      {result.recommendedActions.map((a, i) => (
                        <li key={i} className="text-gray-700">{a}</li>
                      ))}
                    </ol>

                    <div className="mt-4">
                      <button
                        onClick={() => {
                          // copy a short safety checklist to clipboard
                          const txt = `Claim: ${tab === 'text' ? input : tab === 'url' ? url : (file ? file.name : '')}\nVerdict: ${result.verdict} (${result.confidence}%)\nActions:\n- ${result.recommendedActions.join('\n- ')}`;
                          navigator.clipboard?.writeText(txt);
                          alert('Copied a short report to clipboard — you can paste it in messages or notes.');
                        }}
                        className="mt-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm">
                        Copy short report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer className="mt-4 text-center text-xs text-gray-400">
          Built as a demo to illustrate how an explainable misinformation-checker could look. For production, integrate with
          trusted fact-checking APIs and image forensic services.
        </footer>
      </div>
    </div>
  );
}
