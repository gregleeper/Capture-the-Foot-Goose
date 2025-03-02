// THREE is loaded globally from CDN in HTML
// import * as THREE from "three";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LANE_WIDTH,
  TOTAL_LANES,
  GAME_SPEED,
} from "./utils/constants.js";
import {
  Player,
  CharacterColor,
  CharacterType,
  HairstyleType,
} from "./objects/Player.js";
import { FootGoose } from "./objects/FootGoose.js";
import { Obstacle } from "./objects/Obstacle.js";
import { Environment } from "./environment/Environment.js";
import { Egg } from "./objects/Egg.js";
import { AudioManager } from "./audio/AudioManager.js";
import { Shop, ShopItem } from "./Shop.js";
import { GameObject } from "./objects/GameObject.js";

// Use the global THREE object
declare const THREE: any;

// Define character types
interface Character {
  id: string;
  name: string;
  color: CharacterColor;
  description: string;
  unlockScore: number;
  unlocked: boolean;
}

// Game class
export class Game {
  // Three.js components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Game state
  private isGameRunning: boolean = false;
  private score: number = 0;
  private distanceTraveled: number = 0;
  private gameSpeed: number = GAME_SPEED;
  private clock: THREE.Clock;
  private isFullScreen: boolean = false;
  private highScore: number = 0;

  // UI elements
  private startButton!: HTMLButtonElement;
  private scoreDisplay!: HTMLElement;
  private colorSelector!: HTMLDivElement;
  private fullScreenButton!: HTMLButtonElement;
  private lockerButton!: HTMLButtonElement;
  private lockerPanel!: HTMLDivElement;
  private uiContainer!: HTMLDivElement;
  private highScoreDisplay!: HTMLDivElement;
  private isLockerOpen: boolean = false;
  private shopButton!: HTMLButtonElement;
  private shopPanel!: HTMLDivElement;
  private coinsDisplay!: HTMLDivElement;
  private isShopOpen: boolean = false;

  // Customization states
  private selectedHairstyle: HairstyleType = "none";

  // Available characters
  private availableCharacters: Character[] = [
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

  // Currently selected character
  private selectedCharacter: Character;

  // Game objects
  private player!: Player;
  private footGoose!: FootGoose;
  private ground!: THREE.Mesh;
  private obstacles: Obstacle[] = [];
  private environment!: Environment;

  // Obstacle generation
  private spawnTimer: number = 0;
  private spawnInterval: number = 2000; // milliseconds

  private audioManager: AudioManager;
  private shop: Shop;

  constructor() {
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
    this.selectedCharacter = this.availableCharacters.find(
      (char) => char.id === "default"
    )!;

    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
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
    const gameContainer = document.querySelector(
      ".game-container"
    ) as HTMLElement;
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
    document.addEventListener("fullscreenchange", () =>
      this.handleFullscreenChange()
    );
    document.addEventListener("webkitfullscreenchange", () =>
      this.handleFullscreenChange()
    );
    document.addEventListener("mozfullscreenchange", () =>
      this.handleFullscreenChange()
    );
    document.addEventListener("MSFullscreenChange", () =>
      this.handleFullscreenChange()
    );

    // Handle window resize for responsive fullscreen
    window.addEventListener("resize", () => this.handleWindowResize());

    // Initial render
    this.render();
  }

  // Load saved game data from local storage
  private loadGameData(): void {
    try {
      // Load high score
      const savedHighScore = localStorage.getItem("highScore");
      if (savedHighScore) {
        this.highScore = parseInt(savedHighScore);
      }

      // Load unlocked characters
      const savedCharacters = localStorage.getItem("unlockedCharacters");
      if (savedCharacters) {
        const unlockedIds = JSON.parse(savedCharacters) as string[];
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
        const character = this.availableCharacters.find(
          (c) => c.id === characterId
        );
        if (character && character.unlocked) {
          this.selectedCharacter = character;
        }
      }

      // Load selected hairstyle
      const savedHairstyle = localStorage.getItem("selectedHairstyle");
      if (savedHairstyle) {
        this.selectedHairstyle = savedHairstyle as HairstyleType;
      }

      console.log("Game data loaded successfully");
    } catch (error) {
      console.error("Error loading game data:", error);
      // Continue with default values if loading fails
    }
  }

  // Save game data to local storage
  private saveGameData(): void {
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
    } catch (error) {
      console.error("Error saving game data:", error);
    }
  }

  private createUI(): void {
    // Create UI container
    this.uiContainer = document.createElement("div");
    this.uiContainer.className = "ui-container";
    this.uiContainer.style.display = "none"; // Initially hidden
    document.querySelector(".game-container")!.appendChild(this.uiContainer);

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
        const target = e.target as HTMLElement;
        const color = target.dataset.color as CharacterColor;

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
    this.fullScreenButton.addEventListener("click", () =>
      this.toggleFullScreen()
    );
    this.uiContainer.appendChild(this.fullScreenButton);

    // Initially hide the in-game UI
    this.uiContainer.style.display = "none";

    // Add the UI to the DOM
    document.querySelector(".game-container")?.appendChild(this.uiContainer);

    // Create the start screen
    this.createStartScreen();

    // Create mobile controls for touch devices
    this.createMobileControls();
  }

  /**
   * Create mobile control buttons for touch devices
   * This adds touch controls for mobile play
   */
  private createMobileControls(): void {
    const gameContainer = document.querySelector(
      ".game-container"
    ) as HTMLElement;

    // Create main container for mobile controls
    const mobileControls = document.createElement("div");
    mobileControls.className = "mobile-controls";

    // Create left side controls (jump button)
    const leftControls = document.createElement("div");
    leftControls.className = "mobile-controls-left";

    // Create jump button
    const jumpButton = document.createElement("div");
    jumpButton.className = "control-button arrow-up";
    jumpButton.setAttribute("aria-label", "Jump");

    // Add both touch and click event listeners for jump button
    const addJumpEvents = (element: HTMLElement) => {
      // Touch events
      element.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.handleMobileControl("jump", true);
      });

      // Mouse events for desktop testing
      element.addEventListener("mousedown", () => {
        this.handleMobileControl("jump", true);
      });
    };

    addJumpEvents(jumpButton);

    // Add jump button to left controls
    leftControls.appendChild(jumpButton);

    // Create right side controls (left and right arrow buttons)
    const rightControls = document.createElement("div");
    rightControls.className = "mobile-controls-right";

    // Create left arrow button
    const leftButton = document.createElement("div");
    leftButton.className = "control-button arrow-left";
    leftButton.setAttribute("aria-label", "Move Left");

    // Create right arrow button
    const rightButton = document.createElement("div");
    rightButton.className = "control-button arrow-right";
    rightButton.setAttribute("aria-label", "Move Right");

    // Add touch and click event listeners for movement buttons
    const addMoveEvents = (element: HTMLElement, direction: string) => {
      // Touch events
      element.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.handleMobileControl(direction, true);
      });

      element.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.handleMobileControl(direction, false);
      });

      element.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        this.handleMobileControl(direction, false);
      });

      // Mouse events for desktop testing
      element.addEventListener("mousedown", () => {
        this.handleMobileControl(direction, true);
      });

      element.addEventListener("mouseup", () => {
        this.handleMobileControl(direction, false);
      });

      element.addEventListener("mouseleave", () => {
        this.handleMobileControl(direction, false);
      });
    };

    addMoveEvents(leftButton, "left");
    addMoveEvents(rightButton, "right");

    // Add movement buttons to right controls (left first, then right)
    rightControls.appendChild(leftButton);
    rightControls.appendChild(rightButton);

    // Assemble the controls in the container
    mobileControls.appendChild(leftControls);
    mobileControls.appendChild(rightControls);

    // Add to game container
    gameContainer.appendChild(mobileControls);

    // Add swipe gesture detection
    this.addSwipeControls(gameContainer);

    // Add global tap-to-jump functionality on the game container
    // This allows tapping anywhere on the screen to jump
    const handleGameAreaTap = (e: TouchEvent | MouseEvent) => {
      // Don't process taps on control buttons (they have their own handlers)
      if ((e.target as HTMLElement).closest(".control-button")) {
        return;
      }

      // Don't process taps on UI elements like buttons
      if (
        (e.target as HTMLElement).closest("button") ||
        (e.target as HTMLElement).closest(".ui-container") ||
        (e.target as HTMLElement).closest(".shop-panel") ||
        (e.target as HTMLElement).closest(".locker-panel")
      ) {
        return;
      }

      // If the game is running, handle the jump
      if (this.isGameRunning && !this.player.isCurrentlyJumping()) {
        this.player.jump();
      }
    };

    // Add the touch and mouse handlers to the game container
    gameContainer.addEventListener("touchstart", handleGameAreaTap);

    // Only add click handler for desktop testing if not on a touch device
    if (!("ontouchstart" in window)) {
      gameContainer.addEventListener("click", handleGameAreaTap);
    }
  }

  /**
   * Add swipe controls for mobile play
   * Detects swipe gestures and converts them to player movement
   */
  private addSwipeControls(element: HTMLElement): void {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartTime = 0;

    // Set minimum distance and time to register as a swipe
    const minSwipeDistance = 50; // pixels
    const maxSwipeTime = 300; // milliseconds

    element.addEventListener("touchstart", (e: TouchEvent) => {
      // Store initial touch position and time
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = Date.now();

      // Don't prevent default here to allow scrolling if needed
    });

    element.addEventListener("touchend", (e: TouchEvent) => {
      // Don't process if touching UI elements
      if (
        (e.target as HTMLElement).closest("button") ||
        (e.target as HTMLElement).closest(".ui-container") ||
        (e.target as HTMLElement).closest(".shop-panel") ||
        (e.target as HTMLElement).closest(".locker-panel") ||
        (e.target as HTMLElement).closest(".control-button")
      ) {
        return;
      }

      // Store end position
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;

      // Calculate time elapsed
      const touchElapsedTime = Date.now() - touchStartTime;

      // Only process quick swipes (to distinguish from scrolling)
      if (touchElapsedTime <= maxSwipeTime) {
        // Calculate distances
        const distanceX = touchEndX - touchStartX;
        const distanceY = touchStartY - touchEndY; // Reversed for Y (up is positive)

        // Check if swipe distance meets minimum threshold
        if (
          Math.abs(distanceX) >= minSwipeDistance ||
          Math.abs(distanceY) >= minSwipeDistance
        ) {
          // Prevent default behavior to avoid scrolling
          e.preventDefault();

          // Determine swipe direction
          if (Math.abs(distanceX) > Math.abs(distanceY)) {
            // Horizontal swipe
            if (distanceX > 0) {
              // Swipe right
              this.handleSwipe("right");
            } else {
              // Swipe left
              this.handleSwipe("left");
            }
          } else {
            // Vertical swipe
            if (distanceY > 0) {
              // Swipe up
              this.handleSwipe("up");
            } else {
              // Swipe down - could be used for ducking or other actions
              this.handleSwipe("down");
            }
          }
        }
      }
    });

    // Add touchmove listener to prevent scrolling when swiping
    element.addEventListener("touchmove", (e: TouchEvent) => {
      // Don't prevent default for all moves, only if it seems like a game control swipe
      const touchCurrentX = e.changedTouches[0].screenX;
      const touchCurrentY = e.changedTouches[0].screenY;

      // Calculate current distances
      const currentDistanceX = touchCurrentX - touchStartX;
      const currentDistanceY = touchStartY - touchCurrentY;

      // If it looks like a deliberate swipe control and we're in the game, prevent scrolling
      if (
        (Math.abs(currentDistanceX) > 30 || Math.abs(currentDistanceY) > 30) &&
        this.isGameRunning &&
        !(e.target as HTMLElement).closest(".ui-container") &&
        !(e.target as HTMLElement).closest(".shop-panel") &&
        !(e.target as HTMLElement).closest(".locker-panel")
      ) {
        e.preventDefault();
      }
    });
  }

  /**
   * Handle swipe gestures
   * Translates swipe directions into game actions
   */
  private handleSwipe(direction: string): void {
    // Only respond to swipes when the game is running
    if (!this.isGameRunning) return;

    switch (direction) {
      case "left":
        // Trigger quick move left
        this.player.moveLeft();
        // Play move sound
        this.audioManager.playSound("move");
        break;

      case "right":
        // Trigger quick move right
        this.player.moveRight();
        // Play move sound
        this.audioManager.playSound("move");
        break;

      case "up":
        // Jump if not currently jumping
        if (!this.player.isCurrentlyJumping()) {
          this.player.jump();
          // Play jump sound
          this.audioManager.playSound("jump");
        }
        break;

      case "down":
        // Could implement duck or slide mechanic here if needed
        break;
    }
  }

  /**
   * Handle mobile control button presses
   * @param control The control that was pressed
   * @param isPressed Whether the control is being pressed (true) or released (false)
   */
  private handleMobileControl(control: string, isPressed: boolean): void {
    if (!this.isGameRunning) return;

    switch (control) {
      case "left":
        if (isPressed) {
          this.player.moveLeft();

          // Play sound
          if (this.audioManager) {
            this.audioManager.playSound("move");
          }
        }
        break;

      case "right":
        if (isPressed) {
          this.player.moveRight();

          // Play sound
          if (this.audioManager) {
            this.audioManager.playSound("move");
          }
        }
        break;

      case "jump":
        if (isPressed && !this.player.isCurrentlyJumping()) {
          this.player.jump();
        }
        break;
    }
  }

  private createStartScreen(): void {
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
    soundButton.textContent = `Sound: ${
      this.audioManager.getMute() ? "Off 🔇" : "On 🔊"
    }`;
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
  private updateLockerPanel(): void {
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
    const closeButton = header.querySelector(
      ".close-locker"
    ) as HTMLButtonElement;
    closeButton.addEventListener("click", () => this.toggleLockerPanel());

    // Create character list
    const characterList = document.createElement("div");
    characterList.className = "character-list";

    // Add each character to the list
    this.availableCharacters.forEach((character) => {
      const characterItem = document.createElement("div");
      characterItem.className = `character-item ${
        character.unlocked ? "unlocked" : "locked"
      }`;
      characterItem.dataset.id = character.id;

      // Determine if this is the currently selected character
      const isSelected = this.selectedCharacter.id === character.id;

      characterItem.innerHTML = `
        <div class="character-color ${character.color}"></div>
        <div class="character-info">
          <h3>${character.name} ${isSelected ? "(Selected)" : ""}</h3>
          <p>${character.description}</p>
          ${
            character.unlocked
              ? `<button class="select-character-btn" data-id="${
                  character.id
                }">${isSelected ? "Selected" : "Select"}</button>`
              : `<div class="unlock-info">Unlock at ${character.unlockScore} points</div>`
          }
        </div>
        ${!character.unlocked ? '<div class="lock-icon">🔒</div>' : ""}
      `;

      // Add event listeners to the select buttons
      if (character.unlocked) {
        const selectButton = characterItem.querySelector(
          ".select-character-btn"
        );
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
  private addHairstyleSection(): void {
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
    const hairstyles: { id: HairstyleType; name: string; emoji: string }[] = [
      { id: "none", name: "No Hair", emoji: "👤" },
      { id: "short", name: "Short Hair", emoji: "💇" },
      { id: "mohawk", name: "Mohawk", emoji: "🎸" },
      { id: "spiky", name: "Spiky Hair", emoji: "⚡" },
      { id: "long", name: "Long Hair", emoji: "👱" },
    ];

    // Create a button for each hairstyle
    hairstyles.forEach((hairstyle) => {
      const hairstyleBtn = document.createElement("div");
      hairstyleBtn.className = `hairstyle-option ${
        this.selectedHairstyle === hairstyle.id ? "selected" : ""
      }`;
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
  private selectCharacter(character: Character): void {
    if (!character.unlocked) return;

    this.selectedCharacter = character;

    // Update player color
    if (this.player) {
      this.player.setColor(character.color);

      // Set character type based on ID
      this.player.setCharacterType(character.id as CharacterType);
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
  private setHairstyle(hairstyleType: HairstyleType): void {
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
  private checkCharacterUnlocks(): void {
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
  private showUnlockNotification(character: Character): void {
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
  private toggleFullScreen(): void {
    const gameContainer = document.querySelector(
      ".game-container"
    ) as HTMLElement;

    if (!this.isFullScreen) {
      // Enter fullscreen mode
      if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen();
      } else if ((gameContainer as any).mozRequestFullScreen) {
        (gameContainer as any).mozRequestFullScreen();
      } else if ((gameContainer as any).webkitRequestFullscreen) {
        (gameContainer as any).webkitRequestFullscreen();
      } else if ((gameContainer as any).msRequestFullscreen) {
        (gameContainer as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen mode
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }

    // Play menu click sound
    this.audioManager.playSound("menu_click");
  }

  // Handle fullscreen change events
  private handleFullscreenChange(): void {
    // Check if we're in fullscreen mode
    this.isFullScreen =
      document.fullscreenElement !== null ||
      (document as any).mozFullScreenElement !== null ||
      (document as any).webkitFullscreenElement !== null ||
      (document as any).msFullscreenElement !== null;

    // Update button text
    this.fullScreenButton.textContent = this.isFullScreen
      ? "Exit Full Screen"
      : "Full Screen";

    // Resize renderer
    this.resizeRenderer();
  }

  // Resize renderer based on current container or screen size
  private resizeRenderer(): void {
    const gameContainer = document.querySelector(
      ".game-container"
    ) as HTMLElement;

    if (this.isFullScreen) {
      // In fullscreen mode, use window dimensions
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
    } else {
      // In windowed mode, use container dimensions
      this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
      this.camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    }

    // Update camera projection matrix
    this.camera.updateProjectionMatrix();
  }

  private setupLighting(): void {
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

  private initializeGameObjects(): void {
    // Create environment
    this.environment = new Environment(this.scene);

    // Create ground
    const groundGeometry = new THREE.BoxGeometry(
      LANE_WIDTH * TOTAL_LANES,
      1,
      1000
    );
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.position.set(0, -0.5, 0);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Get selected character
    const characterType = this.selectedCharacter.id as CharacterType;
    const color = this.selectedCharacter.color;

    // Create player with selected character properties and hairstyle
    this.player = new Player(
      this.scene,
      color,
      this.selectedHairstyle,
      this.audioManager
    );

    // Set the character type to apply stats
    this.player.setCharacterType(characterType);

    // Create FootGoose with audio manager
    this.footGoose = new FootGoose(this.scene, this.audioManager);

    // Add control instructions to the UI
    this.addControlInstructions();
  }

  private addControlInstructions(): void {
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

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isGameRunning) return;

    // Prevent default behavior for game controls to avoid browser scrolling
    if (
      [
        "KeyA",
        "KeyD",
        "KeyW",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "ArrowUp",
        "ArrowDown",
      ].includes(e.code)
    ) {
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
  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.isGameRunning) return;

    // Prevent default behavior for game controls
    if (
      [
        "KeyA",
        "KeyD",
        "KeyW",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "ArrowUp",
        "ArrowDown",
      ].includes(e.code)
    ) {
      e.preventDefault();
    }

    // We don't need to do anything special on key release for our game mechanics
    // But having this handler prevents any default browser behaviors
  }

  /**
   * Start the game
   */
  private startGame(): void {
    // Only start if game is not already running
    if (!this.isGameRunning) {
      // Hide start screen
      const startScreen = document.querySelector(
        ".start-screen"
      ) as HTMLElement;
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
      } else {
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
    } else {
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
  private applyPurchasedPowerups(): void {
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

    // Apply purchased shoe customizations
    this.applyPurchasedShoes();

    // Apply purchased skin customizations
    this.applyPurchasedSkins();
  }

  /**
   * Apply purchased shoe customizations to the player
   */
  private applyPurchasedShoes(): void {
    // Get all shoe items from the shop
    const shoeItems = this.shop.getItemsByCategory("shoes");

    // Find the last purchased shoe item (to apply the most recent one)
    let lastPurchasedShoe = null;

    for (const item of shoeItems) {
      if (item.purchased && item.type === "shoes" && item.value) {
        lastPurchasedShoe = item;
      }
    }

    // Apply the shoe style if one is purchased
    if (lastPurchasedShoe) {
      const shoeStyle = lastPurchasedShoe.value as any; // Type cast to the ShoeStyle type
      console.log(`Applying shoe style: ${shoeStyle}`);
      this.player.setShoeStyle(shoeStyle);
    }
  }

  /**
   * Apply purchased skin customizations to the player
   */
  private applyPurchasedSkins(): void {
    // Get all skin items from the shop
    const skinItems = this.shop.getItemsByCategory("skins");

    // Find the last purchased skin item (to apply the most recent one)
    let lastPurchasedSkin = null;

    for (const item of skinItems) {
      if (item.purchased && item.type === "skin" && item.value) {
        lastPurchasedSkin = item;
      }
    }

    // Apply the skin style if one is purchased
    if (lastPurchasedSkin) {
      const skinStyle = lastPurchasedSkin.value as any; // Type cast to the SkinStyle type
      console.log(`Applying skin style: ${skinStyle}`);
      this.player.setSkinStyle(skinStyle);
    }
  }

  private updateScore(): void {
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
    if (
      this.score > 0 &&
      this.score % 100 === 0 &&
      !this.hasAwardedCoinForScore(this.score)
    ) {
      this.awardCoins(10);
      this.trackCoinAward(this.score);
    }
  }

  private update(): void {
    if (!this.isGameRunning) return;

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
      const distanceToObstacle = Math.abs(
        obstacle.position.z - this.player.position.z
      );

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
            console.log(
              "COLLISION DETECTED: Player hit obstacle at distance:",
              distanceToObstacle
            );
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

  private updateCameraPosition(): void {
    // Position camera behind player for third-person perspective
    // Adjusted for wider lanes - higher and further back
    this.camera.position.x = this.player.position.x;
    this.camera.position.y = this.player.position.y + 6; // Increased from 5
    this.camera.position.z = this.player.position.z - 12; // Increased from -10

    // Look at a point slightly ahead of the player
    this.camera.lookAt(
      this.player.position.x,
      this.player.position.y + 2,
      this.player.position.z + 10
    );
  }

  private spawnObstacle(): void {
    // Choose a random lane
    const lane = Math.floor(Math.random() * TOTAL_LANES) - 1; // -1, 0, or 1
    const lanePosition = (lane * LANE_WIDTH) / TOTAL_LANES;

    // Add slight variation to obstacle position within lane
    const xVariation =
      (Math.random() - 0.5) * ((LANE_WIDTH / TOTAL_LANES) * 0.5);
    const x = lanePosition + xVariation;

    // Create obstacle
    const obstacle = new Obstacle(this.scene, x);
    this.obstacles.push(obstacle);

    // Debug obstacle positioning
    console.log(`Spawned obstacle in lane ${lane} at position x: ${x}`);
  }

  private checkCollision(
    a: { mesh: THREE.Object3D },
    b: { mesh: THREE.Object3D }
  ): boolean {
    // Make sure both objects exist
    if (!a || !b || !a.mesh || !b.mesh) {
      console.log("Collision check failed: Missing objects");
      return false;
    }

    // Check if objects are an egg that's too new (just created)
    if (
      b instanceof Egg &&
      (b as Egg).getFreshness() === 0 &&
      !(b as Egg).isBrokenEgg()
    ) {
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
    if (
      a === this.player &&
      b instanceof Obstacle &&
      this.player.isCurrentlyJumping()
    ) {
      // Get height of obstacle - use the actual height from obstacle if available
      let obstacleHeight;
      if (
        b instanceof Obstacle &&
        typeof (b as Obstacle).getHeight === "function"
      ) {
        obstacleHeight = (b as Obstacle).getHeight();
      } else {
        obstacleHeight = bBox.max.y - bBox.min.y;
      }

      const obstacleTopY = b.mesh.position.y + obstacleHeight / 2;

      // Calculate player's feet position (bottom of player mesh)
      const playerFeetY = this.player.position.y - 1; // Player height is 2

      // Debug collision information
      console.log(
        `Jump collision check: Player feet at ${playerFeetY}, Obstacle top at ${obstacleTopY}, Obstacle height: ${obstacleHeight}`
      );

      // If player is jumping high enough over a short obstacle, allow them to pass
      if (playerFeetY > obstacleTopY && obstacleHeight < 1.5) {
        console.log("Jump successful! Clearing obstacle.");
        return false;
      }
    }

    // If we got here, there's a collision that should be handled
    console.log(
      "Collision detected:",
      a === this.player ? "Player" : "Object",
      "at position:",
      a.mesh.position.toArray(),
      "with object at:",
      b.mesh.position.toArray()
    );

    return true;
  }

  /**
   * Check collisions between eggs and player
   */
  private checkEggCollisions(deltaTime: number): void {
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
  private showSlipMessage(): void {
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

  private render(): void {
    // Update game state
    this.update();

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Request next frame
    requestAnimationFrame(() => this.render());
  }

  // Handle window resize events
  private handleWindowResize(): void {
    if (this.isFullScreen) {
      // Update renderer and camera when in fullscreen mode
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  // Toggle the locker panel
  private toggleLockerPanel(): void {
    this.isLockerOpen = !this.isLockerOpen;

    // Play menu click sound
    this.audioManager.playSound("menu_click");

    if (this.isLockerOpen) {
      // First update the panel contents
      this.updateLockerPanel();
      // Then show the panel
      this.lockerPanel.style.display = "block";
    } else {
      this.lockerPanel.style.display = "none";
    }
  }

  /**
   * Load all audio assets
   */
  private loadAudioAssets(): void {
    // Load background music
    this.audioManager.loadMusic("audio/background_music.mp3");

    // Load sound effects
    this.audioManager.loadSound("jump", "audio/jump.mp3");
    this.audioManager.loadSound("collect", "audio/collect.mp3");
    this.audioManager.loadSound("hit", "audio/hit.mp3");
    this.audioManager.loadSound("slip", "audio/slip.mp3");
    this.audioManager.loadSound("menu_click", "audio/menu_click.mp3");
    this.audioManager.loadSound(
      "character_unlock",
      "audio/character_unlock.mp3"
    );
    this.audioManager.loadSound("game_start", "audio/game_start.mp3");
    this.audioManager.loadSound("throw_egg", "audio/throw_egg.mp3");
    this.audioManager.loadSound("egg_break", "audio/egg_break.mp3");
  }

  /**
   * Create and populate the shop panel
   */
  private createShopPanel(): void {
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
        this.filterShopItems((button as HTMLElement).dataset.category || "all");
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
  private renderShopItems(container: HTMLElement): void {
    const items = this.shop.getItems();

    items.forEach((item) => {
      this.createShopItem(
        container,
        item,
        this.shopPanel.querySelector(".shop-header") as HTMLElement
      );
    });
  }

  /**
   * Create a single shop item
   */
  private createShopItem(
    container: HTMLElement,
    item: ShopItem,
    shopHeader: HTMLElement // Renamed parameter from 'header' to 'shopHeader'
  ): void {
    const itemElement = document.createElement("div");
    itemElement.className = `shop-item ${
      item.purchased ? "shop-item-purchased" : ""
    }`;
    // Add data attributes for category and item ID
    itemElement.setAttribute("data-category", item.category);
    itemElement.setAttribute("data-item-id", item.id);

    // Check if this is an equipped item and mark it
    let isEquipped = false;
    if (item.purchased && item.type && item.value) {
      if (item.type === "shoes" && this.player.getShoeStyle() === item.value) {
        isEquipped = true;
      } else if (
        item.type === "skin" &&
        this.player.getSkinStyle() === item.value
      ) {
        isEquipped = true;
      }
    }

    // Item header container
    const itemHeader = document.createElement("div");
    itemHeader.className = "shop-item-header";

    // Item icon
    const icon = document.createElement("div");
    icon.className = `shop-item-icon ${item.icon}`;
    itemHeader.appendChild(icon);

    // Item title
    const title = document.createElement("div");
    title.className = "shop-item-title";
    title.textContent = item.name;
    itemHeader.appendChild(title);

    // Add the header to the item element
    itemElement.appendChild(itemHeader);

    // Item description
    const description = document.createElement("div");
    description.className = "shop-item-description";
    description.textContent = item.description;
    itemElement.appendChild(description);

    // Item footer container
    const footer = document.createElement("div");
    footer.className = "shop-item-footer";

    // Item price
    const price = document.createElement("div");
    price.className = "shop-item-price";
    price.textContent = `${item.price}`;
    footer.appendChild(price);

    // Item button
    const button = document.createElement("button");
    button.className = "shop-item-button";

    if (item.purchased) {
      // For purchased cosmetic items (shoes, skins), allow equipping
      if (item.category === "shoes" || item.category === "skins") {
        button.textContent = isEquipped ? "Equipped" : "Equip";
        button.disabled = isEquipped; // Disable the button if already equipped

        // Add equipped badge if this item is currently equipped
        if (isEquipped) {
          const badge = document.createElement("div");
          badge.className = "equipped-badge";
          badge.textContent = "Equipped";
          itemElement.appendChild(badge);
        }

        button.addEventListener("click", () => {
          // Play sound
          this.audioManager.playSound("menu_click");

          if (item.category === "shoes" && item.value) {
            // Apply shoe style
            this.player.setShoeStyle(item.value as any);
            console.log(`Equipped shoes: ${item.name}`);

            // Update any equipped status indicators
            this.updateEquippedStatusInShop("shoes", item.id);
          } else if (item.category === "skins" && item.value) {
            // Apply skin style
            this.player.setSkinStyle(item.value as any);
            console.log(`Equipped skin: ${item.name}`);

            // Update any equipped status indicators
            this.updateEquippedStatusInShop("skins", item.id);
          }
        });
      } else {
        // For other purchased items, just show as purchased
        button.textContent = "Purchased";
        button.disabled = true;
      }
    } else if (this.shop.getCoins() < item.price) {
      button.textContent = "Buy";
      button.disabled = true;
    } else {
      button.textContent = "Buy";
      button.addEventListener("click", () => {
        const success = this.shop.purchaseItem(item.id);
        if (success) {
          this.audioManager.playSound("character_unlock");
          itemElement.classList.add("shop-item-purchased");

          // For cosmetic items, change button to "Equip" after purchase
          if (item.category === "shoes" || item.category === "skins") {
            button.textContent = "Equip";
            button.disabled = false;

            // Add equip functionality
            button.addEventListener("click", () => {
              // Play sound
              this.audioManager.playSound("menu_click");

              if (item.category === "shoes" && item.value) {
                // Apply shoe style
                this.player.setShoeStyle(item.value as any);
                console.log(`Equipped shoes: ${item.name}`);

                // Update any equipped status indicators
                this.updateEquippedStatusInShop("shoes", item.id);
              } else if (item.category === "skins" && item.value) {
                // Apply skin style
                this.player.setSkinStyle(item.value as any);
                console.log(`Equipped skin: ${item.name}`);

                // Update any equipped status indicators
                this.updateEquippedStatusInShop("skins", item.id);
              }
            });

            // Automatically equip the item when first purchased
            if (item.category === "shoes" && item.value) {
              this.player.setShoeStyle(item.value as any);
            } else if (item.category === "skins" && item.value) {
              this.player.setSkinStyle(item.value as any);
            }
          } else {
            button.textContent = "Purchased";
            button.disabled = true;
          }

          shopHeader.querySelector(
            ".shop-coins"
          )!.textContent = `${this.shop.getCoins()}`;

          // Update all buttons that might be affected by the new coin amount
          this.updateShopButtons();
        }
      });
    }
    footer.appendChild(button);

    itemElement.appendChild(footer);
    container.appendChild(itemElement);
  }

  /**
   * Update all shop buttons based on current coin amount
   */
  private updateShopButtons(): void {
    const itemElements = document.querySelectorAll(
      ".shop-item:not(.shop-item-purchased)"
    );
    const currentCoins = this.shop.getCoins();

    itemElements.forEach((el) => {
      const priceEl = el.querySelector(".shop-item-price");
      const buttonEl = el.querySelector(
        ".shop-item-button"
      ) as HTMLButtonElement;

      if (priceEl && buttonEl) {
        const price = parseInt(priceEl.textContent || "0", 10);
        buttonEl.disabled = currentCoins < price;
      }
    });
  }

  /**
   * Filter shop items by category
   */
  private filterShopItems(category: string): void {
    const items = document.querySelectorAll(".shop-item");

    items.forEach((item) => {
      if (
        category === "all" ||
        item.getAttribute("data-category") === category
      ) {
        (item as HTMLElement).style.display = "flex";
      } else {
        (item as HTMLElement).style.display = "none";
      }
    });
  }

  /**
   * Toggle the shop panel visibility
   */
  private toggleShopPanel(): void {
    this.isShopOpen = !this.isShopOpen;
    this.audioManager.playSound("menu_click");

    if (this.isShopOpen) {
      this.createShopPanel();
      this.shopPanel.style.display = "block";
    } else {
      this.shopPanel.style.display = "none";
    }
  }

  /**
   * Award coins to the player based on score/distance
   */
  private awardCoins(amount: number): void {
    this.shop.addCoins(amount);
    // Play coin sound
    this.audioManager.playSound("collect");
  }

  // Track awarded coins to prevent duplicates
  private coinAwardTracker: Set<number> = new Set();

  private hasAwardedCoinForScore(score: number): boolean {
    return this.coinAwardTracker.has(score);
  }

  private trackCoinAward(score: number): void {
    this.coinAwardTracker.add(score);
  }

  private resetCoinTracker(): void {
    this.coinAwardTracker.clear();
  }

  /**
   * Updates the visual indicators in the shop to show which items are currently equipped
   * @param category The category of items to update (e.g., "shoes", "skins")
   * @param equippedItemId The ID of the item that was just equipped
   */
  private updateEquippedStatusInShop(
    category: string,
    equippedItemId: string
  ): void {
    // Get all shop items of the specified category
    const shopItems = document.querySelectorAll(
      `.shop-item[data-category="${category}"]`
    );

    // Remove equipped indicator from all items in this category
    shopItems.forEach((item) => {
      // Remove any equipped indicator
      const equippedBadge = item.querySelector(".equipped-badge");
      if (equippedBadge) {
        equippedBadge.remove();
      }

      // Update button text for all items except the newly equipped one
      const button = item.querySelector(
        ".shop-item-button"
      ) as HTMLButtonElement;
      if (button && item.getAttribute("data-item-id") !== equippedItemId) {
        if (item.classList.contains("shop-item-purchased")) {
          button.textContent = "Equip";
        }
      }
    });

    // Add equipped indicator to the newly equipped item
    const equippedItem = document.querySelector(
      `.shop-item[data-item-id="${equippedItemId}"]`
    );
    if (equippedItem) {
      // Create and add an equipped badge
      const badge = document.createElement("div");
      badge.className = "equipped-badge";
      badge.textContent = "Equipped";
      equippedItem.appendChild(badge);

      // Update the button text
      const button = equippedItem.querySelector(
        ".shop-item-button"
      ) as HTMLButtonElement;
      if (button) {
        button.textContent = "Equipped";
      }
    }
  }
}
