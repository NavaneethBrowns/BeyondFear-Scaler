import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

function StudioParticles({ color = '#fff3dd', count = 520, spread = 18, size = 0.05, opacity = 0.42 }) {
  const ref = useRef(null);
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 4 + Math.random() * spread;
      const theta = Math.random() * Math.PI * 2;
      const lift = (Math.random() - 0.5) * 9;
      data[index * 3] = Math.cos(theta) * radius;
      data[index * 3 + 1] = lift;
      data[index * 3 + 2] = Math.sin(theta) * radius * 0.45;
    }
    return data;
  }, [count, spread]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.03;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.08) * 0.03;
  });

  return (
    <points ref={ref} position={[0, 0, -5]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  );
}

function OrbitRings({ palette }) {
  const ref = useRef(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * 0.04;
    ref.current.rotation.x = 1.06 + Math.sin(state.clock.elapsedTime * 0.12) * 0.03;
  });

  return (
    <group ref={ref} position={[0, 0.4, -8]}>
      <mesh>
        <torusGeometry args={[8.4, 0.05, 18, 220]} />
        <meshBasicMaterial color={palette.ringPrimary} transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[0, 0, 0.72]}>
        <torusGeometry args={[11.4, 0.03, 18, 220]} />
        <meshBasicMaterial color={palette.ringSecondary} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function HeroStructures({ palette }) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const beamRef = useRef(null);

  useFrame((state, delta) => {
    if (leftRef.current) {
      leftRef.current.rotation.y += delta * 0.08;
      leftRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.06;
    }

    if (rightRef.current) {
      rightRef.current.rotation.y -= delta * 0.06;
      rightRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.16) * 0.05;
    }

    if (beamRef.current) {
      beamRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.12) * 0.04;
    }
  });

  return (
    <group>
      <group ref={leftRef} position={[4.8, 3.3, -1.4]}>
        <mesh rotation={[0.3, 0.55, -0.4]}>
          <torusKnotGeometry args={[1.25, 0.34, 160, 22]} />
          <meshStandardMaterial color={palette.primary} roughness={0.24} metalness={0.18} />
        </mesh>
        <mesh position={[-1.2, -0.35, -0.8]} rotation={[0.6, 0.2, -0.25]}>
          <boxGeometry args={[0.95, 1.55, 0.95]} />
          <meshStandardMaterial color={palette.secondary} roughness={0.18} metalness={0.08} />
        </mesh>
      </group>

      <group ref={rightRef} position={[2.2, -4.4, -1.8]}>
        <mesh rotation={[0.2, -0.42, 0.22]}>
          <torusGeometry args={[1.65, 0.42, 24, 80]} />
          <meshStandardMaterial color={palette.accent} roughness={0.24} metalness={0.12} />
        </mesh>
        <mesh position={[2.4, 0.8, -1.2]} rotation={[0.28, 0.4, 0.12]}>
          <dodecahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color={palette.secondary} roughness={0.25} metalness={0.12} />
        </mesh>
      </group>

      <group ref={beamRef} position={[-5.4, 1.6, -3.2]}>
        <mesh rotation={[0.2, 0.65, 0.35]}>
          <cylinderGeometry args={[0.32, 0.32, 7.8, 18]} />
          <meshStandardMaterial color={palette.cyan} roughness={0.18} metalness={0.18} />
        </mesh>
        <mesh position={[0, 0, -0.6]} rotation={[0.2, 0.65, 0.35]}>
          <cylinderGeometry args={[0.16, 0.16, 7.8, 18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.05} />
        </mesh>
      </group>
    </group>
  );
}

function ChatFramework({ palette }) {
  const frameRef = useRef(null);
  const nodesRef = useRef(null);

  useFrame((state, delta) => {
    if (frameRef.current) {
      frameRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.08) * 0.015;
    }
    if (nodesRef.current) {
      nodesRef.current.rotation.y += delta * 0.025;
    }
  });

  return (
    <group>
      <group ref={frameRef} position={[0, 0.3, -7.4]}>
        <mesh>
          <torusGeometry args={[8.8, 0.03, 16, 180]} />
          <meshBasicMaterial color={palette.ringPrimary} transparent opacity={0.18} />
        </mesh>
        <mesh rotation={[0, 0, 0.78]}>
          <torusGeometry args={[11.8, 0.02, 16, 180]} />
          <meshBasicMaterial color={palette.ringSecondary} transparent opacity={0.12} />
        </mesh>
      </group>

      <group ref={nodesRef} position={[0, 0, -4.6]}>
        {Array.from({ length: 8 }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / 8;
          const x = Math.cos(angle) * 6.4;
          const y = Math.sin(angle) * 3.1;
          return (
            <mesh key={index} position={[x, y, 0]}>
              <sphereGeometry args={[0.18, 20, 20]} />
              <meshStandardMaterial color={index % 2 === 0 ? palette.primary : palette.secondary} emissive={index % 2 === 0 ? palette.primary : palette.secondary} emissiveIntensity={0.18} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function HomepageScene() {
  const palette = {
    primary: '#ffbf2f',
    secondary: '#6edfff',
    accent: '#ff8b28',
    cyan: '#8ce6ff',
    ringPrimary: '#d5ebff',
    ringSecondary: '#9fd8ff',
  };

  return (
    <>
      <color attach="background" args={['#2f63d6']} />
      <fog attach="fog" args={['#2f63d6', 18, 34]} />
      <ambientLight intensity={0.95} color="#d9eeff" />
      <directionalLight position={[8, 9, 8]} intensity={1.6} color="#fff3cf" />
      <directionalLight position={[-8, -3, 7]} intensity={0.8} color="#5fd0ff" />
      <HeroStructures palette={palette} />
      <OrbitRings palette={palette} />
      <StudioParticles color="#fff6df" count={580} spread={18} size={0.05} opacity={0.34} />
    </>
  );
}

function ChatScene() {
  const palette = {
    primary: '#ffd057',
    secondary: '#8ee7ff',
    ringPrimary: '#ffffff',
    ringSecondary: '#9fd8ff',
  };

  return (
    <>
      <color attach="background" args={['#3565d5']} />
      <fog attach="fog" args={['#3565d5', 20, 36]} />
      <ambientLight intensity={0.78} color="#eff8ff" />
      <directionalLight position={[7, 8, 7]} intensity={1.1} color="#fff5d9" />
      <directionalLight position={[-7, -2, 6]} intensity={0.7} color="#80deff" />
      <ChatFramework palette={palette} />
      <StudioParticles color="#ffffff" count={360} spread={14} size={0.038} opacity={0.22} />
    </>
  );
}

const sceneMap = {
  home: HomepageScene,
  signup: HomepageScene,
  login: HomepageScene,
  chat: ChatScene,
};

export function ThreeBackdrop({ scene = 'home' }) {
  const SceneComponent = sceneMap[scene] || HomepageScene;

  return (
    <div className={`three-backdrop three-backdrop-${scene}`} aria-hidden="true">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 14], fov: 42 }}>
        <SceneComponent />
      </Canvas>
      <div className="three-backdrop-overlay" />
    </div>
  );
}
