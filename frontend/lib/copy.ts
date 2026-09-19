/**
 * All of the product's voice lives here so the components stay about layout.
 * Tone: a 2003 shareware CD that is very proud of itself.
 */

export const PRODUCT_NAME = "Name That Shi";
export const WORDMARK = "NAME THAT SHI";
export const WINDOW_TITLE = `${PRODUCT_NAME} \u2014 Object Scanner 2003`;

export const TAGLINE =
  "ARTIFICIAL INTELLIGENCE\u2122 FOR PEOPLE WHO CAN'T IDENTIFY THINGS";

export const BOOT_LINES: string[] = [
  "NameThatShi BIOS v1.03  (C) 2003 Ocular Dynamics Ltd.",
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

/** Rotating jabs shown under a fresh result. */
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

export function detectionLine(label: string, confidence: number): string {
  return `OBJECT IDENTIFIED: ${label.toUpperCase()}  //  CONFIDENCE: ${Math.round(
    confidence * 100,
  )}%`;
}

export const IDLE_HINT =
  "Switch the camera on, point it at literally anything, and press the big button. The machine will tell you what it is, at great expense.";

export const LIVE_HINT = "Framed up? Take the shot.";

export const EMPTY_RESULT =
  "Nothing recognised in that frame. Either the room is empty or the model has given up.";

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ---------------------------------------------------------------------------
   Menu-bar flavour. Half of these entries do real work; the rest exist purely
   because a 2003 application without a useless File menu is not a 2003
   application.
   --------------------------------------------------------------------------- */

export const TIPS: string[] = [
  "Did you know? Holding the camera steadier does not make the model smarter, but it does make you feel involved.",
  "Did you know? Objects that are further away are also smaller. This application knows this and resents being asked.",
  "Did you know? If nothing is detected, try pointing the camera at a thing instead of a wall.",
  "Did you know? The confidence percentage is the model's feelings, expressed numerically.",
  "Did you know? You can press the shutter as many times as you like. The model has no memory and no grudges.",
  "Did you know? This software was certified Y2K-compliant approximately four years too late.",
];

export const ABOUT_TEXT = `${PRODUCT_NAME}, Object Scanner 2003, Professional Edition.

Build 1.03.7 \u2014 compiled on a Tuesday.

Neural detection by YOLO. Interface by someone who has seen a beveled button and could not stop. Commercial redistribution prohibited, spiritually.`;

export const EXIT_TEXT =
  "This application cannot be closed. It has seen things. Minimise it instead, and we will both pretend this did not happen.";

export const UNDO_TEXT =
  "There is nothing to undo. The object still exists. That is not something this software can reverse.";

export const REGISTER_TEXT =
  "You are using the unregistered shareware edition, which is identical to the registered edition in every respect. Thank you for your interest.";
