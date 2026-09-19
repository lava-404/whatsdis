"use client";

import { useCallback, useRef, useState } from "react";
import type { ConsoleLine, ConsoleTone } from "@/lib/types";

const MAX_LINES = 80;

export interface ConsoleApi {
  lines: ConsoleLine[];
  print: (text: string, tone?: ConsoleTone) => void;
  /** Prints only if the previous line differs — stops the log becoming a wall. */
  printOnce: (text: string, tone?: ConsoleTone) => void;
  clear: () => void;
}

export function useConsole(initial: string[] = []): ConsoleApi {
  const nextId = useRef(0);
  const [lines, setLines] = useState<ConsoleLine[]>(() =>
    initial.map((text) => ({ id: nextId.current++, text, tone: "info" as const })),
  );

  const print = useCallback((text: string, tone: ConsoleTone = "info") => {
    setLines((previous) => {
      const line: ConsoleLine = { id: nextId.current++, text, tone };
      const next = [...previous, line];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  }, []);

  const printOnce = useCallback((text: string, tone: ConsoleTone = "info") => {
    setLines((previous) => {
      if (previous.length > 0 && previous[previous.length - 1].text === text) {
        return previous;
      }
      const line: ConsoleLine = { id: nextId.current++, text, tone };
      const next = [...previous, line];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return { lines, print, printOnce, clear };
}
