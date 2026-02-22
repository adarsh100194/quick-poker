import { useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useSoundEffects() {
    const soundEnabled = usePlayerStore((state) => state.soundEnabled);

    const playSound = useCallback((type: 'chip' | 'card' | 'fold' | 'win' | 'turn') => {
        if (!soundEnabled) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            switch (type) {
                case 'chip':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                    gain.gain.setValueAtTime(0.5, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    break;
                case 'card':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, ctx.currentTime);
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    break;
                case 'fold':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.3);
                    break;
                case 'win':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
                    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
                    gain.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.5);
                    break;
                case 'turn':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(500, ctx.currentTime);
                    gain.gain.setValueAtTime(0.4, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                    break;
            }
        } catch (e) {
            console.error('Audio playback failed', e);
        }
    }, [soundEnabled]);

    return { playSound };
}
