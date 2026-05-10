import { useCallback, useRef } from "react";
import { Howl } from "howler";

/**
 * Ludo Sound System — Maps all game events to available SFX files.
 * Uses Howler.js with global cache and per-event debouncing.
 */

const SFX_MAP = {
    dice_roll: "/sfx/dice_roll.ogg",
    cheer: "/sfx/yx_Victory.ogg",
    game_start: "/sfx/yx_StartGame.ogg",
    collide: "/sfx/yx_Kick.ogg",
    home_win: "/sfx/yx_Final.ogg",
    pile_move: "/sfx/yx_Start.ogg",
    safe_spot: "/sfx/yx_Safety.ogg",
    ui: "/sfx/ui.mp3",
    home: "/sfx/yx_Final.ogg",
    girl1: "/sfx/girl1.mp3",
    girl2: "/sfx/girl2.mp3",
    girl3: "/sfx/girl3.mp3",
    // Extended mappings — previously unused SFX
    button: "/sfx/yx_Button.ogg",
    coins: "/sfx/yx_Coins.ogg",
    countdown: "/sfx/yx_Laba.ogg",
    ladder: "/sfx/yx_Ladder.ogg",
    // Semantic aliases for gameplay events
    player_join: "/sfx/yx_Coins.ogg",
    turn_change: "/sfx/yx_Button.ogg",
    lose: "/sfx/yx_Kick.ogg",
};

// Global cache — shared across all hook instances, never duplicated
const howlCache = {};

const getHowl = (src) => {
    if (!howlCache[src]) {
        howlCache[src] = new Howl({
            src: [src],
            preload: true,
            html5: false,
        });
    }
    return howlCache[src];
};

// Active sound IDs for cleanup
const activeSounds = new Set();

export const useLudoSound = () => {
    const lastPlayedAt = useRef({});

    const playSound = useCallback((key, volume = 0.5) => {
        try {
            const src = SFX_MAP[key];
            if (!src) return;

            // Debounce rapid-fire sounds (especially pile_move during multi-step animation)
            const now = Date.now();
            const debounceMs = key === "pile_move" ? 120 : 50;
            if (lastPlayedAt.current[key] && now - lastPlayedAt.current[key] < debounceMs) {
                return;
            }
            lastPlayedAt.current[key] = now;

            const howl = getHowl(src);
            howl.volume(volume);
            const id = howl.play();
            activeSounds.add(id);
            howl.once("end", () => activeSounds.delete(id), id);
        } catch (e) {
            // Silently fail — audio is non-critical
        }
    }, []);

    const stopAll = useCallback(() => {
        Object.values(howlCache).forEach((howl) => {
            try { howl.stop(); } catch (e) { /* ignore */ }
        });
        activeSounds.clear();
    }, []);

    return { playSound, stopAll };
};
