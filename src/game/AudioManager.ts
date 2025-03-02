/**
 * Manages all audio playback for the game
 */
export class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private music: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private soundVolume: number = 0.7;
  private musicVolume: number = 0.4;

  constructor() {
    // No automatic loading, Game.ts calls loadAudioAssets
  }

  /**
   * Loads the background music
   */
  loadMusic(path: string): void {
    this.music = new Audio(path);
    if (this.music) {
      this.music.loop = true;
      this.music.volume = this.musicVolume;
    }
  }

  /**
   * Loads a single sound effect
   */
  loadSound(name: string, path: string): void {
    const audio = new Audio(path);
    audio.volume = this.soundVolume;
    this.sounds.set(name, audio);
  }

  /**
   * Plays a sound effect once
   */
  playSound(name: string): void {
    if (this.isMuted) return;

    const sound = this.sounds.get(name);
    if (sound) {
      // Create a clone to allow overlapping sounds
      const soundClone = sound.cloneNode(true) as HTMLAudioElement;
      soundClone.volume = this.soundVolume;
      soundClone
        .play()
        .catch((error) => console.error(`Error playing sound ${name}:`, error));
    }
  }

  /**
   * Starts playing the background music
   */
  playMusic(): void {
    if (this.isMuted || !this.music) return;

    this.music.currentTime = 0;
    this.music
      .play()
      .catch((error) =>
        console.error("Error playing background music:", error)
      );
  }

  /**
   * Pauses the background music
   */
  pauseMusic(): void {
    if (this.music) {
      this.music.pause();
    }
  }

  /**
   * Toggles the mute state for all audio
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;

    // Update sound effects
    this.sounds.forEach((sound) => {
      sound.muted = this.isMuted;
    });

    // Update music
    if (this.music) {
      this.music.muted = this.isMuted;
      if (this.isMuted) {
        this.music.pause();
      } else if (document.visibilityState === "visible") {
        this.music
          .play()
          .catch((error) =>
            console.error("Error resuming background music:", error)
          );
      }
    }
  }

  /**
   * Gets the current mute state
   */
  getMute(): boolean {
    return this.isMuted;
  }

  /**
   * Sets the sound effect volume
   */
  setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => {
      sound.volume = this.soundVolume;
    });
  }

  /**
   * Sets the music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.music) {
      this.music.volume = this.musicVolume;
    }
  }
}
