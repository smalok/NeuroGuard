'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Vertex Shader for Particles
const pointsVertexShader = `
uniform float uTime;
uniform vec3 uMouse;
uniform float uPulseFreq;
uniform vec3 uRipplePos;
uniform float uRippleTime; // 0 to 1

attribute float aSize;
varying float vDistanceToMouse;
varying float vPulse;
varying float vRipple;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  
  // Calculate distance from mouse
  float dist = distance(worldPosition.xyz, uMouse);
  vDistanceToMouse = dist;
  
  // Heartbeat pulse calculation
  float pulse = (sin(uTime * 3.14159 / uPulseFreq) + 1.0) * 0.5;
  pulse = pow(pulse, 8.0);
  vPulse = pulse;

  // Click Ripple calculation
  vRipple = 0.0;
  if (uRippleTime > 0.0) {
      float distToRipple = distance(worldPosition.xyz, uRipplePos);
      float rippleRadius = uRippleTime * 50.0; // Expands to 50 units
      float rippleThickness = 5.0;
      
      // Calculate distance to the expanding ripple front
      float distToFront = abs(distToRipple - rippleRadius);
      if (distToFront < rippleThickness) {
          // Creates a peak at the exact radius, fading out by thickness
          vRipple = 1.0 - (distToFront / rippleThickness);
          
          // Fade overall effect out as time reaches 1.0
          vRipple *= (1.0 - uRippleTime);
      }
  }
  
  // Size multiplier based on mouse proximity and ripple
  float sizeMultiplier = 1.0;
  if (dist < 8.0) {
    sizeMultiplier = 1.0 + (1.0 - dist / 8.0) * 2.0;
  }
  
  // Add huge spike if caught in ripple
  sizeMultiplier += (vRipple * 4.0);
  
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_PointSize = aSize * sizeMultiplier * (100.0 / -mvPosition.z) * (1.0 + pulse * 0.5);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment Shader for Particles
const pointsFragmentShader = `
uniform vec3 uColor1; // Cyan
uniform vec3 uColor2; // Magenta

varying float vDistanceToMouse;
varying float vPulse;
varying float vRipple;

void main() {
  // Circular particle with soft edge
  float distToCenter = distance(gl_PointCoord, vec2(0.5));
  if (distToCenter > 0.5) discard;
  float alpha = 1.0 - (distToCenter * 2.0);
  
  // Color selection based on proximity and pulse/ripple
  vec3 finalColor = mix(uColor1, uColor2, max(vPulse, vRipple));
  
  // Glow intensity based on mouse
  float intensity = 0.6;
  if (vDistanceToMouse < 8.0) {
    intensity += (1.0 - vDistanceToMouse / 8.0) * 0.8;
  }
  
  // Add pulse and ripple glow
  intensity += vPulse * 0.8;
  intensity += vRipple * 2.0; // Huge bright flash for ripple
  
  gl_FragColor = vec4(finalColor * intensity, alpha * intensity);
}
`;

// Vertex Shader for Lines
const linesVertexShader = `
uniform float uTime;
uniform vec3 uMouse;
uniform float uPulseFreq;
uniform vec3 uRipplePos;
uniform float uRippleTime;

varying float vDistanceToMouse;
varying float vPulse;
varying float vRipple;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  
  vDistanceToMouse = distance(worldPosition.xyz, uMouse);
  
  float pulse = (sin(uTime * 3.14159 / uPulseFreq) + 1.0) * 0.5;
  vPulse = pow(pulse, 8.0);
  
  // Click Ripple calculation
  vRipple = 0.0;
  if (uRippleTime > 0.0) {
      float distToRipple = distance(worldPosition.xyz, uRipplePos);
      float rippleRadius = uRippleTime * 50.0;
      float rippleThickness = 5.0;
      
      float distToFront = abs(distToRipple - rippleRadius);
      if (distToFront < rippleThickness) {
          vRipple = 1.0 - (distToFront / rippleThickness);
          vRipple *= (1.0 - uRippleTime);
      }
  }

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Fragment Shader for Lines
const linesFragmentShader = `
uniform vec3 uColor1;

varying float vDistanceToMouse;
varying float vPulse;
varying float vRipple;

void main() {
  float alpha = 0.15; // Base line opacity
  
  // Brighten near mouse
  if (vDistanceToMouse < 8.0) {
    alpha += (1.0 - vDistanceToMouse / 8.0) * 0.4;
  }
  
  // Brighten on pulse and ripple
  alpha += vPulse * 0.4;
  
  vec3 color = uColor1;
  if (vRipple > 0.0) {
      alpha += vRipple * 0.8;
      // Shift color to magenta during ripple
      color = mix(uColor1, vec3(0.75, 0.15, 0.83), vRipple);
  }
  
  gl_FragColor = vec4(color, alpha);
}
`;

function NeuralScene() {
    const { size, viewport, camera, pointer, raycaster, scene } = useThree();

    const pointsMatRef = useRef<THREE.ShaderMaterial>(null);
    const linesMatRef = useRef<THREE.ShaderMaterial>(null);
    const groupRef = useRef<THREE.Group>(null);
    const planeRef = useRef<THREE.Mesh>(null);

    const rippleRef = useRef({ time: 0 });
    const ripplePosRef = useRef(new THREE.Vector3(0, 0, 0));

    // Configuration
    const PARTICLE_COUNT = 2000;
    const VOLUME_SIZE = 80;
    const CONNECTION_DIST = 4.5;

    // Generate Geometry
    const { positions, sizes, linePositions } = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const s = new Float32Array(PARTICLE_COUNT);

        // Generate random positions
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            pos[i * 3] = (Math.random() - 0.5) * VOLUME_SIZE;
            pos[i * 3 + 1] = (Math.random() - 0.5) * VOLUME_SIZE;
            pos[i * 3 + 2] = (Math.random() - 0.5) * VOLUME_SIZE;

            // Random sizes between 0.5 and 2.5
            s[i] = Math.random() * 2.0 + 0.5;
        }

        // Generate connections
        const linePos = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            for (let j = i + 1; j < PARTICLE_COUNT; j++) {
                const dx = pos[i * 3] - pos[j * 3];
                const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
                const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < CONNECTION_DIST * CONNECTION_DIST) {
                    linePos.push(
                        pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
                        pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
                    );
                }
            }
        }

        return {
            positions: pos,
            sizes: s,
            linePositions: new Float32Array(linePos)
        };
    }, []);

    // Update loop
    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // Gentle floating rotation
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.05;
            groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.05;
        }

        // Update shaders
        if (pointsMatRef.current && linesMatRef.current) {
            pointsMatRef.current.uniforms.uTime.value = t;
            linesMatRef.current.uniforms.uTime.value = t;

            pointsMatRef.current.uniforms.uRippleTime.value = rippleRef.current.time;
            linesMatRef.current.uniforms.uRippleTime.value = rippleRef.current.time;

            // Raycast to invisible plane to get 3D mouse coordinates
            if (planeRef.current) {
                raycaster.setFromCamera(pointer, camera);
                const intersects = raycaster.intersectObject(planeRef.current);
                if (intersects.length > 0) {
                    // Add offset to z to push mouse effect slightly forward
                    const mousePos = intersects[0].point.clone();
                    // Transform mouse position to local space of the rotating group
                    if (groupRef.current) {
                        groupRef.current.worldToLocal(mousePos);
                    }

                    // Lerp mouse uniform for smooth trailing effect
                    const currentMouse = pointsMatRef.current.uniforms.uMouse.value as THREE.Vector3;
                    currentMouse.lerp(mousePos, 0.1);

                    pointsMatRef.current.uniforms.uMouse.value.copy(currentMouse);
                    linesMatRef.current.uniforms.uMouse.value.copy(currentMouse);
                }
            }
        }
    });

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (groupRef.current) {
            // Get local position relative to the rotating group
            const clickPos = e.point.clone();
            groupRef.current.worldToLocal(clickPos);

            // Set uniform targets directly
            ripplePosRef.current.copy(clickPos);
            if (pointsMatRef.current && linesMatRef.current) {
                pointsMatRef.current.uniforms.uRipplePos.value.copy(clickPos);
                linesMatRef.current.uniforms.uRipplePos.value.copy(clickPos);
            }

            // Reset and trigger animation
            rippleRef.current.time = 0;
            gsap.killTweensOf(rippleRef.current);
            gsap.to(rippleRef.current, {
                time: 1.0,
                duration: 2.5,
                ease: 'power2.out'
            });
        }
    };

    // Setup GSAP ScrollTrigger
    useEffect(() => {
        if (!groupRef.current) return;

        // Start camera pushed back
        camera.position.z = 30;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
            }
        });

        // Fly through the network and rotate as we scroll
        tl.to(camera.position, {
            z: 5, // Move inward
            y: -5,
            ease: 'none'
        }, 0)
            .to(groupRef.current.rotation, {
                y: Math.PI * 0.5, // Rotate 90 degrees
                x: 0.2, // Slight tilt
                ease: 'none'
            }, 0);

        return () => {
            tl.kill();
        };
    }, [camera]);

    return (
        <>
            <group ref={groupRef}>
                {/* Particles */}
                <points>
                    <bufferGeometry>
                        <bufferAttribute
                            args={[new Float32Array(0), 3]}
                            attach="attributes-position"
                            count={PARTICLE_COUNT}
                            array={positions}
                            itemSize={3}
                        />
                        <bufferAttribute
                            args={[new Float32Array(0), 1]}
                            attach="attributes-aSize"
                            count={PARTICLE_COUNT}
                            array={sizes}
                            itemSize={1}
                        />
                    </bufferGeometry>
                    <shaderMaterial
                        ref={pointsMatRef}
                        vertexShader={pointsVertexShader}
                        fragmentShader={pointsFragmentShader}
                        transparent
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        uniforms={{
                            uTime: { value: 0 },
                            uMouse: { value: new THREE.Vector3(0, 0, 0) },
                            uRipplePos: { value: new THREE.Vector3(0, 0, 0) },
                            uRippleTime: { value: 0 },
                            uColor1: { value: new THREE.Color('#22d3ee') }, // Electric Cyan
                            uColor2: { value: new THREE.Color('#c084fc') }, // Magenta
                            uPulseFreq: { value: 1.2 } // Heartbeat every 1.2s
                        }}
                    />
                </points>

                {/* Connecting Lines */}
                <lineSegments>
                    <bufferGeometry>
                        <bufferAttribute
                            args={[new Float32Array(0), 3]}
                            attach="attributes-position"
                            count={linePositions.length / 3}
                            array={linePositions}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <shaderMaterial
                        ref={linesMatRef}
                        vertexShader={linesVertexShader}
                        fragmentShader={linesFragmentShader}
                        transparent
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        uniforms={{
                            uTime: { value: 0 },
                            uMouse: { value: new THREE.Vector3(0, 0, 0) },
                            uRipplePos: { value: new THREE.Vector3(0, 0, 0) },
                            uRippleTime: { value: 0 },
                            uColor1: { value: new THREE.Color('#3b82f6') }, // Deep blue base
                            uPulseFreq: { value: 1.2 }
                        }}
                    />
                </lineSegments>
            </group>

            {/* Invisible plane for raycasting mouse coordinates and handling clicks */}
            <mesh ref={planeRef} visible={false} onPointerDown={handlePointerDown}>
                <planeGeometry args={[200, 200]} />
            </mesh>
        </>
    );
}

export default function NeuralWeb3D() {
    return (
        <div style={{
            position: 'absolute', inset: 0, width: '100vw', height: '100vh',
            zIndex: 0, pointerEvents: 'auto',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 60px, black 120px)'
        }}>
            <Canvas
                camera={{ position: [0, 0, 30], fov: 60 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                dpr={[1, 2]} // Optimize pixel ratio
            >
                <NeuralScene />
            </Canvas>
        </div>
    );
}
