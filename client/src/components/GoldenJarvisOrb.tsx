import React, { useEffect, useRef } from "react";

interface GoldenJarvisOrbProps {
  active?: boolean;
  speaking?: boolean;
  level?: number;
  bass?: number;
  treble?: number;
  className?: string;
  onClick?: () => void;
}

interface Particle {
  theta: number; // orbital angle around Y
  phi: number;   // inclination angle
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
}

export const GoldenJarvisOrb: React.FC<GoldenJarvisOrbProps> = ({
  active = true,
  speaking = false,
  level = 0,
  bass = 0,
  treble = 0,
  className = "",
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateRef = useRef({
    rotationX: 0.35,
    rotationY: 0,
    rotationZ: 0.15,
    pulsePhase: 0,
    beamAngle: 0,
  });

  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Initialize 240 3D golden stardust particles
    const count = 240;
    const particles: Particle[] = [];
    const colors = [
      "rgba(255, 235, 170, ",
      "rgba(255, 195, 60, ",
      "rgba(255, 160, 20, ",
      "rgba(255, 250, 220, ",
    ];

    for (let i = 0; i < count; i++) {
      particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: (Math.random() - 0.5) * Math.PI * 0.9,
        radius: 80 + Math.random() * 110,
        speed: (0.004 + Math.random() * 0.012) * (Math.random() > 0.4 ? 1 : -1),
        size: 1 + Math.random() * 2.4,
        alpha: 0.35 + Math.random() * 0.65,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 500);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 500);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 500;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 500;
    };
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseScale = (Math.min(width, height) / 500) * (0.95 + level * 0.2 + bass * 0.15);

      const state = stateRef.current;
      const speedMultiplier = 1 + level * 2.2 + (speaking ? 1.5 : 0);
      state.rotationY += 0.008 * speedMultiplier;
      state.pulsePhase += 0.04 * speedMultiplier;
      state.beamAngle += 0.003 * speedMultiplier;

      // 1. Draw outer ambient golden flare glow
      const glowRadius = (160 + level * 90 + bass * 60) * baseScale;
      const ambientGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      ambientGlow.addColorStop(0, `rgba(255, 200, 60, ${0.45 + level * 0.35})`);
      ambientGlow.addColorStop(0.25, `rgba(255, 140, 20, ${0.25 + level * 0.25})`);
      ambientGlow.addColorStop(0.6, `rgba(200, 80, 0, ${0.08 + level * 0.12})`);
      ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Piercing Radial Light Beams (movie-accurate starburst spikes from Video-94796)
      const rayCount = 8;
      const mainRayLength = (210 + level * 120 + Math.sin(state.pulsePhase * 2) * 15) * baseScale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(state.beamAngle);

      for (let i = 0; i < rayCount; i++) {
        const angle = (i * Math.PI * 2) / rayCount;
        const rayLen = i % 2 === 0 ? mainRayLength : mainRayLength * 0.65;
        const rayWidth = (i % 2 === 0 ? 12 : 7) * (1 + level * 0.8) * baseScale;

        ctx.save();
        ctx.rotate(angle);

        // Linear gradient for each beam
        const beamGrad = ctx.createLinearGradient(0, 0, rayLen, 0);
        beamGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        beamGrad.addColorStop(0.15, `rgba(255, 220, 110, ${0.85 + level * 0.15})`);
        beamGrad.addColorStop(0.5, `rgba(255, 150, 30, ${0.45 + level * 0.3})`);
        beamGrad.addColorStop(1, "rgba(255, 100, 0, 0)");

        ctx.beginPath();
        ctx.moveTo(0, -rayWidth * 0.2);
        ctx.lineTo(rayLen * 0.2, -rayWidth * 0.5);
        ctx.lineTo(rayLen, 0);
        ctx.lineTo(rayLen * 0.2, rayWidth * 0.5);
        ctx.lineTo(0, rayWidth * 0.2);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.shadowColor = "rgba(255, 180, 40, 0.9)";
        ctx.shadowBlur = (15 + level * 20) * baseScale;
        ctx.fill();

        ctx.restore();
      }
      ctx.restore();

      // 3. Draw 3D Gyroscopic Holographic Rings
      const rings = [
        { radius: 155, tiltX: 1.15, tiltY: 0.3, speed: 0.012, dash: [18, 12, 4, 12], width: 2.2, color: "rgba(255, 205, 85, " },
        { radius: 135, tiltX: 0.95, tiltY: -0.45, speed: -0.015, dash: [40, 15, 8, 15], width: 1.8, color: "rgba(255, 180, 45, " },
        { radius: 175, tiltX: 1.25, tiltY: 0.1, speed: 0.008, dash: [6, 18], width: 1.5, color: "rgba(255, 230, 130, " },
        { radius: 110, tiltX: 0.75, tiltY: 0.6, speed: -0.018, dash: [30, 8], width: 2.0, color: "rgba(255, 215, 95, " },
        { radius: 195, tiltX: 1.35, tiltY: -0.2, speed: 0.006, dash: [60, 20, 10, 20], width: 1.6, color: "rgba(255, 160, 30, " },
      ];

      rings.forEach((ring, idx) => {
        const ringAngle = state.rotationY * ring.speed * 80 + idx * 1.2;
        const currentRadius = ring.radius * baseScale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ringAngle * 0.3);
        ctx.scale(1, Math.cos(ring.tiltX));

        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.setLineDash(ring.dash.map((d) => d * baseScale));
        ctx.strokeStyle = `${ring.color}${0.45 + level * 0.45})`;
        ctx.lineWidth = ring.width * baseScale;
        ctx.shadowColor = "rgba(255, 185, 50, 0.8)";
        ctx.shadowBlur = (10 + level * 15) * baseScale;
        ctx.stroke();

        // Draw HUD tick brackets / nodes along the ring
        const nodeCount = 3 + idx;
        for (let n = 0; n < nodeCount; n++) {
          const nodeTheta = ringAngle + (n * Math.PI * 2) / nodeCount;
          const nx = Math.cos(nodeTheta) * currentRadius;
          const ny = Math.sin(nodeTheta) * currentRadius;

          ctx.beginPath();
          ctx.arc(nx, ny, (2.2 + (n === 0 ? 1.5 : 0)) * baseScale, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 245, 200, 0.95)";
          ctx.shadowColor = "rgba(255, 220, 100, 1)";
          ctx.shadowBlur = 12 * baseScale;
          ctx.fill();
        }

        ctx.restore();
      });

      // 4. Render Orbiting 3D Golden Stardust Cloud
      const particles = particlesRef.current;
      const sortedParticles = [...particles].map((p) => {
        p.theta += p.speed * speedMultiplier;
        const r = p.radius * baseScale;
        // 3D Spherical Coordinates to 3D Cartesian
        const x3d = r * Math.cos(p.phi) * Math.cos(p.theta);
        const y3d = r * Math.sin(p.phi);
        const z3d = r * Math.cos(p.phi) * Math.sin(p.theta);

        // Apply gyroscopic rotation around X and Z
        const cosX = Math.cos(state.rotationX);
        const sinX = Math.sin(state.rotationX);
        const yRot = y3d * cosX - z3d * sinX;
        const zRot = y3d * sinX + z3d * cosX;

        // Perspective 3D projection
        const fov = 350;
        const scale = fov / (fov + zRot);
        const projX = cx + x3d * scale;
        const projY = cy + yRot * scale;

        return {
          ...p,
          projX,
          projY,
          projZ: zRot,
          projScale: scale,
        };
      });

      // Sort by Z for proper depth
      sortedParticles.sort((a, b) => a.projZ - b.projZ);

      sortedParticles.forEach((p) => {
        const size = p.size * p.projScale * (1 + level * 0.5) * baseScale;
        const depthAlpha = Math.max(0.15, Math.min(1, (p.projZ + 200) / 350)) * p.alpha;

        ctx.beginPath();
        ctx.arc(p.projX, p.projY, Math.max(0.8, size), 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${depthAlpha * (0.6 + level * 0.4)})`;
        ctx.shadowColor = "rgba(255, 200, 70, 0.85)";
        ctx.shadowBlur = 6 * baseScale;
        ctx.fill();
      });

      // 5. Draw Movie-Accurate Central Golden Star Core
      const corePulse = Math.sin(state.pulsePhase * 3) * 6 * baseScale;
      const coreRadius = (46 + level * 28 + bass * 18) * baseScale + corePulse;

      // Concentric intense core layers
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      coreGrad.addColorStop(0.18, "rgba(255, 250, 210, 0.98)");
      coreGrad.addColorStop(0.42, `rgba(255, 205, 60, ${0.9 + level * 0.1})`);
      coreGrad.addColorStop(0.72, `rgba(255, 140, 15, ${0.75 + level * 0.2})`);
      coreGrad.addColorStop(1, "rgba(255, 80, 0, 0)");

      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = "rgba(255, 210, 80, 1)";
      ctx.shadowBlur = (35 + level * 40 + bass * 25) * baseScale;
      ctx.fill();

      // Inner white fusion center
      const innerWhiteRadius = (16 + level * 10) * baseScale;
      ctx.beginPath();
      ctx.arc(cx, cy, innerWhiteRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
      ctx.shadowColor = "rgba(255, 255, 255, 1)";
      ctx.shadowBlur = 20 * baseScale;
      ctx.fill();

      // Micro crosshair HUD reticle in the core
      ctx.save();
      ctx.strokeStyle = `rgba(255, 240, 180, ${0.55 + level * 0.35})`;
      ctx.lineWidth = 1.2 * baseScale;
      ctx.setLineDash([4 * baseScale, 4 * baseScale]);

      ctx.beginPath();
      ctx.arc(cx, cy, 32 * baseScale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 40 * baseScale, cy);
      ctx.lineTo(cx - 24 * baseScale, cy);
      ctx.moveTo(cx + 24 * baseScale, cy);
      ctx.lineTo(cx + 40 * baseScale, cy);
      ctx.moveTo(cx, cy - 40 * baseScale);
      ctx.lineTo(cx, cy - 24 * baseScale);
      ctx.moveTo(cx, cy + 24 * baseScale);
      ctx.lineTo(cx, cy + 40 * baseScale);
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, speaking, level, bass, treble]);

  return (
    <div
      className={`relative flex items-center justify-center cursor-pointer select-none transition-transform duration-300 ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="JARVIS Holographic Reactor Orb"
      style={{
        width: "min(92vw, 460px)",
        height: "min(92vw, 460px)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
