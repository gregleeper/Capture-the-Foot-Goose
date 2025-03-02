/**
 * AudioManager - Manages loading and playing sounds for the game
 */
export class AudioManager {
  private sounds: Map<string, HTMLAudioElement>;
  private music: HTMLAudioElement | null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private soundVolume: number = 0.7;

  constructor() {
    this.sounds = new Map();
    this.music = null;

    // Try to load saved audio preferences
    this.loadAudioPreferences();
  }

  /**
   * Load audio preferences from localStorage
   */
  private loadAudioPreferences(): void {
    try {
      const savedMuted = localStorage.getItem("audioMuted");
      if (savedMuted !== null) {
        this.isMuted = savedMuted === "true";
      }

      const savedMusicVolume = localStorage.getItem("musicVolume");
      if (savedMusicVolume !== null) {
        this.musicVolume = parseFloat(savedMusicVolume);
      }

      const savedSoundVolume = localStorage.getItem("soundVolume");
      if (savedSoundVolume !== null) {
        this.soundVolume = parseFloat(savedSoundVolume);
      }

      console.log(
        `Loaded audio preferences: Muted=${this.isMuted}, Music=${this.musicVolume}, Sound=${this.soundVolume}`
      );
    } catch (e) {
      console.error("Error loading audio preferences:", e);
    }
  }

  /**
   * Save audio preferences to localStorage
   */
  private saveAudioPreferences(): void {
    try {
      localStorage.setItem("audioMuted", this.isMuted.toString());
      localStorage.setItem("musicVolume", this.musicVolume.toString());
      localStorage.setItem("soundVolume", this.soundVolume.toString());
    } catch (e) {
      console.error("Error saving audio preferences:", e);
    }
  }

  /**
   * Preload a sound effect
   * @param id Identifier for the sound
   * @param url URL of the sound file
   */
  public loadSound(id: string, url: string): void {
    const audio = new Audio(url);
    audio.volume = this.soundVolume;
    audio.muted = this.isMuted;

    // Store the audio element
    this.sounds.set(id, audio);

    // Preload the audio file
    audio.load();

    console.log(`Loaded sound: ${id} from ${url}`);
  }

  /**
   * Preload and set background music
   * @param url URL of the music file
   */
  public loadMusic(url: string): void {
    this.music = new Audio(url);
    this.music.loop = true;
    this.music.volume = this.musicVolume;
    this.music.muted = this.isMuted;

    // Preload the audio file
    this.music.load();

    console.log(`Loaded music from ${url}`);
  }

  /**
   * Play a sound effect
   * @param id Identifier for the sound to play
   */
  public playSound(id: string): void {
    if (this.isMuted) {
      return;
    }

    const sound = this.sounds.get(id);
    if (sound) {
      // Clone the audio to allow overlapping sounds
      const soundClone = sound.cloneNode(true) as HTMLAudioElement;
      soundClone.volume = this.soundVolume;

      // Play the sound
      soundClone.play().catch((e) => {
        console.error(`Error playing sound ${id}:`, e);
      });
    } else {
      console.warn(`Sound not found: ${id}`);
    }
  }

  /**
   * Start playing the background music
   */
  public playMusic(): void {
    if (this.music && !this.isMuted) {
      this.music.play().catch((e) => {
        console.error("Error playing music:", e);
      });
    }
  }

  /**
   * Pause the background music
   */
  public pauseMusic(): void {
    if (this.music) {
      this.music.pause();
    }
  }

  /**
   * Toggle mute state for all audio
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;

    // Update all sound elements
    this.sounds.forEach((sound) => {
      sound.muted = this.isMuted;
    });

    // Update music
    if (this.music) {
      this.music.muted = this.isMuted;
    }

    // Save preference
    this.saveAudioPreferences();

    return this.isMuted;
  }

  /**
   * Set mute state for all audio
   */
  public setMute(muted: boolean): void {
    if (this.isMuted !== muted) {
      this.toggleMute();
    }
  }

  /**
   * Set music volume
   * @param volume Volume level (0.0 to 1.0)
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    if (this.music) {
      this.music.volume = this.musicVolume;
    }

    // Save preference
    this.saveAudioPreferences();
  }

  /**
   * Set sound effects volume
   * @param volume Volume level (0.0 to 1.0)
   */
  public setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume));

    // Update all sound elements
    this.sounds.forEach((sound) => {
      sound.volume = this.soundVolume;
    });

    // Save preference
    this.saveAudioPreferences();
  }

  /**
   * Get the current mute state
   */
  public getMute(): boolean {
    return this.isMuted;
  }

  /**
   * Get the current music volume
   */
  public getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Get the current sound effects volume
   */
  public getSoundVolume(): number {
    return this.soundVolume;
  }
}
