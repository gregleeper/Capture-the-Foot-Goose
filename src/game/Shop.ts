import { AudioManager } from "./audio/AudioManager.js";

/**
 * Represents a purchasable item in the shop
 */
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string; // CSS class for the icon
  unlocked: boolean;
  purchased: boolean;
  category: string;
  effect?: (game: any) => void; // Function that applies the effect when used
  type?: string; // For cosmetic items like shoes or skins to identify their specific type
  value?: string; // For cosmetic items, stores the specific value (color, style, etc.)
}

/**
 * Manages the in-game shop system
 */
export class Shop {
  private items: ShopItem[] = [];
  private coins: number = 0;
  private audioManager: AudioManager;
  private onCoinsChanged: (coins: number) => void = () => {}; // Callback for coin changes

  constructor(audioManager: AudioManager, initialCoins: number = 0) {
    this.audioManager = audioManager;
    this.coins = initialCoins;
    this.initializeItems();
  }

  /**
   * Set up the initial set of items available in the shop
   */
  private initializeItems(): void {
    this.items = [
      // Power-ups
      {
        id: "jump_boost",
        name: "Super Jump",
        description: "Increases jump height by 50% for 30 seconds",
        price: 100,
        icon: "shop-icon-jump",
        unlocked: true,
        purchased: false,
        category: "powerup",
        effect: (game) => {
          game.getPlayer().applyPowerup("jump_boost", 1.5, 30000);
        },
      },
      {
        id: "coin_magnet",
        name: "Coin Magnet",
        description: "Attracts nearby coins for 30 seconds",
        price: 150,
        icon: "shop-icon-magnet",
        unlocked: true,
        purchased: false,
        category: "powerup",
        effect: (game) => {
          game.getPlayer().applyPowerup("magnet", 5, 30000);
        },
      },
      {
        id: "shield",
        name: "Shield",
        description: "Protects from one hit",
        price: 200,
        icon: "shop-icon-shield",
        unlocked: true,
        purchased: false,
        category: "powerup",
        effect: (game) => {
          game.getPlayer().applyPowerup("shield", 1, null);
        },
      },
      // Cosmetics
      {
        id: "crown",
        name: "Royal Crown",
        description: "A majestic crown for your character",
        price: 500,
        icon: "shop-icon-crown",
        unlocked: true,
        purchased: false,
        category: "cosmetic",
      },
      {
        id: "beanie",
        name: "Cool Beanie",
        description: "A stylish beanie hat",
        price: 300,
        icon: "shop-icon-beanie",
        unlocked: true,
        purchased: false,
        category: "cosmetic",
      },
      // Boosters
      {
        id: "head_start",
        name: "Head Start",
        description: "Start with 100 points",
        price: 200,
        icon: "shop-icon-start",
        unlocked: true,
        purchased: false,
        category: "booster",
        effect: (game) => {
          game.addScore(100);
        },
      },
      {
        id: "coin_doubler",
        name: "Coin Doubler",
        description: "Double all coins collected",
        price: 500,
        icon: "shop-icon-doubler",
        unlocked: true,
        purchased: false,
        category: "booster",
      },
      // Shoes
      {
        id: "shoes_red_sneakers",
        name: "Red Sneakers",
        description: "Stylish red running shoes",
        price: 250,
        icon: "shop-icon-shoes",
        unlocked: true,
        purchased: false,
        category: "shoes",
        type: "shoes",
        value: "red_sneakers",
      },
      {
        id: "shoes_blue_boots",
        name: "Blue Boots",
        description: "Sturdy blue boots with good grip",
        price: 350,
        icon: "shop-icon-shoes",
        unlocked: true,
        purchased: false,
        category: "shoes",
        type: "shoes",
        value: "blue_boots",
      },
      {
        id: "shoes_golden_sandals",
        name: "Golden Sandals",
        description: "Luxurious golden sandals that shimmer in the light",
        price: 500,
        icon: "shop-icon-shoes",
        unlocked: true,
        purchased: false,
        category: "shoes",
        type: "shoes",
        value: "golden_sandals",
      },
      // Skins
      {
        id: "skin_rainbow",
        name: "Rainbow Skin",
        description: "A vibrant rainbow-colored skin",
        price: 400,
        icon: "shop-icon-skin",
        unlocked: true,
        purchased: false,
        category: "skins",
        type: "skin",
        value: "rainbow",
      },
      {
        id: "skin_metal",
        name: "Metallic Skin",
        description: "A shiny metallic skin that reflects light",
        price: 450,
        icon: "shop-icon-skin",
        unlocked: true,
        purchased: false,
        category: "skins",
        type: "skin",
        value: "metal",
      },
      {
        id: "skin_galaxy",
        name: "Galaxy Skin",
        description: "A cosmic skin with swirling galaxy patterns",
        price: 600,
        icon: "shop-icon-skin",
        unlocked: true,
        purchased: false,
        category: "skins",
        type: "skin",
        value: "galaxy",
      },
    ];

    // Load purchased items
    this.loadShopData();
  }

  /**
   * Add coins to the player's balance
   */
  public addCoins(amount: number): void {
    this.coins += amount;
    this.onCoinsChanged(this.coins);
    this.saveShopData();
  }

  /**
   * Get the player's current coin balance
   */
  public getCoins(): number {
    return this.coins;
  }

  /**
   * Get all shop items
   */
  public getItems(): ShopItem[] {
    return this.items;
  }

  /**
   * Get items of a specific category
   */
  public getItemsByCategory(category: string): ShopItem[] {
    return this.items.filter((item) => item.category === category);
  }

  /**
   * Purchase an item if the player has enough coins
   */
  public purchaseItem(itemId: string): boolean {
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
  public isItemPurchased(itemId: string): boolean {
    const item = this.items.find((i) => i.id === itemId);
    return item ? item.purchased : false;
  }

  /**
   * Set callback for when coins amount changes
   */
  public setOnCoinsChanged(callback: (coins: number) => void): void {
    this.onCoinsChanged = callback;
  }

  /**
   * Save shop data to localStorage
   */
  public saveShopData(): void {
    try {
      const shopData = {
        coins: this.coins,
        purchasedItems: this.items
          .filter((item) => item.purchased)
          .map((item) => item.id),
      };

      localStorage.setItem("shopData", JSON.stringify(shopData));
    } catch (e) {
      console.error("Error saving shop data:", e);
    }
  }

  /**
   * Load shop data from localStorage
   */
  public loadShopData(): void {
    try {
      const shopDataStr = localStorage.getItem("shopData");

      if (shopDataStr) {
        const shopData = JSON.parse(shopDataStr);

        // Restore coins
        this.coins = shopData.coins || 0;

        // Restore purchased items
        if (shopData.purchasedItems && Array.isArray(shopData.purchasedItems)) {
          shopData.purchasedItems.forEach((itemId: string) => {
            const item = this.items.find((i) => i.id === itemId);
            if (item) {
              item.purchased = true;
            }
          });
        }

        this.onCoinsChanged(this.coins);
      }
    } catch (e) {
      console.error("Error loading shop data:", e);
    }
  }
}
