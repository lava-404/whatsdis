"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/copy";
import styles from "./Taskbar.module.css";

interface TaskbarProps {
  windowTitle: string;
  windowFocused: boolean;
  onTaskClick: () => void;
  onStartClick: () => void;
  scanning: boolean;
}

/** Desktop taskbar: Start, the running task, and a tray that keeps the time. */
export default function Taskbar({
  windowTitle,
  windowFocused,
  onTaskClick,
  onStartClick,
  scanning,
}: TaskbarProps) {
  const [clock, setClock] = useState<string>("");

  // Rendered client-side only; a server-rendered clock would hydrate wrong.
  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={styles.taskbar}>
      <button type="button" className={styles.start} onClick={onStartClick}>
        <span className={styles.startGlyph} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span>start</span>
      </button>

      <div className={styles.tasks}>
        <button
          type="button"
          className={`${styles.task} ${windowFocused ? styles.taskActive : ""}`}
          onClick={onTaskClick}
        >
          {windowTitle}
        </button>
      </div>

      <div className={styles.tray}>
        <span
          className={`${styles.trayIcon} ${styles.hideNarrow}`}
          title={scanning ? "Scanner running" : "Scanner idle"}
          aria-hidden="true"
        >
          {scanning ? "\u25C9" : "\u25CB"}
        </span>
        <span className={`${styles.trayIcon} ${styles.hideNarrow}`} aria-hidden="true">
          {"\u2632"}
        </span>
        <span className={styles.clock}>{clock || "\u00A0"}</span>
      </div>
    </div>
  );
}
