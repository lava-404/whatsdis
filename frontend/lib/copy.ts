/**
 * All of the product's voice lives here so the components stay about layout.
 * Tone: a 2003 shareware CD that is very proud of itself.
 */

export const TAGLINE =
  "ARTIFICIAL INTELLIGENCE\u2122 FOR PEOPLE WHO CAN'T IDENTIFY THINGS";

export const BOOT_LINES: string[] = [
  "WhatsDis BIOS v1.03  (C) 2003 Ocular Dynamics Ltd.",
  "Memory test .................. 640K OK",
  "Detecting optical input device ....... FOUND",
  "Loading NEURAL.DLL ................... OK",
  "Loading COMMONSENSE.DLL .............. NOT FOUND",
  "Calibrating vibes .................... OK",
  "Mounting REALITY: ....................",
];

export const SPLASH_STEPS: string[] = [
  "Unpacking convolutions",
  "Sharpening pixels by hand",
  "Asking the model to try its best",
  "Preparing to state the obvious",
];

/** Rotating jabs shown under a fresh detection. */
const VERDICTS: string[] = [
  "WHY DID YOU NEED AI FOR THIS?",
  "YOU COULD HAVE JUST LOOKED.",
  "CONGRATULATIONS ON YOUR EYES.",
  "THIS WAS NEVER IN DOUBT.",
  "SEVEN GPUs DIED FOR THIS ANSWER.",
  "TRULY, THE FUTURE IS HERE.",
  "FILED UNDER: THINGS YOU ALREADY KNEW.",
  "ANOTHER MYSTERY SOLVED.",
];

export function verdictFor(label: string, index: number): string {
  const seed = label.length + index;
  return VERDICTS[seed % VERDICTS.length];
}

/** Console line for a confident hit. */
export function detectionLine(label: string, confidence: number): string {
  return `OBJECT DETECTED: ${label.toUpperCase()}  //  CONFIDENCE: ${Math.round(
    confidence * 100,
  )}%`;
}

export const IDLE_HINT =
  "Point the camera at literally anything. The machine will tell you what it is, at great expense.";

export const EMPTY_SCAN =
  "Nothing recognised. Either the room is empty or the model has given up.";

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
