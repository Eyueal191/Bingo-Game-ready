import React, { useEffect, useRef, useState } from "react";

// Deterministic canvas spinner aligned with backend (targetIndex, durationMs)
export default function SpinWheel({
  segments = [],
  isSpinning = false,
  targetIndex = null,
  durationMs = 4500,
  size = 290,
  onProgress = undefined, // (currentIndex:number) => void
  onSpinComplete = () => {},
  spinId = null, // pass-through so we can ack with server spinId
}) {
  const names = segments.map((s) => s.label || s.name || String(s.id));
  const colors = segments.map((s, i) => s.color || getSegmentColor(i));

  const [needleText, setNeedleText] = useState("");

  // canvas/state refs
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(0);
  const startAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const angleRef = useRef(0);
  const extraSpinsRef = useRef(8); // full rotations before landing

  const centerX = size;
  const centerY = size;

  useEffect(() => {
    // init canvas once
    let canvas = canvasRef.current || document.getElementById("spinCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("width", `${size * 2}`);
      canvas.setAttribute("height", `${size * 2}`);
      canvas.setAttribute("id", "spinCanvas");
      const wheelDiv = document.getElementById("wheelDiv");
      if (wheelDiv) wheelDiv.appendChild(canvas);
    }
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext("2d");
    canvas.style.borderRadius = "50%";
    drawFrame(angleRef.current);
    // cleanup on unmount
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start animation when isSpinning toggles
  useEffect(() => {
    if (!isSpinning || names.length === 0) return;

    // choose a random starting index, compute matching start angle
    const N = Math.max(1, names.length);
    const startIdx = Math.floor(Math.random() * N);
    const startAngle = indexToAngleCenter(startIdx, N);
    startAngleRef.current = startAngle;

    // compute destination angle to center targetIndex under needle
    const tgtIdx =
      targetIndex === null || targetIndex === undefined
        ? Math.floor(Math.random() * N)
        : Math.max(0, Math.min(N - 1, Number(targetIndex)));
    const baseTargetAngle = indexToAngleCenter(tgtIdx, N);
    targetAngleRef.current =
      baseTargetAngle + 2 * Math.PI * extraSpinsRef.current;

    startTimeRef.current = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, targetIndex, durationMs, names.length]);

  const tick = (now) => {
    const N = Math.max(1, names.length);
    const elapsed = now - startTimeRef.current;
    const t = Math.min(Math.max(elapsed / (durationMs || 4500), 0), 1);
    const easeOut = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const angle =
      startAngleRef.current +
      easeOut * (targetAngleRef.current - startAngleRef.current);
    angleRef.current = angle;
    drawFrame(angle);

    const idx = angleToIndex(angle, N);
    if (typeof onProgress === "function") onProgress(idx);

    if (t < 1 && isSpinning) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // finalize
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onSpinComplete(spinId != null ? spinId : idx);
    }
  };

  function drawFrame(currentAngle) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    clear(ctx);
    drawWheel(ctx, currentAngle);
    drawNeedle(ctx, currentAngle);
  }

  function drawSegment(ctx, key, lastAngle, angle) {
    const value = names[key];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, size, lastAngle, angle, false);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fillStyle = colors[key];
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((lastAngle + angle) / 2);
    ctx.fillStyle = "white";
    ctx.font = "bold 1em Arial";
    ctx.fillText((value || "").substring(0, 21), size / 2 + 20, 0);
    ctx.restore();
  }

  function drawWheel(ctx, angleCurrent) {
    let lastAngle = angleCurrent;
    const N = Math.max(1, names.length);
    const PI2 = Math.PI * 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "1em Arial";
    for (let i = 1; i <= N; i++) {
      const angle = PI2 * (i / N) + angleCurrent;
      drawSegment(ctx, i - 1, lastAngle, angle);
      lastAngle = angle;
    }

    // center button
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, PI2, false);
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.fill();
    ctx.font = "bold 1em Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("Spin", centerX, centerY + 3);
    ctx.stroke();

    // outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, PI2, false);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }

  function drawNeedle(ctx, angleCurrent) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(centerX + 20, centerY - 30);
    ctx.lineTo(centerX - 20, centerY - 30);
    ctx.lineTo(centerX, centerY - centerY / 2.5);
    ctx.closePath();
    ctx.fill();
    // Compute label (keep in sync with angleToIndex)
    const idx = angleToIndex(angleCurrent, Math.max(1, names.length));
    setNeedleText(names[idx] || "");
  }

  function clear(ctx) {
    ctx.clearRect(0, 0, size * 2, size * 2);
  }

  // Mapping helpers to align index <-> angle with needle formula
  function indexToAngleCenter(idx, N) {
    const bucket = N - 1 - (idx % N);
    const change = 2 * Math.PI * ((bucket + 0.5) / N);
    return change - Math.PI / 2;
  }
  function angleToIndex(angle, N) {
    let change = angle + Math.PI / 2;
    // normalize to [0, 2π)
    const PI2 = Math.PI * 2;
    change = ((change % PI2) + PI2) % PI2;
    const bucket = Math.floor((change / PI2) * N);
    let i = N - bucket - 1;
    if (i < 0) i += N;
    if (i >= N) i -= N;
    return i;
  }

  function getSegmentColor(index) {
    const palette = [
      "#ff3b30",
      "#55ff77",
      "#f8d517",
      "#55ff77",
      "#55ff77",
      "#ff9f1c",
      "#55ff77",
      "#ff3b30",
      "#55ff77",
      "#55ff77",
      "#55ff77",
      "#f8d517",
    ];
    return palette[index % palette.length];
  }

  return (
    <div
      id="wheelDiv"
      style={{
        position: "relative",
        width: size * 2,
        margin: "16px auto 0",
        paddingTop: 48, // reserve space for the top needle text
      }}
    >
      <canvas id="spinCanvas" width={size * 2} height={size * 2} />
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "1.3em",
          color: "#ffffff",
          textShadow: "0 2px 6px rgba(0, 0, 0, 0.6)",
          whiteSpace: "nowrap",
          maxWidth: size * 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          pointerEvents: "none",
        }}
      >
        {needleText}
      </div>
    </div>
  );
}
