// THREE is loaded globally from CDN in HTML
import { GameObject } from "./GameObject.js";
import { GRAVITY } from "../utils/constants.js";
import { AudioManager } from "../audio/AudioManager.js";

// Use the global THREE object
declare const THREE: any;

export class Egg extends GameObject {
  private velocity: THREE.Vector3;
  private isBroken: boolean = false;
  private age: number = 0;
  private lifespan: number = 5; // seconds before removing
  private isFixedInPlace: boolean = false; // Flag to track if egg is fixed in world space
  private worldPosition: THREE.Vector3 = new THREE.Vector3(); // Store world position for fixed eggs
  private broken: boolean = false;
  private lifetime: number = 0;
  private freshness: number = 1.0; // How fresh the egg is (1.0 = just laid, 0.0 = old)
  private breakSound: string = "egg_break";
  private _hasHitGround: boolean = false;
  private markedForRemoval: boolean = false;

  // Parts for broken egg effect
  private eggShell!: THREE.Mesh;
  private eggYolk!: THREE.Mesh;
  private particleSystem!: THREE.Points;

  // Audio manager reference
  private audioManager: AudioManager | null = null;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    audioManager?: AudioManager
  ) {
    super(scene);

    // Store audio manager if provided
    this.audioManager = audioManager || null;

    // Initialize position and velocity
    this.velocity = velocity.clone();

    // Create egg mesh
    this.createEggMesh();

    // Set initial position
    this.mesh.position.copy(position);
    this.position = this.mesh.position;

    // Add egg to scene
    scene.add(this.mesh);
  }

  private createEggMesh(): void {
    // Create egg group
    const eggGroup = new THREE.Group();

    // Create egg (oval shape)
    const eggGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    eggGeometry.scale(0.8, 1, 0.8); // Make it egg-shaped
    const eggMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    this.eggShell = new THREE.Mesh(eggGeometry, eggMaterial);
    this.eggShell.castShadow = true;
    eggGroup.add(this.eggShell);

    // Add egg mesh to the group
    this.mesh = eggGroup;
  }

  private createBrokenEggEffect(): void {
    // Store the world position where the egg broke
    this.worldPosition.copy(this.position);
    this.isFixedInPlace = true;
    console.log("Egg broke and is now fixed at position:", this.worldPosition);

    // Play egg break sound if audio manager exists
    if (this.audioManager) {
      this.audioManager.playSound("egg_break");
    }

    // Remove the whole egg
    this.scene.remove(this.mesh);

    // Create a group for broken egg parts
    const brokenEggGroup = new THREE.Group();

    // Create egg yolk (yellow puddle)
    const yolkGeometry = new THREE.CircleGeometry(0.35, 16);
    const yolkMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      side: THREE.DoubleSide,
    });

    this.eggYolk = new THREE.Mesh(yolkGeometry, yolkMaterial);
    this.eggYolk.rotation.x = -Math.PI / 2; // Lay flat on the ground
    this.eggYolk.position.y = 0.01; // Just above ground
    brokenEggGroup.add(this.eggYolk);

    // Create eggshell fragments
    const fragmentsGeometry = new THREE.BufferGeometry();
    const fragmentCount = 15;

    // Create positions for fragments
    const positions = new Float32Array(fragmentCount * 3);
    for (let i = 0; i < fragmentCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.2;

      positions[i * 3] = Math.cos(angle) * radius; // x
      positions[i * 3 + 1] = 0.05; // y - just above ground
      positions[i * 3 + 2] = Math.sin(angle) * radius; // z
    }

    fragmentsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const fragmentsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(
      fragmentsGeometry,
      fragmentsMaterial
    );
    brokenEggGroup.add(this.particleSystem);

    // Set position of broken egg to where the egg broke
    brokenEggGroup.position.copy(this.position);

    // Add broken egg to scene
    this.scene.add(brokenEggGroup);

    // Update mesh reference for future updates
    this.mesh = brokenEggGroup;

    // Set broken flag
    this.isBroken = true;
  }

  /**
   * Check if the egg has hit the ground
   */
  public hasHitGround(): boolean {
    return this._hasHitGround;
  }

  /**
   * Check if the egg is marked for removal
   */
  public isMarkedForRemoval(): boolean {
    return this.markedForRemoval;
  }

  /**
   * Mark the egg for removal
   */
  public markForRemoval(): void {
    this.markedForRemoval = true;
  }

  /**
   * Update egg position and handle physics
   * @param deltaTime Time since last frame
   * @param gameSpeed Current game speed for z-axis movement
   */
  public update(deltaTime: number, gameSpeed: number): void {
    // Don't update eggs marked for removal
    if (this.markedForRemoval) {
      return;
    }

    // Update age of egg
    this.age += deltaTime;

    // Remove old eggs
    if (this.age > this.lifespan) {
      this.remove();
      return;
    }

    if (!this.isBroken) {
      // Apply physics to egg movement
      this.velocity.y -= GRAVITY * deltaTime;

      // Apply velocity to position
      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
      this.position.z += this.velocity.z * deltaTime - gameSpeed * deltaTime;

      // Check for ground collision
      if (this.position.y <= 0.2) {
        this.position.y = 0.25;
        this.createBrokenEggEffect();
        this._hasHitGround = true;
      }

      // Spin egg as it flies
      this.mesh.rotation.x += deltaTime * 5;
      this.mesh.rotation.z += deltaTime * 3;
    } else {
      // If egg is broken and fixed in place, don't move it with game speed
      // The egg stays at its worldPosition
      if (this.isFixedInPlace) {
        // No position updates - egg stays fixed in world space

        // Make the yolk slowly fade away over time
        if (this.eggYolk && this.particleSystem) {
          const fadeProgress = Math.min(
            1,
            (this.age - (this.lifespan - 3)) / 3
          );
          if (fadeProgress > 0) {
            (this.eggYolk.material as THREE.MeshStandardMaterial).opacity =
              1 - fadeProgress;
            (this.eggYolk.material as THREE.MeshStandardMaterial).transparent =
              true;

            (this.particleSystem.material as THREE.PointsMaterial).opacity =
              1 - fadeProgress;
            (this.particleSystem.material as THREE.PointsMaterial).transparent =
              true;
          }
        }
      }
    }
  }

  public reset(): void {
    // Not needed as eggs are removed once they break or age out
  }

  public isBrokenEgg(): boolean {
    return this.isBroken;
  }

  public getFreshness(): number {
    // Returns a value between 0-1 indicating how fresh the broken egg is
    // Used to determine how slippery it is (fresher = more slippery)
    if (!this.isBroken) return 0;

    // Calculate freshness (1.0 = just broken, 0.0 = almost disappeared)
    return Math.max(0, 1 - this.age / this.lifespan);
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager;
  }
}
