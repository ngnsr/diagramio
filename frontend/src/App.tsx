import { useEffect, useState } from "react";
import "./App.css";
import MermaidEditor from "./components/MermaidEditor";

function App() {
  const [backendMessage, setBackendMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [diagram, setDiagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:3000/health")
      .then((r) => r.json())
      .then((d) => setBackendMessage(`Backend status: ${d.status}`))
      .catch(() =>
        setBackendMessage("Backend unavailable at http://localhost:3000")
      );
  }, []);

  const generate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:3000/api/generate-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDiagram(data.mermaidSyntax);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Diagram Generator</h1>
        <p>{backendMessage}</p>

        {diagram && (
          <div className="editor-wrapper">
            <MermaidEditor initialCode={diagram} onCodeChange={setDiagram} />
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="input-section">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe your diagram..."
          />
          <button onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
