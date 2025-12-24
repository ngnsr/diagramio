import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [backendMessage, setBackendMessage] = useState(
    "Loading backend message..."
  );

  useEffect(() => {
    const fetchBackend = async () => {
      try {
        const response = await fetch("http://localhost:3000/");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const message = await response.text();
        setBackendMessage(message);
      } catch (error) {
        console.error("Failed to fetch from backend:", error);
        setBackendMessage("Failed to connect to backend. Is it running?");
      }
    };
    fetchBackend();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Diagram Generator</h1>
        <p>{backendMessage}</p> {/* Display message from backend */}
        {/* Your diagram generation UI will go here */}
      </header>
    </div>
  );
}

export default App;
