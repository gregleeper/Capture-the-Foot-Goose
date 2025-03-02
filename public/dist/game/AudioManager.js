/**
 * Manages all audio playback for the game
 */
export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.music = null;
        this.isMuted = false;
        this.soundVolume = 0.7;
        this.musicVolume = 0.4;
        // No automatic loading, Game.ts calls loadAudioAssets
    }
    /**
     * Loads the background music
     */
    loadMusic(path) {
        this.music = new Audio(path);
        if (this.music) {
            this.music.loop = true;
            this.music.volume = this.musicVolume;
        }
    }
    /**
     * Loads a single sound effect
     */
    loadSound(name, path) {
        const audio = new Audio(path);
        audio.volume = this.soundVolume;
        this.sounds.set(name, audio);
    }
    /**
     * Plays a sound effect once
     */
    playSound(name) {
        if (this.isMuted)
            return;
        const sound = this.sounds.get(name);
        if (sound) {
            // Create a clone to allow overlapping sounds
            const soundClone = sound.cloneNode(true);
            soundClone.volume = this.soundVolume;
            soundClone
                .play()
                .catch((error) => console.error(`Error playing sound ${name}:`, error));
        }
    }
    /**
     * Starts playing the background music
     */
    playMusic() {
        if (this.isMuted || !this.music)
            return;
        this.music.currentTime = 0;
        this.music
            .play()
            .catch((error) => console.error("Error playing background music:", error));
    }
    /**
     * Pauses the background music
     */
    pauseMusic() {
        if (this.music) {
            this.music.pause();
        }
    }
    /**
     * Toggles the mute state for all audio
     */
    toggleMute() {
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
            }
            else if (document.visibilityState === "visible") {
                this.music
                    .play()
                    .catch((error) => console.error("Error resuming background music:", error));
            }
        }
    }
    /**
     * Gets the current mute state
     */
    getMute() {
        return this.isMuted;
    }
    /**
     * Sets the sound effect volume
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.sounds.forEach((sound) => {
            sound.volume = this.soundVolume;
        });
    }
    /**
     * Sets the music volume
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }
}
//# sourceMappingURL=AudioManager.js.map