// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
// Base class for all game objects
export class GameObject {
    constructor(scene) {
        this.scene = scene;
        // These will be initialized in derived classes
        this.mesh = new THREE.Mesh();
        this.position = new THREE.Vector3();
    }
    remove() {
        this.scene.remove(this.mesh);
    }
}
//# sourceMappingURL=GameObject.js.map