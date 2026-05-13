"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";

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

function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    dur: `${Math.random() * 3 + 2}s`,
    delay: `${Math.random() * 4}s`,
  }));
}

const STARS = generateStars(80);

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [transcript, setTranscript] = useState("");
  const [progressMsg, setProgressMsg] = useState(FUN_MESSAGES[0]);
  const [skyboxUrl, setSkyboxUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [useTextMode, setUseTextMode] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const viewerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const rendererRef = useRef<{
    dispose: () => void;
  } | null>(null);
  const animFrameRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Browser support check ────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setSpeechSupported(false);
      setUseTextMode(true);
    }
  }, []);

  /* ── Cleanup on unmount ───────────────────────────── */
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      rendererRef.current?.dispose();
    };
  }, []);

  /* ── Voice recording ──────────────────────────────── */
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setErrorMsg(
          "🎤 Microphone access denied! Please allow microphone access and try again."
        );
      } else {
        setErrorMsg("🎤 Couldn't hear you — check your microphone!");
      }
      setAppState("error");
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        setAppState("ready");
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setAppState("listening");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (transcript.trim()) {
      setAppState("ready");
    } else {
      setAppState("idle");
    }
  }, [transcript]);

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
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Generation failed");
      }

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
            setSkyboxUrl(statusData.file_url);
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
              statusData.error_message ||
                "The magic fizzled out! Let's try again."
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
        err instanceof Error
          ? err.message
          : "Oops! Something went wrong. Let's try again!"
      );
      setAppState("error");
    }
  }, [transcript]);

  /* ── Three.js panorama ────────────────────────────── */
  useEffect(() => {
    if (appState !== "viewing" || !skyboxUrl || !viewerRef.current) return;
    const container = viewerRef.current;

    let disposed = false;

    import("three").then((THREE) => {
      if (disposed) return;

      const w = container.clientWidth;
      const h = container.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1100);
      camera.position.set(0, 0, 0.1);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const geo = new THREE.SphereGeometry(500, 64, 40);
      geo.scale(-1, 1, 1);

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      const tex = loader.load(skyboxUrl, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
      });
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      scene.add(new THREE.Mesh(geo, mat));

      let lon = 0;
      let lat = 0;
      let downX = 0;
      let downY = 0;
      let downLon = 0;
      let downLat = 0;
      let dragging = false;

      const onDown = (e: PointerEvent) => {
        dragging = true;
        downX = e.clientX;
        downY = e.clientY;
        downLon = lon;
        downLat = lat;
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        lon = (downX - e.clientX) * 0.15 + downLon;
        lat = (e.clientY - downY) * 0.15 + downLat;
      };
      const onUp = () => {
        dragging = false;
      };

      container.addEventListener("pointerdown", onDown);
      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerup", onUp);

      const onResize = () => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      };
      window.addEventListener("resize", onResize);

      const animate = () => {
        if (disposed) return;
        animFrameRef.current = requestAnimationFrame(animate);
        lat = Math.max(-85, Math.min(85, lat));
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        camera.lookAt(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta)
        );
        renderer.render(scene, camera);
      };

      if (!dragging) {
        const autoRotate = () => {
          if (dragging || disposed) return;
          lon += 0.05;
        };
        const autoId = setInterval(autoRotate, 16);
        container.addEventListener(
          "pointerdown",
          () => clearInterval(autoId),
          { once: true }
        );
      }

      animate();

      rendererRef.current = {
        dispose: () => {
          disposed = true;
          cancelAnimationFrame(animFrameRef.current);
          renderer.dispose();
          geo.dispose();
          mat.dispose();
          tex.dispose();
          container.removeEventListener("pointerdown", onDown);
          container.removeEventListener("pointermove", onMove);
          container.removeEventListener("pointerup", onUp);
          window.removeEventListener("resize", onResize);
          const canvas = container.querySelector("canvas");
          if (canvas) canvas.remove();
        },
      };
    });

    return () => {
      disposed = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [appState, skyboxUrl]);

  /* ── Reset ────────────────────────────────────────── */
  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (msgRef.current) clearInterval(msgRef.current);
    pollRef.current = null;
    msgRef.current = null;
    rendererRef.current?.dispose();
    rendererRef.current = null;

    setAppState("idle");
    setTranscript("");
    setProgressMsg(FUN_MESSAGES[0]);
    setSkyboxUrl("");
    setErrorMsg("");
  }, []);

  /* ── Handle text submit ───────────────────────────── */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (transcript.trim()) {
      generateSkybox();
    }
  };

  /* ── Pick example ─────────────────────────────────── */
  const pickExample = (text: string) => {
    const clean = text.replace(/^.\s/, "");
    setTranscript(clean);
    setAppState("ready");
  };

  /* ═══════════════════════════════════════════════════ */
  /*  R E N D E R                                       */
  /* ═══════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Background ────────────────────────────── */}
      <div className="starfield" aria-hidden="true">
        {STARS.map((s) => (
          <span
            key={s.id}
            className="star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              "--dur": s.dur,
              animationDelay: s.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      {/* ── 3-D Panorama (full-screen overlay) ────── */}
      {appState === "viewing" && (
        <>
          <div ref={viewerRef} className="panorama-container" />
          <div className="panorama-hint">👆 Drag to explore your world!</div>
          <div className="panorama-overlay">
            <button className="action-btn primary" onClick={reset}>
              ✨ Create Another World
            </button>
          </div>
        </>
      )}

      {/* ── Main UI ───────────────────────────────── */}
      {appState !== "viewing" && (
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
          <div className="glass-card fade-in flex w-full max-w-lg flex-col items-center gap-6 text-center">
            {/* Title */}
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  Voice2World
                </span>
              </h1>
              <p className="mt-2 text-base font-semibold text-slate-400 sm:text-lg">
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
                        appState === "listening"
                          ? stopListening
                          : startListening
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

                    <p className="text-sm font-semibold text-slate-400">
                      {appState === "listening"
                        ? "Listening… tap ⏹️ when done"
                        : "Tap the mic and describe your world"}
                    </p>
                  </>
                )}

                {/* Text input (text mode OR after recording) */}
                {(useTextMode || appState === "ready") && (
                  <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
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
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      or try an idea
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
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
              </div>
            )}

            {/* ── GENERATING ─────────────────────── */}
            {appState === "generating" && (
              <div className="fade-in flex flex-col items-center gap-5">
                <div className="globe-spinner" />
                <p className="progress-msg text-center">{progressMsg}</p>
                <p className="max-w-xs text-center text-sm text-slate-400">
                  &ldquo;{transcript}&rdquo;
                </p>
                <p className="text-xs text-slate-500">
                  This usually takes about 30 seconds…
                </p>
              </div>
            )}

            {/* ── ERROR ──────────────────────────── */}
            {appState === "error" && (
              <div className="fade-in flex flex-col items-center gap-4">
                <div className="text-5xl">😕</div>
                <p className="text-center font-bold text-red-300">
                  {errorMsg}
                </p>
                <button className="action-btn primary" onClick={reset}>
                  🔄 Try Again
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-8 text-xs text-slate-600">
            Powered by Blockade Labs &middot; Built with Next.js
          </p>
        </main>
      )}
    </>
  );
}
