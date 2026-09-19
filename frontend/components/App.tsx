"use client";

import { useCallback, useEffect, useState } from "react";
import { EXIT_TEXT, PRODUCT_NAME, WINDOW_TITLE } from "@/lib/copy";
import AppMenuBar from "./AppMenuBar";
import BootScreen from "./BootScreen";
import Dialog from "./Dialog";
import Scanner from "./Scanner";
import { ScannerProvider, useScanner } from "./ScannerProvider";
import Taskbar from "./Taskbar";
import Window from "./Window";
import styles from "./App.module.css";

const BOOT_FLAG = "name-that-shi:booted";

export default function App() {
  return (
    <ScannerProvider>
      <Shell />
    </ScannerProvider>
  );
}

function Shell() {
  const { stage, dialog, showDialog, closeDialog } = useScanner();

  // null = not yet decided on the client. Keeps server and client markup in step.
  const [booting, setBooting] = useState<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);

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

  const showStartMenu = useCallback(() => {
    showDialog({
      title: "Start",
      message: "There is no Start menu.",
      hint: "This computer does exactly one thing, and it is already on screen.",
      tone: "info",
    });
  }, [showDialog]);

  const attemptClose = useCallback(() => {
    showDialog({
      title: PRODUCT_NAME,
      message: "This application cannot be closed.",
      hint: EXIT_TEXT,
      tone: "info",
    });
  }, [showDialog]);

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
          menu={<AppMenuBar />}
          collapsed={collapsed}
          onMinimize={toggleCollapsed}
          onMaximize={toggleMaximized}
          onClose={attemptClose}
        >
          <Scanner />
        </Window>
      </div>

      <Taskbar
        windowTitle={WINDOW_TITLE}
        windowFocused={!collapsed}
        onTaskClick={focusWindow}
        onStartClick={showStartMenu}
        scanning={stage === "analysing"}
      />

      {dialog ? (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          hint={dialog.hint}
          tone={dialog.tone}
          onConfirm={closeDialog}
        />
      ) : null}

      {booting === null ? <div className={styles.preboot} /> : null}
      {booting ? <BootScreen onFinish={finishBoot} /> : null}
    </div>
  );
}
