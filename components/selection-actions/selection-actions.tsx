"use client";

import {
  ArrowUp,
  Check,
  ChevronRight,
  CircleHelp,
  RotateCcw,
  Scissors,
  Sparkles,
  SpellCheck2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../shared/utils";

export type SelectionActionMode = "idle" | "thinking" | "result";

export interface SelectionActionsProps {
  /** Text preceding the highlighted selection. */
  leadingText?: string;
  /** The text the contextual actions operate on. */
  selection?: string;
  /** Replacement text shown after a successful action. */
  result?: string;
  className?: string;
}

const actions = [
  { label: "Explain", icon: CircleHelp },
  { label: "Improve", icon: Sparkles },
  { label: "Shorten", icon: Scissors },
  { label: "Fix grammar", icon: SpellCheck2 },
] as const;

export function SelectionActions({
  leadingText = "Pistachio holds the top slot all weekend. ",
  selection = "Churn it first thing Saturday so the batch has time to firm up before the afternoon rush.",
  result = "Churn pistachio first thing Saturday so the batch has time to fully firm before the afternoon rush.",
  className,
}: SelectionActionsProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [mode, setMode] = useState<SelectionActionMode>("idle");
  const [activeAction, setActiveAction] = useState("Improve");
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (mode !== "thinking") return;

    const timer = window.setTimeout(
      () => setMode("result"),
      reduceMotion ? 0 : 950,
    );
    return () => window.clearTimeout(timer);
  }, [mode, reduceMotion]);

  function run(action: string) {
    setActiveAction(action);
    setExpanded(false);
    setMode("thinking");
  }

  function reset() {
    setMode("idle");
    setPrompt("");
    setExpanded(false);
  }

  const visibleActions = expanded ? actions : actions.slice(0, 2);
  const currentSelection = mode === "result" ? result : selection;

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="text-foreground/90 relative pb-14 text-[13px] leading-6">
        <span className="select-none">{leadingText}</span>
        <mark className="bg-primary/10 dark:bg-primary/15 rounded-sm px-0.5 text-inherit select-none">
          {currentSelection}
        </mark>

        <motion.div
          className="absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2"
          initial={reduceMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            layout={!reduceMotion}
            className="border-border bg-card text-foreground flex min-h-9 max-w-[calc(100vw-48px)] items-center gap-0.5 overflow-hidden rounded-full border p-1 shadow-lg"
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    layout: {
                      type: "spring",
                      stiffness: 520,
                      damping: 38,
                      mass: 0.7,
                    },
                  }
            }
          >
            <AnimatePresence initial={false} mode="wait">
              {mode === "thinking" ? (
                <motion.span
                  key="thinking"
                  aria-live="polite"
                  className="text-muted-foreground inline-flex h-7 items-center gap-2 px-2.5 text-xs"
                  initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                >
                  <span className="border-muted-foreground/40 border-t-foreground size-3 animate-spin rounded-full border-2" />
                  Applying {activeAction}…
                </motion.span>
              ) : mode === "result" ? (
                <motion.div
                  key="result"
                  className="flex items-center gap-0.5"
                  initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                >
                  <button
                    className="bg-primary text-primary-foreground inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-opacity hover:opacity-90"
                    onClick={reset}
                    type="button"
                  >
                    <Check className="size-3.5" /> Keep
                  </button>
                  <button
                    aria-label="Discard change"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-full transition-colors"
                    onClick={reset}
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                  <span className="bg-border mx-1 h-4 w-px" />
                  <button
                    aria-label="Try action again"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-full transition-colors"
                    onClick={() => run(activeAction)}
                    type="button"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  className="flex items-center gap-0.5"
                  initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                >
                  {prompt ? (
                    <>
                      <input
                        aria-label="Describe an edit"
                        className="placeholder:text-muted-foreground h-7 w-36 bg-transparent px-2 text-xs outline-none select-text"
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Describe edit"
                        value={prompt}
                      />
                      <button
                        aria-label="Run edit"
                        className="bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-full transition-transform active:scale-95"
                        onClick={() => run(prompt)}
                        type="button"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <AnimatePresence initial={false} mode="popLayout">
                        {visibleActions.map(({ label, icon: Icon }, index) => (
                          <motion.button
                            layout={!reduceMotion}
                            key={label}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            className="hover:bg-muted inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs transition-colors"
                            exit={
                              reduceMotion
                                ? { opacity: 1 }
                                : { opacity: 0, scale: 0.86, x: -6 }
                            }
                            initial={
                              reduceMotion || index < 2
                                ? false
                                : { opacity: 0, scale: 0.86, x: -6 }
                            }
                            onClick={() => run(label)}
                            transition={{
                              duration: 0.18,
                              ease: [0.16, 1, 0.3, 1],
                              layout: {
                                type: "spring",
                                stiffness: 520,
                                damping: 38,
                                mass: 0.7,
                              },
                            }}
                            type="button"
                          >
                            <Icon className="size-3.5" /> {label}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                      <span className="bg-border mx-0.5 h-4 w-px" />
                      <button
                        aria-label={
                          expanded ? "Show fewer actions" : "Show more actions"
                        }
                        aria-expanded={expanded}
                        className="hover:bg-muted inline-flex size-7 items-center justify-center rounded-full transition-colors"
                        onClick={() => setExpanded((value) => !value)}
                        type="button"
                      >
                        <ChevronRight
                          className={cn(
                            "size-3.5 transition-transform",
                            expanded && "rotate-180",
                          )}
                        />
                      </button>
                      <button
                        aria-label="Describe a custom edit"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-full transition-colors"
                        onClick={() => setPrompt(" ")}
                        type="button"
                      >
                        <Sparkles className="size-3.5" />
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
