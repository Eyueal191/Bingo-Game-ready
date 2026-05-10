import React from "react";
import { Box, Typography } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import JarScene from "./JarScene";

const KeshkeshJar = ({ numbers, isShaking, webGLAvailable, canvasRef, children }) => (
  <Box
    sx={{
      height: "400px",
      mb: 4,
      borderRadius: "16px",
      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
      position: "relative",
    }}
  >
    {numbers.length === 0 && (
      <Typography color="error" sx={{ position: "absolute", top: 8, left: 8, zIndex: 2 }}>
        ማሰሮው ውስጥ ምንም ቁጥሮች የሉም።
      </Typography>
    )}

    {webGLAvailable ? (
      <Canvas camera={{ position: [0, 2, 6], fov: 50 }} gl={{ alpha: true, preserveDrawingBuffer: false }} ref={canvasRef}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <JarScene isShaking={isShaking} numbers={numbers} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
      </Canvas>
    ) : (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Typography color="textSecondary">3D Jar unavailable due to rendering issues.</Typography>
        {numbers.length > 0 && (
          <Typography color="textSecondary">ቁጥሮች በጃር: {numbers.join(", ")}</Typography>
        )}
      </Box>
    )}
    {children}
  </Box>
);

export default KeshkeshJar;
