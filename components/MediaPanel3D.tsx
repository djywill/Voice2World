"use client";

import { useCallback } from "react";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import type { MediaPanelData } from "@/types/scene";
import { useSceneStore } from "@/lib/sceneStore";

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed)/.test(url);
}

function getYouTubeEmbedUrl(url: string): string {
  let videoId = "";
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (watchMatch) videoId = watchMatch[1];
  else if (shortMatch) videoId = shortMatch[1];
  else if (embedMatch) videoId = embedMatch[1];
  return videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
    : url;
}

function ImagePanel({
  data,
  isSelected,
  isEditMode,
}: {
  data: MediaPanelData;
  isSelected: boolean;
  isEditMode: boolean;
}) {
  const texture = useTexture(data.url);
  const { setSelected } = useSceneStore();

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      if (isEditMode) setSelected(data.id);
    },
    [isEditMode, data.id, setSelected]
  );

  return (
    <group position={data.position} rotation={data.rotation}>
      {isSelected && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[data.scale[0] + 0.3, data.scale[1] + 0.3]} />
          <meshBasicMaterial color="#7c5cbf" transparent opacity={0.6} />
        </mesh>
      )}
      <mesh onClick={handleClick}>
        <planeGeometry args={data.scale} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
      {data.title && (
        <Html position={[0, -data.scale[1] / 2 - 0.4, 0]} center>
          <div className="panel-label">{data.title}</div>
        </Html>
      )}
    </group>
  );
}

function VideoPanel({
  data,
  isSelected,
  isEditMode,
}: {
  data: MediaPanelData;
  isSelected: boolean;
  isEditMode: boolean;
}) {
  const { setSelected } = useSceneStore();
  const isYT = isYouTubeUrl(data.url);
  const pxW = data.scale[0] * 160;
  const pxH = data.scale[1] * 160;

  return (
    <group position={data.position} rotation={data.rotation}>
      {isSelected && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[data.scale[0] + 0.3, data.scale[1] + 0.3]} />
          <meshBasicMaterial color="#7c5cbf" transparent opacity={0.6} />
        </mesh>
      )}
      <Html
        transform
        distanceFactor={1.5}
        style={{
          width: `${pxW}px`,
          height: `${pxH}px`,
          pointerEvents: isEditMode ? "none" : "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#000",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => {
            if (isEditMode) {
              e.stopPropagation();
              setSelected(data.id);
            }
          }}
        >
          {isYT ? (
            <iframe
              src={getYouTubeEmbedUrl(data.url)}
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={data.url}
              controls
              muted
              loop
              playsInline
              preload="auto"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
      </Html>
      {data.title && (
        <Html
          position={[0, -data.scale[1] / 2 - 0.4, 0]}
          center
        >
          <div className="panel-label">{data.title}</div>
        </Html>
      )}
    </group>
  );
}

export function MediaPanel3D({
  data,
  isSelected,
  isEditMode,
}: {
  data: MediaPanelData;
  isSelected: boolean;
  isEditMode: boolean;
}) {
  if (data.type === "video") {
    return (
      <VideoPanel data={data} isSelected={isSelected} isEditMode={isEditMode} />
    );
  }
  return (
    <ImagePanel data={data} isSelected={isSelected} isEditMode={isEditMode} />
  );
}
