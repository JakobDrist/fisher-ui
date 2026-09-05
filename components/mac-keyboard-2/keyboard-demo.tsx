"use client";
import React from "react";
import { Keyboard } from "./keyboard";

export default function KeyboardDemo() {
  return (
    <div className="flex min-h-96 w-full items-center justify-center py-10 md:min-h-180">
      <Keyboard enableSound className="origin-center -translate-y-4 scale-[1.28]" />
    </div>
  );
}
