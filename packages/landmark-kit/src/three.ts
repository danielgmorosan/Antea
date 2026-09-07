import type * as ThreeModule from 'three';

/**
 * Three.js is injected into every builder rather than imported, so this package
 * has no hard runtime dependency on it and the placement maths stays testable
 * without a WebGL context. Only the types are pulled in here.
 */
export type Three = typeof ThreeModule;

export type Group = ThreeModule.Group;
export type Mesh = ThreeModule.Mesh;
export type Object3D = ThreeModule.Object3D;
export type InstancedMesh = ThreeModule.InstancedMesh;
export type Material = ThreeModule.Material;
export type BufferGeometry = ThreeModule.BufferGeometry;
