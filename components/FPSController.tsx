"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cameraState } from "@/lib/cameraState";

export function FPSController() {
  const { camera, gl } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const keys = useRef<Record<string, boolean>>({});
  const isDragging = useRef(false);
  const prev = useRef({ x: 0, y: 0 });

  const MOVE_SPEED = 0.15;
  const LOOK_SPEED = 0.003;

  useEffect(() => {
    const el = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      prev.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prev.current.x;
      const dy = e.clientY - prev.current.y;
      euler.current.y -= dx * LOOK_SPEED;
      euler.current.x -= dy * LOOK_SPEED;
      euler.current.x = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, euler.current.x)
      );
      prev.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      keys.current[e.key.toLowerCase()] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gl]);

  useFrame(() => {
    camera.rotation.copy(euler.current);

    const k = keys.current;
    const moving =
      k.w || k.a || k.s || k.d ||
      k.arrowup || k.arrowdown || k.arrowleft || k.arrowright;

    if (moving) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

      if (k.w || k.arrowup) camera.position.addScaledVector(forward, MOVE_SPEED);
      if (k.s || k.arrowdown) camera.position.addScaledVector(forward, -MOVE_SPEED);
      if (k.a || k.arrowleft) camera.position.addScaledVector(right, MOVE_SPEED);
      if (k.d || k.arrowright) camera.position.addScaledVector(right, -MOVE_SPEED);
    }

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    cameraState.position = camera.position.toArray() as [number, number, number];
    cameraState.direction = dir.toArray() as [number, number, number];
  });

  return null;
}
