"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron, Sphere } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const OURO = "#D4A94F";
const AZUL = "#0B1B3A";

/** Núcleo: icosaedro em wireframe + esfera interna + satélites orbitando. Reage ao cursor. */
function Nucleo() {
  const grupo = useRef<THREE.Group>(null!);
  const orbita = useRef<THREE.Group>(null!);

  const satelites = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a * 2) * 0.6, Math.sin(a) * 2.2);
      }),
    []
  );

  useFrame((state, delta) => {
    // pointer vai de -1 a 1; o grupo "olha" suavemente para o cursor
    const alvoX = state.pointer.y * 0.6;
    const alvoY = state.pointer.x * 0.9;
    grupo.current.rotation.x = THREE.MathUtils.lerp(grupo.current.rotation.x, alvoX, 0.06);
    grupo.current.rotation.y = THREE.MathUtils.lerp(grupo.current.rotation.y, alvoY, 0.06);
    orbita.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={grupo}>
      <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.8}>
        <Icosahedron args={[1.5, 1]}>
          <meshStandardMaterial color={OURO} wireframe emissive={OURO} emissiveIntensity={0.6} />
        </Icosahedron>
        <Sphere args={[0.85, 48, 48]}>
          <meshStandardMaterial color={AZUL} emissive="#1B3F8F" emissiveIntensity={0.9} roughness={0.25} metalness={0.7} />
        </Sphere>
      </Float>
      <group ref={orbita}>
        {satelites.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={OURO} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function NucleoCerebro() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={40} color={OURO} />
      <pointLight position={[-4, -2, 3]} intensity={25} color="#4D7CFF" />
      <Nucleo />
    </Canvas>
  );
}
