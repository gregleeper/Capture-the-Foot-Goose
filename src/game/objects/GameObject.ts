// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";

// Use the global THREE object
declare const THREE: any;

// Base class for all game objects
export abstract class GameObject {
  protected scene: THREE.Scene;
  public mesh: THREE.Mesh;
  public position: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // These will be initialized in derived classes
    this.mesh = new THREE.Mesh();
    this.position = new THREE.Vector3();
  }

  public remove(): void {
    this.scene.remove(this.mesh);
  }

  abstract update(deltaTime: number, ...args: any[]): void;
  abstract reset(): void;
}
