"use client";

import { useCallback, useEffect, useState } from "react";
import type { SystemFault } from "@/lib/types";
import BootScreen from "./BootScreen";
import Dialog from "./Dialog";
import Scanner from "./Scanner";
import Taskbar from "./Taskbar";
import Window from "./Window";
import styles from "./App.module.css";

const WINDOW_TITLE = "WhatsDis \u2014 Object Scanner 2003";
const BOOT_FLAG = "whatsdis:booted";

interface DialogState extends SystemFault {
  tone: "error" | "info";
}

export default function App() {
  // null = not yet decided on the client. Keeps server and client markup in step.
  const [booting, setBooting] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const alreadyBooted = sessionStorage.getItem(BOOT_FLAG) === "1";
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setBooting(!alreadyBooted && !reducedMotion);
  }, []);

  const finishBoot = useCallback(() => {
    sessionStorage.setItem(BOOT_FLAG, "1");
    setBooting(false);
  }, []);

  const handleFault = useCallback((fault: SystemFault) => {
    setDialog({ ...fault, tone: "error" });
  }, []);

  const showStartMenu = useCallback(() => {
    setDialog({
      title: "Start",
      message: "There is no Start menu.",
      hint: "This computer does exactly one thing, and it is already on screen.",
      tone: "info",
    });
  }, []);

  const attemptClose = useCallback(() => {
    setDialog({
      title: "WhatsDis",
      message: "This application cannot be closed.",
      hint: "It has seen things. Minimise it instead, and we will both pretend this did not happen.",
      tone: "info",
    });
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((open) => !open), []);
  const toggleMaximized = useCallback(() => setMaximized((open) => !open), []);

  const focusWindow = useCallback(() => setCollapsed(false), []);

  const surfaceClasses = [
    styles.surface,
    maximized ? styles.maximized : "",
    collapsed ? styles.collapsed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.desktop}>
      <div className={surfaceClasses}>
        <Window
          title={WINDOW_TITLE}
          className={styles.window}
          icon={
            <span className={styles.icon}>
              {Array.from({ length: 9 }, (_, index) => (
                <span key={index} />
              ))}
            </span>
          }
          menu={["File", "Edit", "View", "Scan", "Help"]}
          collapsed={collapsed}
          onMinimize={toggleCollapsed}
          onMaximize={toggleMaximized}
          onClose={attemptClose}
        >
          <Scanner onFault={handleFault} onScanningChange={setScanning} />
        </Window>
      </div>

      <Taskbar
        windowTitle={WINDOW_TITLE}
        windowFocused={!collapsed}
        onTaskClick={focusWindow}
        onStartClick={showStartMenu}
        scanning={scanning}
      />

      {dialog ? (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          hint={dialog.hint}
          tone={dialog.tone}
          onConfirm={() => setDialog(null)}
        />
      ) : null}

      {booting === null ? <div className={styles.preboot} /> : null}
      {booting ? <BootScreen onFinish={finishBoot} /> : null}
    </div>
  );
}
