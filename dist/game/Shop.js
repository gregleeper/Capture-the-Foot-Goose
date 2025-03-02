/**
 * Manages the in-game shop system
 */
export class Shop {
    constructor(audioManager, initialCoins = 0) {
        this.items = [];
        this.coins = 0;
        this.onCoinsChanged = () => { }; // Callback for coin changes
        this.audioManager = audioManager;
        this.coins = initialCoins;
        this.initializeItems();
    }
    /**
     * Set up the initial set of items available in the shop
     */
    initializeItems() {
        this.items = [
            {
                id: "double_jump",
                name: "Double Jump",
                description: "Jump twice before landing",
                price: 500,
                icon: "shop-icon-jump",
                unlocked: true,
                purchased: false,
                category: "powerup",
            },
            {
                id: "magnet",
                name: "Coin Magnet",
                description: "Automatically collect nearby coins",
                price: 750,
                icon: "shop-icon-magnet",
                unlocked: true,
                purchased: false,
                category: "powerup",
            },
            {
                id: "shield",
                name: "Egg Shield",
                description: "Protect yourself from eggs once per run",
                price: 1000,
                icon: "shop-icon-shield",
                unlocked: true,
                purchased: false,
                category: "powerup",
            },
            {
                id: "hat_crown",
                name: "Royal Crown",
                description: "A fashionable crown for your character",
                price: 1500,
                icon: "shop-icon-crown",
                unlocked: true,
                purchased: false,
                category: "cosmetic",
            },
            {
                id: "hat_beanie",
                name: "Beanie",
                description: "A cool beanie for your character",
                price: 800,
                icon: "shop-icon-beanie",
                unlocked: true,
                purchased: false,
                category: "cosmetic",
            },
            {
                id: "head_start",
                name: "Head Start",
                description: "Start 500 meters into your run",
                price: 600,
                icon: "shop-icon-start",
                unlocked: true,
                purchased: false,
                category: "booster",
            },
            {
                id: "coin_doubler",
                name: "Coin Doubler",
                description: "Double all coin collections for one run",
                price: 1200,
                icon: "shop-icon-doubler",
                unlocked: true,
                purchased: false,
                category: "booster",
            },
        ];
    }
    /**
     * Add coins to the player's balance
     */
    addCoins(amount) {
        this.coins += amount;
        this.onCoinsChanged(this.coins);
        this.saveShopData();
    }
    /**
     * Get the player's current coin balance
     */
    getCoins() {
        return this.coins;
    }
    /**
     * Get all shop items
     */
    getItems() {
        return this.items;
    }
    /**
     * Get items of a specific category
     */
    getItemsByCategory(category) {
        return this.items.filter((item) => item.category === category);
    }
    /**
     * Purchase an item if the player has enough coins
     */
    purchaseItem(itemId) {
        const item = this.items.find((i) => i.id === itemId);
        if (!item || item.purchased || !item.unlocked) {
            return false;
        }
        if (this.coins >= item.price) {
            this.coins -= item.price;
            item.purchased = true;
            this.onCoinsChanged(this.coins);
            this.saveShopData();
            // Play purchase sound
            this.audioManager.playSound("collect");
            return true;
        }
        return false;
    }
    /**
     * Check if an item is purchased
     */
    isItemPurchased(itemId) {
        const item = this.items.find((i) => i.id === itemId);
        return item ? item.purchased : false;
    }
    /**
     * Set callback for when coins amount changes
     */
    setOnCoinsChanged(callback) {
        this.onCoinsChanged = callback;
    }
    /**
     * Save shop data to localStorage
     */
    saveShopData() {
        try {
            const shopData = {
                coins: this.coins,
                purchasedItems: this.items
                    .filter((item) => item.purchased)
                    .map((item) => item.id),
            };
            localStorage.setItem("shopData", JSON.stringify(shopData));
        }
        catch (e) {
            console.error("Error saving shop data:", e);
        }
    }
    /**
     * Load shop data from localStorage
     */
    loadShopData() {
        try {
            const shopDataStr = localStorage.getItem("shopData");
            if (shopDataStr) {
                const shopData = JSON.parse(shopDataStr);
                // Restore coins
                this.coins = shopData.coins || 0;
                // Restore purchased items
                if (shopData.purchasedItems && Array.isArray(shopData.purchasedItems)) {
                    shopData.purchasedItems.forEach((itemId) => {
                        const item = this.items.find((i) => i.id === itemId);
                        if (item) {
                            item.purchased = true;
                        }
                    });
                }
                this.onCoinsChanged(this.coins);
            }
        }
        catch (e) {
            console.error("Error loading shop data:", e);
        }
    }
}
//# sourceMappingURL=Shop.js.map