import { useCallback, useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import winnerMp3 from "/assets/winner.mp3";
import shakeMp3 from "/assets/shake.mp3";

export const useKeshkeshAudio = () => {
  const winnerAudio = useRef(typeof Audio !== "undefined" ? new Audio(winnerMp3) : null);
  const shakeAudio = useRef(typeof Audio !== "undefined" ? new Audio(shakeMp3) : null);
  const winnerSound = useRef(null);
  const shakeSound = useRef(null);
  const audioUnlocked = useRef(false);
  const [audioPromptVisible, setAudioPromptVisible] = useState(true);

  useEffect(() => {
    const winnerEl = winnerAudio.current;
    const shakeEl = shakeAudio.current;

    if (shakeEl) {
      shakeEl.loop = true;
      shakeEl.volume = 1.0;
    }

    if (winnerEl) {
      winnerEl.volume = 1.0;
    }

    try {
      winnerSound.current = new Howl({
        src: [winnerMp3],
        volume: 1,
        preload: true,
        onload: () => console.log("Winner sound loaded successfully"),
        onloaderror: (id, err) => console.error("Winner sound load error:", err),
        onplayerror: (id, err) => console.error("Winner sound play error:", err),
      });

      shakeSound.current = new Howl({
        src: [shakeMp3],
        volume: 1,
        loop: true,
        preload: true,
        onload: () => console.log("Shake sound loaded successfully"),
      });
    } catch (err) {
      console.error("Howler initialization error:", err);
    }
  }, []);

  const unlockAudioContext = useCallback(() => {
    if (audioUnlocked.current) return true;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio API not supported");
        return false;
      }

      const audioContext = new AudioContext();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      audioUnlocked.current = true;
      setAudioPromptVisible(false);
      audioContext.close();
      return true;
    } catch (err) {
      console.error("Audio context unlock error:", err);
      return false;
    }
  }, []);

  const playWithFallback = useCallback(async (audioElement, howlInstance, logLabel) => {
    if (!audioElement && !howlInstance) return;

    try {
      if (audioElement) {
        audioElement.currentTime = 0;
        await audioElement.play();
        console.log(`${logLabel} audio played successfully`);
        return;
      }
    } catch (err) {
      console.error(`${logLabel} audio error:`, err);
    }

    if (howlInstance) {
      howlInstance.play();
      console.log(`Fallback to Howler for ${logLabel.toLowerCase()} sound`);
    }
  }, []);

  const ensureAudioUnlocked = useCallback(() => {
    if (!audioUnlocked.current) {
      unlockAudioContext();
    }
  }, [unlockAudioContext]);

  const playShakeSound = useCallback(() => {
    ensureAudioUnlocked();
    return playWithFallback(shakeAudio.current, shakeSound.current, "Shake");
  }, [ensureAudioUnlocked, playWithFallback]);

  const stopShakeSound = useCallback(() => {
    const shakeEl = shakeAudio.current;
    if (shakeEl) {
      shakeEl.pause();
    }
    if (shakeSound.current) {
      shakeSound.current.stop();
    }
  }, []);

  const playWinnerSound = useCallback(() => {
    ensureAudioUnlocked();
    return playWithFallback(winnerAudio.current, winnerSound.current, "Winner");
  }, [ensureAudioUnlocked, playWithFallback]);

  const stopAllAudio = useCallback(() => {
    const winnerEl = winnerAudio.current;
    const shakeEl = shakeAudio.current;

    if (winnerEl) {
      winnerEl.pause();
      winnerEl.currentTime = 0;
    }

    if (shakeEl) {
      shakeEl.pause();
      shakeEl.currentTime = 0;
    }

    if (winnerSound.current) {
      winnerSound.current.stop();
    }

    if (shakeSound.current) {
      shakeSound.current.stop();
    }
  }, []);

  return {
    audioPromptVisible,
    ensureAudioUnlocked,
    playShakeSound,
    stopShakeSound,
    playWinnerSound,
    stopAllAudio,
    audioUnlocked,
  };
};
