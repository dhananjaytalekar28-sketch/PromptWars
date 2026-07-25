import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

type MediaQueryListStub = MediaQueryList & {
  addListener: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
};

function createMatchMedia(matches = false): (query: string) => MediaQueryListStub {
  return (query: string): MediaQueryListStub => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "0px";
  readonly thresholds: ReadonlyArray<number> = [0];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class SpeechSynthesisUtteranceStub implements SpeechSynthesisUtterance {
  text = "";
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;
  rate = 1;
  pitch = 1;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown) | null =
    null;
  onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onmark: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onboundary: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }

  constructor(text?: string) {
    if (typeof text === "string") this.text = text;
  }
}

const speechSynthesisStub: SpeechSynthesis = {
  pending: false,
  speaking: false,
  paused: false,
  onvoiceschanged: null,
  getVoices: () => [],
  speak: () => undefined,
  cancel: () => undefined,
  pause: () => undefined,
  resume: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: createMatchMedia(false),
});

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
});

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  writable: true,
  configurable: true,
  value: function scrollIntoView(): void {},
});

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (): Promise<void> => undefined,
    readText: async (): Promise<string> => "",
  } satisfies Pick<Clipboard, "writeText" | "readText">,
});

Object.defineProperty(window, "SpeechSynthesisUtterance", {
  writable: true,
  configurable: true,
  value: SpeechSynthesisUtteranceStub,
});

Object.defineProperty(window, "speechSynthesis", {
  configurable: true,
  value: speechSynthesisStub,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
