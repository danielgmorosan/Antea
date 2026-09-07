'use client';

import {
  buildEra,
  buildTerrainMesh,
  createPalette,
  createTerrainSampler,
  disposeGeometries,
  mulberry32,
} from '@antea/landmark-kit';
import type { EraScene } from '@antea/landmark-kit';
import type { CitySpec } from '@antea/schema';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { applyOrbit, useOrbitControls } from './useOrbitControls';
import type { OrbitLimits, OrbitState } from './useOrbitControls';

const LIMITS: OrbitLimits = {
  phiMin: 0.28,
  phiMax: 1.28,
  radiusMin: 16,
  radiusMax: 70,
  panX: [-34, 28],
  panZ: [-20, 20],
};

/** Seconds an era swap takes. */
const SWAP_SECONDS = 0.55;

export interface DioramaProps {
  spec: CitySpec;
  /** Index into `spec.eras`. */
  eraIndex: number;
  className?: string;
}

interface Swap {
  out: EraScene;
  into: EraScene;
  /** Wall-clock start, so a throttled tab resumes to the right frame. */
  startedAt: number;
}

/**
 * Renders any city spec. Owns the render loop, the camera controls and the era
 * transition; knows nothing about which city it is drawing.
 */
export function Diorama({ spec, eraIndex, className }: DioramaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<THREE.Vector3 | null>(null);
  const orbitRef = useRef<OrbitState>({
    theta: 0.85,
    phi: 0.98,
    radius: 42,
    touched: false,
  });

  // The live scene, rebuilt only when the city changes.
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    palette: ReturnType<typeof createPalette>;
    terrain: ReturnType<typeof createTerrainSampler>;
    current: EraScene | null;
    swap: Swap | null;
  } | null>(null);

  useOrbitControls(canvasRef, targetRef, orbitRef, LIMITS);

  // Build the scene for a city. Torn down and rebuilt only when the spec changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const palette = createPalette(THREE, spec.palette);
    const terrain = createTerrainSampler(spec.terrain);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.colour('sky'));
    scene.fog = new THREE.Fog(palette.colour('fog'), 48, 130);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    const target = new THREE.Vector3(0, 2.2, 0);
    targetRef.current = target;

    scene.add(new THREE.HemisphereLight(0xf2f4ee, 0xb9b2a1, 0.95));
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.85);
    sun.position.set(-30, 42, 26);
    scene.add(sun);

    // Terrain colour jitter is seeded too, so the shoreline is identical on reload.
    const terrainMesh = buildTerrainMesh(
      THREE,
      spec.terrain,
      palette,
      mulberry32(spec.seed),
    );
    scene.add(terrainMesh);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      palette,
      terrain,
      current: null,
      swap: null,
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const timer = new THREE.Timer();
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const live = sceneRef.current;
      if (!live) return;

      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();
      const orbit = orbitRef.current;

      if (!orbit.touched && !reduced) orbit.theta += dt * 0.045;

      if (live.swap) {
        // Driven by wall clock rather than accumulated frame deltas: a tab that
        // is backgrounded mid-swap stops getting animation frames, and an
        // accumulator would leave the city frozen half-built on return.
        const k = Math.min(
          1,
          (performance.now() - live.swap.startedAt) / (SWAP_SECONDS * 1000),
        );
        const eased = 1 - (1 - k) ** 3;
        live.swap.into.group.scale.y = 0.001 + eased * 0.999;
        live.swap.out.group.scale.y = Math.max(0.001, 1 - eased * 1.4);
        if (k >= 1) {
          live.scene.remove(live.swap.out.group);
          disposeGeometries(live.swap.out.group);
          live.swap.into.group.scale.y = 1;
          live.swap = null;
        }
      }

      for (const ship of live.current?.bobbing ?? []) {
        ship.object.position.y =
          live.terrain.waterLevel + Math.sin(elapsed * 1.3 + ship.phase) * 0.045;
        ship.object.rotation.z = Math.sin(elapsed * 0.9 + ship.phase) * 0.03;
      }

      applyOrbit(live.camera, target, orbit);
      live.renderer.render(live.scene, live.camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      const live = sceneRef.current;
      sceneRef.current = null;
      if (live) {
        if (live.current) disposeGeometries(live.current.group);
        if (live.swap) disposeGeometries(live.swap.out.group);
        disposeGeometries(terrainMesh);
        live.palette.dispose();
      }
      renderer.dispose();
    };
    // Keyed on the city, not on the spec object identity: a re-render that
    // hands down an equal but new spec must not tear down the WebGL context
    // and rebuild the terrain. The spec fields read above are immutable for a
    // given slug, so they cannot go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.slug]);

  // Swap eras without rebuilding the scene or the terrain.
  useEffect(() => {
    const live = sceneRef.current;
    const era = spec.eras[eraIndex];
    if (!live || !era) return;

    const next = buildEra(THREE, spec, era, live.palette, live.terrain);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previous = live.current;

    if (!previous || reduced) {
      if (previous) {
        live.scene.remove(previous.group);
        disposeGeometries(previous.group);
      }
      live.scene.add(next.group);
      live.current = next;
      return;
    }

    // A swap already in flight loses its outgoing group immediately, or we
    // would leak it when a third era arrives mid-transition.
    if (live.swap) {
      live.scene.remove(live.swap.out.group);
      disposeGeometries(live.swap.out.group);
    }

    next.group.scale.y = 0.001;
    live.scene.add(next.group);
    live.swap = { out: previous, into: next, startedAt: performance.now() };
    live.current = next;
  }, [spec, eraIndex]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export default Diorama;
