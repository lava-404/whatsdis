"use client";

import type { ReactNode } from "react";
import styles from "./Window.module.css";

interface WindowProps {
  title: string;
  icon?: ReactNode;
  menu?: string[];
  collapsed?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Application window chrome: title bar, optional menu strip, body.
 *
 * The caption buttons are real controls wired to real handlers rather than
 * decoration — a button that does nothing is worse than no button.
 */
export default function Window({
  title,
  icon,
  menu,
  collapsed = false,
  onMinimize,
  onMaximize,
  onClose,
  className,
  children,
}: WindowProps) {
  return (
    <section
      className={[styles.window, collapsed ? styles.collapsed : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      aria-label={title}
    >
      <div className={styles.titleBar}>
        {icon ? (
          <span className={styles.titleIcon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <h1 className={styles.titleText}>{title}</h1>
        <div className={styles.captionGroup}>
          {onMinimize ? (
            <button
              type="button"
              className={styles.caption}
              onClick={onMinimize}
              aria-label={collapsed ? "Expand window" : "Minimise window"}
            >
              {collapsed ? "\u25A1" : "\u2013"}
            </button>
          ) : null}
          {onMaximize ? (
            <button
              type="button"
              className={styles.caption}
              onClick={onMaximize}
              aria-label="Toggle maximised window"
            >
              {"\u2750"}
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              className={`${styles.caption} ${styles.close}`}
              onClick={onClose}
              aria-label="Close window"
            >
              {"\u2715"}
            </button>
          ) : null}
        </div>
      </div>

      {menu && menu.length > 0 ? (
        <nav className={styles.menuBar} aria-label="Application menu">
          {menu.map((item) => (
            <button key={item} type="button" className={styles.menuItem} tabIndex={-1}>
              <u>{item.charAt(0)}</u>
              {item.slice(1)}
            </button>
          ))}
        </nav>
      ) : null}

      <div className={styles.body}>{children}</div>
    </section>
  );
}
