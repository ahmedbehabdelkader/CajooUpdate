// Plays a short notification beep using Web Audio API (no asset needed).
let ctx: AudioContext | null = null;

export const playNotificationSound = () => {
  try {
    if (!ctx) {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx!.state === "suspended") ctx!.resume().catch(() => {});
    const now = ctx!.currentTime;
    const tones = [880, 1175]; // two-note chime
    tones.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // ignore audio errors
  }
};
