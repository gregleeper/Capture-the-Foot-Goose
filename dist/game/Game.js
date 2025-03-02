// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
import { CANVAS_WIDTH, CANVAS_HEIGHT, LANE_WIDTH, TOTAL_LANES, GAME_SPEED, } from "./utils/constants.js";
import { Player, } from "./objects/Player.js";
import { FootGoose } from "./objects/FootGoose.js";
import { Obstacle } from "./objects/Obstacle.js";
import { Environment } from "./environment/Environment.js";
import { Egg } from "./objects/Egg.js";
import { AudioManager } from "./audio/AudioManager.js";
import { Shop } from "./Shop.js";
// Game class
export class Game {
    constructor() {
        // Game state
        this.isGameRunning = false;
        this.score = 0;
        this.distanceTraveled = 0;
        this.gameSpeed = GAME_SPEED;
        this.isFullScreen = false;
        this.highScore = 0;
        this.isLockerOpen = false;
        this.isShopOpen = false;
        // Customization states
        this.selectedHairstyle = "none";
        // Available characters
        this.availableCharacters = [
            {
                id: "default",
                name: "Standard Runner",
                color: "blue",
                description: "Your reliable standard runner with big feet.",
                unlockScore: 0, // Available from the start
                unlocked: true,
            },
            {
                id: "speedy",
                name: "Speedy Red",
                color: "red",
                description: "A faster character with slightly smaller feet.",
                unlockScore: 1000,
                unlocked: false,
            },
            {
                id: "jumper",
                name: "Green Hopper",
                color: "green",
                description: "Jumps slightly higher than other characters.",
                unlockScore: 2500,
                unlocked: false,
            },
            {
                id: "purple_giant",
                name: "Purple Giant",
                color: "purple",
                description: "Slower but with massive feet for better balance.",
                unlockScore: 5000,
                unlocked: false,
            },
            {
                id: "golden_runner",
                name: "Golden Champion",
                color: "orange",
                description: "The ultimate balanced character. Master of all skills.",
                unlockScore: 10000,
                unlocked: false,
            },
        ];
        this.obstacles = [];
        // Obstacle generation
        this.spawnTimer = 0;
        this.spawnInterval = 2000; // milliseconds
        // Track awarded coins to prevent duplicates
        this.coinAwardTracker = new Set();
        // Load saved data
        this.loadGameData();
        // Initialize audio manager
        this.audioManager = new AudioManager();
        this.loadAudioAssets();
        // Initialize shop
        this.shop = new Shop(this.audioManager, 0); // Start with 0 coins
        this.shop.loadShopData();
        this.shop.setOnCoinsChanged((coins) => {
            if (this.coinsDisplay) {
                this.coinsDisplay.textContent = `${coins}`;
            }
        });
        // Set initial selected character (default)
        this.selectedCharacter = this.availableCharacters.find((char) => char.id === "default");
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
        if (!gameContainer) {
            console.error("Could not find game container element");
            throw new Error("Game container not found");
        }
        gameContainer.innerHTML = ""; // Clear existing content
        gameContainer.appendChild(this.renderer.domElement);
        // Create UI elements
        this.createUI();
        // Initialize clock for time-based movements
        this.clock = new THREE.Clock();
        // Set up lighting
        this.setupLighting();
        // Initialize game objects
        this.initializeGameObjects();
        // Set up camera position - adjust height and distance for wider lanes
        this.camera.position.set(0, 6, -12); // Increased height and distance
        this.camera.lookAt(0, 2, 10); // Look ahead
        // Set up event listeners
        window.addEventListener("keydown", (e) => this.handleKeyDown(e));
        window.addEventListener("keyup", (e) => this.handleKeyUp(e));
        this.startButton.addEventListener("click", () => this.startGame());
        // Handle fullscreen change event
        document.addEventListener("fullscreenchange", () => this.handleFullscreenChange());
        document.addEventListener("webkitfullscreenchange", () => this.handleFullscreenChange());
        document.addEventListener("mozfullscreenchange", () => this.handleFullscreenChange());
        document.addEventListener("MSFullscreenChange", () => this.handleFullscreenChange());
        // Handle window resize for responsive fullscreen
        window.addEventListener("resize", () => this.handleWindowResize());
        // Initial render
        this.render();
    }
    // Load saved game data from local storage
    loadGameData() {
        try {
            // Load high score
            const savedHighScore = localStorage.getItem("highScore");
            if (savedHighScore) {
                this.highScore = parseInt(savedHighScore);
            }
            // Load unlocked characters
            const savedCharacters = localStorage.getItem("unlockedCharacters");
            if (savedCharacters) {
                const unlockedIds = JSON.parse(savedCharacters);
                // Update our available characters
                unlockedIds.forEach((id) => {
                    const character = this.availableCharacters.find((c) => c.id === id);
                    if (character) {
                        character.unlocked = true;
                    }
                });
            }
            // Load selected character
            const savedSelectedCharacter = localStorage.getItem("selectedCharacter");
            if (savedSelectedCharacter) {
                const characterId = savedSelectedCharacter;
                const character = this.availableCharacters.find((c) => c.id === characterId);
                if (character && character.unlocked) {
                    this.selectedCharacter = character;
                }
            }
            // Load selected hairstyle
            const savedHairstyle = localStorage.getItem("selectedHairstyle");
            if (savedHairstyle) {
                this.selectedHairstyle = savedHairstyle;
            }
            console.log("Game data loaded successfully");
        }
        catch (error) {
            console.error("Error loading game data:", error);
            // Continue with default values if loading fails
        }
    }
    // Save game data to local storage
    saveGameData() {
        try {
            // Save high score
            localStorage.setItem("highScore", this.highScore.toString());
            // Save unlocked characters (just IDs)
            const unlockedIds = this.availableCharacters
                .filter((char) => char.unlocked)
                .map((char) => char.id);
            localStorage.setItem("unlockedCharacters", JSON.stringify(unlockedIds));
            // Save selected character
            localStorage.setItem("selectedCharacter", this.selectedCharacter.id);
            // Save selected hairstyle
            localStorage.setItem("selectedHairstyle", this.selectedHairstyle);
            console.log("Game data saved successfully");
        }
        catch (error) {
            console.error("Error saving game data:", error);
        }
    }
    createUI() {
        // Create UI container
        this.uiContainer = document.createElement("div");
        this.uiContainer.className = "ui-container";
        // Create score display
        this.scoreDisplay = document.createElement("div");
        this.scoreDisplay.className = "score-display";
        this.scoreDisplay.textContent = "Score: 0";
        this.uiContainer.appendChild(this.scoreDisplay);
        // Create high score display
        this.highScoreDisplay = document.createElement("div");
        this.highScoreDisplay.className = "high-score-display";
        this.highScoreDisplay.style.marginLeft = "20px";
        this.highScoreDisplay.textContent = `High Score: ${this.highScore}`;
        this.uiContainer.appendChild(this.highScoreDisplay);
        // Create sound toggle button
        const soundButton = document.createElement("button");
        soundButton.className = "sound-button";
        soundButton.textContent = this.audioManager.getMute() ? "🔇" : "🔊";
        soundButton.title = this.audioManager.getMute()
            ? "Unmute Sound"
            : "Mute Sound";
        soundButton.addEventListener("click", () => {
            const muted = this.audioManager.toggleMute();
            soundButton.textContent = muted ? "🔇" : "🔊";
            soundButton.title = muted ? "Unmute Sound" : "Mute Sound";
        });
        this.uiContainer.appendChild(soundButton);
        // Create color selector
        const colorSelector = document.createElement("div");
        colorSelector.className = "color-selector";
        // Add color options
        const colors = ["red", "green", "blue", "yellow", "purple", "orange"];
        colors.forEach((color) => {
            const colorOption = document.createElement("div");
            colorOption.className = `color-option ${color}`;
            colorOption.dataset.color = color;
            // Set selected color
            if (color === this.selectedCharacter.color) {
                colorOption.classList.add("selected");
            }
            colorSelector.appendChild(colorOption);
        });
        this.uiContainer.appendChild(colorSelector);
        // Create locker button
        const lockerButton = document.createElement("button");
        lockerButton.className = "locker-button";
        lockerButton.textContent = "🎮 Characters";
        // Save reference to 'this' for the event handler
        const self = this;
        lockerButton.addEventListener("click", function () {
            self.toggleLockerPanel();
        });
        // Assign to the class property
        this.lockerButton = lockerButton;
        this.uiContainer.appendChild(lockerButton);
        // Create locker panel
        this.lockerPanel = document.createElement("div");
        this.lockerPanel.className = "locker-panel";
        this.lockerPanel.style.display = "none";
        // Append to game container instead of uiContainer
        document.querySelector(".game-container")?.appendChild(this.lockerPanel);
        // Populate locker panel with characters
        this.updateLockerPanel();
        // Add color selector event listeners
        const colorOptions = colorSelector.querySelectorAll(".color-option");
        colorOptions.forEach((option) => {
            option.addEventListener("click", (e) => {
                const target = e.target;
                const color = target.dataset.color;
                // Remove selected class from all options
                colorOptions.forEach((opt) => opt.classList.remove("selected"));
                // Add selected class to clicked option
                target.classList.add("selected");
                // Set player color if player exists
                this.selectedCharacter.color = color;
                if (this.player) {
                    this.player.setColor(color);
                }
                // Save selected color
                this.saveGameData();
            });
        });
        // Create shop button to the UI
        this.shopButton = document.createElement("button");
        this.shopButton.className = "locker-button";
        this.shopButton.textContent = "Shop";
        this.shopButton.addEventListener("click", () => this.toggleShopPanel());
        this.uiContainer.appendChild(this.shopButton);
        // Create shop panel (initially hidden)
        this.shopPanel = document.createElement("div");
        this.shopPanel.className = "shop-panel";
        this.shopPanel.style.display = "none";
        document.body.appendChild(this.shopPanel);
        // Add coin display
        this.coinsDisplay = document.createElement("div");
        this.coinsDisplay.className = "coin-display";
        this.coinsDisplay.textContent = `${this.shop.getCoins()}`;
        this.uiContainer.appendChild(this.coinsDisplay);
        // Create start button
        this.startButton = document.createElement("button");
        this.startButton.id = "startButton";
        this.startButton.className = "start-button";
        this.startButton.textContent = "Start Game";
        this.startButton.addEventListener("click", () => this.startGame());
        this.uiContainer.appendChild(this.startButton);
        // Create full screen button
        this.fullScreenButton = document.createElement("button");
        this.fullScreenButton.id = "fullScreenButton";
        this.fullScreenButton.className = "fullscreen-button";
        this.fullScreenButton.textContent = "Full Screen";
        this.fullScreenButton.addEventListener("click", () => this.toggleFullScreen());
        this.uiContainer.appendChild(this.fullScreenButton);
        // Initially hide the in-game UI
        this.uiContainer.style.display = "none";
        // Add the UI to the DOM
        document.querySelector(".game-container")?.appendChild(this.uiContainer);
        // Create the start screen
        this.createStartScreen();
    }
    createStartScreen() {
        // Create start screen container
        const startScreen = document.createElement("div");
        startScreen.className = "start-screen";
        // Create lake background
        const lakeBackground = document.createElement("div");
        lakeBackground.className = "lake-background";
        // Create ripples for lake
        const lakeRipples = document.createElement("div");
        lakeRipples.className = "lake-ripples";
        lakeBackground.appendChild(lakeRipples);
        startScreen.appendChild(lakeBackground);
        // Create goose
        const gooseContainer = document.createElement("div");
        gooseContainer.className = "goose-container";
        // Goose body
        const gooseBody = document.createElement("div");
        gooseBody.className = "goose-body";
        // Goose neck
        const gooseNeck = document.createElement("div");
        gooseNeck.className = "goose-neck";
        // Goose head
        const gooseHead = document.createElement("div");
        gooseHead.className = "goose-head";
        // Goose bill
        const gooseBill = document.createElement("div");
        gooseBill.className = "goose-bill";
        // Goose eye
        const gooseEye = document.createElement("div");
        gooseEye.className = "goose-eye";
        // Assemble goose
        gooseHead.appendChild(gooseEye);
        gooseHead.appendChild(gooseBill);
        gooseNeck.appendChild(gooseHead);
        gooseBody.appendChild(gooseNeck);
        gooseContainer.appendChild(gooseBody);
        // Add goose to start screen
        startScreen.appendChild(gooseContainer);
        // Create start menu
        const startMenu = document.createElement("div");
        startMenu.className = "start-menu";
        // Game title
        const gameTitle = document.createElement("h1");
        gameTitle.className = "game-title";
        gameTitle.textContent = "Capture the Foot Goose";
        startMenu.appendChild(gameTitle);
        // Play button
        const playButton = document.createElement("button");
        playButton.className = "menu-button play-button";
        playButton.textContent = "Play Game";
        playButton.addEventListener("click", () => {
            // Hide start screen
            startScreen.style.display = "none";
            // Show in-game UI
            if (this.uiContainer) {
                this.uiContainer.style.display = "flex";
            }
            // Start the game
            this.startGame();
        });
        startMenu.appendChild(playButton);
        // Character locker button
        const charButton = document.createElement("button");
        charButton.className = "menu-button character-button";
        charButton.textContent = "Characters";
        // Save reference to the class instance
        const self = this;
        charButton.addEventListener("click", function () {
            self.toggleLockerPanel();
        });
        startMenu.appendChild(charButton);
        // Settings button (including fullscreen option)
        const settingsButton = document.createElement("button");
        settingsButton.className = "menu-button settings-button";
        settingsButton.textContent = "Fullscreen";
        settingsButton.addEventListener("click", () => this.toggleFullScreen());
        startMenu.appendChild(settingsButton);
        // Sound toggle button
        const soundButton = document.createElement("button");
        soundButton.className = "menu-button sound-button";
        soundButton.textContent = `Sound: ${this.audioManager.getMute() ? "Off 🔇" : "On 🔊"}`;
        soundButton.addEventListener("click", () => {
            const muted = this.audioManager.toggleMute();
            soundButton.textContent = `Sound: ${muted ? "Off 🔇" : "On 🔊"}`;
        });
        startMenu.appendChild(soundButton);
        // Footer text
        const footerText = document.createElement("p");
        footerText.className = "footer-text";
        footerText.textContent =
            "W/Space/↑ to Jump • A/← to Move Left • D/→ to Move Right";
        startMenu.appendChild(footerText);
        // Add shop button
        const shopButton = document.createElement("button");
        shopButton.className = "menu-button shop-button";
        shopButton.textContent = "Shop";
        shopButton.addEventListener("click", () => {
            this.audioManager.playSound("menu_click");
            this.createShopPanel();
            this.shopPanel.style.display = "block";
            this.isShopOpen = true;
        });
        startMenu.appendChild(shopButton);
        // Add start menu to start screen
        startScreen.appendChild(startMenu);
        // Add start screen to game container
        document.querySelector(".game-container")?.appendChild(startScreen);
    }
    // Update the locker panel contents
    updateLockerPanel() {
        // Clear existing content
        this.lockerPanel.innerHTML = "";
        // Create header
        const header = document.createElement("div");
        header.className = "locker-header";
        header.innerHTML = `
      <h2>Character Locker</h2>
      <button class="close-locker">✕</button>
    `;
        this.lockerPanel.appendChild(header);
        // Add close button functionality
        const closeButton = header.querySelector(".close-locker");
        closeButton.addEventListener("click", () => this.toggleLockerPanel());
        // Create character list
        const characterList = document.createElement("div");
        characterList.className = "character-list";
        // Add each character to the list
        this.availableCharacters.forEach((character) => {
            const characterItem = document.createElement("div");
            characterItem.className = `character-item ${character.unlocked ? "unlocked" : "locked"}`;
            characterItem.dataset.id = character.id;
            // Determine if this is the currently selected character
            const isSelected = this.selectedCharacter.id === character.id;
            characterItem.innerHTML = `
        <div class="character-color ${character.color}"></div>
        <div class="character-info">
          <h3>${character.name} ${isSelected ? "(Selected)" : ""}</h3>
          <p>${character.description}</p>
          ${character.unlocked
                ? `<button class="select-character-btn" data-id="${character.id}">${isSelected ? "Selected" : "Select"}</button>`
                : `<div class="unlock-info">Unlock at ${character.unlockScore} points</div>`}
        </div>
        ${!character.unlocked ? '<div class="lock-icon">🔒</div>' : ""}
      `;
            // Add event listeners to the select buttons
            if (character.unlocked) {
                const selectButton = characterItem.querySelector(".select-character-btn");
                selectButton?.addEventListener("click", () => {
                    this.selectCharacter(character);
                });
            }
            characterList.appendChild(characterItem);
        });
        this.lockerPanel.appendChild(characterList);
        // Add hairstyle section
        this.addHairstyleSection();
    }
    // Add hairstyle selection section to the locker panel
    addHairstyleSection() {
        // Create hairstyle section heading
        const hairstyleHeading = document.createElement("div");
        hairstyleHeading.className = "locker-header";
        hairstyleHeading.style.marginTop = "20px";
        hairstyleHeading.innerHTML = `
      <h2>Hairstyles</h2>
    `;
        this.lockerPanel.appendChild(hairstyleHeading);
        // Create hairstyle container
        const hairstyleContainer = document.createElement("div");
        hairstyleContainer.className = "hairstyle-container";
        // Define available hairstyles
        const hairstyles = [
            { id: "none", name: "No Hair", emoji: "👤" },
            { id: "short", name: "Short Hair", emoji: "💇" },
            { id: "mohawk", name: "Mohawk", emoji: "🎸" },
            { id: "spiky", name: "Spiky Hair", emoji: "⚡" },
            { id: "long", name: "Long Hair", emoji: "👱" },
        ];
        // Create a button for each hairstyle
        hairstyles.forEach((hairstyle) => {
            const hairstyleBtn = document.createElement("div");
            hairstyleBtn.className = `hairstyle-option ${this.selectedHairstyle === hairstyle.id ? "selected" : ""}`;
            hairstyleBtn.dataset.hairstyle = hairstyle.id;
            hairstyleBtn.innerHTML = `
        <div class="emoji">${hairstyle.emoji}</div>
        <div class="name">${hairstyle.name}</div>
      `;
            hairstyleBtn.addEventListener("click", () => {
                // Update selected hairstyle
                this.setHairstyle(hairstyle.id);
                // Update UI
                hairstyleContainer
                    .querySelectorAll(".hairstyle-option")
                    .forEach((opt) => {
                    opt.classList.remove("selected");
                });
                hairstyleBtn.classList.add("selected");
            });
            hairstyleContainer.appendChild(hairstyleBtn);
        });
        this.lockerPanel.appendChild(hairstyleContainer);
    }
    // Select a new character
    selectCharacter(character) {
        if (!character.unlocked)
            return;
        this.selectedCharacter = character;
        // Update player color
        if (this.player) {
            this.player.setColor(character.color);
            // Set character type based on ID
            this.player.setCharacterType(character.id);
        }
        // Update color selector UI
        const colorOptions = this.colorSelector.querySelectorAll(".color-option");
        colorOptions.forEach((option) => {
            option.classList.remove("selected");
            if (option.getAttribute("data-color") === character.color) {
                option.classList.add("selected");
            }
        });
        // Update the locker panel to show the currently selected character
        this.updateLockerPanel();
        // Save the selected character
        this.saveGameData();
        // Play menu click sound
        this.audioManager.playSound("menu_click");
    }
    // Select a new hairstyle
    setHairstyle(hairstyleType) {
        this.selectedHairstyle = hairstyleType;
        // Update player's hairstyle
        if (this.player && typeof this.player.setHairstyle === "function") {
            this.player.setHairstyle(hairstyleType);
        }
        // Save the selected hairstyle
        this.saveGameData();
        // Play menu click sound
        this.audioManager.playSound("menu_click");
    }
    // Check for newly unlocked characters based on score
    checkCharacterUnlocks() {
        let newUnlocks = false;
        this.availableCharacters.forEach((character) => {
            if (!character.unlocked && this.score >= character.unlockScore) {
                character.unlocked = true;
                newUnlocks = true;
                // Show unlock notification
                this.showUnlockNotification(character);
            }
        });
        if (newUnlocks) {
            // Save unlocked characters
            this.saveGameData();
        }
    }
    // Show notification when a new character is unlocked
    showUnlockNotification(character) {
        const notification = document.createElement("div");
        notification.className = "unlock-notification";
        notification.innerHTML = `
      <div class="notification-content">
        <h3>New Character Unlocked!</h3>
        <div class="character-color ${character.color}"></div>
        <p>${character.name}</p>
        <p>${character.description}</p>
        <button class="notification-btn">Awesome!</button>
      </div>
    `;
        document.querySelector(".game-container")?.appendChild(notification);
        // Add button functionality
        const button = notification.querySelector(".notification-btn");
        button?.addEventListener("click", () => {
            notification.remove();
        });
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        // Play character unlock sound
        this.audioManager.playSound("character_unlock");
    }
    // Toggle fullscreen mode
    toggleFullScreen() {
        const gameContainer = document.querySelector(".game-container");
        if (!this.isFullScreen) {
            // Enter fullscreen mode
            if (gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen();
            }
            else if (gameContainer.mozRequestFullScreen) {
                gameContainer.mozRequestFullScreen();
            }
            else if (gameContainer.webkitRequestFullscreen) {
                gameContainer.webkitRequestFullscreen();
            }
            else if (gameContainer.msRequestFullscreen) {
                gameContainer.msRequestFullscreen();
            }
        }
        else {
            // Exit fullscreen mode
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
            else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        // Play menu click sound
        this.audioManager.playSound("menu_click");
    }
    // Handle fullscreen change events
    handleFullscreenChange() {
        // Check if we're in fullscreen mode
        this.isFullScreen =
            document.fullscreenElement !== null ||
                document.mozFullScreenElement !== null ||
                document.webkitFullscreenElement !== null ||
                document.msFullscreenElement !== null;
        // Update button text
        this.fullScreenButton.textContent = this.isFullScreen
            ? "Exit Full Screen"
            : "Full Screen";
        // Resize renderer
        this.resizeRenderer();
    }
    // Resize renderer based on current container or screen size
    resizeRenderer() {
        const gameContainer = document.querySelector(".game-container");
        if (this.isFullScreen) {
            // In fullscreen mode, use window dimensions
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
        }
        else {
            // In windowed mode, use container dimensions
            this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
            this.camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        }
        // Update camera projection matrix
        this.camera.updateProjectionMatrix();
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
        // Get selected character
        const characterType = this.selectedCharacter.id;
        const color = this.selectedCharacter.color;
        // Create player with selected character properties and hairstyle
        this.player = new Player(this.scene, color, this.selectedHairstyle, this.audioManager);
        // Set the character type to apply stats
        this.player.setCharacterType(characterType);
        // Create FootGoose with audio manager
        this.footGoose = new FootGoose(this.scene, this.audioManager);
        // Add control instructions to the UI
        this.addControlInstructions();
    }
    addControlInstructions() {
        const instructions = document.createElement("div");
        instructions.className = "control-instructions";
        instructions.innerHTML = `
      <div style="position: absolute; bottom: 10px; left: 10px; background-color: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 5px; font-size: 14px;">
        <strong>Controls:</strong><br>
        A / → : Move Left<br>
        D / ← : Move Right<br>
        W / Space / ↑ : Jump
      </div>
    `;
        document.querySelector(".game-container")?.appendChild(instructions);
    }
    handleKeyDown(e) {
        if (!this.isGameRunning)
            return;
        // Prevent default behavior for game controls to avoid browser scrolling
        if ([
            "KeyA",
            "KeyD",
            "KeyW",
            "ArrowLeft",
            "ArrowRight",
            "Space",
            "ArrowUp",
            "ArrowDown",
        ].includes(e.code)) {
            e.preventDefault();
        }
        switch (e.code) {
            case "KeyA":
                this.player.moveLeft();
                break;
            case "ArrowLeft": // Invert arrow keys - Left arrow moves right
                this.player.moveRight();
                break;
            case "KeyD":
                this.player.moveRight();
                break;
            case "ArrowRight": // Invert arrow keys - Right arrow moves left
                this.player.moveLeft();
                break;
            case "KeyW":
            case "Space":
            case "ArrowUp":
                if (!this.player.isCurrentlyJumping()) {
                    this.audioManager.playSound("jump");
                }
                this.player.jump();
                break;
        }
    }
    // Add a new method to handle key releases
    handleKeyUp(e) {
        if (!this.isGameRunning)
            return;
        // Prevent default behavior for game controls
        if ([
            "KeyA",
            "KeyD",
            "KeyW",
            "ArrowLeft",
            "ArrowRight",
            "Space",
            "ArrowUp",
            "ArrowDown",
        ].includes(e.code)) {
            e.preventDefault();
        }
        // We don't need to do anything special on key release for our game mechanics
        // But having this handler prevents any default browser behaviors
    }
    /**
     * Start the game
     */
    startGame() {
        // Only start if game is not already running
        if (!this.isGameRunning) {
            // Hide start screen
            const startScreen = document.querySelector(".start-screen");
            if (startScreen) {
                startScreen.style.display = "none";
            }
            // Reset game state
            this.isGameRunning = true;
            this.score = 0;
            this.distanceTraveled = 0;
            this.gameSpeed = GAME_SPEED;
            this.updateScore();
            this.startButton.textContent = "Restart Game";
            // Initialize game objects only the first time
            if (!this.player || !this.footGoose) {
                this.initializeGameObjects();
            }
            else {
                // Just reset existing objects
                this.player.reset();
                this.footGoose.reset();
            }
            // Apply any purchased powerups from the shop
            this.applyPurchasedPowerups();
            // Remove all obstacles
            this.obstacles.forEach((obstacle) => obstacle.remove());
            this.obstacles = [];
            // Reset spawn timers
            this.spawnTimer = 0;
            this.spawnInterval = 2000;
            // Reset clock
            this.clock = new THREE.Clock();
            // Start game loop
            this.update();
            // Show UI elements
            this.uiContainer.style.display = "block";
            // Play game start sound
            this.audioManager.playSound("game_start");
            // Start background music if not already playing
            this.audioManager.playMusic();
            // Reset coin award tracker for new game session
            this.resetCoinTracker();
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
            // Play game start sound for restart
            this.audioManager.playSound("game_start");
        }
    }
    /**
     * Apply powerups that have been purchased from the shop
     */
    applyPurchasedPowerups() {
        // Check for purchased powerups
        if (this.shop.isItemPurchased("double_jump")) {
            // Implement double jump functionality
            console.log("Double jump powerup active");
            // Could add a double jump counter to the player here
        }
        if (this.shop.isItemPurchased("magnet")) {
            // Apply coin magnet effect
            this.player.applyPowerup("magnet", 3, null); // 3 unit range, permanent
            console.log("Coin magnet powerup active");
        }
        if (this.shop.isItemPurchased("shield")) {
            // Apply shield effect
            this.player.applyPowerup("shield", 1, null); // Single shield, permanent until hit
            console.log("Shield powerup active");
        }
        if (this.shop.isItemPurchased("head_start")) {
            // Apply head start by advancing the player
            this.distanceTraveled += 500;
            console.log("Head start powerup active");
        }
        if (this.shop.isItemPurchased("coin_doubler")) {
            // Set a flag to double coins for this run
            // This would need to be implemented in the coin collection logic
            console.log("Coin doubler powerup active");
        }
    }
    updateScore() {
        this.scoreDisplay.textContent = `Score: ${this.score}`;
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            const highScoreDisplay = document.getElementById("highScore");
            if (highScoreDisplay) {
                highScoreDisplay.textContent = `High Score: ${this.highScore}`;
            }
            // Save the new high score
            this.saveGameData();
        }
        // Check for character unlocks
        this.checkCharacterUnlocks();
        // Award coins at intervals (every 100 points)
        if (this.score > 0 &&
            this.score % 100 === 0 &&
            !this.hasAwardedCoinForScore(this.score)) {
            this.awardCoins(10);
            this.trackCoinAward(this.score);
        }
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
            // Get distance to obstacle for more accurate collision detection
            const distanceToObstacle = Math.abs(obstacle.position.z - this.player.position.z);
            // Skip collision check if obstacle is too far away (optimization)
            if (distanceToObstacle > 5) {
                continue;
            }
            // Enhanced collision detection for nearby obstacles
            if (distanceToObstacle < 3) {
                // Skip collision checks if player is slipping (grace period)
                if (!this.player.isCurrentlySlipping()) {
                    // Check for actual collision
                    if (this.checkCollision(this.player, obstacle)) {
                        console.log("COLLISION DETECTED: Player hit obstacle at distance:", distanceToObstacle);
                        // For now, just reset the game
                        this.startGame();
                        break;
                    }
                }
            }
        }
        // Check for egg collisions
        this.checkEggCollisions(deltaTime);
        // Check if player caught the FootGoose
        if (this.checkCollision(this.player, this.footGoose)) {
            console.log("Player caught the FootGoose!");
            // Play collect sound
            this.audioManager.playSound("collect");
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
        // Adjusted for wider lanes - higher and further back
        this.camera.position.x = this.player.position.x;
        this.camera.position.y = this.player.position.y + 6; // Increased from 5
        this.camera.position.z = this.player.position.z - 12; // Increased from -10
        // Look at a point slightly ahead of the player
        this.camera.lookAt(this.player.position.x, this.player.position.y + 2, this.player.position.z + 10);
    }
    spawnObstacle() {
        // Choose a random lane
        const lane = Math.floor(Math.random() * TOTAL_LANES) - 1; // -1, 0, or 1
        const lanePosition = (lane * LANE_WIDTH) / TOTAL_LANES;
        // Add slight variation to obstacle position within lane
        const xVariation = (Math.random() - 0.5) * ((LANE_WIDTH / TOTAL_LANES) * 0.5);
        const x = lanePosition + xVariation;
        // Create obstacle
        const obstacle = new Obstacle(this.scene, x);
        this.obstacles.push(obstacle);
        // Debug obstacle positioning
        console.log(`Spawned obstacle in lane ${lane} at position x: ${x}`);
    }
    checkCollision(a, b) {
        // Make sure both objects exist
        if (!a || !b || !a.mesh || !b.mesh) {
            console.log("Collision check failed: Missing objects");
            return false;
        }
        // Check if objects are an egg that's too new (just created)
        if (b instanceof Egg &&
            b.getFreshness() === 0 &&
            !b.isBrokenEgg()) {
            // Skip collision for newly created eggs that are still near the goose
            return false;
        }
        // Create bounding boxes for both objects
        const aBox = new THREE.Box3().setFromObject(a.mesh);
        const bBox = new THREE.Box3().setFromObject(b.mesh);
        // Basic collision check using bounding box intersection
        const isIntersecting = aBox.intersectsBox(bBox);
        // If no intersection, no collision
        if (!isIntersecting) {
            return false;
        }
        // Handle player jumping over obstacles
        if (a === this.player &&
            b instanceof Obstacle &&
            this.player.isCurrentlyJumping()) {
            // Get height of obstacle - use the actual height from obstacle if available
            let obstacleHeight;
            if (b instanceof Obstacle &&
                typeof b.getHeight === "function") {
                obstacleHeight = b.getHeight();
            }
            else {
                obstacleHeight = bBox.max.y - bBox.min.y;
            }
            const obstacleTopY = b.mesh.position.y + obstacleHeight / 2;
            // Calculate player's feet position (bottom of player mesh)
            const playerFeetY = this.player.position.y - 1; // Player height is 2
            // Debug collision information
            console.log(`Jump collision check: Player feet at ${playerFeetY}, Obstacle top at ${obstacleTopY}, Obstacle height: ${obstacleHeight}`);
            // If player is jumping high enough over a short obstacle, allow them to pass
            if (playerFeetY > obstacleTopY && obstacleHeight < 1.5) {
                console.log("Jump successful! Clearing obstacle.");
                return false;
            }
        }
        // If we got here, there's a collision that should be handled
        console.log("Collision detected:", a === this.player ? "Player" : "Object", "at position:", a.mesh.position.toArray(), "with object at:", b.mesh.position.toArray());
        return true;
    }
    /**
     * Check collisions between eggs and player
     */
    checkEggCollisions(deltaTime) {
        // Get list of eggs from foot goose
        const eggs = this.footGoose.getEggs();
        // Check each egg for collision with player
        for (let i = eggs.length - 1; i >= 0; i--) {
            const egg = eggs[i];
            // Skip eggs that have already hit the ground or are marked for removal
            if (egg.hasHitGround() || egg.isMarkedForRemoval()) {
                continue;
            }
            // Check for collision with player
            if (this.checkCollision(egg, this.player)) {
                // If player has a shield, use it instead of taking damage
                if (this.player.hasShield()) {
                    // Use the shield and show shield effect
                    this.player.removeShield();
                    // Play shield break sound
                    this.audioManager.playSound("egg_break");
                    // Show a shield break message
                    const message = document.createElement("div");
                    message.textContent = "Shield protected you!";
                    message.className = "slip-message shield-message";
                    document.body.appendChild(message);
                    // Remove the message after a short time
                    setTimeout(() => {
                        if (message.parentNode) {
                            message.parentNode.removeChild(message);
                        }
                    }, 2000);
                    // Mark egg for removal
                    egg.markForRemoval();
                    continue;
                }
                // Handle normal egg hit (player slips)
                console.log("Player hit by egg!");
                // Make player slip
                this.player.slip(0.5);
                // Show slip message
                this.showSlipMessage();
                // Play slip sound
                this.audioManager.playSound("slip");
                // Mark egg for removal
                egg.markForRemoval();
            }
        }
    }
    // Show a temporary message when player slips
    showSlipMessage() {
        // Create a message element if it doesn't exist
        let slipMessage = document.getElementById("slipMessage");
        if (!slipMessage) {
            slipMessage = document.createElement("div");
            slipMessage.id = "slipMessage";
            slipMessage.style.position = "absolute";
            slipMessage.style.top = "50%";
            slipMessage.style.left = "50%";
            slipMessage.style.transform = "translate(-50%, -50%)";
            slipMessage.style.color = "#FF0000";
            slipMessage.style.fontSize = "36px";
            slipMessage.style.fontWeight = "bold";
            slipMessage.style.textShadow = "2px 2px 4px #000000";
            slipMessage.style.opacity = "0";
            slipMessage.style.transition = "opacity 0.3s";
            slipMessage.style.zIndex = "100";
            slipMessage.style.pointerEvents = "none";
            document.querySelector(".game-container")?.appendChild(slipMessage);
        }
        // Show the message
        slipMessage.textContent = "SLIPPED!";
        slipMessage.style.opacity = "1";
        // Hide after 1.5 seconds
        setTimeout(() => {
            if (slipMessage) {
                slipMessage.style.opacity = "0";
            }
        }, 1500);
    }
    render() {
        // Update game state
        this.update();
        // Render scene
        this.renderer.render(this.scene, this.camera);
        // Request next frame
        requestAnimationFrame(() => this.render());
    }
    // Handle window resize events
    handleWindowResize() {
        if (this.isFullScreen) {
            // Update renderer and camera when in fullscreen mode
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
    // Toggle the locker panel
    toggleLockerPanel() {
        this.isLockerOpen = !this.isLockerOpen;
        // Play menu click sound
        this.audioManager.playSound("menu_click");
        if (this.isLockerOpen) {
            // First update the panel contents
            this.updateLockerPanel();
            // Then show the panel
            this.lockerPanel.style.display = "block";
        }
        else {
            this.lockerPanel.style.display = "none";
        }
    }
    /**
     * Load all audio assets
     */
    loadAudioAssets() {
        // Load background music
        this.audioManager.loadMusic("audio/background_music.mp3");
        // Load sound effects
        this.audioManager.loadSound("jump", "audio/jump.mp3");
        this.audioManager.loadSound("collect", "audio/collect.mp3");
        this.audioManager.loadSound("hit", "audio/hit.mp3");
        this.audioManager.loadSound("slip", "audio/slip.mp3");
        this.audioManager.loadSound("menu_click", "audio/menu_click.mp3");
        this.audioManager.loadSound("character_unlock", "audio/character_unlock.mp3");
        this.audioManager.loadSound("game_start", "audio/game_start.mp3");
        this.audioManager.loadSound("throw_egg", "audio/throw_egg.mp3");
        this.audioManager.loadSound("egg_break", "audio/egg_break.mp3");
    }
    /**
     * Create and populate the shop panel
     */
    createShopPanel() {
        // Clear existing content if any
        this.shopPanel.innerHTML = "";
        // Create header
        const header = document.createElement("div");
        header.className = "shop-header";
        const title = document.createElement("h2");
        title.textContent = "Item Shop";
        header.appendChild(title);
        const coinsDisplay = document.createElement("div");
        coinsDisplay.className = "shop-coins";
        coinsDisplay.textContent = `${this.shop.getCoins()}`;
        header.appendChild(coinsDisplay);
        const closeButton = document.createElement("button");
        closeButton.className = "close-shop";
        closeButton.textContent = "×";
        closeButton.addEventListener("click", () => {
            this.audioManager.playSound("menu_click");
            this.shopPanel.style.display = "none";
            this.isShopOpen = false;
        });
        header.appendChild(closeButton);
        this.shopPanel.appendChild(header);
        // Create category filters
        const categories = document.createElement("div");
        categories.className = "shop-categories";
        const allCategory = document.createElement("button");
        allCategory.className = "shop-category active";
        allCategory.textContent = "All Items";
        allCategory.dataset.category = "all";
        categories.appendChild(allCategory);
        const powerupCategory = document.createElement("button");
        powerupCategory.className = "shop-category";
        powerupCategory.textContent = "Power-ups";
        powerupCategory.dataset.category = "powerup";
        categories.appendChild(powerupCategory);
        const cosmeticCategory = document.createElement("button");
        cosmeticCategory.className = "shop-category";
        cosmeticCategory.textContent = "Cosmetics";
        cosmeticCategory.dataset.category = "cosmetic";
        categories.appendChild(cosmeticCategory);
        const boosterCategory = document.createElement("button");
        boosterCategory.className = "shop-category";
        boosterCategory.textContent = "Boosters";
        boosterCategory.dataset.category = "booster";
        categories.appendChild(boosterCategory);
        this.shopPanel.appendChild(categories);
        // Add event listeners to category buttons
        const categoryButtons = categories.querySelectorAll(".shop-category");
        categoryButtons.forEach((button) => {
            button.addEventListener("click", () => {
                // Remove active class from all buttons
                categoryButtons.forEach((btn) => btn.classList.remove("active"));
                // Add active class to clicked button
                button.classList.add("active");
                // Show/hide items based on category
                this.filterShopItems(button.dataset.category || "all");
            });
        });
        // Create items container
        const itemsContainer = document.createElement("div");
        itemsContainer.className = "shop-items";
        this.shopPanel.appendChild(itemsContainer);
        // Add all items
        this.renderShopItems(itemsContainer);
    }
    /**
     * Render all shop items
     */
    renderShopItems(container) {
        const items = this.shop.getItems();
        items.forEach((item) => {
            const itemElement = document.createElement("div");
            itemElement.className = `shop-item ${item.purchased ? "shop-item-purchased" : ""}`;
            itemElement.dataset.category = item.category;
            const header = document.createElement("div");
            header.className = "shop-item-header";
            const icon = document.createElement("div");
            icon.className = `shop-item-icon ${item.icon}`;
            header.appendChild(icon);
            const title = document.createElement("div");
            title.className = "shop-item-title";
            title.textContent = item.name;
            header.appendChild(title);
            itemElement.appendChild(header);
            const description = document.createElement("div");
            description.className = "shop-item-description";
            description.textContent = item.description;
            itemElement.appendChild(description);
            const footer = document.createElement("div");
            footer.className = "shop-item-footer";
            const price = document.createElement("div");
            price.className = "shop-item-price";
            price.textContent = `${item.price}`;
            footer.appendChild(price);
            const button = document.createElement("button");
            button.className = "shop-item-button";
            if (item.purchased) {
                button.textContent = "Purchased";
                button.disabled = true;
            }
            else if (this.shop.getCoins() < item.price) {
                button.textContent = "Buy";
                button.disabled = true;
            }
            else {
                button.textContent = "Buy";
                button.addEventListener("click", () => {
                    const success = this.shop.purchaseItem(item.id);
                    if (success) {
                        this.audioManager.playSound("character_unlock");
                        itemElement.classList.add("shop-item-purchased");
                        button.textContent = "Purchased";
                        button.disabled = true;
                        header.querySelector(".shop-coins").textContent = `${this.shop.getCoins()}`;
                        // Update all buttons that might be affected by the new coin amount
                        this.updateShopButtons();
                    }
                });
            }
            footer.appendChild(button);
            itemElement.appendChild(footer);
            container.appendChild(itemElement);
        });
    }
    /**
     * Update all shop buttons based on current coin amount
     */
    updateShopButtons() {
        const itemElements = document.querySelectorAll(".shop-item:not(.shop-item-purchased)");
        const currentCoins = this.shop.getCoins();
        itemElements.forEach((el) => {
            const priceEl = el.querySelector(".shop-item-price");
            const buttonEl = el.querySelector(".shop-item-button");
            if (priceEl && buttonEl) {
                const price = parseInt(priceEl.textContent || "0", 10);
                buttonEl.disabled = currentCoins < price;
            }
        });
    }
    /**
     * Filter shop items by category
     */
    filterShopItems(category) {
        const items = document.querySelectorAll(".shop-item");
        items.forEach((item) => {
            if (category === "all" ||
                item.getAttribute("data-category") === category) {
                item.style.display = "flex";
            }
            else {
                item.style.display = "none";
            }
        });
    }
    /**
     * Toggle the shop panel visibility
     */
    toggleShopPanel() {
        this.isShopOpen = !this.isShopOpen;
        this.audioManager.playSound("menu_click");
        if (this.isShopOpen) {
            this.createShopPanel();
            this.shopPanel.style.display = "block";
        }
        else {
            this.shopPanel.style.display = "none";
        }
    }
    /**
     * Award coins to the player based on score/distance
     */
    awardCoins(amount) {
        this.shop.addCoins(amount);
        // Play coin sound
        this.audioManager.playSound("collect");
    }
    hasAwardedCoinForScore(score) {
        return this.coinAwardTracker.has(score);
    }
    trackCoinAward(score) {
        this.coinAwardTracker.add(score);
    }
    resetCoinTracker() {
        this.coinAwardTracker.clear();
    }
}
//# sourceMappingURL=Game.js.map