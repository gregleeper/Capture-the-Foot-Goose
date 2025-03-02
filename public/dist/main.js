// THREE is loaded globally from CDN in HTML
import { Game } from "./game/Game.js";
// Initialize the game when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
    try {
        console.log("Initializing game...");
        new Game();
        console.log("Game initialized successfully!");
    }
    catch (error) {
        console.error("Failed to initialize game:", error);
    }
});
//# sourceMappingURL=main.js.map