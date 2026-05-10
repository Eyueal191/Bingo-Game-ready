import { useEffect } from "react";

export const useWebGLContextMonitor = ({
  canvasRef,
  onContextLost,
  onContextRestored,
}) => {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return undefined;

    const handleContextLost = (event) => {
      event.preventDefault();
      onContextLost?.(event);
    };

    const handleContextRestored = (event) => {
      onContextRestored?.(event);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [canvasRef, onContextLost, onContextRestored]);
};
