import * as THREE from "three";
// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const LANE_WIDTH = 4;
const TOTAL_LANES = 3;
const GAME_SPEED = 20;
const JUMP_FORCE = 15;
const GRAVITY = 30;
// Game class
class Game {
    constructor() {
        // Game state
        this.isGameRunning = false;
        this.score = 0;
        this.distanceTraveled = 0;
        this.gameSpeed = GAME_SPEED;
        this.obstacles = [];
        // Obstacle generation
        this.spawnTimer = 0;
        this.spawnInterval = 2000; // milliseconds
        // Initialize Three.js components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, // Field of view
        CANVAS_WIDTH / CANVAS_HEIGHT, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
        );
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
        this.renderer.setClearColor(0x87ceeb); // Sky blue color
        this.renderer.shadowMap.enabled = true;
        // Add the renderer's canvas to the DOM
        const gameContainer = document.querySelector(".game-container");
        gameContainer.innerHTML = ""; // Clear existing content
        gameContainer.appendChild(this.renderer.domElement);
        // Create UI elements
        this.createUI(gameContainer);
        // Initialize clock for time-based movements
        this.clock = new THREE.Clock();
        // Set up lighting
        this.setupLighting();
        // Initialize game objects
        this.initializeGameObjects();
        // Set up camera position
        this.camera.position.set(0, 5, -10); // Position camera behind and above player
        this.camera.lookAt(0, 2, 10); // Look ahead
        // Set up event listeners
        window.addEventListener("keydown", (e) => this.handleKeyDown(e));
        this.startButton.addEventListener("click", () => this.startGame());
        // Initial render
        this.render();
    }
    createUI(container) {
        // Create UI container
        const uiContainer = document.createElement("div");
        uiContainer.className = "ui-container";
        // Create score display
        this.scoreDisplay = document.createElement("div");
        this.scoreDisplay.id = "score";
        this.scoreDisplay.textContent = "Score: 0";
        // Create start button
        this.startButton = document.createElement("button");
        this.startButton.id = "startButton";
        this.startButton.textContent = "Start Game";
        // Append UI elements
        uiContainer.appendChild(this.scoreDisplay);
        uiContainer.appendChild(this.startButton);
        container.appendChild(uiContainer);
    }
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        // Set up shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }
    initializeGameObjects() {
        // Create environment
        this.environment = new Environment(this.scene);
        // Create ground
        const groundGeometry = new THREE.BoxGeometry(LANE_WIDTH * TOTAL_LANES, 1, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.position.set(0, -0.5, 0);
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        // Create player
        this.player = new Player(this.scene);
        // Create FootGoose
        this.footGoose = new FootGoose(this.scene);
    }
    handleKeyDown(e) {
        if (!this.isGameRunning)
            return;
        switch (e.code) {
            case "ArrowLeft":
                this.player.moveLeft();
                break;
            case "ArrowRight":
                this.player.moveRight();
                break;
            case "Space":
                this.player.jump();
                break;
        }
    }
    startGame() {
        if (!this.isGameRunning) {
            this.isGameRunning = true;
            this.score = 0;
            this.distanceTraveled = 0;
            this.gameSpeed = GAME_SPEED;
            this.updateScore();
            this.startButton.textContent = "Restart Game";
            // Reset game objects
            this.player.reset();
            this.footGoose.reset();
            // Remove all obstacles
            this.obstacles.forEach((obstacle) => obstacle.remove());
            this.obstacles = [];
            // Reset spawn timers
            this.spawnTimer = 0;
            this.spawnInterval = 2000;
            // Reset clock
            this.clock.start();
        }
        else {
            // Reset game state
            this.score = 0;
            this.distanceTraveled = 0;
            this.gameSpeed = GAME_SPEED;
            this.updateScore();
            // Reset game objects
            this.player.reset();
            this.footGoose.reset();
            // Remove all obstacles
            this.obstacles.forEach((obstacle) => obstacle.remove());
            this.obstacles = [];
            // Reset spawn timers
            this.spawnTimer = 0;
            this.spawnInterval = 2000;
        }
    }
    updateScore() {
        this.scoreDisplay.textContent = `Score: ${this.score}`;
    }
    update() {
        if (!this.isGameRunning)
            return;
        const deltaTime = this.clock.getDelta();
        // Update distance traveled
        this.distanceTraveled += this.gameSpeed * deltaTime;
        // Update score based on distance
        this.score = Math.floor(this.distanceTraveled);
        this.updateScore();
        // Gradually increase game speed
        this.gameSpeed = GAME_SPEED + this.distanceTraveled / 1000;
        // Update player
        this.player.update(deltaTime);
        // Update FootGoose
        this.footGoose.update(deltaTime, this.player);
        // Update environment (move ground and decorations)
        this.environment.update(deltaTime, this.gameSpeed);
        // Move the ground to create endless running effect
        this.ground.position.z -= this.gameSpeed * deltaTime;
        if (this.ground.position.z < -500) {
            this.ground.position.z = 0;
        }
        // Spawn obstacles
        this.spawnTimer += deltaTime * 1000;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnObstacle();
            this.spawnTimer = 0;
            // Gradually decrease spawn interval for increased difficulty
            this.spawnInterval = Math.max(500, this.spawnInterval - 50);
        }
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(deltaTime, this.gameSpeed);
            // Remove obstacles that are far behind the camera
            if (obstacle.position.z < -20) {
                obstacle.remove();
                this.obstacles.splice(i, 1);
                continue;
            }
            // Check for collisions with player
            if (this.checkCollision(this.player, obstacle)) {
                console.log("Player hit obstacle!");
                // For now, just reset the game
                this.startGame();
                break;
            }
        }
        // Check if player caught the FootGoose
        if (this.checkCollision(this.player, this.footGoose)) {
            console.log("Player caught the FootGoose!");
            // Add score and reset FootGoose
            this.score += 1000;
            this.updateScore();
            this.footGoose.reset();
        }
        // Update camera position to follow player
        this.updateCameraPosition();
    }
    updateCameraPosition() {
        // Position camera behind player for third-person perspective
        this.camera.position.x = this.player.position.x;
        this.camera.position.y = this.player.position.y + 5;
        this.camera.position.z = this.player.position.z - 10;
        // Look at a point slightly ahead of the player
        this.camera.lookAt(this.player.position.x, this.player.position.y + 2, this.player.position.z + 10);
    }
    spawnObstacle() {
        // Choose a random lane
        const lane = Math.floor(Math.random() * TOTAL_LANES) - 1; // -1, 0, or 1
        const x = (lane * LANE_WIDTH) / TOTAL_LANES;
        // Create obstacle
        const obstacle = new Obstacle(this.scene, x);
        this.obstacles.push(obstacle);
    }
    checkCollision(a, b) {
        // Simple box collision detection
        const aBox = new THREE.Box3().setFromObject(a.mesh);
        const bBox = new THREE.Box3().setFromObject(b.mesh);
        return aBox.intersectsBox(bBox);
    }
    render() {
        // Update game state
        this.update();
        // Render scene
        this.renderer.render(this.scene, this.camera);
        // Request next frame
        requestAnimationFrame(() => this.render());
    }
}
// Base class for all game objects
class GameObject {
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
// Player class
class Player extends GameObject {
    constructor(scene) {
        super(scene);
        this.lane = 0; // -1: left, 0: center, 1: right
        this.isJumping = false;
        this.velocity = new THREE.Vector3(0, 0, 0);
        // Create player mesh
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x3498db });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, 0); // Start at center lane
        this.mesh.castShadow = true;
        this.position = this.mesh.position;
        scene.add(this.mesh);
    }
    update(deltaTime) {
        // Apply gravity if jumping
        if (this.isJumping) {
            this.velocity.y -= GRAVITY * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
            // Check for landing
            if (this.position.y <= 1) {
                this.position.y = 1;
                this.velocity.y = 0;
                this.isJumping = false;
            }
        }
        // Smooth lane changing
        const targetX = (this.lane * LANE_WIDTH) / TOTAL_LANES;
        this.position.x += (targetX - this.position.x) * 10 * deltaTime;
    }
    moveLeft() {
        if (this.lane > -1) {
            this.lane--;
        }
    }
    moveRight() {
        if (this.lane < 1) {
            this.lane++;
        }
    }
    jump() {
        if (!this.isJumping) {
            this.velocity.y = JUMP_FORCE;
            this.isJumping = true;
        }
    }
    reset() {
        this.lane = 0;
        this.isJumping = false;
        this.velocity.set(0, 0, 0);
        this.position.set(0, 1, 0);
    }
}
// FootGoose class
class FootGoose extends GameObject {
    constructor(scene) {
        super(scene);
        this.lane = 1; // Start in right lane
        this.isJumping = false;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.jumpTimer = 0;
        this.jumpInterval = 2; // seconds
        this.laneChangeTimer = 0;
        this.laneChangeInterval = 3; // seconds
        // Create FootGoose mesh - slightly different shape
        const geometry = new THREE.BoxGeometry(1, 1.5, 1.2);
        const material = new THREE.MeshStandardMaterial({ color: 0xff9800 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set((this.lane * LANE_WIDTH) / TOTAL_LANES, 0.75, 15 // Start ahead of player
        );
        this.mesh.castShadow = true;
        this.position = this.mesh.position;
        scene.add(this.mesh);
    }
    update(deltaTime, player) {
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
    }
}
// Obstacle class
class Obstacle extends GameObject {
    constructor(scene, lane) {
        super(scene);
        // Create obstacle mesh (various types)
        const type = Math.floor(Math.random() * 3);
        let geometry;
        let material;
        switch (type) {
            case 0: // Box obstacle
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
        this.mesh.position.set(lane, type === 1 ? 1 : 0.5, // Height based on obstacle type
        100 // Far ahead
        );
        this.mesh.castShadow = true;
        this.position = this.mesh.position;
        scene.add(this.mesh);
    }
    update(deltaTime, gameSpeed) {
        // Move obstacle toward player
        this.position.z -= gameSpeed * deltaTime;
    }
    reset() {
        // Not needed for obstacles as they are removed once passed
    }
}
// Environment class for background elements
class Environment {
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
            tree.position.set(side * (LANE_WIDTH + 2 + Math.random() * 5), 0, i * 10);
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
            rock.position.set(side * (LANE_WIDTH + Math.random() * 6), 0, Math.random() * 200);
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
// Initialize the game when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
    new Game();
});
//# sourceMappingURL=game.js.map