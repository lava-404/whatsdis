"use client";

import styles from "./StatusStrip.module.css";

export type LinkState = "online" | "busy" | "offline";

interface StatusStripProps {
  status: string;
  link: LinkState;
  fps: number;
  latencyMs: number | null;
  inferenceMs: number | null;
  modelName: string;
  objectCount: number;
}

const LINK_LABEL: Record<LinkState, string> = {
  online: "NEURAL LINK OK",
  busy: "CONNECTING",
  offline: "NO LINK",
};

/** The status bar at the foot of the window. Sunken fields, terse readouts. */
export default function StatusStrip({
  status,
  link,
  fps,
  latencyMs,
  inferenceMs,
  modelName,
  objectCount,
}: StatusStripProps) {
  return (
    <div className={styles.strip} role="status" aria-live="polite">
      <div className={`${styles.field} ${styles.grow}`}>
        <span className={`${styles.dot} ${styles[link]}`} aria-hidden="true" />
        <span className={styles.value}>{status}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.key}>OBJ</span>
        <span className={styles.value}>
          {String(objectCount).padStart(2, "0")}
        </span>
      </div>

      <div className={styles.field}>
        <span className={styles.key}>FPS</span>
        <span className={styles.value}>{fps.toFixed(1)}</span>
      </div>

      <div className={`${styles.field} ${styles.hideNarrow}`}>
        <span className={styles.key}>TRIP</span>
        <span className={styles.value}>
          {latencyMs === null ? "--" : `${latencyMs}ms`}
        </span>
      </div>

      <div className={`${styles.field} ${styles.hideNarrow}`}>
        <span className={styles.key}>INFER</span>
        <span className={styles.value}>
          {inferenceMs === null ? "--" : `${inferenceMs}ms`}
        </span>
      </div>

      <div className={`${styles.field} ${styles.hideNarrow}`}>
        <span className={styles.key}>NET</span>
        <span className={styles.value}>{modelName}</span>
      </div>

      <span className="srOnly">{LINK_LABEL[link]}</span>
    </div>
  );
}
