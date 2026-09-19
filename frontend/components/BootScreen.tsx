"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOOT_LINES, SPLASH_STEPS, WORDMARK } from "@/lib/copy";
import Button from "./Button";
import styles from "./BootScreen.module.css";

const LINE_DELAY_MS = 190;
const SPLASH_STEP_MS = 520;

interface BootScreenProps {
  onFinish: () => void;
}

/**
 * Two-part cold boot: a BIOS POST, then a shareware splash with a progress bar
 * that is, in the finest tradition, entirely fictional.
 *
 * It is skippable at any point, skipped outright for reduced-motion users, and
 * only shown once per browser session.
 */
export default function BootScreen({ onFinish }: BootScreenProps) {
  const [phase, setPhase] = useState<"post" | "splash">("post");
  const [visibleLines, setVisibleLines] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }, [onFinish]);

  // POST: reveal one line at a time.
  useEffect(() => {
    if (phase !== "post") return;

    if (visibleLines >= BOOT_LINES.length) {
      const timer = window.setTimeout(() => setPhase("splash"), 420);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => setVisibleLines((count) => count + 1),
      visibleLines === 0 ? 260 : LINE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, visibleLines]);

  // Splash: march through the fake initialisation steps, then hand over.
  useEffect(() => {
    if (phase !== "splash") return;

    if (stepIndex >= SPLASH_STEPS.length) {
      const timer = window.setTimeout(finish, 420);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => setStepIndex((index) => index + 1),
      SPLASH_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, stepIndex, finish]);

  // Any key press skips, the way you always could.
  useEffect(() => {
    const onKeyDown = () => finish();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish]);

  const progress = Math.min(
    100,
    Math.round((stepIndex / SPLASH_STEPS.length) * 100),
  );
  const currentStep =
    SPLASH_STEPS[Math.min(stepIndex, SPLASH_STEPS.length - 1)] ?? "";

  return (
    <div className={styles.screen} role="status" aria-live="polite">
      {phase === "post" ? (
        <div className={styles.post}>
          {BOOT_LINES.slice(0, visibleLines).map((line, index) => (
            <div key={line} className={styles.postLine}>
              {line}
              {index === visibleLines - 1 ? (
                <span className={styles.cursor} aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.splashWrap}>
          <div className={styles.splash}>
            <div className={styles.splashArt}>
              <p className={styles.wordmark}>{WORDMARK}</p>
              <p className={styles.version}>
                Object Scanner 2003 &nbsp;&middot;&nbsp; Professional Edition
              </p>
            </div>
            <div className={styles.splashBody}>
              <p className={styles.step}>
                {stepIndex >= SPLASH_STEPS.length
                  ? "Ready."
                  : `${currentStep}\u2026`}
              </p>
              <div
                className={styles.track}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Startup progress"
              >
                <div className={styles.fill} style={{ width: `${progress}%` }} />
              </div>
              <p className={styles.copyright}>
                &copy; 2003 Ocular Dynamics Ltd. All rights reserved, probably.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.skip}>
        <Button onClick={finish}>Skip startup</Button>
      </div>
    </div>
  );
}
