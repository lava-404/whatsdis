"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MenuBar.module.css";

export interface MenuEntry {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: string;
  separatorAfter?: boolean;
}

export interface MenuDefinition {
  label: string;
  entries: MenuEntry[];
}

interface MenuBarProps {
  menus: MenuDefinition[];
}

/**
 * A menu bar that actually opens.
 *
 * Half of these commands do real work and half are period-accurate nonsense;
 * either way they respond, which is more than the average 2003 Help menu
 * managed.
 */
export default function MenuBar({ menus }: MenuBarProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIndex === null) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpenIndex(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openIndex]);

  const select = (entry: MenuEntry) => {
    setOpenIndex(null);
    entry.onSelect?.();
  };

  return (
    <div className={styles.bar} ref={barRef} role="menubar" aria-label="Application menu">
      {menus.map((menu, index) => {
        const open = openIndex === index;

        return (
          <div key={menu.label} className={styles.row}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={open}
              className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
              onClick={() => setOpenIndex(open ? null : index)}
              // Once one menu is open, sliding across the bar switches menus,
              // the way every desktop menu bar has always behaved.
              onPointerEnter={() => {
                if (openIndex !== null) setOpenIndex(index);
              }}
            >
              <u>{menu.label.charAt(0)}</u>
              {menu.label.slice(1)}
            </button>

            {open ? (
              <ul className={styles.menu} role="menu" aria-label={menu.label}>
                {menu.entries.map((entry) => (
                  <li key={entry.label} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.item}
                      disabled={entry.disabled}
                      onClick={() => select(entry)}
                    >
                      {entry.checked ? (
                        <span className={styles.check} aria-hidden="true">
                          {"\u2713"}
                        </span>
                      ) : null}
                      <span className={styles.label}>{entry.label}</span>
                      {entry.shortcut ? (
                        <span className={styles.shortcut}>{entry.shortcut}</span>
                      ) : null}
                    </button>
                    {entry.separatorAfter ? (
                      <div className={styles.separator} role="separator" />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
