"use client";

import { useRef } from "react";
import {
  ABOUT_TEXT,
  EXIT_TEXT,
  PRODUCT_NAME,
  REGISTER_TEXT,
  TIPS,
  UNDO_TEXT,
} from "@/lib/copy";
import MenuBar from "./MenuBar";
import type { MenuDefinition } from "./MenuBar";
import { useScanner } from "./ScannerProvider";

const MOODS = [
  "The model reports that it is fine. The model reports this about everything.",
  "The model would like it noted that it was trained on photographs, not on your lighting.",
  "The model has no feelings. The confidence score is the closest thing it has, and you keep asking it to be higher.",
  "The model is doing its best. The model's best is 80 classes.",
];

/**
 * The menu bar's contents.
 *
 * Roughly half of these are real commands wired to the scanner; the rest are
 * the kind of entry a 2003 application shipped because the menu looked empty
 * otherwise. Anything that cannot act right now is disabled rather than silent.
 */
export default function AppMenuBar() {
  const {
    camera,
    shot,
    log,
    stage,
    fit,
    toggleFit,
    scanlines,
    toggleScanlines,
    showDialog,
    startCamera,
    stopCamera,
    flipCamera,
    takeShot,
    retake,
    saveSnapshot,
    copyResults,
  } = useScanner();

  const tipIndex = useRef(0);
  const moodIndex = useRef(0);

  const hasResult = shot.analysis !== null;
  const objectCount = shot.analysis?.detections.length ?? 0;

  const info = (title: string, message: string, hint?: string) =>
    showDialog({ title, message, hint, tone: "info" });

  const menus: MenuDefinition[] = [
    {
      label: "File",
      entries: [
        {
          label: "New scan",
          shortcut: "Space",
          disabled: !hasResult,
          onSelect: retake,
        },
        {
          label: "Save snapshot as PNG\u2026",
          shortcut: "Ctrl+S",
          disabled: !hasResult,
          onSelect: () => void saveSnapshot(),
          separatorAfter: true,
        },
        {
          label: "Print\u2026",
          onSelect: () =>
            info(
              "Print",
              "No printer is attached.",
              "There has never been a printer. There is not going to be a printer.",
            ),
          separatorAfter: true,
        },
        {
          label: "Exit",
          onSelect: () => info(PRODUCT_NAME, "This application cannot be closed.", EXIT_TEXT),
        },
      ],
    },
    {
      label: "Edit",
      entries: [
        {
          label: "Undo identification",
          shortcut: "Ctrl+Z",
          onSelect: () => info("Edit", "Nothing to undo.", UNDO_TEXT),
        },
        {
          label: "Copy results",
          shortcut: "Ctrl+C",
          disabled: !hasResult,
          onSelect: () => void copyResults(),
          separatorAfter: true,
        },
        {
          label: "Select all objects",
          disabled: objectCount === 0,
          onSelect: () =>
            info(
              "Edit",
              `All ${objectCount} object${objectCount === 1 ? "" : "s"} selected.`,
              "They remain exactly where they were. Selection is a state of mind.",
            ),
        },
      ],
    },
    {
      label: "View",
      entries: [
        {
          label: "Whole frame",
          checked: fit === "contain",
          onSelect: () => {
            if (fit !== "contain") toggleFit();
          },
        },
        {
          label: "Fill screen",
          checked: fit === "cover",
          onSelect: () => {
            if (fit !== "cover") toggleFit();
          },
          separatorAfter: true,
        },
        {
          label: "CRT emulation",
          checked: scanlines,
          onSelect: toggleScanlines,
          separatorAfter: true,
        },
        { label: "Clear console", onSelect: log.clear },
      ],
    },
    {
      label: "Scan",
      entries: [
        {
          label: camera.active ? "Turn camera off" : "Turn camera on",
          onSelect: () => {
            if (camera.active) stopCamera();
            else void startCamera();
          },
        },
        {
          label: "Take the shot",
          shortcut: "Space",
          disabled: stage !== "live",
          onSelect: () => void takeShot(),
        },
        {
          label: "Flip camera",
          disabled: !camera.active || !camera.hasMultipleCameras,
          onSelect: () => void flipCamera(),
          separatorAfter: true,
        },
        {
          label: "Enhance",
          onSelect: () =>
            info(
              "Enhance",
              "Enhance is not available in this edition.",
              "It was not available in any edition. You are thinking of a film.",
            ),
        },
      ],
    },
    {
      label: "Help",
      entries: [
        {
          label: "Tip of the Day",
          onSelect: () => {
            const tip = TIPS[tipIndex.current % TIPS.length];
            tipIndex.current += 1;
            info("Tip of the Day", tip);
          },
        },
        {
          label: "Ask the model how it feels",
          onSelect: () => {
            const mood = MOODS[moodIndex.current % MOODS.length];
            moodIndex.current += 1;
            info("Neural Network Wellbeing", mood);
          },
          separatorAfter: true,
        },
        {
          label: "Register this product\u2026",
          onSelect: () => info("Registration", "You are already registered.", REGISTER_TEXT),
        },
        {
          label: `About ${PRODUCT_NAME}`,
          onSelect: () => info(`About ${PRODUCT_NAME}`, ABOUT_TEXT),
        },
      ],
    },
  ];

  return <MenuBar menus={menus} />;
}
