// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
import { GameObject } from "./GameObject.js";
import { Egg } from "./Egg.js";
import { LANE_WIDTH, TOTAL_LANES, JUMP_FORCE, GRAVITY, } from "../utils/constants.js";
export class FootGoose extends GameObject {
    constructor(scene, audioManager) {
        super(scene);
        this.lane = 1; // Start in right lane
        this.isJumping = false;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.jumpTimer = 0;
        this.jumpInterval = 2; // seconds
        this.laneChangeTimer = 0;
        this.laneChangeInterval = 3; // seconds
        // Egg throwing variables
        this.eggThrowTimer = 0;
        this.eggThrowInterval = 4; // seconds
        this.eggs = [];
        // Animation properties
        this.runningCycle = 0;
        this.isThrowingEgg = false;
        this.throwAnimationTimer = 0;
        // Audio manager reference
        this.audioManager = null;
        // Add properties for power-ups
        this.jumpBoost = 0;
        this.speedBoost = 0;
        this.isShielded = false;
        this.magnetRange = 0;
        // Add properties needed for power-ups
        this.canJump = true;
        this.jumpForce = JUMP_FORCE;
        this.jumpCooldown = 500; // milliseconds
        this.moveSpeed = 10; // Base move speed
        // Store audio manager if provided
        this.audioManager = audioManager || null;
        // Create a group to hold all goose parts
        this.gooseGroup = new THREE.Group();
        // Create the goose mesh
        this.createGooseMesh();
        // Position the goose
        this.gooseGroup.position.set((this.lane * LANE_WIDTH) / TOTAL_LANES, 0.75, 15 // Start ahead of player
        );
        this.position = this.gooseGroup.position;
        // Add goose to scene
        scene.add(this.gooseGroup);
        // Set mesh property for collision detection
        this.mesh = this.body;
    }
    createGooseMesh() {
        // Materials
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White goose
        const billMaterial = new THREE.MeshStandardMaterial({ color: 0xff9800 }); // Orange bill
        const feetMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 }); // Orange feet
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black eyes
        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        bodyGeometry.scale(1, 0.8, 1.5); // Oval shape
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.set(0, 0.2, 0);
        this.body.castShadow = true;
        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.8, 12);
        this.neck = new THREE.Mesh(neckGeometry, bodyMaterial);
        this.neck.position.set(0, 0.8, 0.6);
        this.neck.rotation.x = -Math.PI / 4; // Angle the neck forward
        this.neck.castShadow = true;
        // Head
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        this.head = new THREE.Mesh(headGeometry, bodyMaterial);
        this.head.position.set(0, 1.3, 0.8);
        this.head.castShadow = true;
        // Bill
        const billGeometry = new THREE.ConeGeometry(0.2, 0.5, 4);
        this.bill = new THREE.Mesh(billGeometry, billMaterial);
        this.bill.position.set(0, 1.3, 1.3);
        this.bill.rotation.x = -Math.PI / 2; // Point forward
        this.bill.castShadow = true;
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.15, 0.1, 0.15);
        this.head.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.15, 0.1, 0.15);
        this.head.add(rightEye);
        // Wings
        const wingGeometry = new THREE.BoxGeometry(0.15, 0.7, 1);
        wingGeometry.translate(0, 0, -0.3); // Shift pivot point
        this.leftWing = new THREE.Mesh(wingGeometry, bodyMaterial);
        this.leftWing.position.set(0.8, 0.2, 0);
        this.leftWing.castShadow = true;
        this.rightWing = new THREE.Mesh(wingGeometry, bodyMaterial);
        this.rightWing.position.set(-0.8, 0.2, 0);
        this.rightWing.castShadow = true;
        // BIG FEET!
        const footGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.6); // Extra large feet for a goose
        this.leftFoot = new THREE.Mesh(footGeometry, feetMaterial);
        this.leftFoot.position.set(0.35, -0.5, 0);
        this.leftFoot.castShadow = true;
        this.rightFoot = new THREE.Mesh(footGeometry, feetMaterial);
        this.rightFoot.position.set(-0.35, -0.5, 0);
        this.rightFoot.castShadow = true;
        // Add all parts to goose group
        this.gooseGroup.add(this.body);
        this.gooseGroup.add(this.neck);
        this.gooseGroup.add(this.head);
        this.gooseGroup.add(this.bill);
        this.gooseGroup.add(this.leftWing);
        this.gooseGroup.add(this.rightWing);
        this.gooseGroup.add(this.leftFoot);
        this.gooseGroup.add(this.rightFoot);
        // Create a collision helper for the whole goose
        const collisionGeometry = new THREE.BoxGeometry(1.6, 2, 2);
        const collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            visible: false, // Hide the collision mesh
        });
        const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
        collisionMesh.position.set(0, 0.2, 0);
        this.gooseGroup.add(collisionMesh);
        // Set the collision mesh for use in game collision detection
        this.mesh = collisionMesh;
    }
    throwEgg() {
        // Start the throwing animation
        this.isThrowingEgg = true;
        this.throwAnimationTimer = 0;
        // Play throw egg sound if audio manager exists
        if (this.audioManager) {
            this.audioManager.playSound("throw_egg");
        }
        // Calculate egg properties
        const eggPosition = new THREE.Vector3(this.position.x, this.position.y + 1.3, // From the head height
        this.position.z);
        // Calculate velocity - throw backward and slightly down toward player
        const eggVelocity = new THREE.Vector3((Math.random() - 0.5) * 2, // Random horizontal spread
        5, // Upward velocity
        -10 // Throw backward toward player
        );
        // Create the egg
        const egg = new Egg(this.scene, eggPosition, eggVelocity, this.audioManager || undefined);
        // Add to eggs array for updates
        this.eggs.push(egg);
        console.log("FootGoose threw an egg!");
    }
    update(deltaTime, player) {
        // Update all eggs
        for (let i = this.eggs.length - 1; i >= 0; i--) {
            const egg = this.eggs[i];
            egg.update(deltaTime, 0); // Eggs handle game speed internally
            // Remove old eggs
            if (egg.position.z < -20) {
                egg.remove();
                this.eggs.splice(i, 1);
            }
        }
        // Update throw animation
        if (this.isThrowingEgg) {
            this.throwAnimationTimer += deltaTime;
            // Animate wings raising for throw
            const throwProgress = Math.min(this.throwAnimationTimer / 0.5, 1);
            if (throwProgress < 0.5) {
                // Raising wings phase
                const raiseFactor = throwProgress * 2; // 0 to 1 in first half
                this.leftWing.rotation.z = (Math.PI / 4) * raiseFactor;
                this.rightWing.rotation.z = (-Math.PI / 4) * raiseFactor;
                // Neck stretching up
                this.neck.scale.y = 1 + 0.3 * raiseFactor;
            }
            else {
                // Lowering wings phase
                const lowerFactor = (throwProgress - 0.5) * 2; // 0 to 1 in second half
                this.leftWing.rotation.z = (Math.PI / 4) * (1 - lowerFactor);
                this.rightWing.rotation.z = (-Math.PI / 4) * (1 - lowerFactor);
                // Neck returning to normal
                this.neck.scale.y = 1.3 - 0.3 * lowerFactor;
            }
            // End animation after 0.5 seconds
            if (this.throwAnimationTimer > 0.5) {
                this.isThrowingEgg = false;
                this.throwAnimationTimer = 0;
            }
        }
        // Egg throwing timer
        this.eggThrowTimer += deltaTime;
        if (this.eggThrowTimer >= this.eggThrowInterval && !this.isThrowingEgg) {
            this.throwEgg();
            this.eggThrowTimer = 0;
            // Random interval between 3-6 seconds
            this.eggThrowInterval = 3 + Math.random() * 3;
        }
        // Simple AI: dodge player by changing lanes and jumping occasionally
        // Update jump and lane change timers
        this.jumpTimer += deltaTime;
        this.laneChangeTimer += deltaTime;
        // Jump occasionally
        if (this.jumpTimer >= this.jumpInterval && !this.isJumping) {
            this.velocity.y = JUMP_FORCE * 0.8; // Jump slightly lower than player
            this.isJumping = true;
            this.jumpTimer = 0;
            this.jumpInterval = 1 + Math.random() * 2; // Random interval
        }
        // Apply gravity if jumping
        if (this.isJumping) {
            this.velocity.y -= GRAVITY * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
            // Check for landing
            if (this.position.y <= 0.75) {
                this.position.y = 0.75;
                this.velocity.y = 0;
                this.isJumping = false;
            }
            // Jumping animation: Wings up
            this.leftWing.rotation.z = Math.min(this.leftWing.rotation.z + deltaTime * 5, Math.PI / 4);
            this.rightWing.rotation.z = Math.max(this.rightWing.rotation.z - deltaTime * 5, -Math.PI / 4);
            // Feet tucked up
            this.leftFoot.rotation.x = Math.min(this.leftFoot.rotation.x + deltaTime * 5, Math.PI / 4);
            this.rightFoot.rotation.x = Math.min(this.rightFoot.rotation.x + deltaTime * 5, Math.PI / 4);
        }
        else if (!this.isThrowingEgg) {
            // Only reset wing positions if not throwing an egg
            // Reset wing and foot positions
            this.leftWing.rotation.z = 0;
            this.rightWing.rotation.z = 0;
            this.leftFoot.rotation.x = 0;
            this.rightFoot.rotation.x = 0;
            // Running animation
            this.runningCycle += deltaTime * 10;
            // Waddle animation for feet
            this.leftFoot.position.y =
                -0.5 + Math.abs(Math.sin(this.runningCycle)) * 0.2;
            this.rightFoot.position.y =
                -0.5 + Math.abs(Math.sin(this.runningCycle + Math.PI)) * 0.2;
            // Subtle body bob
            this.body.position.y = 0.2 + Math.sin(this.runningCycle * 2) * 0.05;
            // Neck and head bob
            this.neck.rotation.x = -Math.PI / 4 + Math.sin(this.runningCycle) * 0.1;
            this.head.position.y = 1.3 + Math.sin(this.runningCycle) * 0.05;
        }
        // Change lanes occasionally
        if (this.laneChangeTimer >= this.laneChangeInterval) {
            // Try to move away from player's lane
            const playerLane = Math.round(player.position.x / (LANE_WIDTH / TOTAL_LANES));
            // Move to a different lane than the player when possible
            if (playerLane === this.lane) {
                // Move to a random different lane
                const newLane = this.lane + (Math.random() > 0.5 ? 1 : -1);
                this.lane = Math.max(-1, Math.min(1, newLane)); // Keep in bounds
            }
            else {
                // Random lane change
                const randomLane = Math.floor(Math.random() * TOTAL_LANES) - 1;
                this.lane = randomLane;
            }
            this.laneChangeTimer = 0;
            this.laneChangeInterval = 2 + Math.random() * 2; // Random interval
        }
        // Smooth lane changing
        const targetX = (this.lane * LANE_WIDTH) / TOTAL_LANES;
        this.position.x += (targetX - this.position.x) * 5 * deltaTime;
        // Turn goose slightly when changing lanes
        const targetRotationY = (this.position.x - targetX) * 0.8;
        this.gooseGroup.rotation.y +=
            (targetRotationY - this.gooseGroup.rotation.y) * 8 * deltaTime;
        // Keep ahead of player (10-20 units ahead)
        const targetZ = player.position.z + 15;
        this.position.z += (targetZ - this.position.z) * deltaTime;
    }
    reset() {
        this.lane = 1;
        this.isJumping = false;
        this.velocity.set(0, 0, 0);
        this.position.set((this.lane * LANE_WIDTH) / TOTAL_LANES, 0.75, 15);
        this.jumpTimer = 0;
        this.laneChangeTimer = 0;
        this.eggThrowTimer = 0;
        this.isThrowingEgg = false;
        // Remove all eggs
        for (const egg of this.eggs) {
            egg.remove();
        }
        this.eggs = [];
        // Reset all animations
        this.runningCycle = 0;
        this.leftWing.rotation.z = 0;
        this.rightWing.rotation.z = 0;
        this.leftFoot.rotation.x = 0;
        this.rightFoot.rotation.x = 0;
        this.gooseGroup.rotation.y = 0;
        this.neck.scale.y = 1;
    }
    // Helper method to get the height (for collision detection)
    getHeight() {
        return 2; // Total height of the goose character
    }
    // Get a list of all eggs for collision detection from Game
    getEggs() {
        return this.eggs;
    }
    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }
    /**
     * Apply a power-up to the foot goose
     * @param powerupType The type of power-up to apply
     * @param value The value/strength of the power-up
     * @param duration The duration in milliseconds (if temporary)
     */
    applyPowerup(powerupType, value, duration) {
        switch (powerupType) {
            case "jump_boost":
                this.jumpBoost = value;
                if (duration) {
                    setTimeout(() => {
                        this.jumpBoost = 0;
                    }, duration);
                }
                break;
            case "speed_boost":
                this.speedBoost = value;
                if (duration) {
                    setTimeout(() => {
                        this.speedBoost = 0;
                    }, duration);
                }
                break;
            case "shield":
                this.isShielded = true;
                if (duration) {
                    setTimeout(() => {
                        this.isShielded = false;
                    }, duration);
                }
                break;
            case "magnet":
                this.magnetRange = value;
                if (duration) {
                    setTimeout(() => {
                        this.magnetRange = 0;
                    }, duration);
                }
                break;
        }
    }
    /**
     * Check if the foot goose is shielded
     */
    hasShield() {
        return this.isShielded;
    }
    /**
     * Remove the shield from the foot goose
     */
    removeShield() {
        this.isShielded = false;
    }
    /**
     * Get the magnet range
     */
    getMagnetRange() {
        return this.magnetRange;
    }
    /**
     * Apply jump force
     */
    jump() {
        if (this.canJump) {
            // Apply jump boost if active
            const jumpForce = this.jumpForce * (1 + this.jumpBoost);
            this.velocity.y = jumpForce;
            this.canJump = false;
            // Reset jump timer
            setTimeout(() => {
                this.canJump = true;
            }, this.jumpCooldown);
            // Play jump sound
            if (this.audioManager) {
                this.audioManager.playSound("jump");
            }
        }
    }
    /**
     * Move character left or right
     */
    move(direction) {
        // Apply speed boost if active
        const moveSpeed = this.moveSpeed * (1 + this.speedBoost);
        this.velocity.x = direction * moveSpeed;
    }
}
//# sourceMappingURL=FootGoose.js.map