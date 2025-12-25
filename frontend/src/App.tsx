import { useEffect, useState, useRef } from "react";
import MermaidEditor from "./components/MermaidEditor";
import { SAMPLE_PROMPT, SAMPLE_MERMAID } from "./examples/sample-diagrams";

const API_BASE_URL = "http://localhost:3000/api";

function App() {
  const [backendMessage, setBackendMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [diagram, setDiagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then((d) => setBackendMessage(`Backend status: ${d.status}`))
      .catch(() =>
        setBackendMessage("Backend unavailable at http://localhost:3000")
      );
  }, []);

  useEffect(() => {
    setPrompt(SAMPLE_PROMPT.trim());
    setDiagram(SAMPLE_MERMAID.trim());
  }, []);

  const generateOrImprove = async (isImprovement: boolean) => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let apiUrl = `${API_BASE_URL}/generate-diagram`;
      let requestBody: any = { text: prompt };

      if (isImprovement && diagram) {
        apiUrl = `${API_BASE_URL}/improve-diagram`;
        requestBody = {
          currentDiagram: diagram,
          prompt: prompt,
        };
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error! Status: ${res.status}`);
      }

      setDiagram(data.mermaidSyntax);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred during generation/improvement.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartStopRecording = async () => {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      !MediaRecorder
    ) {
      setError("Your browser does not support recording audio.");
      return;
    }

    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        if (!streamRef.current.getAudioTracks().length) {
          throw new Error("No audio recording detected.");
        }

        const recorder = new MediaRecorder(streamRef.current, {
          mimeType: "audio/webm",
        });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            console.log(`Collected chunk of size: ${event.data.size}`);
          }
        };

        recorder.onstop = async () => {
          console.log("MediaRecorder 'onstop' event fired.");

          const blob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          audioChunksRef.current = [];

          console.log(`Final blob size: ${blob.size}`);

          if (blob.size === 0) {
            setError("No audio recorded or recording was too short.");
            console.warn("Blob size is 0, not sending to backend.");
            releaseMicrophone();
            return;
          }

          const formData = new FormData();
          formData.append("audio", blob, `recording-${Date.now()}.webm`);

          setLoading(true);
          setError(null);

          try {
            const response = await fetch(`${API_BASE_URL}/transcribe`, {
              method: "POST",
              body: formData,
            });

            const responseText = await response.text();
            console.log("Raw response from /transcribe:", responseText);

            if (!response.ok) {
              let errorMessage = `Transcription failed with status: ${response.status}`;
              try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error || errorMessage;
              } catch {
                errorMessage = `Transcription failed: ${responseText}`;
              }
              throw new Error(errorMessage);
            }

            const result = JSON.parse(responseText);

            setPrompt((prevPrompt) =>
              prevPrompt ? `${prevPrompt} ${result.text}` : result.text
            );
            if (promptInputRef.current) {
              promptInputRef.current.scrollTop =
                promptInputRef.current.scrollHeight;
            }
          } catch (e: unknown) {
            console.error("Error during transcription process:", e);
            if (e instanceof Error) {
              setError(e.message);
            } else {
              setError("An unknown error occurred during transcription.");
            }
          } finally {
            setLoading(false);
            releaseMicrophone();
          }
        };

        recorder.start();
        setIsRecording(true);
        setError(null);
      } catch (e: unknown) {
        console.error("Error accessing microphone or starting recording:", e);
        let userFacingError = "Failed to start recording.";
        if (e instanceof Error) {
          if (
            e.message.includes("permission") ||
            e.name === "NotAllowedError"
          ) {
            userFacingError =
              "Microphone access denied. Please grant permission in your browser settings.";
          } else if (
            e.message.includes("audio") ||
            e.name === "NotFoundError" ||
            e.name === "NotReadableError"
          ) {
            userFacingError =
              "Could not access microphone. Ensure it's connected and not in use by another application.";
          } else {
            userFacingError = `Error starting recording: ${e.message}`;
          }
        }
        setError(userFacingError);
        setIsRecording(false);
        releaseMicrophone();
      }
    }
  };

  const releaseMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      console.log("Microphone stream released.");
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      releaseMicrophone();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Diagram Generator & Improver</h1>
        <p>{backendMessage}</p>

        {diagram && (
          <div className="editor-wrapper">
            <MermaidEditor initialCode={diagram} onCodeChange={setDiagram} />
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="input-section input-section-with-buttons">
          <div className="input-actions">
            <textarea
              ref={promptInputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Describe your diagram or how to improve it..."
            />
            <div className="action-buttons">
              <button
                onClick={handleStartStopRecording}
                disabled={loading}
                className={`btn ${
                  isRecording ? "btn-recording" : "btn-secondary"
                }`}
              >
                {isRecording ? "Stop Recording" : "Record"}
              </button>
              <button
                onClick={() => generateOrImprove(false)}
                disabled={loading}
                className="btn btn-primary"
              >
                Generate
              </button>
              {diagram && (
                <button
                  onClick={() => generateOrImprove(true)}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  Improve
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
