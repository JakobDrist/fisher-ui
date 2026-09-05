"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../shared/utils";

export type CountdownUnit = "days" | "hours" | "minutes" | "seconds";

type CountdownParts = Record<CountdownUnit, number> & {
  total: number;
  isComplete: boolean;
};

const emptyParts: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  total: 0,
  isComplete: false,
};

const CountdownContext = createContext<CountdownParts>(emptyParts);

function getParts(total: number): CountdownParts {
  const seconds = Math.max(0, Math.ceil(total / 1000));
  return {
    days: Math.floor(seconds / 86_400),
    hours: Math.floor((seconds % 86_400) / 3_600),
    minutes: Math.floor((seconds % 3_600) / 60),
    seconds: seconds % 60,
    total: seconds,
    isComplete: seconds === 0,
  };
}

export interface CountdownProps extends HTMLAttributes<HTMLDivElement> {
  targetDate?: Date | number | string;
  duration?: number;
  interval?: number;
  onComplete?: () => void;
  children: ReactNode;
}

/** Headless countdown timing engine. Compose labels and surfaces around its segments. */
export function Countdown({
  targetDate,
  duration,
  interval = 1_000,
  onComplete,
  children,
  className,
  ...props
}: CountdownProps) {
  const [parts, setParts] = useState<CountdownParts>(emptyParts);
  const completed = useRef(false);

  useEffect(() => {
    const target = targetDate
      ? (targetDate instanceof Date
          ? targetDate
          : new Date(targetDate)
        ).getTime()
      : Date.now() + Math.max(0, duration ?? 0) * 1_000;
    const update = () => {
      const next = getParts(target - Date.now());
      setParts(next);
      if (next.isComplete && !completed.current) {
        completed.current = true;
        onComplete?.();
      }
    };

    completed.current = false;
    update();
    const timer = window.setInterval(update, interval);
    return () => window.clearInterval(timer);
  }, [duration, interval, onComplete, targetDate]);

  return (
    <CountdownContext.Provider value={parts}>
      <div className={cn("inline-flex", className)} role="timer" {...props}>
        {children}
      </div>
    </CountdownContext.Provider>
  );
}

function RollingDigit({ digit }: { digit: string }) {
  return (
    <span className="relative inline-flex h-[1em] w-[0.64em] overflow-hidden align-[-0.1em]">
      <span
        className="flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateY(-${Number(digit)}em)` }}
      >
        {Array.from({ length: 10 }, (_, value) => (
          <span
            className="flex h-[1em] items-center justify-center leading-none"
            key={value}
          >
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

export interface CountdownSegmentProps extends HTMLAttributes<HTMLSpanElement> {
  unit?: CountdownUnit;
  value?: number;
  minDigits?: number;
}

/** Rolling digit display, driven either by a parent Countdown or a direct value. */
export function CountdownSegment({
  unit,
  value,
  minDigits = 2,
  className,
  ...props
}: CountdownSegmentProps) {
  const parts = useContext(CountdownContext);
  const currentValue = Math.max(
    0,
    Math.floor(value ?? (unit ? parts[unit] : 0)),
  );
  const display = String(currentValue).padStart(minDigits, "0");

  return (
    <span className={cn("inline-flex tabular-nums", className)} {...props}>
      <span aria-hidden className="inline-flex">
        {display.split("").map((digit, index) => (
          <RollingDigit digit={digit} key={`${index}-${digit}`} />
        ))}
      </span>
      <span className="sr-only">{display}</span>
    </span>
  );
}
