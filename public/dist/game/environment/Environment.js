// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
import { LANE_WIDTH } from "../utils/constants.js";
export class Environment {
    constructor(scene) {
        this.decorations = [];
        this.scene = scene;
        // Create skybox
        this.createSkybox();
        // Create some decorative elements
        this.createDecorations();
    }
    createSkybox() {
        // Simple skybox using a large sphere
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            side: THREE.BackSide,
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
    }
    createDecorations() {
        // Add trees, rocks, etc. on both sides of the path
        // Add some trees on the sides
        for (let i = 0; i < 30; i++) {
            // Tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            // Tree top
            const topGeometry = new THREE.ConeGeometry(2, 4, 8);
            const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.y = 3.5;
            // Combine into a tree
            const tree = new THREE.Group();
            tree.add(trunk);
            tree.add(top);
            // Position on either side of the path, at various distances
            const side = i % 2 === 0 ? 1 : -1;
            tree.position.set(side * (LANE_WIDTH * 1.5 + Math.random() * 5), 0, i * 10);
            this.decorations.push(tree);
            this.scene.add(tree);
        }
        // Add some rocks
        for (let i = 0; i < 20; i++) {
            const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.5);
            const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            // Position on either side of the path
            const side = Math.random() > 0.5 ? 1 : -1;
            rock.position.set(side * (LANE_WIDTH * 1.2 + Math.random() * 6), 0, Math.random() * 200);
            this.decorations.push(rock);
            this.scene.add(rock);
        }
    }
    update(deltaTime, gameSpeed) {
        // Move all decorations to create scrolling effect
        this.decorations.forEach((decoration) => {
            decoration.position.z -= gameSpeed * deltaTime;
            // If decoration is too far behind, move it ahead
            if (decoration.position.z < -20) {
                decoration.position.z += 300; // Reposition ahead
            }
        });
    }
}
//# sourceMappingURL=Environment.js.map