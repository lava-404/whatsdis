"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "default" | "start" | "stop";

// React 19 passes `ref` straight through as a prop, so no forwardRef wrapper.
interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: Variant;
  size?: "default" | "large";
  block?: boolean;
  icon?: ReactNode;
}

/** A moulded-plastic push button. Depresses on press, because of course it does. */
export default function Button({
  variant = "default",
  size = "default",
  block = false,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    variant !== "default" ? styles[variant] : "",
    size === "large" ? styles.large : "",
    block ? styles.block : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
