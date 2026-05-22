export interface MediaPanelData {
  id: string;
  type: "image" | "video";
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number];
  title: string;
}

export interface HotspotData {
  id: string;
  position: [number, number, number];
  label: string;
  content: string;
  color: string;
}

export interface SceneData {
  id: string;
  name: string;
  prompt: string;
  skyboxUrl: string;
  skyboxStyleId: number | null;
  mediaPanels: MediaPanelData[];
  hotspots: HotspotData[];
  createdAt: number;
  updatedAt: number;
}

export interface SkyboxStyle {
  id: number;
  name: string;
  model_version: number;
}
