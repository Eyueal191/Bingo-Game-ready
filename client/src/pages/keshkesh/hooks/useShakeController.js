import { useCallback, useEffect, useRef, useState } from "react";
import { SHAKE_DURATION_MS } from "../constants";

export const useShakeController = ({
  playShakeSound,
  stopShakeSound,
  ensureAudioUnlocked,
}) => {
  const timerRef = useRef(null);
  const [isShaking, setIsShaking] = useState(false);

  const stopShake = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsShaking(false);
    stopShakeSound();
  }, [stopShakeSound]);

  const triggerShake = useCallback(() => {
    console.log("[GamePlay] triggerShake called");
    ensureAudioUnlocked();
    setIsShaking(true);
    playShakeSound();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsShaking(false);
      stopShakeSound();
      console.log("[GamePlay] Shake animation stopped");
    }, SHAKE_DURATION_MS);
  }, [ensureAudioUnlocked, playShakeSound, stopShakeSound]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      stopShakeSound();
    };
  }, [stopShakeSound]);

  return {
    isShaking,
    triggerShake,
    stopShake,
  };
};
