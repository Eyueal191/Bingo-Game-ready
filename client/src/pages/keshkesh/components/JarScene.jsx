import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import {
  BOUNCE,
  DICE_SIZE,
  GRAVITY,
  JAR_HEIGHT,
  JAR_RADIUS,
  SHAKE_FORCE,
} from "../constants";

const JarScene = React.memo(({ isShaking, numbers,    boxColor = "#ffb617",
    fontColor = "white",
    fontSize = 0.2,
    fontUrl = undefined, }) => {
  const jarRef = useRef(null);
  const diceRefs = useRef([]);
  const diceState = useRef(
    numbers.map((num) => ({
      pos: [
        Math.sin(num * 1.3) * (JAR_RADIUS - DICE_SIZE),
        Math.random() * (JAR_HEIGHT - DICE_SIZE) - JAR_HEIGHT / 2,
        Math.cos(num * 1.7) * (JAR_RADIUS - DICE_SIZE),
      ],
      vel: [0, 0, 0],
      num,
    }))
  );

  useEffect(() => {
    diceState.current = numbers.map((num) => ({
      pos: [
        Math.sin(num * 1.3) * (JAR_RADIUS - DICE_SIZE),
        Math.random() * (JAR_HEIGHT - DICE_SIZE) - JAR_HEIGHT / 2,
        Math.cos(num * 1.7) * (JAR_RADIUS - DICE_SIZE),
      ],
      vel: [0, 0, 0],
      num,
    }));
  }, [numbers]);

  useFrame((state) => {
    if (jarRef.current) {
      if (isShaking) {
        const t = state.clock.getElapsedTime();
        jarRef.current.rotation.x = Math.sin(t * 8) * 0.18;
        jarRef.current.rotation.y = Math.sin(t * 6) * 0.12;
        jarRef.current.rotation.z = Math.cos(t * 10) * 0.13;
        jarRef.current.position.y = Math.abs(Math.sin(t * 3.5)) * 0.25;
        jarRef.current.scale.set(1.04, 1.04, 1.04);
      } else {
        jarRef.current.rotation.set(0, 0, 0);
        jarRef.current.position.y = 0;
        jarRef.current.scale.set(1, 1, 1);
      }
    }

    diceState.current.forEach((dice, i) => {
      if (isShaking) {
        dice.vel[0] += (Math.random() - 0.5) * SHAKE_FORCE;
        dice.vel[1] += (Math.random() - 0.5) * SHAKE_FORCE * 0.7;
        dice.vel[2] += (Math.random() - 0.5) * SHAKE_FORCE;
      }
      dice.vel[1] += GRAVITY;
      dice.pos[0] += dice.vel[0];
      dice.pos[1] += dice.vel[1];
      dice.pos[2] += dice.vel[2];

      const r = Math.sqrt(dice.pos[0] ** 2 + dice.pos[2] ** 2);
      if (r > JAR_RADIUS - DICE_SIZE / 2) {
        const angle = Math.atan2(dice.pos[2], dice.pos[0]);
        dice.pos[0] = Math.cos(angle) * (JAR_RADIUS - DICE_SIZE / 2);
        dice.pos[2] = Math.sin(angle) * (JAR_RADIUS - DICE_SIZE / 2);
        dice.vel[0] *= -BOUNCE;
        dice.vel[2] *= -BOUNCE;
      }

      if (dice.pos[1] < -JAR_HEIGHT / 2 + DICE_SIZE / 2) {
        dice.pos[1] = -JAR_HEIGHT / 2 + DICE_SIZE / 2;
        dice.vel[1] *= -BOUNCE;
      }

      if (dice.pos[1] > JAR_HEIGHT / 2 - DICE_SIZE / 2) {
        dice.pos[1] = JAR_HEIGHT / 2 - DICE_SIZE / 2;
        dice.vel[1] *= -BOUNCE;
      }

      dice.vel[0] *= 0.97;
      dice.vel[1] *= 0.97;
      dice.vel[2] *= 0.97;

      if (diceRefs.current[i]) {
        diceRefs.current[i].position.set(dice.pos[0], dice.pos[1], dice.pos[2]);
      }
    });
  });

  return (
    <group>
      <mesh ref={jarRef}>
        <cylinderGeometry args={[JAR_RADIUS, JAR_RADIUS, JAR_HEIGHT, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#b3e0ff"
          transparent
          opacity={0.35}
          roughness={0.08}
          metalness={0.2}
          thickness={0.5}
          transmission={0.95}
          ior={1.5}
          clearcoat={0.7}
        />
      </mesh>
      <mesh position={[0, JAR_HEIGHT / 2 + 0.18, 0]}>
        <cylinderGeometry args={[JAR_RADIUS * 0.98, JAR_RADIUS * 0.98, 0.18, 48]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, JAR_HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[JAR_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#b3e0ff"
          transparent
          opacity={0.35}
          roughness={0.08}
          metalness={0.2}
          thickness={0.5}
          transmission={0.95}
          ior={1.5}
          clearcoat={0.7}
        />
      </mesh>
     {numbers.map((num, i) => (
  <group
    key={num}
    ref={(el) => {
      diceRefs.current[i] = el;
    }}
    position={diceState.current[i]?.pos}
  >
    {/* Box */}
    <mesh>
      <boxGeometry args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} />
      <meshStandardMaterial color={boxColor || "#DEB887"} roughness={0.5} />
    </mesh>

    {/* Numbers on all 6 faces */}
    {/* Front (+Z) */}
    <Text
      position={[0, 0, DICE_SIZE / 2 + 0.01]}
      fontSize={fontSize || 0.2}
      color={fontColor || "black"}
      font={fontUrl}
      anchorX="center"
      anchorY="middle"
    >
      {num}
    </Text>

    {/* Back (-Z) */}
    <Text
      position={[0, 0, -DICE_SIZE / 2 - 0.01]}
      rotation={[0, Math.PI, 0]}
      fontSize={fontSize || 0.2}
      color={fontColor || "black"}
      font={fontUrl}
      anchorX="center"
      anchorY="middle"
    >
      {num}
    </Text>

    {/* Right (+X) */}
    <Text
      position={[DICE_SIZE / 2 + 0.01, 0, 0]}
      rotation={[0, -Math.PI / 2, 0]}
      fontSize={fontSize || 0.2}
      color={fontColor || "black"}
      font={fontUrl}
      anchorX="center"
      anchorY="middle"
    >
      {num}
    </Text>

    {/* Left (-X) */}
    <Text
      position={[-DICE_SIZE / 2 - 0.01, 0, 0]}
      rotation={[0, Math.PI / 2, 0]}
      fontSize={fontSize || 0.2}
      color={fontColor || "black"}
      font={fontUrl}
      anchorX="center"
      anchorY="middle"
    >
      {num}
    </Text>

    {/* Top (+Y) */}
    <Text
      position={[0, DICE_SIZE / 2 + 0.01, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={fontSize || 0.2}
      color={fontColor || "black"}
      font={fontUrl}
      anchorX="center"
      anchorY="middle"
    >
      {num}
    </Text>

    {/* Bottom (-Y) */}
    <Text
      position={[0, -DICE_SIZE / 2 - 0.01, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      fontSize={fontSize || 0.2}
      color={fontColor || "black"}
      font={fontUrl}
      anchorX="center"
      anchorY="middle"
    >
      {num}
    </Text>
  </group>
))}

    </group>
  );
});

JarScene.displayName = "JarScene";

export default JarScene;
