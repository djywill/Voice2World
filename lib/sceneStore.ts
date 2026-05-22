import { create } from "zustand";
import type { SceneData, MediaPanelData, HotspotData } from "@/types/scene";

interface SceneState {
  scene: SceneData | null;
  mode: "view" | "edit";
  selectedId: string | null;
  activeHotspot: string | null;

  setScene: (scene: SceneData | null) => void;
  updateSkybox: (url: string, prompt?: string) => void;
  setMode: (mode: "view" | "edit") => void;
  setSelected: (id: string | null) => void;
  setActiveHotspot: (id: string | null) => void;

  addMediaPanel: (panel: MediaPanelData) => void;
  updateMediaPanel: (id: string, updates: Partial<MediaPanelData>) => void;
  removeMediaPanel: (id: string) => void;

  addHotspot: (hotspot: HotspotData) => void;
  updateHotspot: (id: string, updates: Partial<HotspotData>) => void;
  removeHotspot: (id: string) => void;

  saveToLocal: () => void;
  loadFromLocal: (id: string) => boolean;
  getSavedScenes: () => Array<{ id: string; name: string; updatedAt: number }>;
  deleteFromLocal: (id: string) => void;
}

const STORAGE_KEY = "voice2world-scenes";

function readScenes(): SceneData[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeScenes(scenes: SceneData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: null,
  mode: "view",
  selectedId: null,
  activeHotspot: null,

  setScene: (scene) =>
    set({ scene, mode: "view", selectedId: null, activeHotspot: null }),

  updateSkybox: (url, prompt) =>
    set((s) =>
      s.scene
        ? {
            scene: {
              ...s.scene,
              skyboxUrl: url,
              ...(prompt ? { prompt } : {}),
              updatedAt: Date.now(),
            },
          }
        : {}
    ),

  setMode: (mode) =>
    set({ mode, selectedId: mode === "view" ? null : get().selectedId }),

  setSelected: (id) => set({ selectedId: id }),

  setActiveHotspot: (id) => set({ activeHotspot: id }),

  addMediaPanel: (panel) =>
    set((s) => {
      if (!s.scene) return {};
      return {
        scene: {
          ...s.scene,
          mediaPanels: [...s.scene.mediaPanels, panel],
          updatedAt: Date.now(),
        },
      };
    }),

  updateMediaPanel: (id, updates) =>
    set((s) => {
      if (!s.scene) return {};
      return {
        scene: {
          ...s.scene,
          mediaPanels: s.scene.mediaPanels.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeMediaPanel: (id) =>
    set((s) => {
      if (!s.scene) return {};
      return {
        scene: {
          ...s.scene,
          mediaPanels: s.scene.mediaPanels.filter((p) => p.id !== id),
          updatedAt: Date.now(),
        },
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    }),

  addHotspot: (hotspot) =>
    set((s) => {
      if (!s.scene) return {};
      return {
        scene: {
          ...s.scene,
          hotspots: [...s.scene.hotspots, hotspot],
          updatedAt: Date.now(),
        },
      };
    }),

  updateHotspot: (id, updates) =>
    set((s) => {
      if (!s.scene) return {};
      return {
        scene: {
          ...s.scene,
          hotspots: s.scene.hotspots.map((h) =>
            h.id === id ? { ...h, ...updates } : h
          ),
          updatedAt: Date.now(),
        },
      };
    }),

  removeHotspot: (id) =>
    set((s) => {
      if (!s.scene) return {};
      return {
        scene: {
          ...s.scene,
          hotspots: s.scene.hotspots.filter((h) => h.id !== id),
          updatedAt: Date.now(),
        },
        selectedId: s.selectedId === id ? null : s.selectedId,
        activeHotspot: s.activeHotspot === id ? null : s.activeHotspot,
      };
    }),

  saveToLocal: () => {
    const { scene } = get();
    if (!scene) return;
    const scenes = readScenes();
    const idx = scenes.findIndex((s) => s.id === scene.id);
    const updated = { ...scene, updatedAt: Date.now() };
    if (idx >= 0) scenes[idx] = updated;
    else scenes.push(updated);
    writeScenes(scenes);
    set({ scene: updated });
  },

  loadFromLocal: (id) => {
    const scenes = readScenes();
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return false;
    set({ scene, mode: "view", selectedId: null, activeHotspot: null });
    return true;
  },

  getSavedScenes: () =>
    readScenes().map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),

  deleteFromLocal: (id) => {
    writeScenes(readScenes().filter((s) => s.id !== id));
  },
}));
