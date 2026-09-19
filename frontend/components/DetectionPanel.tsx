"use client";

import { EMPTY_RESULT, formatConfidence, verdictFor } from "@/lib/copy";
import { colorForLabel } from "@/lib/geometry";
import type { KeyedDetection } from "@/lib/types";
import styles from "./DetectionPanel.module.css";

interface DetectionPanelProps {
  detections: KeyedDetection[];
  hasResult: boolean;
}

const METER_CELLS = 10;

/** Inventory of everything found in the last shot, plus a rude verdict. */
export default function DetectionPanel({
  detections,
  hasResult,
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
            {hasResult ? EMPTY_RESULT : "No shot taken yet. Nothing to report."}
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
