"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { useReducedMotion } from "motion/react";
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../shared/classname-helper";

type HoldToConfirmButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "onClick"
> & {
  children?: ReactNode;
  confirmedContent?: ReactNode;
  duration?: number;
  onConfirm: (input: ConfirmationInput) => void;
  resetAfter?: number;
};

type HoldStatus = "confirmed" | "holding" | "idle";

export type ConfirmationInput = "keyboard" | "pointer";

export function HoldToConfirmButton({
  children = "Hold to confirm",
  className,
  confirmedContent,
  disabled,
  duration = 1600,
  onConfirm,
  resetAfter = 1800,
  ...buttonProps
}: HoldToConfirmButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const inputModeRef = useRef<ConfirmationInput>("pointer");
  const isHoldingRef = useRef(false);
  const [inputMode, setInputMode] = useState<ConfirmationInput | null>(null);
  const [status, setStatus] = useState<HoldStatus>("idle");
  const shouldReduceMotion = useReducedMotion();

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current === null) {
      return;
    }

    window.clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = null;
  }, []);

  const completeHold = useCallback(() => {
    if (!isHoldingRef.current) {
      return;
    }

    isHoldingRef.current = false;
    activePointerIdRef.current = null;
    clearConfirmTimer();
    setStatus("confirmed");
    onConfirm(inputModeRef.current);

    if (resetAfter > 0) {
      resetTimerRef.current = window.setTimeout(() => {
        setStatus("idle");
        resetTimerRef.current = null;
      }, resetAfter);
    }
  }, [clearConfirmTimer, onConfirm, resetAfter]);

  const cancelHold = useCallback(() => {
    if (!isHoldingRef.current) {
      return;
    }

    isHoldingRef.current = false;
    activePointerIdRef.current = null;
    clearConfirmTimer();
    setStatus("idle");
  }, [clearConfirmTimer]);

  const startHold = useCallback(
    (input: ConfirmationInput) => {
      if (disabled || status === "confirmed" || isHoldingRef.current) {
        return;
      }

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      inputModeRef.current = input;
      setInputMode(input);
      isHoldingRef.current = true;
      setStatus("holding");
      confirmTimerRef.current = window.setTimeout(completeHold, duration);
    },
    [completeHold, disabled, duration, status],
  );

  useEffect(() => {
    return () => {
      clearConfirmTimer();

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [clearConfirmTimer]);

  useEffect(() => {
    if (disabled) {
      // The upstream component cancels an active hold as soon as it is disabled.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cancelHold();
    }
  }, [cancelHold, disabled]);

  function releasePointerCapture(pointerId: number) {
    const button = buttonRef.current;

    if (button?.hasPointerCapture(pointerId)) {
      button.releasePointerCapture(pointerId);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || disabled) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold("pointer");
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (
      !isHoldingRef.current ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const boundaryPadding = 8;
    const isOutside =
      event.clientX < rect.left - boundaryPadding ||
      event.clientX > rect.right + boundaryPadding ||
      event.clientY < rect.top - boundaryPadding ||
      event.clientY > rect.bottom + boundaryPadding;

    if (isOutside) {
      cancelHold();
      releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    cancelHold();
    releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    startHold("keyboard");
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    cancelHold();
  }

  const isConfirmed = status === "confirmed";
  const isHolding = status === "holding";
  const overlayStyle = {
    clipPath: isHolding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
    transitionDuration:
      shouldReduceMotion || inputMode === "keyboard"
        ? "0ms"
        : isHolding
          ? `${duration}ms`
          : "180ms",
    transitionProperty: "clip-path",
    transitionTimingFunction: isHolding
      ? "linear"
      : "cubic-bezier(0.23, 1, 0.32, 1)",
  };

  return (
    <button
      {...buttonProps}
      aria-busy={isHolding}
      className={cn(
        "relative isolate inline-flex h-9 min-w-40 touch-none cursor-pointer select-none items-center justify-center overflow-hidden rounded-lg border border-red-9 bg-red-3 px-3 font-medium text-red-11 text-sm outline-none transition-[transform,border-color,background-color,color] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-red-8 focus-visible:ring-offset-2 focus-visible:ring-offset-grayscale-1 data-[input=pointer]:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-4",
        isConfirmed && "bg-red-9 text-white dark:bg-red-9 dark:text-white",
        className,
      )}
      data-input={inputMode}
      disabled={disabled}
      onBlur={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onLostPointerCapture={cancelHold}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={buttonRef}
      type="button"
    >
      {isConfirmed ? (
        <span className="relative flex items-center justify-center gap-1.5">
          {confirmedContent ?? (
            <>
              <CheckIcon aria-hidden="true" size={15} weight="bold" />
              Confirmed
            </>
          )}
        </span>
      ) : (
        <>
          <span className="relative flex items-center justify-center gap-1.5">
            {children}
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center gap-1.5 bg-red-9 px-3 text-white"
            style={overlayStyle}
          >
            {children}
          </span>
        </>
      )}
    </button>
  );
}
