"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  phase: number;
  alpha: number;
};

const POINTER_RADIUS = 150;
const CONNECTION_DISTANCE = 110;
const MAX_PARTICLE_SPEED = 0.55;

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    velocityX: (Math.random() - 0.5) * 0.22,
    velocityY: (Math.random() - 0.5) * 0.22,
    radius: 0.7 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2,
    alpha: 1,
  };
}

export function AuthParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const context = canvas?.getContext("2d");

    if (!canvas || !container || !context) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const pointer = { x: 0, y: 0, active: false };
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let animationFrame: number | undefined;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextCanvasWidth = Math.round(bounds.width * pixelRatio);
      const nextCanvasHeight = Math.round(bounds.height * pixelRatio);

      // Notificação sem mudança real (ex.: o disparo inicial do observe())
      // não toca em nada — resetar o backing store apagaria o frame atual.
      if (
        particles.length > 0 &&
        canvas.width === nextCanvasWidth &&
        canvas.height === nextCanvasHeight
      ) {
        return;
      }

      const previousWidth = width;
      const previousHeight = height;
      width = bounds.width;
      height = bounds.height;
      canvas.width = nextCanvasWidth;
      canvas.height = nextCanvasHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const particleCount = Math.min(
        58,
        Math.max(28, Math.round((width * height) / 18_000)),
      );

      if (particles.length === 0) {
        // Primeira medição: semeia o campo inteiro.
        particles.push(
          ...Array.from({ length: particleCount }, () =>
            createParticle(width, height),
          ),
        );
        return;
      }

      // Redimensionar NUNCA reseta o campo — o container muda de tamanho por
      // motivos triviais (scroll-lock de dialogs tira a scrollbar, URL bar do
      // mobile muda a altura). Reprojeta as posições para as novas dimensões
      // e ajusta a contagem incrementalmente.
      if (previousWidth > 0 && previousWidth !== width) {
        const scaleX = width / previousWidth;
        for (const particle of particles) {
          particle.x *= scaleX;
        }
      }
      if (previousHeight > 0 && previousHeight !== height) {
        const scaleY = height / previousHeight;
        for (const particle of particles) {
          particle.y *= scaleY;
        }
      }
      if (particles.length > particleCount) {
        particles.length = particleCount;
      } else {
        while (particles.length < particleCount) {
          // Alpha 0: entra em fade-in, sem "onda" de novatas. Sob reduced
          // motion não há loop para animar o fade, então nasce visível.
          const particle = createParticle(width, height);
          particle.alpha = reducedMotion ? 1 : 0;
          particles.push(particle);
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        if (!reducedMotion) {
          if (particle.alpha < 1) {
            particle.alpha = Math.min(1, particle.alpha + 0.012);
          }

          if (pointer.active) {
            const deltaX = pointer.x - particle.x;
            const deltaY = pointer.y - particle.y;
            const distance = Math.hypot(deltaX, deltaY);

            if (distance > 0 && distance < POINTER_RADIUS) {
              const force = (1 - distance / POINTER_RADIUS) * 0.012;
              particle.velocityX -= (deltaX / distance) * force;
              particle.velocityY -= (deltaY / distance) * force;
            }
          }

          const speed = Math.hypot(
            particle.velocityX,
            particle.velocityY,
          );
          if (speed > MAX_PARTICLE_SPEED) {
            particle.velocityX =
              (particle.velocityX / speed) * MAX_PARTICLE_SPEED;
            particle.velocityY =
              (particle.velocityY / speed) * MAX_PARTICLE_SPEED;
          }

          particle.x += particle.velocityX;
          particle.y += particle.velocityY;

          if (particle.x < -4) particle.x = width + 4;
          if (particle.x > width + 4) particle.x = -4;
          if (particle.y < -4) particle.y = height + 4;
          if (particle.y > height + 4) particle.y = -4;
        }

        const shimmer =
          (0.3 + Math.sin(time * 0.0008 + particle.phase) * 0.12) *
          particle.alpha;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${shimmer})`;
        context.fill();

        for (
          let nextIndex = index + 1;
          nextIndex < particles.length;
          nextIndex += 1
        ) {
          const nextParticle = particles[nextIndex];
          if (!nextParticle) continue;

          const distance = Math.hypot(
            particle.x - nextParticle.x,
            particle.y - nextParticle.y,
          );

          if (distance < CONNECTION_DISTANCE) {
            const opacity =
              (1 - distance / CONNECTION_DISTANCE) *
              0.07 *
              Math.min(particle.alpha, nextParticle.alpha);
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(nextParticle.x, nextParticle.y);
            context.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            context.lineWidth = 0.7;
            context.stroke();
          }
        }
      });

      if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw(performance.now());

    const resizeObserver = new ResizeObserver(() => {
      resize();
      // Sob reduced motion não há rAF: um resize real limpa o backing store,
      // então o frame estático precisa ser repintado aqui.
      if (reducedMotion) draw(performance.now());
    });
    resizeObserver.observe(container);

    if (!reducedMotion) {
      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);
    }

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
