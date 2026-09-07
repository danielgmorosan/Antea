'use client';

import { useEffect } from 'react';
import type { PerspectiveCamera, Vector3 } from 'three';

/**
 * Spherical-coordinate orbit, pan and pinch, ported from the prototype.
 *
 * Three.js does not ship OrbitControls in the main bundle and the addons build
 * pulls in far more than we use, so we keep our own sixty lines.
 */
export interface OrbitLimits {
  phiMin: number;
  phiMax: number;
  radiusMin: number;
  radiusMax: number;
  panX: [number, number];
  panZ: [number, number];
}

export interface OrbitState {
  theta: number;
  phi: number;
  radius: number;
  /** Set once the user takes over, which stops the idle drift. */
  touched: boolean;
}

export function applyOrbit(
  camera: PerspectiveCamera,
  target: Vector3,
  state: OrbitState,
): void {
  camera.position.set(
    target.x + state.radius * Math.sin(state.phi) * Math.cos(state.theta),
    target.y + state.radius * Math.cos(state.phi),
    target.z + state.radius * Math.sin(state.phi) * Math.sin(state.theta),
  );
  camera.lookAt(target);
}

export function useOrbitControls(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  target: React.RefObject<Vector3 | null>,
  state: React.RefObject<OrbitState>,
  limits: OrbitLimits,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

    function panBy(dx: number, dy: number): void {
      const centre = target.current;
      if (!centre) return;
      const s = state.current;
      const k = s.radius * 0.0011;
      // Screen-right and screen-up, projected onto the ground plane.
      const rightX = Math.sin(s.theta);
      const rightZ = -Math.cos(s.theta);
      const forwardX = -Math.cos(s.theta);
      const forwardZ = -Math.sin(s.theta);
      centre.x = clamp(
        centre.x + (-dx * rightX - dy * forwardX) * k,
        limits.panX[0],
        limits.panX[1],
      );
      centre.z = clamp(
        centre.z + (-dx * rightZ - dy * forwardZ) * k,
        limits.panZ[0],
        limits.panZ[1],
      );
    }

    let dragging = false;
    let px = 0;
    let py = 0;

    const onContextMenu = (e: Event) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      state.current.touched = true;
      px = e.clientX;
      py = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      const s = state.current;
      if (e.buttons & 2 || e.shiftKey) {
        panBy(dx, dy);
      } else {
        s.theta += dx * 0.0052;
        s.phi = clamp(s.phi - dy * 0.0042, limits.phiMin, limits.phiMax);
      }
      px = e.clientX;
      py = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // The pointer was already released — nothing to do.
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = state.current;
      s.touched = true;
      s.radius = clamp(s.radius + e.deltaY * 0.035, limits.radiusMin, limits.radiusMax);
    };

    let pinchDistance = 0;
    let pinchX = 0;
    let pinchY = 0;

    const touchCentre = (t: TouchList) => ({
      x: ((t[0]?.clientX ?? 0) + (t[1]?.clientX ?? 0)) / 2,
      y: ((t[0]?.clientY ?? 0) + (t[1]?.clientY ?? 0)) / 2,
      d: Math.hypot(
        (t[0]?.clientX ?? 0) - (t[1]?.clientX ?? 0),
        (t[0]?.clientY ?? 0) - (t[1]?.clientY ?? 0),
      ),
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const c = touchCentre(e.touches);
      pinchDistance = c.d;
      pinchX = c.x;
      pinchY = c.y;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const c = touchCentre(e.touches);
      const s = state.current;
      s.radius = clamp(
        s.radius - (c.d - pinchDistance) * 0.06,
        limits.radiusMin,
        limits.radiusMax,
      );
      panBy(c.x - pinchX, c.y - pinchY);
      pinchDistance = c.d;
      pinchX = c.x;
      pinchY = c.y;
      s.touched = true;
      dragging = false; // Never orbit while two fingers are down.
    };

    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [canvasRef, target, state, limits]);
}
