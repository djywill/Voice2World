"use client";

import { Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/lib/sceneStore";
import { Skybox } from "./Skybox";
import { FPSController } from "./FPSController";
import { MediaPanel3D } from "./MediaPanel3D";
import { Hotspot3D } from "./Hotspot3D";
import { SceneEditor } from "./SceneEditor";

export default function SceneViewer({ onReset }: { onReset: () => void }) {
  const scene = useSceneStore((s) => s.scene);
  const mode = useSceneStore((s) => s.mode);
  const selectedId = useSceneStore((s) => s.selectedId);
  const activeHotspot = useSceneStore((s) => s.activeHotspot);
  const setSelected = useSceneStore((s) => s.setSelected);
  const setActiveHotspot = useSceneStore((s) => s.setActiveHotspot);

  const handleMiss = useCallback(() => {
    if (mode === "edit") setSelected(null);
    if (activeHotspot) setActiveHotspot(null);
  }, [mode, activeHotspot, setSelected, setActiveHotspot]);

  if (!scene) return null;

  return (
    <div className="scene-viewer-container">
      <Canvas
        camera={{ position: [0, 1.6, 0], fov: 75, near: 0.1, far: 1100 }}
        onPointerMissed={handleMiss}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ touchAction: "none" }}
      >
        <Suspense fallback={null}>
          <Skybox url={scene.skyboxUrl} />
        </Suspense>

        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={0.5} />

        <FPSController />

        {scene.mediaPanels.map((panel) => (
          <Suspense key={panel.id} fallback={null}>
            <MediaPanel3D
              data={panel}
              isSelected={selectedId === panel.id}
              isEditMode={mode === "edit"}
            />
          </Suspense>
        ))}

        {scene.hotspots.map((hotspot) => (
          <Hotspot3D
            key={hotspot.id}
            data={hotspot}
            isActive={activeHotspot === hotspot.id}
            isEditMode={mode === "edit"}
            isSelected={selectedId === hotspot.id}
          />
        ))}
      </Canvas>

      <SceneEditor onReset={onReset} />
    </div>
  );
}
