"use client";

import {
  Check,
  ChevronDown,
  FilePenLine,
  Globe2,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThinkingShimmer } from "./loading-states/thinking-shimmer";
import { cn } from "../../lib/utils";

export type AgentActivity2Variant = "steps" | "reasoning" | "search" | "coding";

type TraceRow = {
  primary: string;
  secondary?: string;
  href?: string;
  add?: number;
  remove?: number;
};

const traces: Record<
  AgentActivity2Variant,
  { active: string; complete: string; query?: string; rows: TraceRow[] }
> = {
  steps: {
    active: "Thinking",
    complete: "Thought for 4 seconds",
    rows: [
      { primary: "Reading flavor briefs" },
      { primary: "Scanning supplier lists" },
      { primary: "Comparing tasting notes", secondary: "6 flavors" },
      { primary: "Writing the scoop report" },
    ],
  },
  reasoning: {
    active: "Thinking",
    complete: "Thought for 4 seconds",
    rows: [
      {
        primary:
          "Summer demand spikes for stone-fruit flavors — peach and apricot lead.",
      },
      {
        primary:
          "I should check cone inventory before promoting a waffle-bowl special.",
      },
    ],
  },
  search: {
    active: "Searching the web",
    complete: "Searched the web",
    query: "best waffle cone supplier",
    rows: [
      {
        primary: "Joy Cone",
        secondary: "joycone.com",
        href: "https://joycone.com",
      },
      {
        primary: "WebstaurantStore",
        secondary: "webstaurantstore.com",
        href: "https://www.webstaurantstore.com",
      },
      {
        primary: "The Konery",
        secondary: "thekonery.com",
        href: "https://www.thekonery.com",
      },
    ],
  },
  coding: {
    active: "Running tools",
    complete: "Ran 3 tools",
    rows: [
      { primary: "Read", secondary: "flavors.ts" },
      { primary: "Edit", secondary: "ChurnSchedule.tsx", add: 74, remove: 41 },
      { primary: "Run", secondary: "npm run freeze" },
    ],
  },
};

const stageDelays = [700, 650, 1600, 1600];

function useTraceStage() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= stageDelays.length) return;
    const timer = window.setTimeout(
      () => setStage((current) => current + 1),
      stageDelays[stage],
    );
    return () => window.clearTimeout(timer);
  }, [stage]);
  return stage;
}

function SearchDot({ index }: { index: number }) {
  const tones = ["bg-primary", "bg-amber-500", "bg-emerald-600"];
  return (
    <span
      className={cn(
        "size-3 shrink-0 rounded-full",
        tones[index % tones.length],
      )}
    />
  );
}

export interface AgentActivity2Props {
  variant?: AgentActivity2Variant;
  className?: string;
}

/** A lightweight, expandable thinking trace with steps, reasoning, search, and coding variants. */
export function AgentActivity2({
  variant = "steps",
  className,
}: AgentActivity2Props) {
  const stage = useTraceStage();
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const trace = traces[variant];
  const working = stage < 3;
  const autoOpen = stage >= 1 && stage < 4;
  const isOpen = manualOpen ?? autoOpen;
  const visibleRows =
    stage < 2
      ? 0
      : stage === 2
        ? Math.min(2, trace.rows.length)
        : trace.rows.length;

  function toggleOpen() {
    setManualOpen((current) => !(current ?? autoOpen));
  }

  return (
    <section
      className={cn("flex min-h-52 w-full max-w-md flex-col", className)}
    >
      <button
        aria-expanded={isOpen}
        className="hover:bg-muted -mx-2 flex w-fit items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
        onClick={toggleOpen}
        type="button"
      >
        <Sparkles
          className={cn(
            "size-[18px]",
            working ? "text-foreground" : "text-muted-foreground",
          )}
        />
        {working ? (
          <ThinkingShimmer className="text-sm">
            {trace.active}
          </ThinkingShimmer>
        ) : (
          <span className="text-muted-foreground text-sm font-medium">
            {trace.complete}
          </span>
        )}
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-border relative mt-1.5 ml-2.5 border-l pl-5">
            {trace.query && (
              <div className="text-muted-foreground flex min-h-9 items-center gap-2.5 py-1.5 text-[13px]">
                <Search className="size-4" />
                {trace.query}
              </div>
            )}

            {trace.rows.slice(0, visibleRows).map((row, index) => {
              const selected = selectedTool === row.primary;
              const content = (
                <>
                  {variant === "search" && <SearchDot index={index} />}
                  {variant === "steps" &&
                    (index < visibleRows - 1 || !working ? (
                      <Check
                        className="text-muted-foreground size-4 shrink-0"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <span className="border-muted-foreground border-t-foreground size-4 shrink-0 animate-spin rounded-full border-2" />
                    ))}
                  {variant === "coding" &&
                    (index === 0 ? (
                      <Globe2 className="text-muted-foreground size-4 shrink-0" />
                    ) : index === 1 ? (
                      <FilePenLine className="text-muted-foreground size-4 shrink-0" />
                    ) : (
                      <Terminal className="text-muted-foreground size-4 shrink-0" />
                    ))}
                  <span
                    className={cn(
                      "min-w-0 text-[13px]",
                      variant === "reasoning"
                        ? "text-muted-foreground leading-relaxed"
                        : "font-medium",
                    )}
                  >
                    {row.primary}
                  </span>
                  {row.secondary && (
                    <span
                      className={cn(
                        "text-muted-foreground ml-auto shrink-0 text-xs",
                        variant === "coding" && "font-mono",
                      )}
                    >
                      {row.secondary}
                    </span>
                  )}
                  {row.add !== undefined && (
                    <span className="ml-auto shrink-0 font-mono text-xs tabular-nums">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +{row.add}
                      </span>{" "}
                      <span className="text-red-700 dark:text-red-400">
                        −{row.remove}
                      </span>
                    </span>
                  )}
                </>
              );

              const rowClass = cn(
                "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
                variant === "reasoning" && "items-start",
              );
              if (variant === "search") {
                return (
                  <a
                    className={cn(rowClass, "hover:bg-muted transition-colors")}
                    href={row.href}
                    key={row.primary}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {content}
                  </a>
                );
              }
              if (variant === "coding") {
                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      rowClass,
                      "transition-colors",
                      selected ? "bg-muted" : "hover:bg-muted",
                    )}
                    key={row.primary}
                    onClick={() =>
                      setSelectedTool(selected ? null : row.primary)
                    }
                    type="button"
                  >
                    {content}
                  </button>
                );
              }
              return (
                <div className={rowClass} key={row.primary}>
                  {content}
                </div>
              );
            })}
            {variant === "search" && stage >= 3 && (
              <span className="text-muted-foreground block px-2 py-1.5 text-[13px]">
                +7 more
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
