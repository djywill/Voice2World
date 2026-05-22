"use client";

import { useState, useEffect } from "react";
import type { SkyboxStyle } from "@/types/scene";

const CARTOON_KW = [
  "cartoon", "anime", "digital painting", "illustration",
  "watercolor", "fantasy", "dreamscape", "stylize",
];

export function StyleSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [styles, setStyles] = useState<SkyboxStyle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/styles")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = [...data]
            .map((s: Record<string, unknown>) => ({
              id: s.id as number,
              name: s.name as string,
              model_version: s.model_version as number,
            }))
            .sort((a, b) => {
              const aHit = CARTOON_KW.some((k) => a.name.toLowerCase().includes(k)) ? 0 : 1;
              const bHit = CARTOON_KW.some((k) => b.name.toLowerCase().includes(k)) ? 0 : 1;
              return aHit - bHit;
            });
          setStyles(sorted);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Loading styles…
      </p>
    );
  }

  if (styles.length === 0) return null;

  return (
    <div className="style-selector">
      <p
        className="text-sm font-bold"
        style={{ color: "var(--text-secondary)" }}
      >
        🎨 Pick a style (cartoon styles first):
      </p>
      <div className="style-grid">
        {styles.map((s) => (
          <button
            key={s.id}
            className={`style-chip ${value === s.id ? "active" : ""}`}
            onClick={() => onChange(value === s.id ? null : s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
