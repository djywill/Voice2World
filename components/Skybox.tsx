"use client";

import { useRef, Component, type ReactNode } from "react";
import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function SkyboxInner({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[500, 64, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function FallbackSky() {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[500, 64, 40]} />
      <meshBasicMaterial color="#1a1a2e" side={THREE.BackSide} />
    </mesh>
  );
}

interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; }

class SkyboxErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <FallbackSky />;
    return this.props.children;
  }
}

export function Skybox({ url }: { url: string }) {
  return (
    <SkyboxErrorBoundary>
      <SkyboxInner url={url} />
    </SkyboxErrorBoundary>
  );
}
