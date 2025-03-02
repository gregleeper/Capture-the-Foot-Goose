// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
import { GameObject } from "./GameObject.js";
export class Obstacle extends GameObject {
    constructor(scene, lane) {
        super(scene);
        // Create obstacle mesh (various types)
        this.obstacleType = Math.floor(Math.random() * 3);
        let geometry;
        let material;
        switch (this.obstacleType) {
            case 0: // Box obstacle (short)
                geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                break;
            case 1: // Tall thin obstacle
                geometry = new THREE.BoxGeometry(0.5, 2, 0.5);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                break;
            case 2: // Egg-shaped obstacle
                geometry = new THREE.SphereGeometry(0.5, 16, 16);
                material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        }
        this.mesh = new THREE.Mesh(geometry, material);
        // Position at the specified lane and far ahead
        const yPosition = this.obstacleType === 1 ? 1 : 0.5; // Height based on obstacle type
        this.mesh.position.set(lane, yPosition, 100); // Far ahead
        // Ensure proper scale is set for collision detection
        this.mesh.scale.set(1, this.obstacleType === 1 ? 2 : 1, 1);
        this.mesh.castShadow = true;
        this.position = this.mesh.position;
        // Add a helper box to visualize the collision boundary (debug mode)
        this.addCollisionHelper();
        scene.add(this.mesh);
    }
    addCollisionHelper() {
        // Create a wireframe box to visualize the collision area
        const boundingBox = new THREE.Box3().setFromObject(this.mesh);
        const size = boundingBox.getSize(new THREE.Vector3());
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            opacity: 0.3,
            transparent: true,
        });
        const helper = new THREE.Mesh(boxGeometry, wireframeMaterial);
        helper.position.copy(this.mesh.position);
        // Only enable this for debugging
        // this.scene.add(helper);
    }
    update(deltaTime, gameSpeed) {
        // Move obstacle toward player
        this.position.z -= gameSpeed * deltaTime;
    }
    reset() {
        // Not needed for obstacles as they are removed once passed
    }
    // Helper method to get obstacle's actual height from its type
    getHeight() {
        return this.obstacleType === 1 ? 2 : 1;
    }
}
//# sourceMappingURL=Obstacle.js.map