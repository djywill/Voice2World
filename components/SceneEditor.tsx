"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSceneStore } from "@/lib/sceneStore";
import { cameraState } from "@/lib/cameraState";
import type { MediaPanelData, HotspotData } from "@/types/scene";

type Dialog = "addImage" | "addVideo" | "addHotspot" | "regenerate" | null;

const REGEN_MESSAGES = [
  "🎨 Painting the new sky…",
  "🌳 Growing new trees…",
  "✨ Sprinkling magic dust…",
  "🏔️ Carving new mountains…",
  "🌊 Reshaping the oceans…",
  "☁️ Reshaping the clouds…",
  "🌈 Mixing new colors…",
  "⭐ Hanging new stars…",
];

export function SceneEditor({ onReset }: { onReset: () => void }) {
  const store = useSceneStore();
  const { scene, mode, selectedId } = store;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState(REGEN_MESSAGES[0]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    };
  }, []);

  const setField = useCallback(
    (key: string, val: string) => setFormData((f) => ({ ...f, [key]: val })),
    []
  );

  if (!scene) return null;

  const selected: MediaPanelData | HotspotData | undefined =
    scene.mediaPanels.find((p) => p.id === selectedId) ??
    scene.hotspots.find((h) => h.id === selectedId);

  const isMedia = selected && "url" in selected;
  const isHotspot = selected && "label" in selected && !("url" in selected);

  const placementPos = (): [number, number, number] => {
    const { position: p, direction: d } = cameraState;
    return [p[0] + d[0] * 6, Math.max(p[1], 1.6), p[2] + d[2] * 6];
  };

  const placementRot = (): [number, number, number] => {
    const { direction: d } = cameraState;
    return [0, Math.atan2(d[0], d[2]) + Math.PI, 0];
  };

  const handleAddMedia = (type: "image" | "video") => {
    const url = formData.url?.trim();
    if (!url) return;
    const id = `${type}-${Date.now()}`;
    store.addMediaPanel({
      id,
      type,
      url,
      position: placementPos(),
      rotation: placementRot(),
      scale: [4, 3],
      title: formData.title?.trim() || "",
    });
    setFormData({});
    setDialog(null);
    store.setSelected(id);
  };

  const handleAddHotspot = () => {
    const label = formData.label?.trim();
    if (!label) return;
    const id = `hotspot-${Date.now()}`;
    store.addHotspot({
      id,
      position: placementPos(),
      label,
      content: formData.content?.trim() || "",
      color: formData.color || "#5b63d3",
    });
    setFormData({});
    setDialog(null);
    store.setSelected(id);
  };

  const handleSave = () => {
    store.saveToLocal();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (isMedia) store.removeMediaPanel(selectedId);
    else if (isHotspot) store.removeHotspot(selectedId);
  };

  const nudge = (axis: 0 | 1 | 2, delta: number) => {
    if (!selectedId || !selected) return;
    const pos = [...selected.position] as [number, number, number];
    pos[axis] += delta;
    if (isMedia) store.updateMediaPanel(selectedId, { position: pos });
    else if (isHotspot) store.updateHotspot(selectedId, { position: pos });
  };

  const handleRegenerate = async () => {
    const prompt = formData.regenPrompt?.trim();
    if (!prompt) return;

    setDialog(null);
    setRegenerating(true);
    let idx = 0;
    setRegenMsg(REGEN_MESSAGES[0]);
    msgRef.current = setInterval(() => {
      idx = (idx + 1) % REGEN_MESSAGES.length;
      setRegenMsg(REGEN_MESSAGES[idx]);
    }, 3000);

    try {
      const body: Record<string, unknown> = { prompt };
      if (scene.skyboxStyleId) body.skybox_style_id = scene.skyboxStyleId;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");

      const generationId = data.id;
      if (!generationId) throw new Error("No generation ID");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status/${generationId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "complete" && statusData.file_url) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            pollRef.current = null;
            msgRef.current = null;
            store.updateSkybox(statusData.file_url, formData.regenPrompt?.trim());
            setRegenerating(false);
            setFormData({});
          } else if (
            statusData.status === "error" ||
            statusData.status === "abort"
          ) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            pollRef.current = null;
            msgRef.current = null;
            setRegenerating(false);
            alert("Generation failed. Please try again.");
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          if (msgRef.current) clearInterval(msgRef.current);
          pollRef.current = null;
          msgRef.current = null;
          setRegenerating(false);
        }
      }, 3000);
    } catch {
      if (msgRef.current) clearInterval(msgRef.current);
      msgRef.current = null;
      setRegenerating(false);
      alert("Failed to start generation. Please try again.");
    }
  };

  return (
    <>
      {/* Controls hint */}
      <div className="scene-hint">
        <span>🖱️ Drag to look</span>
        <span>⌨️ WASD to walk</span>
        {mode === "edit" && <span>📌 Click objects to select</span>}
      </div>

      {/* Regenerating overlay */}
      {regenerating && createPortal(
        <div className="regen-overlay">
          <div className="regen-spinner" />
          <p className="regen-msg">{regenMsg}</p>
          <p className="regen-sub">Regenerating skybox…</p>
        </div>,
        document.body
      )}

      {/* Toolbar */}
      <div className="scene-toolbar">
        {mode === "view" ? (
          <>
            <button className="toolbar-btn" onClick={() => store.setMode("edit")}>
              ✏️ Edit Scene
            </button>
            <button className="toolbar-btn" onClick={handleSave}>
              {saved ? "✅ Saved!" : "💾 Save"}
            </button>
            <button className="toolbar-btn" onClick={onReset}>
              ✨ New World
            </button>
          </>
        ) : (
          <>
            <button className="toolbar-btn accent" onClick={() => setDialog("addImage")}>
              🖼️ Image
            </button>
            <button className="toolbar-btn accent" onClick={() => setDialog("addVideo")}>
              🎬 Video
            </button>
            <button className="toolbar-btn accent" onClick={() => setDialog("addHotspot")}>
              📌 Info Point
            </button>
            <button
              className="toolbar-btn accent"
              onClick={() => {
                setFormData({ regenPrompt: scene.prompt });
                setDialog("regenerate");
              }}
            >
              🔄 Change Sky
            </button>
            <button className="toolbar-btn" onClick={handleSave}>
              {saved ? "✅ Saved!" : "💾 Save"}
            </button>
            <button className="toolbar-btn primary" onClick={() => store.setMode("view")}>
              ✅ Done
            </button>
          </>
        )}
      </div>

      {/* Properties panel */}
      {mode === "edit" && selected && (
        <div className="props-panel">
          <h3>{isMedia ? "🖼️ Media Panel" : "📌 Info Point"}</h3>

          {isMedia && (
            <>
              <label>Title</label>
              <input
                value={(selected as MediaPanelData).title}
                onChange={(e) =>
                  store.updateMediaPanel(selectedId!, { title: e.target.value })
                }
              />
              <label>URL</label>
              <input
                value={(selected as MediaPanelData).url}
                onChange={(e) =>
                  store.updateMediaPanel(selectedId!, { url: e.target.value })
                }
              />
            </>
          )}

          {isHotspot && (
            <>
              <label>Label</label>
              <input
                value={(selected as HotspotData).label}
                onChange={(e) =>
                  store.updateHotspot(selectedId!, { label: e.target.value })
                }
              />
              <label>Content</label>
              <textarea
                value={(selected as HotspotData).content}
                onChange={(e) =>
                  store.updateHotspot(selectedId!, { content: e.target.value })
                }
                rows={3}
              />
            </>
          )}

          <div className="nudge-group">
            <label>Position</label>
            {(["X", "Y", "Z"] as const).map((label, i) => (
              <div key={label} className="nudge-row">
                <span>{label}</span>
                <button onClick={() => nudge(i as 0 | 1 | 2, -0.5)}>◀</button>
                <span className="nudge-val">
                  {selected.position[i].toFixed(1)}
                </span>
                <button onClick={() => nudge(i as 0 | 1 | 2, 0.5)}>▶</button>
              </div>
            ))}
          </div>

          <button className="delete-btn" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      )}

      {/* Portaled dialogs — rendered to document.body to escape drei's stacking context */}
      {dialog && dialog !== "regenerate" && createPortal(
        <div className="dialog-backdrop" onClick={() => { setDialog(null); setFormData({}); }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>
              {dialog === "addImage" && "🖼️ Add Image"}
              {dialog === "addVideo" && "🎬 Add Video"}
              {dialog === "addHotspot" && "📌 Add Info Point"}
            </h3>

            {(dialog === "addImage" || dialog === "addVideo") && (
              <>
                <label>Title (optional)</label>
                <input
                  placeholder="e.g. Lesson 1 Introduction"
                  value={formData.title || ""}
                  onChange={(e) => setField("title", e.target.value)}
                />
                <label>
                  {dialog === "addImage" ? "Image URL" : "Video URL"}
                </label>
                <input
                  placeholder={
                    dialog === "addImage"
                      ? "https://example.com/photo.jpg"
                      : "YouTube link or .mp4 URL"
                  }
                  value={formData.url || ""}
                  onChange={(e) => setField("url", e.target.value)}
                />
              </>
            )}

            {dialog === "addHotspot" && (
              <>
                <label>Label</label>
                <input
                  placeholder="e.g. Fun Fact!"
                  value={formData.label || ""}
                  onChange={(e) => setField("label", e.target.value)}
                />
                <label>Content</label>
                <textarea
                  placeholder="Information shown when clicked…"
                  value={formData.content || ""}
                  onChange={(e) => setField("content", e.target.value)}
                  rows={4}
                />
              </>
            )}

            <div className="dialog-actions">
              <button
                className="action-btn secondary"
                onClick={() => { setDialog(null); setFormData({}); }}
              >
                Cancel
              </button>
              <button
                className="action-btn primary"
                onClick={() => {
                  if (dialog === "addImage") handleAddMedia("image");
                  else if (dialog === "addVideo") handleAddMedia("video");
                  else handleAddHotspot();
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Regenerate skybox dialog */}
      {dialog === "regenerate" && createPortal(
        <div className="dialog-backdrop" onClick={() => { setDialog(null); setFormData({}); }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>🔄 Change Sky / Scene</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 12px" }}>
              Enter a new description to regenerate the 360° background. Your media panels and info points will be preserved.
            </p>
            <label>Scene Description</label>
            <textarea
              placeholder="Describe the scene you want…"
              value={formData.regenPrompt || ""}
              onChange={(e) => setField("regenPrompt", e.target.value)}
              rows={3}
              style={{ resize: "vertical" }}
            />
            <div className="dialog-actions">
              <button
                className="action-btn secondary"
                onClick={() => { setDialog(null); setFormData({}); }}
              >
                Cancel
              </button>
              <button
                className="action-btn primary"
                onClick={handleRegenerate}
                disabled={!formData.regenPrompt?.trim()}
              >
                🔄 Regenerate Sky
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
