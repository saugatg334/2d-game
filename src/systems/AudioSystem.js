// ============================================
// Nepali Racer - Audio System
// ============================================

class AudioSystem {
  constructor() {
    this.sounds = {};
    this.music = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.masterVolume = 1.0;
    this.soundVolume = 0.7;
    this.musicVolume = 0.5;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled && this.music) {
      this.music.pause();
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    this.updateVolumes();
  }

  setSoundVolume(volume) {
    this.soundVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  setMusicVolume(volume) {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.music) {
      this.music.volume = this.musicVolume * this.masterVolume;
    }
  }

  updateVolumes() {
    if (this.music) {
      this.music.volume = this.musicVolume * this.masterVolume;
    }
  }

  playSound(key) {
    if (!this.soundEnabled) return;
    try {
      if (this.sounds[key]) {
        this.sounds[key].play();
      }
    } catch (e) {
      console.warn(`AudioSystem: Failed to play sound "${key}"`, e);
    }
  }

  playMusic(key) {
    if (!this.musicEnabled) return;
    try {
      if (this.music) {
        this.music.stop();
      }
      // Music would be loaded and played here
      console.log(`AudioSystem: Playing music "${key}"`);
    } catch (e) {
      console.warn(`AudioSystem: Failed to play music "${key}"`, e);
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  pauseMusic() {
    if (this.music) {
      this.music.pause();
    }
  }

  resumeMusic() {
    if (this.music && this.musicEnabled) {
      this.music.resume();
    }
  }
}

export const audioSystem = new AudioSystem();
export default AudioSystem;
