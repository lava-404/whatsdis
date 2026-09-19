"use client";

import { useEffect, useRef } from "react";
import Button from "./Button";
import styles from "./Dialog.module.css";

interface DialogProps {
  title: string;
  message: string;
  hint?: string;
  tone?: "error" | "info";
  confirmLabel?: string;
  secondaryLabel?: string;
  onConfirm: () => void;
  onSecondary?: () => void;
}

/** A modal system dialog. Blocks the app until acknowledged, as tradition demands. */
export default function Dialog({
  title,
  message,
  hint,
  tone = "error",
  confirmLabel = "OK",
  secondaryLabel,
  onConfirm,
  onSecondary,
}: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onConfirm();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onConfirm]);

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <div className={styles.titleBar} id="dialog-title">
          {title}
        </div>

        <div className={styles.content}>
          <div
            className={`${styles.glyph} ${tone === "error" ? styles.error : styles.info}`}
            aria-hidden="true"
          >
            {tone === "error" ? "\u2715" : "i"}
          </div>
          <div className={styles.text}>
            <p className={styles.message} id="dialog-message">
              {message}
            </p>
            {hint ? <p className={styles.hint}>{hint}</p> : null}
          </div>
        </div>

        <div className={styles.actions}>
          {secondaryLabel && onSecondary ? (
            <Button onClick={onSecondary}>{secondaryLabel}</Button>
          ) : null}
          <Button ref={confirmRef} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
