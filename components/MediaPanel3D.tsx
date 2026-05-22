"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import type { MediaPanelData } from "@/types/scene";
import { useSceneStore } from "@/lib/sceneStore";

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
    <group
      position={data.position}
      rotation={data.rotation}
    >
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
  const [isPlaying, setIsPlaying] = useState(false);

  const video = useMemo(() => {
    const v = document.createElement("video");
    v.src = data.url;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    return v;
  }, [data.url]);

  const videoTexture = useMemo(() => new THREE.VideoTexture(video), [video]);

  useEffect(() => {
    video.play().catch(() => {});
    setIsPlaying(true);
    return () => {
      video.pause();
      video.src = "";
      videoTexture.dispose();
    };
  }, [video, videoTexture]);

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      if (isEditMode) {
        setSelected(data.id);
        return;
      }
      if (isPlaying) {
        video.pause();
        video.muted = true;
      } else {
        video.muted = false;
        video.play();
      }
      setIsPlaying(!isPlaying);
    },
    [isEditMode, data.id, setSelected, isPlaying, video]
  );

  return (
    <group
      position={data.position}
      rotation={data.rotation}
    >
      {isSelected && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[data.scale[0] + 0.3, data.scale[1] + 0.3]} />
          <meshBasicMaterial color="#7c5cbf" transparent opacity={0.6} />
        </mesh>
      )}
      <mesh onClick={handleClick}>
        <planeGeometry args={data.scale} />
        <meshBasicMaterial map={videoTexture} side={THREE.DoubleSide} />
      </mesh>
      {!isEditMode && (
        <Html position={[0, 0, 0.01]} center>
          <button className="video-play-btn" onClick={() => handleClick({} as THREE.Event)}>
            {isPlaying ? "⏸" : "▶️"}
          </button>
        </Html>
      )}
      {data.title && (
        <Html position={[0, -data.scale[1] / 2 - 0.4, 0]} center>
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
    return <VideoPanel data={data} isSelected={isSelected} isEditMode={isEditMode} />;
  }
  return <ImagePanel data={data} isSelected={isSelected} isEditMode={isEditMode} />;
}
