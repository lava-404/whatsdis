"use client";

import { EMPTY_SCAN, formatConfidence, verdictFor } from "@/lib/copy";
import { colorForLabel } from "@/lib/geometry";
import type { TrackedDetection } from "@/hooks/useDetectionBuffer";
import styles from "./DetectionPanel.module.css";

interface DetectionPanelProps {
  detections: TrackedDetection[];
  scanning: boolean;
}

const METER_CELLS = 10;

/** Live inventory of everything currently on screen, plus a rude verdict. */
export default function DetectionPanel({
  detections,
  scanning,
}: DetectionPanelProps) {
  const top = detections[0];

  return (
    <div className={styles.panel}>
      <div className={styles.legend}>
        <span>OBJECTS IDENTIFIED</span>
        <span className={styles.count}>
          {String(detections.length).padStart(2, "0")}
        </span>
      </div>

      <ul className={styles.list}>
        {detections.length === 0 ? (
          <li className={styles.empty}>
            {scanning ? EMPTY_SCAN : "Scanner stopped. Nothing to report."}
          </li>
        ) : (
          detections.map((detection, index) => {
            const color = colorForLabel(detection.label);
            const lit = Math.round(detection.confidence * METER_CELLS);

            return (
              <li
                key={detection.key}
                className={styles.row}
                style={{ ["--swatch" as string]: color }}
              >
                <span className={styles.swatch} aria-hidden="true" />
                <span className={styles.label}>{detection.label}</span>
                <span className={styles.score}>
                  <span className={styles.meter} aria-hidden="true">
                    {Array.from({ length: METER_CELLS }, (_, cell) => (
                      <span
                        key={cell}
                        className={`${styles.cell} ${cell < lit ? styles.cellOn : ""}`}
                      />
                    ))}
                  </span>
                  <span className={styles.percent}>
                    {formatConfidence(detection.confidence)}
                  </span>
                  <span className="srOnly">
                    {`${detection.label}, ${formatConfidence(detection.confidence)} confidence, result ${index + 1}`}
                  </span>
                </span>
              </li>
            );
          })
        )}
      </ul>

      {top ? (
        <p className={styles.verdict} key={top.label}>
          {verdictFor(top.label, detections.length)}
        </p>
      ) : null}
    </div>
  );
}
