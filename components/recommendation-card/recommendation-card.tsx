"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../shared/utils";

type RecommendationOption = {
  key: string;
  description: ReactNode;
  summary: string;
  confidence: 0 | 1 | 2 | 3;
  label: string;
  action: string;
};

const options: RecommendationOption[] = [
  {
    key: "high",
    description: (
      <>
        Reorder waffle cones from <Code>cone_king</Code> with a lead time of{" "}
        <Code>7_days</Code>.
      </>
    ),
    summary: "Reorder from cone_king · 7-day lead",
    confidence: 3,
    label: "High confidence",
    action: "Accept",
  },
  {
    key: "review",
    description: (
      <>
        Switch vanilla to <Code>vanilla_madagascar</Code> for peak season.
      </>
    ),
    summary: "Switch to vanilla_madagascar",
    confidence: 2,
    label: "Needs review",
    action: "Configure",
  },
  {
    key: "none",
    description: (
      <>
        Fall back to a{" "}
        <strong className="text-foreground font-medium">full restock</strong>{" "}
        across every SKU.
      </>
    ),
    summary: "Full restock across every SKU",
    confidence: 0,
    label: "No signal",
    action: "Accept full restock",
  },
];

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="bg-primary/10 text-primary dark:bg-primary/15 rounded px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </code>
  );
}

function ConfidenceMeter({
  value,
}: {
  value: RecommendationOption["confidence"];
}) {
  return (
    <span
      aria-label={`${value} of 3 confidence`}
      className="flex items-end gap-0.5"
    >
      {[1, 2, 3].map((bar) => (
        <span
          className={cn(
            "w-1 rounded-full",
            bar <= value ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border",
          )}
          key={bar}
          style={{ height: `${6 + bar * 3}px` }}
        />
      ))}
    </span>
  );
}

export interface RecommendationCardProps {
  className?: string;
}

/** A compact agent recommendation with alternatives and a confirmation action. */
export function RecommendationCard({ className }: RecommendationCardProps) {
  const [selected, setSelected] = useState(0);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const active = options[selected];
  const alternatives = options.filter((_, index) => index !== selected);

  function choose(option: RecommendationOption) {
    setSelected(options.indexOf(option));
    setAccepted(false);
    setAlternativesOpen(false);
  }

  return (
    <section
      aria-label="Agent recommendation"
      className={cn(
        "border-border bg-card text-card-foreground w-full max-w-sm overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      <div className="p-4">
        <p className="text-sm font-semibold">
          Want me to place this restock order?
        </p>
        <p className="text-muted-foreground mt-2 min-h-11 text-[13px] leading-relaxed">
          {active.description}
        </p>
      </div>

      {alternativesOpen && (
        <div className="border-border bg-muted/40 border-t px-2 py-2">
          <p className="text-muted-foreground px-2 pb-1 text-[11px] font-medium">
            Other options
          </p>
          {alternatives.map((option) => (
            <button
              className="hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors"
              key={option.key}
              onClick={() => choose(option)}
              type="button"
            >
              <ConfidenceMeter value={option.confidence} />
              <span className="min-w-0 flex-1 truncate text-xs">
                {option.summary}
              </span>
              <span className="text-muted-foreground shrink-0 text-[11px]">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <footer className="border-border bg-muted/30 flex items-center justify-between gap-3 border-t p-3">
        <span className="flex items-center gap-2">
          <ConfidenceMeter value={active.confidence} />
          <span className="text-muted-foreground text-xs font-medium">
            {active.label}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <button
            aria-expanded={alternativesOpen}
            className="border-border hover:bg-muted inline-flex h-8 items-center gap-1 rounded-lg border bg-transparent px-2.5 text-xs font-medium transition-colors"
            onClick={() => setAlternativesOpen((open) => !open)}
            type="button"
          >
            Alternatives
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                alternativesOpen && "rotate-180",
              )}
            />
          </button>
          <button
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors",
              accepted
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "bg-primary text-primary-foreground hover:opacity-90",
            )}
            onClick={() => setAccepted(true)}
            type="button"
          >
            {accepted && <Check className="size-3.5" />}
            {accepted ? "Accepted" : active.action}
          </button>
        </span>
      </footer>
    </section>
  );
}
