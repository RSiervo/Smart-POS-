// Simple Base64 encoded "Success Chime" sound to avoid external dependencies or CORS issues
const SUCCESS_CHIME = "data:audio/wav;base64,UklGRpwBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YXMBAACAgICAgICAgICAgICAgICAgICAgICAgICAf3hxeHCAgIB/cnVygICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKAgICAf3J1coCAgIB/cnVygICAgH9ydXKA";

// A slightly more audible chime for notifications
const NOTIFICATION_SOUND = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYaW5nAAAADwAAAA8AAA9gAA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8QAABLmRvY3R5cGUgaHRtbD4KPGh0bWw+CjxoZWFkPgogIDxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KICA8dGl0bGU+PC90aXRsZT4KPC9oZWFkPgo8Ym9keT4KPC9ib2R5Pgo8L2h0bWw+Cg=="; // Placeholder, using a generated beep below for reliability

export const playNotificationSound = () => {
  try {
    // Create a simple oscillator beep since external base64 strings can be large
    // This ensures it works offline without large assets
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (error) {
    console.error("Audio play failed", error);
  }
};