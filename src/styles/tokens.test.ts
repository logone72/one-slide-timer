import { expect, it } from "vitest";

import { THEMES } from "@/domain/timer/timerTypes";

import base from "./base.css?raw";
import tokens from "./tokens.css?raw";

it("keeps shared style values in tokens and defines every referenced token", () => {
  const declarations = new Set(
    [...tokens.matchAll(/(--[\w-]+):/g)].map((match) => match[1])
  );
  const dynamic = new Set([
    "--timer-color",
    "--timer-y",
    "--rail-height",
    "--timer-count",
    "--range-progress",
  ]);
  const references = [...(base + tokens).matchAll(/var\((--[\w-]+)/g)].map(
    (match) => match[1]
  );
  expect(
    references.filter(
      (name) => !declarations.has(name) && !dynamic.has(name ?? "")
    )
  ).toEqual([]);
  const rules = base.replace(/@media[^{]+/g, "");
  expect(rules).not.toMatch(/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(|\dpx\b/i);
  for (const theme of THEMES) {
    expect(tokens).toContain(`[data-theme="${theme.id}"]`);
  }
});
