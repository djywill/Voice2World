"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import { useSceneStore } from "@/lib/sceneStore";
import { StyleSelector } from "@/components/StyleSelector";

const SceneViewer = dynamic(() => import("@/components/SceneViewer"), {
  ssr: false,
});

type AppState =
  | "idle"
  | "listening"
  | "ready"
  | "generating"
  | "viewing"
  | "error";

const EXAMPLE_PROMPTS = [
  "🏰 A fairy-tale castle on a floating island in the clouds",
  "🌊 An underwater city with glowing jellyfish and coral towers",
  "🚀 A space station orbiting a planet with giant rings",
  "🍄 A magical mushroom forest with tiny glowing creatures",
  "🐉 A dragon's mountain cave filled with crystals and treasure",
  "🌸 A cherry blossom garden with a peaceful Japanese temple",
];

const FUN_MESSAGES = [
  "🎨 Painting the sky…",
  "🌳 Growing the trees…",
  "✨ Sprinkling magic dust…",
  "🏔️ Carving the mountains…",
  "🌊 Filling the oceans…",
  "☁️ Shaping the clouds…",
  "🌈 Mixing the colors…",
  "⭐ Hanging the stars…",
  "🦋 Releasing the butterflies…",
  "🔮 Casting the final spell…",
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [transcript, setTranscript] = useState("");
  const [progressMsg, setProgressMsg] = useState(FUN_MESSAGES[0]);
  const [errorMsg, setErrorMsg] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const { setScene, getSavedScenes, loadFromLocal, deleteFromLocal } =
    useSceneStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setSpeechSupported(false);
      setUseTextMode(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    };
  }, []);

  /* ── Voice recording ──────────────────────────────── */
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg(
        "🎤 Voice input is not supported in this browser.\n\nPlease use Chrome or Edge, or switch to ⌨️ Type mode."
      );
      setAppState("error");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      recognitionRef.current = null;
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          setErrorMsg("🎤 Microphone permission denied!");
          setAppState("error");
          break;
        case "no-speech":
          setErrorMsg("🎤 No speech detected — try speaking closer!");
          setAppState("error");
          break;
        case "audio-capture":
          setErrorMsg("🎤 No microphone found!");
          setAppState("error");
          break;
        case "network":
          setUseTextMode(true);
          setErrorMsg(
            "🎤 Voice service unavailable — switched to ⌨️ Type mode.\n\nVoice requires Chrome/Edge with a stable internet connection."
          );
          setAppState("error");
          break;
        case "aborted":
          break;
        default:
          setUseTextMode(true);
          setErrorMsg("🎤 Something went wrong — switched to ⌨️ Type mode.");
          setAppState("error");
      }
    };

    recognition.onend = () => {
      const wasActive = recognitionRef.current !== null;
      recognitionRef.current = null;
      if (wasActive) {
        setAppState(transcriptRef.current.trim() ? "ready" : "idle");
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setAppState("listening");
    } catch {
      setErrorMsg("🎤 Could not start voice recognition.");
      setAppState("error");
    }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    rec?.stop();
    setAppState(transcriptRef.current.trim() ? "ready" : "idle");
  }, []);

  /* ── Generate skybox ──────────────────────────────── */
  const generateSkybox = useCallback(async () => {
    const prompt = transcript.trim();
    if (!prompt) return;

    setAppState("generating");
    let msgIndex = 0;
    setProgressMsg(FUN_MESSAGES[0]);

    msgRef.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % FUN_MESSAGES.length;
      setProgressMsg(FUN_MESSAGES[msgIndex]);
    }, 3000);

    try {
      const body: Record<string, unknown> = { prompt };
      if (selectedStyle) body.skybox_style_id = selectedStyle;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");

      const generationId = data.id;
      if (!generationId) throw new Error("No generation ID returned");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status/${generationId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "complete" && statusData.file_url) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            pollRef.current = null;
            msgRef.current = null;

            setScene({
              id: String(generationId),
              name: prompt.slice(0, 50),
              prompt,
              skyboxUrl: statusData.file_url,
              skyboxStyleId: selectedStyle,
              mediaPanels: [],
              hotspots: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            setAppState("viewing");
          } else if (
            statusData.status === "error" ||
            statusData.status === "abort"
          ) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            pollRef.current = null;
            msgRef.current = null;
            setErrorMsg(
              statusData.error_message || "The magic fizzled out! Try again."
            );
            setAppState("error");
          }
        } catch {
          /* network blip — keep polling */
        }
      }, 3000);
    } catch (err) {
      if (msgRef.current) clearInterval(msgRef.current);
      msgRef.current = null;
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong!"
      );
      setAppState("error");
    }
  }, [transcript, selectedStyle, setScene]);

  /* ── Reset ────────────────────────────────────────── */
  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (msgRef.current) clearInterval(msgRef.current);
    pollRef.current = null;
    msgRef.current = null;
    setScene(null);
    setAppState("idle");
    setTranscript("");
    setProgressMsg(FUN_MESSAGES[0]);
    setErrorMsg("");
  }, [setScene]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (transcript.trim()) generateSkybox();
  };

  const pickExample = (text: string) => {
    setTranscript(text.replace(/^.\s/, ""));
    setAppState("ready");
  };

  const savedScenes = showSaved ? getSavedScenes() : [];

  /* ═══════════════════════════════════════════════════ */
  /*  R E N D E R                                       */
  /* ═══════════════════════════════════════════════════ */
  return (
    <>
      {/* Background blobs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      {/* 3D Scene (full-screen) */}
      {appState === "viewing" && <SceneViewer onReset={reset} />}

      {/* Main UI */}
      {appState !== "viewing" && (
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="glass-card fade-in flex w-full max-w-lg flex-col items-center gap-6 text-center">
            {/* Logos */}
            <div className="logo-bar">
              <img
                src="/eduhk-logo.png"
                alt="The Education University of Hong Kong"
                style={{ height: 56 }}
              />
              <img
                src="/lttc-logo.png"
                alt="Centre for Learning, Teaching and Technology"
                style={{ height: 36 }}
              />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 bg-clip-text text-transparent">
                  Voice2World
                </span>
              </h1>
              <p
                className="mt-2 text-base font-semibold sm:text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Speak your imagination into a 3D world!
              </p>
            </div>

            {/* ── IDLE / LISTENING / READY ────────── */}
            {(appState === "idle" ||
              appState === "listening" ||
              appState === "ready") && (
              <div className="fade-in flex w-full flex-col items-center gap-5">
                {/* Mic button (voice mode) */}
                {!useTextMode && (
                  <>
                    <button
                      className={`mic-btn ${appState === "listening" ? "recording" : ""}`}
                      onClick={
                        appState === "listening" ? stopListening : startListening
                      }
                      aria-label={
                        appState === "listening"
                          ? "Stop recording"
                          : "Start recording"
                      }
                    >
                      {appState === "listening" ? "⏹️" : "🎤"}
                    </button>

                    {appState === "listening" && (
                      <div className="sound-waves">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <span
                            key={i}
                            className="wave-bar"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    )}

                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {appState === "listening"
                        ? "Listening… tap ⏹️ when done"
                        : "Tap the mic and describe your world"}
                    </p>
                  </>
                )}

                {/* Text input */}
                {(useTextMode || appState === "ready") && (
                  <form
                    onSubmit={handleSubmit}
                    className="w-full flex flex-col items-center gap-4"
                  >
                    <textarea
                      className="prompt-area"
                      value={transcript}
                      onChange={(e) => {
                        setTranscript(e.target.value);
                        if (e.target.value.trim()) setAppState("ready");
                      }}
                      placeholder="Describe the world you want to create…"
                      rows={3}
                    />

                    {/* Style Selector */}
                    <StyleSelector
                      value={selectedStyle}
                      onChange={setSelectedStyle}
                    />

                    {transcript.trim() && (
                      <button type="submit" className="action-btn primary">
                        ✨ Create My World!
                      </button>
                    )}
                  </form>
                )}

                {/* Mode toggle */}
                {speechSupported && appState !== "listening" && (
                  <button
                    className="mode-toggle"
                    onClick={() => setUseTextMode((v) => !v)}
                  >
                    {useTextMode ? "🎤 Use voice instead" : "⌨️ Type instead"}
                  </button>
                )}

                {/* Divider */}
                {appState === "idle" && (
                  <div className="flex w-full items-center gap-3">
                    <div className="h-px flex-1 bg-black/8" />
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      or try an idea
                    </span>
                    <div className="h-px flex-1 bg-black/8" />
                  </div>
                )}

                {/* Example prompts */}
                {appState === "idle" && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {EXAMPLE_PROMPTS.map((p) => (
                      <button
                        key={p}
                        className="chip"
                        onClick={() => pickExample(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Saved scenes */}
                {appState === "idle" && (
                  <div className="w-full">
                    <button
                      className="mode-toggle"
                      onClick={() => setShowSaved((v) => !v)}
                    >
                      📂 {showSaved ? "Hide" : "Load"} Saved Scenes
                    </button>
                    {showSaved && savedScenes.length > 0 && (
                      <div className="saved-list">
                        {savedScenes.map((s) => (
                          <div key={s.id} className="saved-item">
                            <button
                              className="saved-name"
                              onClick={() => {
                                loadFromLocal(s.id);
                                setAppState("viewing");
                              }}
                            >
                              {s.name}
                            </button>
                            <button
                              className="saved-delete"
                              onClick={() => {
                                deleteFromLocal(s.id);
                                setShowSaved(false);
                                setTimeout(() => setShowSaved(true), 0);
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {showSaved && savedScenes.length === 0 && (
                      <p
                        className="text-sm mt-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No saved scenes yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── GENERATING ─────────────────────── */}
            {appState === "generating" && (
              <div className="fade-in flex flex-col items-center gap-5">
                <div className="globe-spinner" />
                <p className="progress-msg text-center">{progressMsg}</p>
                <p
                  className="max-w-xs text-center text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  &ldquo;{transcript}&rdquo;
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  This usually takes about 30 seconds…
                </p>
              </div>
            )}

            {/* ── ERROR ──────────────────────────── */}
            {appState === "error" && (
              <div className="fade-in flex flex-col items-center gap-4">
                <div className="text-5xl">😕</div>
                <p className="text-center font-bold text-red-500 whitespace-pre-line">
                  {errorMsg}
                </p>
                <button className="action-btn primary" onClick={reset}>
                  🔄 Try Again
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center gap-1">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Powered by LTTC
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              AI may generate inaccurate content.
            </p>
          </div>
        </main>
      )}
    </>
  );
}
