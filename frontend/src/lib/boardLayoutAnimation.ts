import type { ColumnWithCards } from "./types";

export interface RectSnapshot {
  cards: Map<string, DOMRect>;
  columns: Map<string, DOMRect>;
}

// FLIP translates are additive in screen space: if both a column and a card
// inside it changed position relative to the page, animating the column by
// its delta and the card by its delta *relative to its column* produces the
// correct final position without double motion.
const DURATION_MS = 220;
const EASING = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const THRESHOLD_PX = 1;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function capture(
  root: HTMLElement,
  selector: string,
  attr: string
): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const id = el.getAttribute(attr);
    if (id) rects.set(id, el.getBoundingClientRect());
  });
  return rects;
}

export function captureRects(root: HTMLElement): RectSnapshot {
  return {
    cards: capture(root, "[data-card-id]", "data-card-id"),
    columns: capture(root, "[data-column-id]", "data-column-id"),
  };
}

export function animateRects(root: HTMLElement, before: RectSnapshot) {
  if (prefersReducedMotion()) return;
  const after = captureRects(root);

  const play = (el: HTMLElement, dx: number, dy: number) => {
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: DURATION_MS, easing: EASING }
    );
  };

  const animateOne = (
    el: HTMLElement,
    prevRect: DOMRect,
    nextRect: DOMRect,
    anchorPrev: DOMRect | undefined,
    anchorNow: DOMRect | undefined
  ) => {
    if (anchorPrev && anchorNow) {
      const relPrev = prevRect.left - anchorPrev.left;
      const relNow = nextRect.left - anchorNow.left;
      const relPrevY = prevRect.top - anchorPrev.top;
      const relNowY = nextRect.top - anchorNow.top;
      if (Math.abs(relPrev - relNow) < THRESHOLD_PX && Math.abs(relPrevY - relNowY) < THRESHOLD_PX) {
        // did not move relative to its container — the container's
        // animation carries it
        return;
      }
    }
    const dx = prevRect.left - nextRect.left;
    const dy = prevRect.top - nextRect.top;
    if (Math.abs(dx) < THRESHOLD_PX && Math.abs(dy) < THRESHOLD_PX) return;
    play(el, dx, dy);
  };

  after.columns.forEach((nextRect, id) => {
    const prevRect = before.columns.get(id);
    const el = root.querySelector<HTMLElement>(`[data-column-id="${id}"]`);
    if (!prevRect || !el) return;
    animateOne(el, prevRect, nextRect, undefined, undefined);
  });

  after.cards.forEach((nextRect, id) => {
    const prevRect = before.cards.get(id);
    const el = root.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
    if (!prevRect || !el) return;
    const columnEl = el.closest<HTMLElement>("[data-column-id]");
    const columnId = columnEl?.getAttribute("data-column-id") ?? undefined;
    animateOne(
      el,
      prevRect,
      nextRect,
      columnId ? before.columns.get(columnId) : undefined,
      columnId ? after.columns.get(columnId) : undefined
    );
  });
}

function layoutSignature(columns: ColumnWithCards[]): string {
  return columns
    .map((c) => `${c.id}:${c.cards.map((k) => k.id).join(",")}`)
    .join("|");
}

export function layoutEqual(a: ColumnWithCards[], b: ColumnWithCards[]) {
  return layoutSignature(a) === layoutSignature(b);
}
