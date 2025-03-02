// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
import { GameObject } from "./GameObject.js";
import { LANE_WIDTH, TOTAL_LANES, JUMP_FORCE, GRAVITY, } from "../utils/constants.js";
export class Player extends GameObject {
    constructor(scene, characterColor = "blue", hairstyleType = "none", audioManager) {
        super(scene);
        this.lane = 0; // -1: left, 0: center, 1: right
        this.isJumping = false;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.jumpSafetyTimer = 0; // Add a safety timer for landing
        // Slipping state
        this.isSlipping = false;
        this.slipTimer = 0;
        this.slipDuration = 0;
        this.slipDirection = 0;
        this.slipRotation = 0;
        this.slipVelocity = 0;
        // Animation properties
        this.runningCycle = 0;
        // Customization options
        this.characterColor = "blue";
        this.characterType = "default";
        this.currentHairstyle = "none";
        // Character statistics
        this.stats = {
            jumpMultiplier: 1.0,
            speedMultiplier: 1.0,
            footSize: 1.0,
            slipResistance: 0.0,
        };
        // Add audioManager reference
        this.audioManager = null;
        // Add powerup properties
        this.jumpBoost = 0;
        this.speedBoost = 0;
        this.isShielded = false;
        this.magnetRange = 0;
        this.doubleJump = false;
        this.hasDoubleJumped = false;
        this.characterColor = characterColor;
        this.currentHairstyle = hairstyleType;
        this.audioManager = audioManager || null;
        this.characterGroup = new THREE.Group();
        this.hairMesh = null;
        // Create character mesh
        this.createCharacterMesh();
        // Position character
        this.characterGroup.position.set(0, 1, 0); // Start at center lane
        this.position = this.characterGroup.position;
        // Add character to scene
        scene.add(this.characterGroup);
        // Set mesh property to characterGroup for collision detection
        this.mesh = this.body;
    }
    createCharacterMesh() {
        // Define color based on characterColor
        let mainColor;
        switch (this.characterColor) {
            case "red":
                mainColor = 0xff0000;
                break;
            case "green":
                mainColor = 0x00ff00;
                break;
            case "purple":
                mainColor = 0x8a2be2;
                break;
            case "orange":
                mainColor = 0xff8c00;
                break;
            case "blue":
            default:
                mainColor = 0x3498db;
        }
        // Create materials
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: mainColor });
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 }); // Skin color
        const footMaterial = new THREE.MeshStandardMaterial({ color: 0x663300 }); // Brown feet
        // Create body parts
        // Head
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.set(0, 0.7, 0);
        this.head.castShadow = true;
        // Create eyes
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.1, 0.05, 0.25);
        this.head.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.1, 0.05, 0.25);
        this.head.add(rightEye);
        // Body (torso)
        const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.3);
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.set(0, 0.2, 0);
        this.body.castShadow = true;
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        this.leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.leftArm.position.set(0.4, 0.2, 0);
        this.leftArm.castShadow = true;
        this.rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        this.rightArm.position.set(-0.4, 0.2, 0);
        this.rightArm.castShadow = true;
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
        this.leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        this.leftLeg.position.set(0.2, -0.4, 0);
        this.leftLeg.castShadow = true;
        this.rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        this.rightLeg.position.set(-0.2, -0.4, 0);
        this.rightLeg.castShadow = true;
        // Calculate actual foot size based on character stats
        const footWidth = 0.4 * this.stats.footSize;
        const footHeight = 0.15;
        const footDepth = 0.6 * this.stats.footSize;
        // BIG FEET!
        const footGeometry = new THREE.BoxGeometry(footWidth, footHeight, footDepth);
        this.leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.leftFoot.position.set(0.2, -0.7, 0.1);
        this.leftFoot.castShadow = true;
        this.rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.rightFoot.position.set(-0.2, -0.7, 0.1);
        this.rightFoot.castShadow = true;
        // Add all parts to character group
        this.characterGroup.add(this.head);
        this.characterGroup.add(this.body);
        this.characterGroup.add(this.leftArm);
        this.characterGroup.add(this.rightArm);
        this.characterGroup.add(this.leftLeg);
        this.characterGroup.add(this.rightLeg);
        this.characterGroup.add(this.leftFoot);
        this.characterGroup.add(this.rightFoot);
        // Create the initial hairstyle AFTER the head is in the scene
        this.createHairstyle(this.currentHairstyle);
        // Create a collision helper that encompasses the whole character
        const collisionGeometry = new THREE.BoxGeometry(1, 2, 1);
        const collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            visible: false, // Hide the collision mesh
        });
        const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
        collisionMesh.position.set(0, 0, 0);
        this.characterGroup.add(collisionMesh);
        // Set the collision mesh for use in game collision detection
        this.mesh = collisionMesh;
    }
    update(deltaTime) {
        // Apply gravity if jumping
        if (this.isJumping) {
            this.velocity.y -= GRAVITY * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
            // Check for landing
            if (this.position.y <= 1) {
                this.position.y = 1; // Ensure we don't go below ground
                this.velocity.y = 0;
                // Set isJumping to false immediately so player can jump again
                this.isJumping = false;
                // Set a safety timer after landing to prevent immediate collisions
                this.jumpSafetyTimer = 0.1; // 100ms safety buffer
                console.log("Player has landed, can jump again");
            }
            // Jumping animation: Tuck legs up
            if (this.isJumping) {
                this.leftLeg.rotation.x = Math.min(this.leftLeg.rotation.x + deltaTime * 5, Math.PI / 4);
                this.rightLeg.rotation.x = Math.min(this.rightLeg.rotation.x + deltaTime * 5, Math.PI / 4);
                this.leftFoot.rotation.x = Math.min(this.leftFoot.rotation.x + deltaTime * 5, Math.PI / 4);
                this.rightFoot.rotation.x = Math.min(this.rightFoot.rotation.x + deltaTime * 5, Math.PI / 4);
            }
            else {
                // Reset leg positions
                this.leftLeg.rotation.x = 0;
                this.rightLeg.rotation.x = 0;
                this.leftFoot.rotation.x = 0;
                this.rightFoot.rotation.x = 0;
            }
        }
        else {
            // Running animation when not jumping
            // Apply speed multiplier to running cycle
            this.runningCycle += deltaTime * 10 * this.stats.speedMultiplier;
            // Leg animations
            this.leftLeg.rotation.x = Math.sin(this.runningCycle) * 0.4;
            this.rightLeg.rotation.x = Math.sin(this.runningCycle + Math.PI) * 0.4;
            // Foot animations follow legs
            this.leftFoot.rotation.x = Math.sin(this.runningCycle) * 0.2;
            this.rightFoot.rotation.x = Math.sin(this.runningCycle + Math.PI) * 0.2;
            // Arm animations opposite to legs
            this.leftArm.rotation.x = Math.sin(this.runningCycle + Math.PI) * 0.3;
            this.rightArm.rotation.x = Math.sin(this.runningCycle) * 0.3;
            // Subtle body bob
            this.body.position.y =
                0.2 + Math.abs(Math.sin(this.runningCycle * 2)) * 0.05;
            this.head.position.y =
                0.7 + Math.abs(Math.sin(this.runningCycle * 2)) * 0.05;
        }
        // Decrement jump safety timer regardless of jumping state
        if (this.jumpSafetyTimer > 0) {
            this.jumpSafetyTimer -= deltaTime;
        }
        // Handle slipping state
        if (this.isSlipping) {
            this.slipTimer += deltaTime;
            // Update slip rotation - make the character spin and slide
            this.slipRotation += deltaTime * 15 * this.slipDirection;
            this.characterGroup.rotation.y = this.slipRotation;
            // Arms flailing animation
            const flailSpeed = 20;
            this.leftArm.rotation.z = Math.sin(this.slipTimer * flailSpeed) * 1.2;
            this.rightArm.rotation.z = -Math.sin(this.slipTimer * flailSpeed) * 1.2;
            // Legs and feet spread out
            this.leftLeg.rotation.z = 0.3;
            this.rightLeg.rotation.z = -0.3;
            // Apply slide movement (adjusted by slip resistance)
            const effectiveSlipVelocity = this.slipVelocity * (1 - this.stats.slipResistance);
            this.position.x += effectiveSlipVelocity * deltaTime * this.slipDirection;
            // Gradually reduce sliding
            this.slipVelocity *= 0.98;
            // Check if slip timer is complete
            if (this.slipTimer >= this.slipDuration) {
                this.isSlipping = false;
                this.slipTimer = 0;
                this.characterGroup.rotation.y = 0; // Reset rotation
                // Reset arm and leg positions
                this.leftArm.rotation.z = 0;
                this.rightArm.rotation.z = 0;
                this.leftLeg.rotation.z = 0;
                this.rightLeg.rotation.z = 0;
                console.log("Player recovered from slip!");
            }
            // Ensure player stays within lane bounds
            const laneLimit = (LANE_WIDTH / TOTAL_LANES) * 1.5;
            if (this.position.x > laneLimit) {
                this.position.x = laneLimit;
                this.slipVelocity *= 0.5; // Dampen velocity when hitting boundary
                this.slipDirection = -1; // Bounce off right boundary
            }
            else if (this.position.x < -laneLimit) {
                this.position.x = -laneLimit;
                this.slipVelocity *= 0.5; // Dampen velocity when hitting boundary
                this.slipDirection = 1; // Bounce off left boundary
            }
        }
        else {
            // Normal lane changing when not slipping - apply speed multiplier
            const targetX = (this.lane * LANE_WIDTH) / TOTAL_LANES;
            const laneChangeSpeed = 10 * this.stats.speedMultiplier;
            this.position.x +=
                (targetX - this.position.x) * laneChangeSpeed * deltaTime;
            // Turn character slightly when changing lanes
            const targetRotationY = (this.position.x - targetX) * 0.5;
            this.characterGroup.rotation.y +=
                (targetRotationY - this.characterGroup.rotation.y) * 10 * deltaTime;
        }
    }
    moveLeft() {
        // Only change lanes if not slipping
        if (!this.isSlipping && this.lane > -1) {
            this.lane--;
        }
    }
    moveRight() {
        // Only change lanes if not slipping
        if (!this.isSlipping && this.lane < 1) {
            this.lane++;
        }
    }
    jump() {
        // Apply jump if on the ground or allow double jump if enabled
        if (this.position.y <= 1 || (this.doubleJump && !this.hasDoubleJumped)) {
            // If in the air and double jump is enabled, mark as double jumped
            if (this.position.y > 1 && this.doubleJump) {
                this.hasDoubleJumped = true;
            }
            // Apply jump boost if active
            const jumpForce = JUMP_FORCE * (1 + this.jumpBoost);
            this.velocity.y = jumpForce;
            // Set jumping flag to true
            this.isJumping = true;
            console.log("Player is jumping with velocity:", this.velocity.y);
            // Play jump sound if audio manager exists
            if (this.audioManager) {
                this.audioManager.playSound("jump");
            }
        }
    }
    isCurrentlyJumping() {
        // Consider player as jumping if they're in jump state OR
        // in safety landing period right after a jump
        return this.isJumping || this.jumpSafetyTimer > 0;
    }
    slip(freshness) {
        // Only start slipping if not already slipping
        if (!this.isSlipping) {
            this.isSlipping = true;
            this.slipTimer = 0;
            // Apply slip resistance to duration - fresher eggs cause longer slips
            // Higher slip resistance means shorter slip duration
            const resistanceFactor = 1 - this.stats.slipResistance;
            this.slipDuration = (1 + freshness * 2) * resistanceFactor; // Between 1-3 seconds, reduced by resistance
            // Random slip direction
            this.slipDirection = Math.random() > 0.5 ? 1 : -1;
            // Initial slip rotation
            this.slipRotation = 0;
            // Initial slip velocity based on freshness, affected by resistance
            this.slipVelocity = (3 + freshness * 5) * resistanceFactor; // Between 3-8 units/sec, reduced by resistance
            console.log("Player slipped on an egg! Duration:", this.slipDuration);
        }
    }
    isCurrentlySlipping() {
        return this.isSlipping;
    }
    reset() {
        this.lane = 0;
        this.isJumping = false;
        this.isSlipping = false;
        this.jumpSafetyTimer = 0;
        this.velocity.set(0, 0, 0);
        this.position.set(0, 0.75, 0);
        // Reset all animations
        this.runningCycle = 0;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftFoot.rotation.x = 0;
        this.rightFoot.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
        this.leftArm.rotation.z = 0;
        this.rightArm.rotation.z = 0;
        this.leftLeg.rotation.z = 0;
        this.rightLeg.rotation.z = 0;
        this.characterGroup.rotation.y = 0;
        // Reset powerups
        this.jumpBoost = 0;
        this.speedBoost = 0;
        this.isShielded = false;
        this.magnetRange = 0;
        this.hasDoubleJumped = false; // Reset double jump state
        // Note: We don't reset character color, type, or hairstyle
        // This ensures the player keeps their character customization
    }
    // Method to change character color
    setColor(color) {
        this.characterColor = color;
        // Get the color value
        let mainColor;
        switch (color) {
            case "red":
                mainColor = 0xff0000;
                break;
            case "green":
                mainColor = 0x00ff00;
                break;
            case "purple":
                mainColor = 0x8a2be2;
                break;
            case "orange":
                mainColor = 0xff8c00;
                break;
            case "blue":
            default:
                mainColor = 0x3498db;
        }
        // Update materials for body parts
        this.body.material.color.set(mainColor);
        this.leftArm.material.color.set(mainColor);
        this.rightArm.material.color.set(mainColor);
        this.leftLeg.material.color.set(mainColor);
        this.rightLeg.material.color.set(mainColor);
        // Update hairstyle with new color
        this.createHairstyle(this.currentHairstyle);
    }
    // Set character type and update stats
    setCharacterType(type) {
        this.characterType = type;
        // Set stats based on character type
        switch (type) {
            case "speedy":
                // Red character: Fast but with smaller feet
                this.stats = {
                    jumpMultiplier: 1.1, // Slightly better jumps
                    speedMultiplier: 1.5, // Much faster movement
                    footSize: 0.7, // Smaller feet
                    slipResistance: 0.1, // Minimal slip resistance
                };
                break;
            case "jumper":
                // Green character: High jumper
                this.stats = {
                    jumpMultiplier: 1.8, // Much higher jumps
                    speedMultiplier: 0.9, // Slightly slower movement
                    footSize: 0.9, // Slightly smaller feet
                    slipResistance: 0.0, // No slip resistance
                };
                break;
            case "purple_giant":
                // Purple character: Slower but with huge feet and slip resistance
                this.stats = {
                    jumpMultiplier: 0.8, // Lower jumps
                    speedMultiplier: 0.7, // Slower movement
                    footSize: 1.5, // Huge feet
                    slipResistance: 0.5, // High slip resistance
                };
                break;
            case "golden_runner":
                // Orange character: Balanced high-end character
                this.stats = {
                    jumpMultiplier: 1.3, // Good jumps
                    speedMultiplier: 1.2, // Good speed
                    footSize: 1.2, // Larger feet
                    slipResistance: 0.3, // Decent slip resistance
                };
                break;
            case "default":
            default:
                // Blue character: Standard balanced character
                this.stats = {
                    jumpMultiplier: 1.0, // Standard jumps
                    speedMultiplier: 1.0, // Standard speed
                    footSize: 1.0, // Standard feet
                    slipResistance: 0.0, // No slip resistance
                };
        }
        console.log(`Character type set to ${type} with stats:`, this.stats);
        // Update feet size
        this.updateFeetSize();
    }
    // Update the size of the feet based on character stats
    updateFeetSize() {
        // Remove old feet
        this.characterGroup.remove(this.leftFoot);
        this.characterGroup.remove(this.rightFoot);
        // Calculate new foot dimensions
        const footWidth = 0.4 * this.stats.footSize;
        const footHeight = 0.15;
        const footDepth = 0.6 * this.stats.footSize;
        // Create new feet with updated size
        const footGeometry = new THREE.BoxGeometry(footWidth, footHeight, footDepth);
        const footMaterial = new THREE.MeshStandardMaterial({ color: 0x663300 });
        this.leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.leftFoot.position.set(0.2, -0.7, 0.1);
        this.leftFoot.castShadow = true;
        this.rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        this.rightFoot.position.set(-0.2, -0.7, 0.1);
        this.rightFoot.castShadow = true;
        // Add new feet to character
        this.characterGroup.add(this.leftFoot);
        this.characterGroup.add(this.rightFoot);
    }
    // Get current stats for display or debugging
    getStats() {
        return { ...this.stats }; // Return a copy of stats
    }
    // Method to create a hairstyle on the character
    createHairstyle(hairstyleType) {
        console.log(`Creating hairstyle: ${hairstyleType} for ${this.characterColor} character`);
        // IMPORTANT: Force remove any existing hair
        if (this.hairMesh) {
            console.log("Removing existing hair mesh");
            this.head.remove(this.hairMesh);
            this.hairMesh = null;
        }
        // Return early if no hairstyle is needed
        if (hairstyleType === "none") {
            console.log("No hairstyle requested, returning early");
            this.currentHairstyle = "none";
            return;
        }
        // Create a new hair group
        console.log("Creating new hair group");
        this.hairMesh = new THREE.Group();
        // Get matching hair color based on character color
        let hairColor;
        switch (this.characterColor) {
            case "red":
                hairColor = 0xff0000; // Bright red
                break;
            case "green":
                hairColor = 0x00ff00; // Bright green
                break;
            case "purple":
                hairColor = 0x9900ff; // Bright purple
                break;
            case "orange":
                hairColor = 0xff6600; // Bright orange
                break;
            case "blue":
            default:
                hairColor = 0x0066ff; // Bright blue
        }
        console.log(`Using hair color: ${hairColor.toString(16)}`);
        // Create a MUCH brighter material to make the hair VERY visible
        const hairMaterial = new THREE.MeshStandardMaterial({
            color: hairColor,
            emissive: hairColor,
            emissiveIntensity: 0.5, // Significant glow
            roughness: 0.3,
            metalness: 0.7, // More shiny
        });
        // Ensure material is properly configured
        hairMaterial.needsUpdate = true;
        // Create different hairstyles - SIGNIFICANTLY LARGER and more visible
        switch (hairstyleType) {
            case "short":
                // Short hair - much thicker layer on top
                const shortHairGeometry = new THREE.BoxGeometry(0.6, 0.15, 0.6);
                const shortHair = new THREE.Mesh(shortHairGeometry, hairMaterial);
                shortHair.position.set(0, 0.25, 0); // Higher position
                shortHair.castShadow = true;
                console.log("Adding short hair mesh to hair group");
                this.hairMesh.add(shortHair);
                break;
            case "mohawk":
                // Mohawk - much taller vertical strip down the middle
                const mohawkGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.4);
                const mohawk = new THREE.Mesh(mohawkGeometry, hairMaterial);
                mohawk.position.set(0, 0.4, 0); // Much higher position
                mohawk.castShadow = true;
                console.log("Adding mohawk mesh to hair group");
                this.hairMesh.add(mohawk);
                break;
            case "spiky":
                // Spiky hair - larger, more prominent spikes
                for (let i = 0; i < 8; i++) {
                    const spikeGeometry = new THREE.ConeGeometry(0.08, 0.4, 4); // Larger spikes
                    const spike = new THREE.Mesh(spikeGeometry, hairMaterial);
                    // Position spikes in a circle on top of the head
                    const angle = (i / 8) * Math.PI * 2;
                    const radius = 0.2;
                    spike.position.set(Math.cos(angle) * radius, 0.35, // Much higher position
                    Math.sin(angle) * radius);
                    // Rotate spikes to point outward
                    spike.rotation.x = Math.PI / 2;
                    spike.rotation.z = -angle;
                    spike.castShadow = true;
                    console.log(`Adding spike ${i} to hair group`);
                    this.hairMesh.add(spike);
                }
                break;
            case "long":
                // Long hair - much more obvious coverage
                const longHairTop = new THREE.BoxGeometry(0.65, 0.15, 0.65); // Wider top
                const longHairSides = new THREE.BoxGeometry(0.1, 0.5, 0.6); // Longer sides
                const longHairBack = new THREE.BoxGeometry(0.65, 0.5, 0.1); // Wider back
                const top = new THREE.Mesh(longHairTop, hairMaterial);
                top.position.set(0, 0.25, 0); // Higher on head
                top.castShadow = true;
                const left = new THREE.Mesh(longHairSides, hairMaterial);
                left.position.set(0.3, -0.05, 0); // More to the side
                left.castShadow = true;
                const right = new THREE.Mesh(longHairSides, hairMaterial);
                right.position.set(-0.3, -0.05, 0); // More to the side
                right.castShadow = true;
                const back = new THREE.Mesh(longHairBack, hairMaterial);
                back.position.set(0, -0.05, -0.3); // More to the back
                back.castShadow = true;
                console.log("Adding long hair components to hair group");
                this.hairMesh.add(top);
                this.hairMesh.add(left);
                this.hairMesh.add(right);
                this.hairMesh.add(back);
                break;
        }
        // Make sure the hair mesh is properly configured
        this.hairMesh.position.set(0, 0, 0);
        this.hairMesh.visible = true;
        this.hairMesh.matrixAutoUpdate = true;
        this.hairMesh.updateMatrix();
        // Debug info about the head and hair relationship
        console.log("Head position:", this.head.position);
        console.log("Head scale:", this.head.scale);
        console.log("Hair position:", this.hairMesh.position);
        // Add the hair to the head
        console.log("Adding hair group to head");
        this.head.add(this.hairMesh);
        // Set the current hairstyle
        this.currentHairstyle = hairstyleType;
        // Force a matrix update of the entire character to ensure proper rendering
        if (this.characterGroup) {
            this.characterGroup.updateMatrixWorld(true);
        }
    }
    // Set the hairstyle - completely revamped for reliability
    setHairstyle(hairstyleType) {
        console.log(`setHairstyle called with: ${hairstyleType}`);
        // Don't do anything if the hairstyle is the same
        if (this.currentHairstyle === hairstyleType) {
            console.log("Same hairstyle, no change needed");
            return;
        }
        // Create the new hairstyle - this will handle removing any existing hairstyle
        this.createHairstyle(hairstyleType);
        // Force update the matrices to ensure proper positioning
        this.characterGroup.updateMatrixWorld(true);
        console.log(`Hairstyle changed to ${hairstyleType}`);
    }
    // Get the current hairstyle
    getHairstyle() {
        return this.currentHairstyle;
    }
    /**
     * Apply a power-up to the player
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
                // Visual indicator for shield
                const shieldEffect = document.createElement("div");
                shieldEffect.className = "shield-effect";
                document.body.appendChild(shieldEffect);
                // Position the shield effect over the player
                const updateShieldPosition = () => {
                    if (this.isShielded && shieldEffect) {
                        const position = this.getScreenPosition();
                        shieldEffect.style.left = position.x + "px";
                        shieldEffect.style.top = position.y + "px";
                        requestAnimationFrame(updateShieldPosition);
                    }
                    else if (shieldEffect && shieldEffect.parentNode) {
                        shieldEffect.parentNode.removeChild(shieldEffect);
                    }
                };
                updateShieldPosition();
                if (duration) {
                    setTimeout(() => {
                        this.isShielded = false;
                    }, duration);
                }
                break;
            case "double_jump":
                this.doubleJump = true;
                if (duration) {
                    setTimeout(() => {
                        this.doubleJump = false;
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
     * Check if the player is shielded
     */
    hasShield() {
        return this.isShielded;
    }
    /**
     * Remove the shield from the player
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
     * Get the player's screen position for UI effects
     */
    getScreenPosition() {
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(this.mesh.matrixWorld);
        // Get the canvas element
        const canvas = document.querySelector("canvas");
        if (!canvas)
            return { x: 0, y: 0 };
        // Project the 3D position to screen space
        vector.project(this.scene.getObjectByName("camera"));
        // Convert to screen coordinates
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-(vector.y * 0.5) + 0.5) * canvas.clientHeight;
        return { x, y };
    }
}
//# sourceMappingURL=Player.js.map