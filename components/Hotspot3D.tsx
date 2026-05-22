"use client";

import { useRef, useCallback } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HotspotData } from "@/types/scene";
import { useSceneStore } from "@/lib/sceneStore";

export function Hotspot3D({
  data,
  isActive,
  isEditMode,
  isSelected,
}: {
  data: HotspotData;
  isActive: boolean;
  isEditMode: boolean;
  isSelected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { setActiveHotspot, setSelected } = useSceneStore();

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      if (isEditMode) {
        setSelected(data.id);
      } else {
        setActiveHotspot(isActive ? null : data.id);
      }
    },
    [isEditMode, isActive, data.id, setSelected, setActiveHotspot]
  );

  return (
    <group position={data.position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        scale={isSelected ? 1.4 : 1}
      >
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={isSelected ? "#7c5cbf" : data.color}
          emissive={data.color}
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>

      <Html position={[0, 0.6, 0]} center style={{ pointerEvents: "none" }}>
        <div className="hotspot-label">{data.label}</div>
      </Html>

      {isActive && !isEditMode && (
        <Html position={[0, 1.2, 0]} center>
          <div className="hotspot-popup">
            <h3>{data.label}</h3>
            <p>{data.content}</p>
            <button
              className="hotspot-close"
              onClick={(e) => {
                e.stopPropagation();
                setActiveHotspot(null);
              }}
            >
              ✕
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}
