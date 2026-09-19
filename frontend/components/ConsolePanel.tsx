"use client";

import { useEffect, useRef } from "react";
import type { ConsoleLine } from "@/lib/types";
import styles from "./ConsolePanel.module.css";

interface ConsolePanelProps {
  lines: ConsoleLine[];
  live: boolean;
}

const TONE_CLASS: Record<ConsoleLine["tone"], string> = {
  info: "",
  ok: styles.ok,
  warn: styles.warn,
  error: styles.error,
};

/** The system console. Narrates what the scanner is doing, at length. */
export default function ConsolePanel({ lines, live }: ConsolePanelProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow new output, unless the user has scrolled up to read something.
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen || !pinnedToBottom.current) return;
    screen.scrollTop = screen.scrollHeight;
  }, [lines]);

  const onScroll = () => {
    const screen = screenRef.current;
    if (!screen) return;
    const distance = screen.scrollHeight - screen.scrollTop - screen.clientHeight;
    pinnedToBottom.current = distance < 24;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.legend}>
        <span>SYSTEM CONSOLE</span>
        <span
          className={`${styles.led} ${live ? "" : styles.ledIdle}`}
          aria-hidden="true"
        />
      </div>
      <div
        className={styles.screen}
        ref={screenRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="System console output"
      >
        {lines.map((line) => (
          <div key={line.id} className={`${styles.line} ${TONE_CLASS[line.tone]}`}>
            <span className={styles.caret} aria-hidden="true">
              &gt;
            </span>
            <span>{line.text}</span>
          </div>
        ))}
        <div className={`${styles.line} ${styles.cursorLine}`} aria-hidden="true">
          <span className={styles.caret}>&gt;</span>
          <span className={styles.cursor} />
        </div>
      </div>
    </div>
  );
}
