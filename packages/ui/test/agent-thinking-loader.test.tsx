/**
 * AgentThinkingLoader — l'état « l'agent réfléchit / répond »
 * (docs/ui-libraries.md §9.3). Fondé sur le modèle de thinking
 * assistant-ui (`MessageStatus`) : le composant est muet (Étape 2),
 * piloté par la prop `status`.
 *
 * Asserté via structure + `data-*` flags (docs/ui-libraries.md §6 :
 * les états sont data-driven, testables via les attributs data).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import {
  AgentThinkingLoader,
  DEFAULT_THINKING_WORDS,
} from "src/components/ui/AgentThinkingLoader";
import { render } from "./render";

/** Simule `prefers-reduced-motion` (jsdom matchMedia → toujours false). */
function mockReducedMotion(reduced: boolean) {
  const orig = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = orig;
  };
}

describe("AgentThinkingLoader (assistant-ui thinking, ui-libraries §9.3)", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = mockReducedMotion(false);
  });
  afterEach(() => {
    restore();
  });

  it("thinking = points + mot de thinking rotatif + libellé SR stable", () => {
    const { container, unmount } = render(<AgentThinkingLoader />);
    const root = container.querySelector<HTMLElement>("[data-agent-thinking]");
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-thinking-state")).toBe("thinking");
    expect(root?.getAttribute("role")).toBe("status");
    expect(root?.getAttribute("aria-live")).toBe("polite");
    // 3 points de suspension
    expect(root?.querySelector("[data-thinking-dots]")?.children.length).toBe(3);
    // mot rotatif = le 1er par défaut ; libellé SR stable à côté
    expect(root?.querySelector("span.min-w-0[aria-hidden]")?.textContent?.trim()).toBe(
      DEFAULT_THINKING_WORDS[0],
    );
    unmount();
  });

  it("streaming / requires-action / error rendent leur propre ligne", () => {
    for (const status of ["streaming", "requires-action", "error"] as const) {
      const { container, unmount } = render(<AgentThinkingLoader status={status} />);
      const root = container.querySelector<HTMLElement>("[data-agent-thinking]");
      expect(root?.getAttribute("data-thinking-state")).toBe(status);
      unmount();
    }
  });

  it("error + onRetry rend le bouton Réessayer", () => {
    const onRetry = vi.fn();
    const { container, unmount } = render(
      <AgentThinkingLoader status="error" onRetry={onRetry} />,
    );
    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Réessayer"),
    );
    expect(btn).not.toBeNull();
    btn?.click();
    expect(onRetry).toHaveBeenCalled();
    unmount();
  });

  it("complete ne rend rien", () => {
    const { container, unmount } = render(
      <AgentThinkingLoader status="complete" />,
    );
    expect(container.querySelector("[data-agent-thinking]")).toBeNull();
    unmount();
  });

  it("chip durée optionnelle (Réflexion · Ns)", () => {
    const { container, unmount } = render(
      <AgentThinkingLoader elapsedSeconds={12} />,
    );
    expect(container.querySelector("[data-thinking-elapsed]")?.textContent).toBe(
      "Réflexion · 12 s",
    );
    unmount();
  });

  it("reduced-motion = rendu statique sans crash (05 §2.6 rule 2)", () => {
    restore();
    const restore2 = mockReducedMotion(true);
    const { container, unmount } = render(<AgentThinkingLoader />);
    const root = container.querySelector<HTMLElement>("[data-agent-thinking]");
    expect(root).not.toBeNull();
    expect(root?.querySelector("[data-thinking-dots]")).not.toBeNull();
    unmount();
    restore2();
  });
});
