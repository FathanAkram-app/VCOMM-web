/**
 * Enhanced Audio Manager for Mobile Devices
 * Handles earphone detection, audio routing, and device-specific audio issues
 */

interface AudioDeviceInfo {
  isEarphoneConnected: boolean;
  preferredOutput: 'earpiece' | 'speaker' | 'earphone';
  audioContext?: AudioContext;
  gainNode?: GainNode;
}

class MobileAudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private deviceInfo: AudioDeviceInfo = {
    isEarphoneConnected: false,
    preferredOutput: 'speaker'
  };

  constructor() {
    this.detectAudioDevices();
    this.setupAudioContext();
    this.addEventListeners();
  }

  private async detectAudioDevices() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        console.log('[AudioManager] Available audio outputs:', audioOutputs);
        
        // Check for wired earphones/headphones
        const hasWiredAudio = audioOutputs.some(device => 
          device.label.toLowerCase().includes('headphone') ||
          device.label.toLowerCase().includes('earphone') ||
          device.label.toLowerCase().includes('wired')
        );
        
        this.deviceInfo.isEarphoneConnected = hasWiredAudio;
        this.deviceInfo.preferredOutput = hasWiredAudio ? 'earphone' : 'speaker';
        
        console.log('[AudioManager] Earphone connected:', hasWiredAudio);
      }
    } catch (error) {
      console.warn('[AudioManager] Could not enumerate devices:', error);
    }
  }

  private setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('[AudioManager] Audio context initialized');
    } catch (error) {
      console.error('[AudioManager] Failed to setup audio context:', error);
    }
  }

  private addEventListeners() {
    // Listen for device changes (earphone plug/unplug)
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        console.log('[AudioManager] Audio devices changed, re-detecting...');
        this.detectAudioDevices();
      });
    }

    // Handle visibility change to maintain audio
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleBackgroundAudio();
      } else {
        this.handleForegroundAudio();
      }
    });
  }

  private handleBackgroundAudio() {
    console.log('[AudioManager] App went to background, maintaining audio...');
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private handleForegroundAudio() {
    console.log('[AudioManager] App returned to foreground, checking audio...');
    if (this.currentStream) {
      this.optimizeAudioForDevice(this.currentStream);
    }
  }

  async optimizeAudioForDevice(stream: MediaStream): Promise<MediaStream> {
    this.currentStream = stream;
    
    try {
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('[AudioManager] Audio context resumed');
      }

      // Apply mobile-specific optimizations
      if (this.isMobileDevice()) {
        return this.applyMobileOptimizations(stream);
      }

      return stream;
    } catch (error) {
      console.error('[AudioManager] Error optimizing audio:', error);
      return stream;
    }
  }

  private async applyMobileOptimizations(stream: MediaStream): Promise<MediaStream> {
    const audioTracks = stream.getAudioTracks();
    
    if (audioTracks.length === 0) {
      return stream;
    }

    // Apply mobile-specific audio constraints
    audioTracks.forEach(track => {
      const capabilities = track.getCapabilities();
      const constraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Enhanced settings for mobile
        sampleRate: 48000,
        channelCount: 1 // Mono for better compatibility
      };

      // Apply earphone-specific settings
      if (this.deviceInfo.isEarphoneConnected) {
        constraints.echoCancellation = false; // Less aggressive for earphones
        constraints.autoGainControl = false;
      }

      track.applyConstraints(constraints).then(() => {
        console.log('[AudioManager] Applied mobile optimizations to audio track');
      }).catch(error => {
        console.warn('[AudioManager] Could not apply some constraints:', error);
      });
    });

    // Route audio through Web Audio API for better control
    if (this.audioContext && this.gainNode) {
      const source = this.audioContext.createMediaStreamSource(stream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      // Configure gain for device type
      if (this.deviceInfo.isEarphoneConnected) {
        this.gainNode.gain.value = 0.8; // Slightly lower for earphones
      } else {
        this.gainNode.gain.value = 1.0; // Full volume for speakers
      }
      
      source.connect(this.gainNode);
      this.gainNode.connect(destination);
      
      console.log('[AudioManager] Audio routed through Web Audio API');
      return destination.stream;
    }

    return stream;
  }

  async createOptimizedAudioElement(): Promise<HTMLAudioElement> {
    const audio = new Audio();
    
    // Mobile-specific audio element settings
    audio.autoplay = true;
    audio.playsInline = true;
    audio.muted = false;
    
    // Set audio routing preferences
    if (this.deviceInfo.isEarphoneConnected) {
      // For earphones, use lower volume and disable auto-gain
      audio.volume = 0.8;
    } else {
      // For speakers, use full volume
      audio.volume = 1.0;
    }

    // Handle audio interruptions
    audio.addEventListener('pause', () => {
      console.log('[AudioManager] Audio paused, attempting to resume...');
      setTimeout(() => {
        if (!audio.ended) {
          audio.play().catch(e => console.warn('[AudioManager] Could not resume audio:', e));
        }
      }, 100);
    });

    // Handle audio errors
    audio.addEventListener('error', (e) => {
      console.error('[AudioManager] Audio element error:', e);
      this.handleAudioError();
    });

    this.audioElement = audio;
    return audio;
  }

  private handleAudioError() {
    console.log('[AudioManager] Handling audio error, reinitializing...');
    
    // Reinitialize audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.setupAudioContext();
    }
    
    // Re-detect devices
    this.detectAudioDevices();
  }

  setAudioOutput(outputType: 'earpiece' | 'speaker' | 'earphone') {
    this.deviceInfo.preferredOutput = outputType;
    console.log(`[AudioManager] Audio output set to: ${outputType}`);
    
    // Apply output-specific settings
    if (this.gainNode) {
      switch (outputType) {
        case 'earpiece':
          this.gainNode.gain.value = 0.6;
          break;
        case 'earphone':
          this.gainNode.gain.value = 0.8;
          break;
        case 'speaker':
          this.gainNode.gain.value = 1.0;
          break;
      }
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  isEarphoneConnected(): boolean {
    return this.deviceInfo.isEarphoneConnected;
  }

  getCurrentOutputType(): string {
    return this.deviceInfo.preferredOutput;
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    
    this.currentStream = null;
    this.gainNode = null;
  }
}

// Global instance
export const audioManager = new MobileAudioManager();

// Utility functions
export const optimizeStreamForMobile = (stream: MediaStream) => {
  return audioManager.optimizeAudioForDevice(stream);
};

export const createMobileAudioElement = () => {
  return audioManager.createOptimizedAudioElement();
};

export const setPreferredAudioOutput = (outputType: 'earpiece' | 'speaker' | 'earphone') => {
  audioManager.setAudioOutput(outputType);
};

export const isEarphoneConnected = () => {
  return audioManager.isEarphoneConnected();
};

export const getCurrentAudioOutput = () => {
  return audioManager.getCurrentOutputType();
};