import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';

const CREATE_TASK_COLLAPSED_WIDTH = 44;
const CREATE_TASK_EXPANDED_WIDTH = 142;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type SpacesCreateTaskButtonProps = {
  onClick: () => void;
};

const SpacesCreateTaskButton: React.FC<SpacesCreateTaskButtonProps> = ({ onClick }) => {
  const prefersReducedMotion = useReducedMotion();
  const shellControls = useAnimationControls();
  const buttonControls = useAnimationControls();
  const labelControls = useAnimationControls();
  const iconControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const idleControls = useAnimationControls();
  const sheenControls = useAnimationControls();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [sheenKey, setSheenKey] = useState(0);
  const [hoverOffset, setHoverOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    const runIntro = async () => {
      if (prefersReducedMotion) {
        setIsExpanded(true);
        await buttonControls.set({ width: CREATE_TASK_EXPANDED_WIDTH });
        await labelControls.set({ opacity: 1, x: 0 });
        await iconControls.set({ rotate: 0, x: 0 });
        await glowControls.set({ opacity: 0.42, scale: 1 });
        return;
      }

      setIsExpanded(false);
      await buttonControls.set({ width: CREATE_TASK_COLLAPSED_WIDTH });
      await labelControls.set({ opacity: 0, x: 8 });
      await iconControls.set({ rotate: 0, x: 0 });
      await glowControls.set({ opacity: 0.32, scale: 1 });

      await wait(1650);
      if (cancelled) return;

      idleControls.stop();

      await shellControls.start({
        x: [0, 6, -10, 4, 0],
        scaleX: [1, 0.9, 1.15, 0.97, 1],
        scaleY: [1, 1.08, 0.92, 1.02, 1],
        transition: {
          duration: 0.72,
          times: [0, 0.18, 0.45, 0.76, 1],
          ease: 'easeInOut',
        },
      });
      if (cancelled) return;

      setBurstKey((value) => value + 1);
      setIsExpanded(true);

      await Promise.all([
        buttonControls.start({
          width: CREATE_TASK_EXPANDED_WIDTH,
          transition: { type: 'spring', stiffness: 280, damping: 20, mass: 0.85 },
        }),
        iconControls.start({
          rotate: [0, -14, 18, 0],
          x: [0, -1, 1, 0],
          transition: { duration: 0.68, times: [0, 0.35, 0.72, 1], ease: 'easeInOut' },
        }),
        glowControls.start({
          opacity: [0.32, 0.82, 0.42],
          scale: [0.96, 1.08, 1],
          transition: { duration: 0.7, times: [0, 0.55, 1], ease: 'easeOut' },
        }),
      ]);
      if (cancelled) return;

      await labelControls.start({
        opacity: 1,
        x: 0,
        transition: { delay: 0.05, duration: 0.26, ease: 'easeOut' },
      });
    };

    runIntro();

    return () => {
      cancelled = true;
    };
  }, [buttonControls, glowControls, iconControls, idleControls, labelControls, prefersReducedMotion, shellControls]);

  useEffect(() => {
    if (prefersReducedMotion || isExpanded) {
      idleControls.stop();
      return;
    }

    idleControls.start({
      y: [0, -1.5, 0],
      scale: [1, 1.015, 1],
      transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
    });

    glowControls.start({
      opacity: [0.26, 0.42, 0.26],
      scale: [0.98, 1.05, 0.98],
      transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [glowControls, idleControls, isExpanded, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!isHovered) {
      setHoverOffset({ x: 0, y: 0 });
      glowControls.start({
        opacity: isExpanded ? 0.42 : 0.32,
        scale: 1,
        transition: { duration: 0.2, ease: 'easeOut' },
      });
      sheenControls.set({ x: '-120%', opacity: 0 });
      iconControls.start({
        rotate: 0,
        x: 0,
        transition: { duration: 0.22, ease: 'easeOut' },
      });
      labelControls.start({
        x: 0,
        transition: { duration: 0.2, ease: 'easeOut' },
      });
      return;
    }

    glowControls.start({
      opacity: [0.48, 0.62, 0.48],
      scale: [1, 1.04, 1],
      transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
    });
    sheenControls.start({
      x: ['-120%', '140%'],
      opacity: [0, 0.4, 0],
      transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.2, ease: 'easeOut' },
    });
    iconControls.start({
      rotate: [0, -10, 0],
      x: [0, -1, 0],
      transition: { duration: 0.55, times: [0, 0.45, 1], repeat: Infinity, repeatDelay: 0.25, ease: 'easeInOut' },
    });
    labelControls.start({
      x: [0, 1.5, 0],
      transition: { duration: 0.55, times: [0, 0.45, 1], repeat: Infinity, repeatDelay: 0.25, ease: 'easeInOut' },
    });
  }, [glowControls, iconControls, isExpanded, isHovered, labelControls, prefersReducedMotion, sheenControls]);

  const handleMouseMove = () => {
    if (prefersReducedMotion) return;
    setHoverOffset({ x: 0, y: 0 });
  };

  const handlePressStart = async () => {
    setIsPressed(true);
    if (prefersReducedMotion) return;

    setSheenKey((value) => value + 1);
    await Promise.all([
      shellControls.start({
        scaleX: 0.965,
        scaleY: 0.94,
        transition: { type: 'spring', stiffness: 520, damping: 24, mass: 0.55 },
      }),
      iconControls.start({
        rotate: isExpanded ? 18 : 30,
        transition: { type: 'spring', stiffness: 520, damping: 20 },
      }),
      labelControls.start({
        x: isExpanded ? 1.5 : 0,
        transition: { type: 'spring', stiffness: 420, damping: 26 },
      }),
      sheenControls.start({
        x: ['-120%', '140%'],
        opacity: [0, 0.45, 0],
        transition: { duration: 0.64, ease: 'easeOut' },
      }),
    ]);
  };

  const handlePressEnd = async () => {
    setIsPressed(false);
    if (prefersReducedMotion) return;

    await Promise.all([
      shellControls.start({
        scaleX: 1,
        scaleY: 1,
        transition: { type: 'spring', stiffness: 420, damping: 22, mass: 0.7 },
      }),
      iconControls.start({
        rotate: 0,
        transition: { type: 'spring', stiffness: 360, damping: 18 },
      }),
      labelControls.start({
        x: 0,
        transition: { type: 'spring', stiffness: 360, damping: 24 },
      }),
    ]);
  };

  return (
    <div
      className="relative flex h-11 items-center justify-end"
      style={{ perspective: 900, width: CREATE_TASK_EXPANDED_WIDTH }}
    >
      <AnimatePresence>
        {burstKey > 0 ? (
          <motion.div
            key={burstKey}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {[
              { left: '26%', top: '50%', dx: -16, dy: -14 },
              { left: '40%', top: '18%', dx: 4, dy: -12 },
              { left: '56%', top: '72%', dx: 12, dy: 10 },
              { left: '70%', top: '36%', dx: 18, dy: -2 },
            ].map((particle, index) => (
              <motion.span
                key={`${burstKey}-${index}`}
                className="absolute h-1.5 w-1.5 rounded-full bg-white/70"
                style={{ left: particle.left, top: particle.top }}
                initial={{ x: 0, y: 0, scale: 0.8, opacity: 0 }}
                animate={{
                  x: particle.dx,
                  y: particle.dy,
                  scale: [0.8, 1, 0.5],
                  opacity: [0, 0.7, 0],
                }}
                transition={{
                  duration: 0.52,
                  delay: index * 0.03,
                  times: [0, 0.35, 1],
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div animate={idleControls} className="relative">
        <motion.button
          type="button"
          aria-label="Create Task"
          onClick={onClick}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          onMouseMove={handleMouseMove}
          onTapStart={handlePressStart}
          onTapCancel={handlePressEnd}
          onTap={handlePressEnd}
          animate={buttonControls}
          initial={false}
          className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-full border border-transparent px-2.5 py-1.5 text-[13px] font-semibold"
          style={{
            width: prefersReducedMotion ? CREATE_TASK_EXPANDED_WIDTH : CREATE_TASK_COLLAPSED_WIDTH,
            x: hoverOffset.x,
            y: hoverOffset.y,
            backgroundColor: isHovered ? '#ffffff' : '#dc2626',
            color: isHovered ? '#dc2626' : '#ffffff',
            borderColor: isHovered ? 'rgba(220, 38, 38, 0.18)' : 'transparent',
            boxShadow: isPressed ? '0 8px 18px rgba(220, 38, 38, 0.2)' : 'none',
            transition: 'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
          }}
          whileHover={
            prefersReducedMotion
              ? undefined
              : {
                  scale: 1,
                  transition: { type: 'spring', stiffness: 320, damping: 20 },
                }
          }
        >
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_54%)]"
            animate={glowControls}
            initial={false}
          />
          <motion.span
            key={sheenKey}
            className="pointer-events-none absolute inset-y-0 left-0 w-16 -translate-x-[120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34),transparent)]"
            animate={sheenControls}
            initial={{ x: '-120%', opacity: 0 }}
          />
          <motion.span className="relative z-10 inline-flex items-center" animate={shellControls} initial={false}>
            <motion.span className="inline-flex items-center justify-center" animate={iconControls} initial={false}>
              <Plus size={16} strokeWidth={2.4} />
            </motion.span>
            <AnimatePresence initial={false}>
              {isExpanded || prefersReducedMotion ? (
                <motion.span
                  key="create-task-label"
                  className="overflow-hidden whitespace-nowrap pl-1.5"
                  initial={{ width: 0, opacity: 0, x: 8 }}
                  animate={{
                    width: 'auto',
                    opacity: 1,
                    x: 0,
                    letterSpacing: isHovered ? '0.02em' : '0em',
                  }}
                  exit={{ width: 0, opacity: 0, x: 8 }}
                  transition={{
                    width: { type: 'spring', stiffness: 280, damping: 24 },
                    opacity: { duration: 0.2 },
                    x: { type: 'spring', stiffness: 320, damping: 24 },
                    letterSpacing: { duration: 0.2 },
                  }}
                >
                  <motion.span className="inline-block" animate={labelControls} initial={false}>
                    Create Task
                  </motion.span>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default SpacesCreateTaskButton;
