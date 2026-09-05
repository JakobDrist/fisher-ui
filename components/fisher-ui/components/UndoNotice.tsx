"use client";

import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../helpers/classname-helper";

export type UndoInteraction = "keyboard" | "pointer";

type UndoNoticeProps = {
  className?: string;
  duration?: number;
  message?: string;
  onExpire: () => void;
  onUndo: (input: UndoInteraction) => void;
};

export function UndoNotice({
  className,
  duration = 5000,
  message = "Project deleted",
  onExpire,
  onUndo,
}: UndoNoticeProps) {
  const [isCounting, setIsCounting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsCounting(true);
    });
    const timer = window.setTimeout(onExpire, duration);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [duration, onExpire]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex min-h-9 items-center justify-between gap-3 rounded-xl bg-grayscale-2 p-1 pl-3 dark:bg-grayscale-4",
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2">
        <CheckCircleIcon
          aria-hidden="true"
          className="shrink-0 text-green-9"
          size={16}
          weight="fill"
        />
        <p className="truncate font-medium text-grayscale-12 text-xs">
          {message}
        </p>
      </div>
      <button
        className="relative isolate flex h-7 min-w-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-grayscale-4 bg-grayscale-1 px-2.5 font-medium text-grayscale-11 text-xs outline-none transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-grayscale-8 active:scale-[0.97] dark:border-grayscale-6 dark:bg-grayscale-3"
        onClick={(event) => {
          onUndo(event.detail === 0 ? "keyboard" : "pointer");
        }}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <ArrowCounterClockwiseIcon
            aria-hidden="true"
            size={13}
            weight="bold"
          />
          Undo
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center gap-1.5 bg-grayscale-12 px-2.5 text-grayscale-1"
          style={{
            clipPath: isCounting ? "inset(0 100% 0 0)" : "inset(0 0 0 0)",
            transitionDuration: shouldReduceMotion ? "0ms" : `${duration}ms`,
            transitionProperty: "clip-path",
            transitionTimingFunction: "linear",
          }}
        >
          <ArrowCounterClockwiseIcon
            aria-hidden="true"
            size={13}
            weight="bold"
          />
          Undo
        </span>
      </button>
    </div>
  );
}
