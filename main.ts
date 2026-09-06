import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, debounce } from "obsidian";

const VIEW_TYPE_PLAYGROUND = "irisidian-playground";

type VisibilityMode = "active" | "always" | "editing" | "hover" | "manual";
type FollowTarget = "mouse" | "text-cursor" | "smart" | "both";
type Personality = "calm" | "curious" | "dramatic" | "goofy" | "suspicious" | "sleepy" | "chaotic" | "shy" | "focused" | "mischievous";
type Intensity = "subtle" | "normal" | "expressive" | "chaotic" | "custom";
type Randomness = "low" | "medium" | "high" | "custom";
type PositionPreset = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "sidebar" | "statusbar" | "floating" | "custom";
type FocusModeSetting = "manual" | "writing" | "fullscreen" | "off";
type TriggerType = "event" | "hover" | "idle" | "command" | "keyboard";
type Reaction =
  | "idle-neutral" | "blink" | "slow-blink" | "sleepy" | "look-left" | "look-right" | "look-up" | "look-down"
  | "wide-stare" | "happy" | "shocked" | "suspicious" | "angry" | "sad" | "confused" | "dizzy"
  | "cross-eyed" | "eye-roll" | "nervous" | "typing" | "cut" | "copy" | "paste" | "delete"
  | "undo" | "redo" | "idle-long" | "wake" | "hover-suspicious" | "fast-movement" | "peek"
  | "sleepy-idle" | "chaotic-stare" | "dramatic-shock" | "rapid-typing-focus" | "drag-tracking";

interface ActionMapping {
  name: string;
  triggerType: TriggerType;
  enabled: boolean;
  reactionPool: Reaction[];
  intensity: number;
  cooldownMs: number;
}

interface EyePairConfig {
  skinId: string;
  personality: Personality;
  offsetX: number;
  offsetY: number;
}

interface IrisidianSettings {
  enabled: boolean;
  visible: boolean;
  visibilityMode: VisibilityMode;
  followTarget: FollowTarget;
  followSensitivity: number;
  smoothing: number;
  reactionsEnabled: boolean;
  reactionIntensity: Intensity;
  customIntensity: number;
  randomness: Randomness;
  customRandomness: number;
  personality: Personality;
  skinId: string;
  eyePairCount: number;
  perPairVariation: boolean;
  pairConfigs: EyePairConfig[];
  positionPreset: PositionPreset;
  customX: number;
  customY: number;
  dragEnabled: boolean;
  peekMode: boolean;
  peekFaceMask: boolean;
  irisColor: string;
  pupilColor: string;
  eyelidColor: string;
  eyelidShadowColor: string;
  irisGlow: number;
  emotionStrength: number;
  blinkSpeed: number;
  reactionHoldMs: number;
  debugOverlay: boolean;
  size: number;
  opacity: number;
  zIndex: number;
  animationSmoothness: number;
  focusMode: FocusModeSetting;
  focusModeActive: boolean;
  dndMode: boolean;
  subtleMode: boolean;
  soundEffects: boolean;
  pausedReactions: boolean;
  onboardingComplete: boolean;
  actionMappings: ActionMapping[];
  disabledActions: string[];
}

interface SkinDefinition {
  id: string;
  name: string;
  flavor: string;
  supportsColorOverrides: boolean;
  iris: string;
  pupil: string;
  eyeWhite: string;
  outline: string;
  accent: string;
}

const REACTIONS: Reaction[] = [
  "idle-neutral", "blink", "slow-blink", "sleepy", "look-left", "look-right", "look-up", "look-down",
  "wide-stare", "happy", "shocked", "suspicious", "angry", "sad", "confused", "dizzy", "cross-eyed",
  "eye-roll", "nervous", "typing", "cut", "copy", "paste", "delete", "undo", "redo", "idle-long",
  "wake", "hover-suspicious", "fast-movement", "peek", "sleepy-idle", "chaotic-stare", "dramatic-shock",
  "rapid-typing-focus", "drag-tracking"
];

const SKINS: SkinDefinition[] = [
  ["robot", "Robot", "Mechanical lenses with tiny LED attitude.", "#42d9ff", "#09121c", "#eef8ff", "#6a7685", "#ffcc33"],
  ["cat", "Cat", "Soft fur, sharp focus, vertical pupils.", "#58d34f", "#050806", "#f4ead2", "#5a514d", "#f3b08b"]
].map(([id, name, flavor, iris, pupil, eyeWhite, outline, accent]) => ({
  id, name, flavor, iris, pupil, eyeWhite, outline, accent, supportsColorOverrides: true
}));

const AVAILABLE_SKIN_IDS = new Set(SKINS.map((skin) => skin.id));

const PERSONALITY_OPTIONS: Record<Personality, { label: string; blink: number; energy: number; lag: number; chaos: number }> = {
  calm: { label: "Calm", blink: 1.25, energy: 0.75, lag: 1.3, chaos: 0.4 },
  curious: { label: "Curious", blink: 1, energy: 1, lag: 1, chaos: 0.75 },
  dramatic: { label: "Dramatic", blink: 0.9, energy: 1.55, lag: 0.8, chaos: 1.1 },
  goofy: { label: "Goofy", blink: 0.85, energy: 1.35, lag: 0.75, chaos: 1.45 },
  suspicious: { label: "Suspicious", blink: 1.15, energy: 0.95, lag: 1.1, chaos: 0.9 },
  sleepy: { label: "Sleepy", blink: 1.6, energy: 0.55, lag: 1.55, chaos: 0.35 },
  chaotic: { label: "Chaotic", blink: 0.7, energy: 1.8, lag: 0.55, chaos: 1.8 },
  shy: { label: "Shy", blink: 1.35, energy: 0.65, lag: 1.25, chaos: 0.55 },
  focused: { label: "Focused", blink: 1.05, energy: 0.8, lag: 0.9, chaos: 0.35 },
  mischievous: { label: "Mischievous", blink: 0.95, energy: 1.2, lag: 0.9, chaos: 1.15 }
};

const DEFAULT_ACTIONS: ActionMapping[] = [
  ["mouse move", "event", ["idle-neutral"], 0.3, 150],
  ["click", "event", ["blink", "wide-stare"], 0.8, 500],
  ["double click", "event", ["shocked", "happy"], 1, 800],
  ["drag", "event", ["drag-tracking", "nervous"], 1, 350],
  ["typing", "keyboard", ["typing", "look-down", "rapid-typing-focus"], 0.8, 250],
  ["rapid typing", "keyboard", ["rapid-typing-focus", "cross-eyed", "nervous"], 1.1, 900],
  ["idle", "idle", ["blink", "slow-blink", "sleepy-idle", "look-left", "look-right", "eye-roll"], 0.6, 5000],
  ["wake up", "event", ["wake", "wide-stare", "happy"], 1, 1000],
  ["copy", "keyboard", ["copy", "suspicious", "happy"], 0.9, 900],
  ["cut", "keyboard", ["cut", "shocked", "angry"], 1.2, 900],
  ["paste", "keyboard", ["paste", "happy", "wide-stare"], 1, 900],
  ["delete", "keyboard", ["delete", "shocked", "suspicious"], 1, 800],
  ["backspace spam", "keyboard", ["nervous", "rapid-typing-focus", "confused"], 1.1, 950],
  ["undo", "keyboard", ["undo", "confused", "eye-roll"], 0.9, 850],
  ["redo", "keyboard", ["redo", "happy", "confused"], 0.8, 850],
  ["new note", "event", ["wake", "happy"], 0.8, 1200],
  ["open note", "event", ["wake", "happy", "wide-stare"], 0.7, 900],
  ["close note", "event", ["sad", "slow-blink"], 0.6, 1000],
  ["open command palette", "event", ["wide-stare", "suspicious"], 0.9, 1000],
  ["open search", "event", ["look-left", "look-right", "typing"], 0.8, 900],
  ["switch tab", "event", ["look-left", "look-right", "confused"], 0.7, 650],
  ["hover trash", "hover", ["hover-suspicious", "shocked", "suspicious"], 1.1, 900],
  ["hover command palette", "hover", ["wide-stare", "suspicious"], 0.8, 900],
  ["hover link", "hover", ["peek", "happy", "look-down"], 0.7, 600],
  ["scroll fast", "event", ["dizzy", "confused"], 1, 850],
  ["quick mouse movement", "event", ["dizzy", "chaotic-stare", "fast-movement"], 1.2, 800]
].map(([name, triggerType, reactionPool, intensity, cooldownMs]) => ({
  name: name as string,
  triggerType: triggerType as TriggerType,
  enabled: true,
  reactionPool: reactionPool as Reaction[],
  intensity: intensity as number,
  cooldownMs: cooldownMs as number
}));

const DEFAULT_SETTINGS: IrisidianSettings = {
  enabled: true,
  visible: true,
  visibilityMode: "active",
  followTarget: "smart",
  followSensitivity: 0.8,
  smoothing: 0.18,
  reactionsEnabled: true,
  reactionIntensity: "normal",
  customIntensity: 1,
  randomness: "medium",
  customRandomness: 0.55,
  personality: "curious",
  skinId: "robot",
  eyePairCount: 1,
  perPairVariation: false,
  pairConfigs: [],
  positionPreset: "top-right",
  customX: 24,
  customY: 80,
  dragEnabled: true,
  peekMode: false,
  peekFaceMask: true,
  irisColor: "#42d9ff",
  pupilColor: "#07111b",
  eyelidColor: "#2a2d30",
  eyelidShadowColor: "#030508",
  irisGlow: 0.7,
  emotionStrength: 1,
  blinkSpeed: 1,
  reactionHoldMs: 0,
  debugOverlay: false,
  size: 180,
  opacity: 0.95,
  zIndex: 1000,
  animationSmoothness: 24,
  focusMode: "off",
  focusModeActive: false,
  dndMode: false,
  subtleMode: false,
  soundEffects: false,
  pausedReactions: false,
  onboardingComplete: false,
  disabledActions: [],
  actionMappings: DEFAULT_ACTIONS
};

function baseEyeAsset(skinId: string, side: "left" | "right"): string {
  return `assets/skins/${skinId}/eyes/${side}-base.png`;
}

function thumbnailAsset(skinId: string): string {
  return `assets/skins/${skinId}/thumbnail.png`;
}

function maskAsset(skinId: string, mask: "tab-panel"): string {
  return `assets/skins/${skinId}/masks/${mask}.png`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pick<T>(items: T[], randomness: number): T {
  if (!items.length) throw new Error("Cannot pick from an empty list.");
  if (randomness <= 0.1) return items[0];
  return items[Math.floor(Math.random() * items.length)];
}

function labels<T extends string>(record: Record<T, string>): Record<T, string> {
  return record;
}

const VISIBILITY_LABELS = labels<VisibilityMode>({
  active: "Only when Obsidian window is active",
  always: "Always visible",
  editing: "Only in editing mode",
  hover: "Only on hover / wake behavior",
  manual: "Manual toggle"
});

const FOLLOW_LABELS = labels<FollowTarget>({
  mouse: "Mouse cursor",
  "text-cursor": "Text cursor",
  smart: "Smart / Auto",
  both: "Both"
});

const INTENSITY_LABELS = labels<Intensity>({
  subtle: "Subtle",
  normal: "Normal",
  expressive: "Expressive",
  chaotic: "Chaotic",
  custom: "Custom"
});

const RANDOMNESS_LABELS = labels<Randomness>({
  low: "Low",
  medium: "Medium",
  high: "High",
  custom: "Custom"
});

const POSITION_LABELS = labels<PositionPreset>({
  "top-left": "Top Left",
  "top-right": "Top Right",
  "bottom-left": "Bottom Left",
  "bottom-right": "Bottom Right",
  sidebar: "Sidebar",
  statusbar: "Statusbar",
  floating: "Floating Window",
  custom: "Custom Position"
});

const FOCUS_LABELS = labels<FocusModeSetting>({
  manual: "Manual toggle",
  writing: "Auto during writing",
  fullscreen: "Auto during fullscreen",
  off: "Off"
});

const LAYERED_SKINS = new Set(["robot", "cat"]);

const REACTION_LABELS = labels<Reaction>({
  "idle-neutral": "Neutral",
  blink: "Blink",
  "slow-blink": "Slow blink",
  sleepy: "Sleepy",
  "look-left": "Look left",
  "look-right": "Look right",
  "look-up": "Look up",
  "look-down": "Look down",
  "wide-stare": "Wide stare",
  happy: "Happy",
  shocked: "Shocked",
  suspicious: "Suspicious",
  angry: "Angry",
  sad: "Sad",
  confused: "Confused",
  dizzy: "Dizzy",
  "cross-eyed": "Cross-eyed",
  "eye-roll": "Eye roll",
  nervous: "Nervous",
  typing: "Typing",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  delete: "Delete",
  undo: "Undo",
  redo: "Redo",
  "idle-long": "Long idle",
  wake: "Wake",
  "hover-suspicious": "Hover suspicious",
  "fast-movement": "Fast movement",
  peek: "Peek",
  "sleepy-idle": "Sleepy idle",
  "chaotic-stare": "Chaotic stare",
  "dramatic-shock": "Dramatic shock",
  "rapid-typing-focus": "Rapid typing",
  "drag-tracking": "Drag tracking"
});

const BEHAVIOR_PRESETS: Record<string, Partial<IrisidianSettings>> = {
  subtle: { personality: "focused", reactionIntensity: "subtle", randomness: "low", followSensitivity: 0.55, smoothing: 0.12, emotionStrength: 0.65, blinkSpeed: 0.85 },
  lively: { personality: "curious", reactionIntensity: "expressive", randomness: "medium", followSensitivity: 0.9, smoothing: 0.2, emotionStrength: 1.1, blinkSpeed: 1.05 },
  dramatic: { personality: "dramatic", reactionIntensity: "chaotic", randomness: "high", followSensitivity: 1.1, smoothing: 0.28, emotionStrength: 1.35, blinkSpeed: 1.2 },
  sleepy: { personality: "sleepy", reactionIntensity: "subtle", randomness: "low", followSensitivity: 0.45, smoothing: 0.1, emotionStrength: 0.8, blinkSpeed: 0.72 }
};

class EyeController {
  private root: HTMLDivElement | null = null;
  private pairs: HTMLDivElement[] = [];
  private target = { x: window.innerWidth - 80, y: 80 };
  private eased = { x: window.innerWidth - 80, y: 80 };
  private currentReaction: Reaction = "idle-neutral";
  private frame = 0;
  private idleTimer = 0;
  private blinkTimer = 0;
  private dragging = false;
  private dragOffset = { x: 0, y: 0 };
  private cleanups: Array<() => void> = [];
  private lastAction = new Map<string, number>();
  private lastMouse = { x: 0, y: 0, t: Date.now() };
  private typingHits: number[] = [];
  private reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private workspaceEventsRegistered = false;

  constructor(private plugin: IrisidianPlugin) {}

  mount(parent: HTMLElement): void {
    if (!this.root) {
      this.root = createDiv({ cls: "irisidian-root" });
      this.root.setAttr("aria-label", "Irisidian living eyes");
      this.root.setAttr("role", "img");
      this.root.tabIndex = 0;
      this.buildPairs();
    }
    if (this.root.parentElement !== parent) parent.appendChild(this.root);
    this.applySettings();
    if (!this.cleanups.length) this.registerListeners();
    if (!this.frame) this.loop();
  }

  unload(): void {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.idleTimer) window.clearTimeout(this.idleTimer);
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer);
    this.root?.remove();
    this.root = null;
    this.pairs = [];
  }

  refresh(): void {
    if (!this.root) return;
    this.buildPairs();
    this.applySettings();
    this.react("wake up");
  }

  applySettings(): void {
    const s = this.plugin.settings;
    if (!this.root) return;
    this.root.toggleClass("is-hidden", !s.enabled || !s.visible || !this.visibilityAllowsDisplay());
    this.root.toggleClass("is-peeking", s.peekMode);
    this.root.toggleClass("is-focus-mode", this.isFocusMode());
    this.root.toggleClass("is-reduced-motion", this.reduceMotion.matches);
    this.root.toggleClass("show-debug", s.debugOverlay);
    this.root.style.setProperty("--irisidian-size", `${s.size}px`);
    this.root.parentElement?.style.setProperty("--irisidian-size", `${s.size}px`);
    this.root.style.setProperty("--irisidian-opacity", `${s.opacity}`);
    this.root.style.setProperty("--irisidian-z", `${s.zIndex}`);
    this.root.style.setProperty("--iris-color", s.irisColor);
    this.root.style.setProperty("--pupil-color", s.pupilColor);
    this.root.style.setProperty("--eyelid-color", s.eyelidColor);
    this.root.style.setProperty("--eyelid-shadow-color", s.eyelidShadowColor);
    this.root.style.setProperty("--iris-glow", `${s.irisGlow}`);
    this.root.style.setProperty("--lid-transition-scale", `${1 / Math.max(0.2, s.blinkSpeed)}`);
    this.positionRoot();
    this.updateAssets();
  }

  react(actionName: string, forced?: Reaction): void {
    const s = this.plugin.settings;
    if (!s.reactionsEnabled || s.pausedReactions || s.dndMode) return;
    const mapping = s.actionMappings.find((item) => item.name === actionName);
    if (!forced && mapping && (!mapping.enabled || s.disabledActions.includes(mapping.name))) return;
    if (!forced && mapping) {
      const last = this.lastAction.get(mapping.name) ?? 0;
      if (Date.now() - last < mapping.cooldownMs) return;
      this.lastAction.set(mapping.name, Date.now());
    }
    const pool = forced ? [forced] : mapping?.reactionPool ?? ["blink"];
    const reaction = this.resolveReaction(pick(pool, this.randomness()));
    this.setReaction(reaction);
    const duration = this.reactionDuration(reaction, mapping?.intensity ?? 1);
    window.setTimeout(() => this.setReaction("idle-neutral"), duration);
  }

  setVisible(visible: boolean): void {
    this.plugin.settings.visible = visible;
    this.plugin.saveSettings();
    this.applySettings();
  }

  randomizeStyle(): void {
    this.plugin.settings.skinId = pick(SKINS.map((skin) => skin.id), 1);
    this.plugin.saveSettings();
    this.refresh();
  }

  randomizePersonality(): void {
    this.plugin.settings.personality = pick(Object.keys(PERSONALITY_OPTIONS) as Personality[], 1);
    this.plugin.saveSettings();
    this.refresh();
  }

  resetPosition(): void {
    this.plugin.settings.customX = 24;
    this.plugin.settings.customY = 80;
    this.plugin.saveSettings();
    this.applySettings();
  }

  private buildPairs(): void {
    if (!this.root) return;
    this.root.empty();
    this.pairs = [];
    const count = clamp(this.plugin.settings.eyePairCount, 1, 12);
    for (let i = 0; i < count; i++) {
      const pair = this.root.createDiv({ cls: "irisidian-pair" });
      const layered = pair.createDiv({ cls: "irisidian-layered-eyes" });
      const leftSlot = layered.createDiv({ cls: "irisidian-eye-slot irisidian-eye-slot-left" });
      leftSlot.createEl("img", { cls: "irisidian-eye irisidian-eye-left", attr: { alt: "" } });
      leftSlot.createDiv({ cls: "irisidian-iris", attr: { "aria-hidden": "true" } }).createDiv({ cls: "irisidian-pupil" });
      leftSlot.createDiv({ cls: "irisidian-lid irisidian-lid-upper", attr: { "aria-hidden": "true" } });
      leftSlot.createDiv({ cls: "irisidian-lid irisidian-lid-lower", attr: { "aria-hidden": "true" } });
      const rightSlot = layered.createDiv({ cls: "irisidian-eye-slot irisidian-eye-slot-right" });
      rightSlot.createEl("img", { cls: "irisidian-eye irisidian-eye-right", attr: { alt: "" } });
      rightSlot.createDiv({ cls: "irisidian-iris", attr: { "aria-hidden": "true" } }).createDiv({ cls: "irisidian-pupil" });
      rightSlot.createDiv({ cls: "irisidian-lid irisidian-lid-upper", attr: { "aria-hidden": "true" } });
      rightSlot.createDiv({ cls: "irisidian-lid irisidian-lid-lower", attr: { "aria-hidden": "true" } });
      pair.createEl("img", { cls: "irisidian-peek-mask", attr: { alt: "" } });
      this.pairs.push(pair);
    }
  }

  private registerListeners(): void {
    const add = <K extends keyof DocumentEventMap>(type: K, fn: (event: DocumentEventMap[K]) => void, options?: AddEventListenerOptions) => {
      document.addEventListener(type, fn, options);
      this.cleanups.push(() => document.removeEventListener(type, fn, options));
    };
    add("mousemove", (event) => this.onMouseMove(event), { passive: true });
    add("pointerup", () => this.stopDrag(), { passive: true });
    add("click", () => this.react("click"), { passive: true });
    add("dblclick", () => this.react("double click"), { passive: true });
    add("copy", () => this.react("copy"));
    add("cut", () => this.react("cut"));
    add("paste", () => this.react("paste"));
    add("keydown", (event) => this.onKeyDown(event));
    add("scroll", debounce(() => this.react("scroll fast"), 150, true), { passive: true, capture: true });
    document.addEventListener("mouseover", this.hoverHandler, { passive: true });
    this.cleanups.push(() => document.removeEventListener("mouseover", this.hoverHandler));
    window.addEventListener("focus", this.focusHandler);
    window.addEventListener("blur", this.focusHandler);
    this.cleanups.push(() => {
      window.removeEventListener("focus", this.focusHandler);
      window.removeEventListener("blur", this.focusHandler);
    });
    if (!this.workspaceEventsRegistered) {
      this.plugin.registerEvent(this.plugin.app.workspace.on("active-leaf-change", () => this.react("switch tab")));
      this.plugin.registerEvent(this.plugin.app.workspace.on("file-open", (file) => this.react(file instanceof TFile ? "open note" : "close note")));
      this.workspaceEventsRegistered = true;
    }
    this.scheduleIdle();
    this.scheduleBlink();
  }

  private hoverHandler = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest(".nav-action-button.is-trash, .mod-trash, [aria-label*='trash' i], [aria-label*='delete' i]")) this.react("hover trash");
    else if (target.closest(".suggestion-container, .prompt, .modal.mod-command-palette")) this.react("hover command palette");
    else if (target.closest("a, .cm-link, .internal-link, .external-link")) this.react("hover link");
    else if (target.closest(".workspace-ribbon, .side-dock-ribbon")) this.react("hover command palette");
    if (this.plugin.settings.visibilityMode === "hover") this.setVisible(true);
  };

  private focusHandler = (): void => this.applySettings();

  private onMouseMove(event: MouseEvent): void {
    const now = Date.now();
    const dx = event.clientX - this.lastMouse.x;
    const dy = event.clientY - this.lastMouse.y;
    const dt = Math.max(1, now - this.lastMouse.t);
    const speed = Math.hypot(dx, dy) / dt;
    this.lastMouse = { x: event.clientX, y: event.clientY, t: now };
    if (this.dragging) this.drag(event);
    if (this.plugin.settings.followTarget !== "text-cursor") this.target = { x: event.clientX, y: event.clientY };
    if (speed > 2.2) this.react("quick mouse movement");
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const mod = event.metaKey || event.ctrlKey;
    if (mod && key === "c") this.react("copy");
    else if (mod && key === "x") this.react("cut");
    else if (mod && key === "v") this.react("paste");
    else if (mod && key === "z" && event.shiftKey) this.react("redo");
    else if (mod && key === "z") this.react("undo");
    else if (mod && key === "y") this.react("redo");
    else if (key === "delete") this.react("delete");
    else if (key === "backspace") this.trackTyping(true);
    else if (key.length === 1 || key === "enter" || key === "tab" || key === " ") this.trackTyping(false);
    if (this.plugin.settings.followTarget === "text-cursor" || this.plugin.settings.followTarget === "smart" || this.plugin.settings.followTarget === "both") {
      this.followTextCursorSoon();
    }
  }

  private trackTyping(backspace: boolean): void {
    const now = Date.now();
    this.typingHits = this.typingHits.filter((t) => now - t < 1200);
    this.typingHits.push(now);
    if (backspace && this.typingHits.length > 8) this.react("backspace spam");
    else if (this.typingHits.length > 12) this.react("rapid typing");
    else this.react("typing");
    if (this.plugin.settings.focusMode === "writing") {
      this.plugin.settings.focusModeActive = true;
      this.plugin.saveSettings();
      this.applySettings();
      window.setTimeout(() => {
        if (this.plugin.settings.focusMode === "writing") {
          this.plugin.settings.focusModeActive = false;
          this.plugin.saveSettings();
          this.applySettings();
        }
      }, 2500);
    }
  }

  private followTextCursorSoon(): void {
    window.setTimeout(() => {
      const cursor = document.querySelector(".cm-cursor-primary, .cm-cursor") as HTMLElement | null;
      if (!cursor) return;
      const rect = cursor.getBoundingClientRect();
      if (rect.width || rect.height) this.target = { x: rect.left, y: rect.top };
    }, 0);
  }

  private startDrag(event: PointerEvent): void {
    if (!this.plugin.settings.dragEnabled || !this.root) return;
    if (this.root.closest(".irisidian-stage")) return;
    this.dragging = true;
    const rect = this.root.getBoundingClientRect();
    this.dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.react("drag");
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private drag(event: MouseEvent): void {
    const s = this.plugin.settings;
    s.positionPreset = "floating";
    s.customX = clamp(event.clientX - this.dragOffset.x, 0, window.innerWidth - s.size);
    s.customY = clamp(event.clientY - this.dragOffset.y, 0, window.innerHeight - s.size);
    this.positionRoot();
  }

  private stopDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.plugin.saveSettings();
  }

  private loop = (): void => {
    const s = this.plugin.settings;
    if (this.root && !this.root.hasClass("is-hidden")) {
      const smoothing = clamp(s.smoothing / PERSONALITY_OPTIONS[s.personality].lag, 0.04, 0.8);
      this.eased.x += (this.target.x - this.eased.x) * smoothing;
      this.eased.y += (this.target.y - this.eased.y) * smoothing;
      for (const pair of this.pairs) {
        const rect = pair.getBoundingClientRect();
        const energy = this.isFocusMode() ? 0.35 : PERSONALITY_OPTIONS[s.personality].energy * this.intensity();
        const irises = pair.querySelectorAll<HTMLElement>(".irisidian-iris");
        if (irises.length) {
          irises.forEach((iris) => {
            const slot = iris.closest(".irisidian-eye-slot") as HTMLElement | null;
            const pupil = iris.querySelector<HTMLElement>(".irisidian-pupil");
            const eyeRect = slot?.getBoundingClientRect() ?? rect;
            const cx = eyeRect.left + eyeRect.width / 2 || rect.left + rect.width / 2;
            const cy = eyeRect.top + eyeRect.height / 2 || rect.top + rect.height / 2;
            const vx = this.eased.x - cx;
            const vy = this.eased.y - cy;
            const distance = Math.hypot(vx, vy);
            const baseTravel = Math.min(eyeRect.width, eyeRect.height) * s.followSensitivity * energy;
            const strength = clamp(distance / 280, 0, 1);
            const angle = Math.atan2(vy, vx);
            iris.style.setProperty("--iris-x", `${Math.cos(angle) * baseTravel * 0.085 * strength}px`);
            iris.style.setProperty("--iris-y", `${Math.sin(angle) * baseTravel * 0.07 * strength}px`);
            pupil?.style.setProperty("--pupil-x", `${Math.cos(angle) * baseTravel * 0.13 * strength}px`);
            pupil?.style.setProperty("--pupil-y", `${Math.sin(angle) * baseTravel * 0.11 * strength}px`);
          });
        }
      }
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private scheduleIdle(): void {
    const base = this.isFocusMode() ? 9000 : 4500;
    const jitter = 6000 * this.randomness();
    this.idleTimer = window.setTimeout(() => {
      this.react("idle");
      this.scheduleIdle();
    }, base + Math.random() * jitter);
  }

  private scheduleBlink(): void {
    const personality = PERSONALITY_OPTIONS[this.plugin.settings.personality];
    const interval = (2600 + Math.random() * 4200 * this.randomness()) * personality.blink;
    this.blinkTimer = window.setTimeout(() => {
      this.setReaction(this.isFocusMode() ? "blink" : pick(["blink", "slow-blink"], this.randomness()));
      window.setTimeout(() => this.setReaction("idle-neutral"), 180 / Math.max(0.2, this.plugin.settings.blinkSpeed));
      this.scheduleBlink();
    }, interval);
  }

  private setReaction(reaction: Reaction): void {
    this.currentReaction = this.resolveReaction(reaction);
    this.updateAssets();
  }

  private applyReactionState(pair: HTMLElement): void {
    const reaction = this.currentReaction;
    const strength = this.plugin.settings.emotionStrength;
    const set = (name: string, value: string) => pair.style.setProperty(name, value);
    const pct = (value: number) => `${value * strength}%`;
    set("--lid-upper-left", "-55%");
    set("--lid-lower-left", "58%");
    set("--lid-upper-right", "-55%");
    set("--lid-lower-right", "58%");
    set("--lid-tilt-left", "0deg");
    set("--lid-tilt-right", "0deg");
    set("--lid-lower-tilt-left", "0deg");
    set("--lid-lower-tilt-right", "0deg");
    set("--reaction-iris-x-left", "0%");
    set("--reaction-iris-y-left", "0%");
    set("--reaction-iris-x-right", "0%");
    set("--reaction-iris-y-right", "0%");
    set("--reaction-pupil-x-left", "0%");
    set("--reaction-pupil-y-left", "0%");
    set("--reaction-pupil-x-right", "0%");
    set("--reaction-pupil-y-right", "0%");
    set("--iris-scale", "1");
    set("--pupil-scale", "1");
    set("--iris-opacity", "1");
    set("--iris-filter", "none");
    set("--eye-vibe", "0deg");

    if (reaction === "blink" || reaction === "slow-blink") {
      set("--lid-upper-left", "1%");
      set("--lid-lower-left", "2%");
      set("--lid-upper-right", "1%");
      set("--lid-lower-right", "2%");
      set("--pupil-scale", "0.72");
    } else if (reaction === "sleepy" || reaction === "sleepy-idle" || reaction === "idle-long") {
      set("--lid-upper-left", "-8%");
      set("--lid-lower-left", "36%");
      set("--lid-upper-right", "-8%");
      set("--lid-lower-right", "36%");
      set("--reaction-iris-y-left", pct(5));
      set("--reaction-iris-y-right", pct(5));
      set("--reaction-pupil-y-left", pct(8));
      set("--reaction-pupil-y-right", pct(8));
      set("--iris-opacity", "0.82");
      set("--pupil-scale", "0.86");
    } else if (reaction === "suspicious" || reaction === "hover-suspicious") {
      set("--lid-upper-left", "-17%");
      set("--lid-lower-left", "47%");
      set("--lid-upper-right", "-31%");
      set("--lid-lower-right", "54%");
      set("--lid-tilt-left", "-7deg");
      set("--lid-tilt-right", "7deg");
      set("--lid-lower-tilt-left", "3deg");
      set("--lid-lower-tilt-right", "-3deg");
      set("--reaction-iris-x-left", pct(5));
      set("--reaction-iris-x-right", pct(-5));
      set("--reaction-pupil-x-left", pct(8));
      set("--reaction-pupil-x-right", pct(-8));
      set("--pupil-scale", "0.92");
    } else if (reaction === "angry" || reaction === "delete" || reaction === "cut") {
      set("--lid-upper-left", "-12%");
      set("--lid-lower-left", "49%");
      set("--lid-upper-right", "-12%");
      set("--lid-lower-right", "49%");
      set("--lid-tilt-left", "10deg");
      set("--lid-tilt-right", "-10deg");
      set("--lid-lower-tilt-left", "-4deg");
      set("--lid-lower-tilt-right", "4deg");
      set("--reaction-iris-y-left", pct(-3));
      set("--reaction-iris-y-right", pct(-3));
      set("--reaction-pupil-y-left", pct(-5));
      set("--reaction-pupil-y-right", pct(-5));
      set("--iris-filter", "hue-rotate(155deg) saturate(1.25)");
    } else if (reaction === "shocked" || reaction === "wide-stare" || reaction === "wake" || reaction === "dramatic-shock") {
      set("--lid-upper-left", "-72%");
      set("--lid-lower-left", "70%");
      set("--lid-upper-right", "-72%");
      set("--lid-lower-right", "70%");
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(-2));
      set("--iris-scale", "1.08");
      set("--pupil-scale", "0.74");
    } else if (reaction === "happy" || reaction === "copy" || reaction === "paste" || reaction === "redo") {
      set("--lid-upper-left", "-42%");
      set("--lid-lower-left", "50%");
      set("--lid-upper-right", "-42%");
      set("--lid-lower-right", "50%");
      set("--lid-tilt-left", "-4deg");
      set("--lid-tilt-right", "4deg");
      set("--lid-lower-tilt-left", "2deg");
      set("--lid-lower-tilt-right", "-2deg");
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(-2));
      set("--iris-scale", "1.03");
    } else if (reaction === "sad" || reaction === "undo") {
      set("--lid-upper-left", "-22%");
      set("--lid-lower-left", "43%");
      set("--lid-upper-right", "-22%");
      set("--lid-lower-right", "43%");
      set("--lid-tilt-left", "-8deg");
      set("--lid-tilt-right", "8deg");
      set("--lid-lower-tilt-left", "4deg");
      set("--lid-lower-tilt-right", "-4deg");
      set("--reaction-iris-y-left", pct(7));
      set("--reaction-iris-y-right", pct(7));
      set("--reaction-pupil-y-left", pct(10));
      set("--reaction-pupil-y-right", pct(10));
      set("--iris-opacity", "0.78");
    } else if (reaction === "confused" || reaction === "dizzy" || reaction === "cross-eyed" || reaction === "eye-roll") {
      if (reaction === "cross-eyed") {
        set("--reaction-iris-x-left", pct(9));
        set("--reaction-iris-x-right", pct(-9));
        set("--reaction-pupil-x-left", pct(14));
        set("--reaction-pupil-x-right", pct(-14));
      } else if (reaction === "eye-roll") {
        set("--reaction-iris-y-left", pct(-10));
        set("--reaction-iris-y-right", pct(-10));
        set("--reaction-pupil-y-left", pct(-14));
        set("--reaction-pupil-y-right", pct(-14));
      } else {
        set("--reaction-iris-x-left", pct(-5));
        set("--reaction-iris-x-right", pct(5));
        set("--reaction-pupil-x-left", pct(-8));
        set("--reaction-pupil-x-right", pct(8));
      }
      set("--eye-vibe", reaction === "dizzy" ? "2deg" : "-1deg");
      set("--iris-scale", "0.94");
      set("--pupil-scale", "0.9");
    } else if (reaction === "typing" || reaction === "rapid-typing-focus") {
      set("--lid-upper-left", "-36%");
      set("--lid-lower-left", "53%");
      set("--lid-upper-right", "-36%");
      set("--lid-lower-right", "53%");
      set("--reaction-iris-y-left", pct(5));
      set("--reaction-iris-y-right", pct(5));
      set("--reaction-pupil-y-left", pct(7));
      set("--reaction-pupil-y-right", pct(7));
      set("--iris-filter", "saturate(1.2)");
    } else if (reaction === "look-left" || reaction === "peek") {
      set("--reaction-iris-x-left", pct(-10));
      set("--reaction-iris-x-right", pct(-10));
      set("--reaction-pupil-x-left", pct(-15));
      set("--reaction-pupil-x-right", pct(-15));
    } else if (reaction === "look-right" || reaction === "drag-tracking" || reaction === "fast-movement") {
      set("--reaction-iris-x-left", pct(10));
      set("--reaction-iris-x-right", pct(10));
      set("--reaction-pupil-x-left", pct(15));
      set("--reaction-pupil-x-right", pct(15));
    } else if (reaction === "look-up" || reaction === "chaotic-stare") {
      set("--reaction-iris-y-left", pct(-10));
      set("--reaction-iris-y-right", pct(-10));
      set("--reaction-pupil-y-left", pct(-15));
      set("--reaction-pupil-y-right", pct(-15));
    } else if (reaction === "look-down") {
      set("--reaction-iris-y-left", pct(10));
      set("--reaction-iris-y-right", pct(10));
      set("--reaction-pupil-y-left", pct(15));
      set("--reaction-pupil-y-right", pct(15));
    }
  }

  private updateAssets(): void {
    const s = this.plugin.settings;
    for (let index = 0; index < this.pairs.length; index++) {
      const pair = this.pairs[index];
      const config = s.pairConfigs[index];
      const skin = s.perPairVariation && config ? config.skinId : s.skinId;
      const skinDef = SKINS.find((item) => item.id === skin) ?? SKINS[0];
      const hasLayeredAssets = LAYERED_SKINS.has(skinDef.id);
      const hasPeekMask = hasLayeredAssets && s.peekFaceMask;
      pair.dataset.skin = skinDef.id;
      pair.dataset.reaction = this.currentReaction;
      this.applyReactionState(pair);
      pair.toggleClass("has-layered-assets", hasLayeredAssets);
      pair.toggleClass("has-peek-mask", hasPeekMask);
      pair.style.setProperty("--accent", skinDef.accent);
      const left = pair.querySelector<HTMLImageElement>(".irisidian-eye-left");
      const right = pair.querySelector<HTMLImageElement>(".irisidian-eye-right");
      const mask = pair.querySelector<HTMLImageElement>(".irisidian-peek-mask");
      if (left) left.setAttr("src", hasLayeredAssets ? this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${baseEyeAsset(skinDef.id, "left")}`) : "");
      if (right) right.setAttr("src", hasLayeredAssets ? this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${baseEyeAsset(skinDef.id, "right")}`) : "");
      if (mask) mask.setAttr("src", hasPeekMask ? this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${maskAsset(skinDef.id, "tab-panel")}`) : "");
      pair.style.transform = `translate(${index * 10}px, ${index * 8}px)`;
    }
  }

  private resolveReaction(reaction: Reaction): Reaction {
    if (REACTIONS.includes(reaction)) return reaction;
    const fallbacks: Partial<Record<Reaction, Reaction>> = {
      cut: "shocked",
      delete: "shocked",
      "idle-long": "idle-neutral",
      dizzy: "confused",
      "fast-movement": "dizzy",
      "hover-suspicious": "suspicious"
    };
    return fallbacks[reaction] ?? "idle-neutral";
  }

  private positionRoot(): void {
    if (!this.root) return;
    if (this.root.closest(".irisidian-stage")) {
      this.root.removeClasses(["pos-top-left", "pos-top-right", "pos-bottom-left", "pos-bottom-right", "pos-sidebar", "pos-statusbar", "pos-floating", "pos-custom"]);
      this.root.style.left = "";
      this.root.style.top = "";
      this.root.style.right = "";
      this.root.style.bottom = "";
      return;
    }
    const s = this.plugin.settings;
    this.root.removeClasses(["pos-top-left", "pos-top-right", "pos-bottom-left", "pos-bottom-right", "pos-sidebar", "pos-statusbar", "pos-floating", "pos-custom"]);
    this.root.addClass(`pos-${s.positionPreset}`);
    if (s.positionPreset === "floating" || s.positionPreset === "custom") {
      this.root.style.left = `${s.customX}px`;
      this.root.style.top = `${s.customY}px`;
      this.root.style.right = "";
      this.root.style.bottom = "";
    } else {
      this.root.style.left = "";
      this.root.style.top = "";
    }
  }

  private visibilityAllowsDisplay(): boolean {
    const mode = this.plugin.settings.visibilityMode;
    if (mode === "always" || mode === "manual") return true;
    if (mode === "active") return document.hasFocus();
    if (mode === "editing") return !!document.querySelector(".markdown-source-view.mod-cm6, .is-live-preview");
    if (mode === "hover") return this.plugin.settings.visible;
    return true;
  }

  private intensity(): number {
    if (this.plugin.settings.subtleMode) return 0.45;
    if (this.isFocusMode()) return 0.35;
    return { subtle: 0.45, normal: 1, expressive: 1.35, chaotic: 1.8, custom: this.plugin.settings.customIntensity }[this.plugin.settings.reactionIntensity];
  }

  private randomness(): number {
    return { low: 0.2, medium: 0.55, high: 0.85, custom: this.plugin.settings.customRandomness }[this.plugin.settings.randomness];
  }

  private reactionDuration(reaction: Reaction, multiplier: number): number {
    const base = reaction.includes("typing") ? 380 : reaction.includes("shock") || reaction === "shocked" ? 780 : 560;
    return this.reduceMotion.matches ? 180 : base * multiplier * this.intensity() + this.plugin.settings.reactionHoldMs;
  }

  private isFocusMode(): boolean {
    return this.plugin.settings.focusModeActive || this.plugin.settings.focusMode === "fullscreen" && !!document.fullscreenElement;
  }
}

class QuickUiModal extends Modal {
  constructor(app: App, private plugin: IrisidianPlugin) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("irisidian-modal");
    contentEl.createEl("h2", { text: "Irisidian" });
    const grid = contentEl.createDiv({ cls: "irisidian-quick-grid" });
    this.button(grid, this.plugin.settings.visible ? "Hide eyes" : "Show eyes", () => this.plugin.controller.setVisible(!this.plugin.settings.visible));
    this.button(grid, "Switch personality", () => this.plugin.nextPersonality());
    this.button(grid, this.plugin.settings.focusModeActive ? "Focus off" : "Focus mode", () => this.plugin.toggleFocusMode());
    this.button(grid, this.plugin.settings.pausedReactions ? "Resume reactions" : "Pause reactions", () => this.plugin.togglePauseReactions());
    this.button(grid, "Randomize personality", () => {
      this.plugin.controller.randomizePersonality();
    });
    this.button(grid, "Irisidian tab", () => {
      this.close();
      this.plugin.openPlayground();
    });
    this.button(grid, "Full settings", () => {
      this.close();
      (this.app as App & { setting?: { open: () => void; openTabById: (id: string) => void } }).setting?.open();
      (this.app as App & { setting?: { openTabById: (id: string) => void } }).setting?.openTabById(this.plugin.manifest.id);
    });
  }

  private button(parent: HTMLElement, label: string, onClick: () => void): void {
    const button = parent.createEl("button", { text: label, cls: "mod-cta" });
    button.addEventListener("click", () => {
      onClick();
      this.plugin.controller.applySettings();
      this.onOpen();
    });
  }
}

class OnboardingModal extends Modal {
  private step = 0;
  private steps = [
    "Welcome to Irisidian",
    "Choose a style",
    "Choose a personality",
    "Choose follow behavior",
    "Choose reaction intensity",
    "Quick privacy explanation",
    "Start"
  ];

  constructor(app: App, private plugin: IrisidianPlugin) {
    super(app);
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("irisidian-modal");
    contentEl.createEl("h2", { text: this.steps[this.step] });
    if (this.step === 1) this.select(contentEl, SKINS.map((s) => [s.id, s.name]), this.plugin.settings.skinId, (value) => this.plugin.settings.skinId = value);
    else if (this.step === 2) this.select(contentEl, Object.entries(PERSONALITY_OPTIONS).map(([id, p]) => [id, p.label]), this.plugin.settings.personality, (value) => this.plugin.settings.personality = value as Personality);
    else if (this.step === 3) this.select(contentEl, Object.entries(FOLLOW_LABELS), this.plugin.settings.followTarget, (value) => this.plugin.settings.followTarget = value as FollowTarget);
    else if (this.step === 4) this.select(contentEl, Object.entries(INTENSITY_LABELS), this.plugin.settings.reactionIntensity, (value) => this.plugin.settings.reactionIntensity = value as Intensity);
    else if (this.step === 5) contentEl.createEl("p", { text: "Irisidian only reacts to local UI events. It does not read note text, clipboard contents, accounts, or the internet." });
    else contentEl.createEl("p", { text: "Put living googly eyes in Obsidian." });
    const nav = contentEl.createDiv({ cls: "irisidian-modal-nav" });
    if (this.step > 0) this.navButton(nav, "Back", () => this.step--);
    this.navButton(nav, this.step === this.steps.length - 1 ? "Start" : "Next", async () => {
      if (this.step === this.steps.length - 1) {
        this.plugin.settings.onboardingComplete = true;
        await this.plugin.saveSettings();
        this.plugin.controller.refresh();
        this.close();
      } else {
        this.step++;
        await this.plugin.saveSettings();
        this.plugin.controller.refresh();
      }
    });
  }

  private navButton(parent: HTMLElement, text: string, fn: () => void): void {
    parent.createEl("button", { text }).addEventListener("click", () => {
      fn();
      this.render();
    });
  }

  private select(parent: HTMLElement, options: string[][], value: string, onChange: (value: string) => void): void {
    new Setting(parent).addDropdown((dropdown) => {
      options.forEach(([id, label]) => dropdown.addOption(id, label));
      dropdown.setValue(value);
      dropdown.onChange((next) => {
        onChange(next);
        this.plugin.saveSettings();
        this.plugin.controller.refresh();
      });
    });
  }
}

class PlaygroundView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: IrisidianPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PLAYGROUND;
  }

  getDisplayText(): string {
    return "Irisidian";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.plugin.controller.unload();
  }

  render(): void {
    const el = this.containerEl.children[1] as HTMLElement;
    el.empty();
    el.addClass("irisidian-playground");
    el.createEl("h2", { text: "Irisidian" });
    const stage = el.createDiv({ cls: "irisidian-stage" });
    this.plugin.controller.mount(stage);
    const controls = el.createDiv({ cls: "irisidian-control-row" });
    new Setting(controls).setName("Style").addDropdown((d) => {
      SKINS.forEach((skin) => d.addOption(skin.id, skin.name));
      d.setValue(this.plugin.settings.skinId);
      d.onChange(async (value) => {
        this.plugin.settings.skinId = value;
        await this.plugin.saveSettings();
        this.plugin.controller.refresh();
      });
    });
    new Setting(controls).setName("Personality").addDropdown((d) => {
      Object.entries(PERSONALITY_OPTIONS).forEach(([id, p]) => d.addOption(id, p.label));
      d.setValue(this.plugin.settings.personality);
      d.onChange(async (value) => {
        this.plugin.settings.personality = value as Personality;
        await this.plugin.saveSettings();
        this.plugin.controller.refresh();
      });
    });
    new Setting(controls).setName("Size").addSlider((slider) => {
      slider.setLimits(36, 220, 2).setValue(this.plugin.settings.size);
      slider.onChange(async (value) => {
        this.plugin.settings.size = value;
        await this.plugin.saveSettings();
        this.plugin.controller.applySettings();
      });
    });
    new Setting(controls).setName("Eye pairs").addSlider((slider) => {
      slider.setLimits(1, 6, 1).setValue(this.plugin.settings.eyePairCount);
      slider.onChange(async (value) => {
        this.plugin.settings.eyePairCount = value;
        await this.plugin.saveSettings();
        this.plugin.controller.refresh();
      });
    });
    new Setting(controls).setName("Iris").addColorPicker((picker) => {
      picker.setValue(this.plugin.settings.irisColor).onChange(async (value) => {
        this.plugin.settings.irisColor = value;
        await this.plugin.saveSettings();
        this.plugin.controller.applySettings();
      });
    });
    new Setting(controls).setName("Eyelids").addColorPicker((picker) => {
      picker.setValue(this.plugin.settings.eyelidColor).onChange(async (value) => {
        this.plugin.settings.eyelidColor = value;
        await this.plugin.saveSettings();
        this.plugin.controller.applySettings();
      });
    });
    new Setting(controls).setName("Emotion").addSlider((slider) => {
      slider.setLimits(0.25, 1.8, 0.05).setValue(this.plugin.settings.emotionStrength);
      slider.onChange(async (value) => {
        this.plugin.settings.emotionStrength = value;
        await this.plugin.saveSettings();
        this.plugin.controller.refresh();
      });
    });
    const buttons = el.createDiv({ cls: "irisidian-reaction-grid" });
    [
      ["Blink", "blink"], ["Shock", "shocked"], ["Suspicious", "suspicious"], ["Sleep", "sleepy"], ["Copy", "copy"], ["Cut", "cut"],
      ["Paste", "paste"], ["Delete", "delete"], ["Undo", "undo"], ["Dizzy", "dizzy"], ["Idle", "idle-long"], ["Random", "idle-neutral"]
    ].forEach(([label, reaction]) => {
      buttons.createEl("button", { text: label }).addEventListener("click", () => {
        if (label === "Random") this.plugin.controller.react("idle");
        else this.plugin.controller.react("playground", reaction as Reaction);
      });
    });
    el.createDiv({ cls: "irisidian-preview-note", text: "Irisidian is embedded in this tab. It follows local UI events without reading note or clipboard content." });
  }
}

class IrisidianSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: IrisidianPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("irisidian-settings");
    containerEl.createEl("h2", { text: "Irisidian" });
    containerEl.createEl("p", { text: "Irisidian reacts to local events only. It does not read note contents or clipboard contents." });

    new Setting(containerEl).setName("Enable plugin").addToggle((toggle) => toggle.setValue(this.plugin.settings.enabled).onChange((value) => this.save("enabled", value)));
    new Setting(containerEl).setName("Visibility mode").addDropdown((d) => this.dropdown(d, VISIBILITY_LABELS, this.plugin.settings.visibilityMode, (v) => this.save("visibilityMode", v as VisibilityMode)));
    new Setting(containerEl).setName("Follow target").addDropdown((d) => this.dropdown(d, FOLLOW_LABELS, this.plugin.settings.followTarget, (v) => this.save("followTarget", v as FollowTarget)));
    new Setting(containerEl).setName("Follow sensitivity").addSlider((s) => s.setLimits(0.1, 1.5, 0.05).setValue(this.plugin.settings.followSensitivity).onChange((v) => this.save("followSensitivity", v)));
    new Setting(containerEl).setName("Smoothing").addSlider((s) => s.setLimits(0.04, 0.8, 0.02).setValue(this.plugin.settings.smoothing).onChange((v) => this.save("smoothing", v)));

    containerEl.createEl("h3", { text: "Behavior presets" });
    new Setting(containerEl)
      .setName("Quick behavior")
      .setDesc("Start here, then fine-tune below.")
      .addButton((b) => b.setButtonText("Subtle").onClick(() => this.applyPreset("subtle")))
      .addButton((b) => b.setButtonText("Lively").onClick(() => this.applyPreset("lively")))
      .addButton((b) => b.setButtonText("Dramatic").onClick(() => this.applyPreset("dramatic")))
      .addButton((b) => b.setButtonText("Sleepy").onClick(() => this.applyPreset("sleepy")));

    containerEl.createEl("h3", { text: "Reactions" });
    new Setting(containerEl).setName("Enable reactions").addToggle((t) => t.setValue(this.plugin.settings.reactionsEnabled).onChange((v) => this.save("reactionsEnabled", v)));
    new Setting(containerEl).setName("Reaction intensity").addDropdown((d) => this.dropdown(d, INTENSITY_LABELS, this.plugin.settings.reactionIntensity, (v) => this.save("reactionIntensity", v as Intensity)));
    new Setting(containerEl).setName("Randomness").addDropdown((d) => this.dropdown(d, RANDOMNESS_LABELS, this.plugin.settings.randomness, (v) => this.save("randomness", v as Randomness)));
    new Setting(containerEl).setName("Emotion strength").setDesc("How far the eyes and lids push each expression.").addSlider((s) => s.setLimits(0.25, 1.8, 0.05).setValue(this.plugin.settings.emotionStrength).onChange((v) => this.save("emotionStrength", v)));
    new Setting(containerEl).setName("Blink speed").setDesc("Higher is snappier, lower is softer.").addSlider((s) => s.setLimits(0.35, 1.8, 0.05).setValue(this.plugin.settings.blinkSpeed).onChange((v) => this.save("blinkSpeed", v)));
    new Setting(containerEl).setName("Reaction hold").setDesc("Adds a little extra time before an expression returns to neutral.").addSlider((s) => s.setLimits(0, 1200, 50).setValue(this.plugin.settings.reactionHoldMs).onChange((v) => this.save("reactionHoldMs", v)));
    new Setting(containerEl).setName("Pause reactions").addToggle((t) => t.setValue(this.plugin.settings.pausedReactions).onChange((v) => this.save("pausedReactions", v)));

    containerEl.createEl("h3", { text: "Personality and skin" });
    new Setting(containerEl).setName("Personality").addDropdown((d) => {
      Object.entries(PERSONALITY_OPTIONS).forEach(([id, p]) => d.addOption(id, p.label));
      d.setValue(this.plugin.settings.personality).onChange((v) => this.save("personality", v as Personality));
    });
    const skinGrid = containerEl.createDiv({ cls: "irisidian-skin-grid" });
    SKINS.forEach((skin) => {
      const card = skinGrid.createDiv({ cls: `irisidian-skin-card ${skin.id === this.plugin.settings.skinId ? "is-selected" : ""}` });
      card.createEl("img", { attr: { src: this.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${thumbnailAsset(skin.id)}`), alt: "" } });
      card.createEl("strong", { text: skin.name });
      card.createEl("span", { text: skin.flavor });
      card.addEventListener("click", () => this.save("skinId", skin.id));
    });
    new Setting(containerEl).setName("Number of eye pairs").addSlider((s) => s.setLimits(1, 6, 1).setValue(this.plugin.settings.eyePairCount).onChange((v) => this.save("eyePairCount", v)));
    new Setting(containerEl).setName("Per-pair variation").addToggle((t) => t.setValue(this.plugin.settings.perPairVariation).onChange((v) => this.save("perPairVariation", v)));

    containerEl.createEl("h3", { text: "Look" });
    new Setting(containerEl).setName("Iris color").addColorPicker((picker) => picker.setValue(this.plugin.settings.irisColor).onChange((v) => this.save("irisColor", v)));
    new Setting(containerEl).setName("Pupil color").addColorPicker((picker) => picker.setValue(this.plugin.settings.pupilColor).onChange((v) => this.save("pupilColor", v)));
    new Setting(containerEl).setName("Eyelid color").addColorPicker((picker) => picker.setValue(this.plugin.settings.eyelidColor).onChange((v) => this.save("eyelidColor", v)));
    new Setting(containerEl).setName("Eyelid shadow").addColorPicker((picker) => picker.setValue(this.plugin.settings.eyelidShadowColor).onChange((v) => this.save("eyelidShadowColor", v)));
    new Setting(containerEl).setName("Iris glow").addSlider((s) => s.setLimits(0, 1.5, 0.05).setValue(this.plugin.settings.irisGlow).onChange((v) => this.save("irisGlow", v)));

    containerEl.createEl("h3", { text: "Embedded tab" });
    new Setting(containerEl).setName("Peek mode").addToggle((t) => t.setValue(this.plugin.settings.peekMode).onChange((v) => this.save("peekMode", v)));
    new Setting(containerEl).setName("Embedded panel mask").setDesc("Adds a full-width tab panel overlay so the eyes sit inside Obsidian instead of looking like a floating mask. Supported by layered skins such as Robot.").addToggle((t) => t.setValue(this.plugin.settings.peekFaceMask).onChange((v) => this.save("peekFaceMask", v)));
    new Setting(containerEl).setName("Debug eye windows").setDesc("Shows the eye-window boxes and centers while tuning a skin.").addToggle((t) => t.setValue(this.plugin.settings.debugOverlay).onChange((v) => this.save("debugOverlay", v)));
    new Setting(containerEl).setName("Size").addSlider((s) => s.setLimits(36, 220, 2).setValue(this.plugin.settings.size).onChange((v) => this.save("size", v)));
    new Setting(containerEl).setName("Opacity").addSlider((s) => s.setLimits(0.2, 1, 0.05).setValue(this.plugin.settings.opacity).onChange((v) => this.save("opacity", v)));
    new Setting(containerEl).setName("Layering / z-index").addText((t) => t.setValue(String(this.plugin.settings.zIndex)).onChange((v) => this.save("zIndex", Number(v) || 1000)));
    new Setting(containerEl).setName("Animation frame count / smoothness").addSlider((s) => s.setLimits(8, 60, 1).setValue(this.plugin.settings.animationSmoothness).onChange((v) => this.save("animationSmoothness", v)));

    containerEl.createEl("h3", { text: "Focus and accessibility" });
    new Setting(containerEl).setName("Focus mode").addDropdown((d) => this.dropdown(d, FOCUS_LABELS, this.plugin.settings.focusMode, (v) => this.save("focusMode", v as FocusModeSetting)));
    new Setting(containerEl).setName("DND mode").addToggle((t) => t.setValue(this.plugin.settings.dndMode).onChange((v) => this.save("dndMode", v)));
    new Setting(containerEl).setName("Subtle mode").addToggle((t) => t.setValue(this.plugin.settings.subtleMode).onChange((v) => this.save("subtleMode", v)));
    new Setting(containerEl).setName("Sound effects").setDesc("Off by default. V1 focuses on visual feedback.").addToggle((t) => t.setValue(this.plugin.settings.soundEffects).onChange((v) => this.save("soundEffects", v)));

    containerEl.createEl("h3", { text: "Action reactions" });
    new Setting(containerEl)
      .setName("Reset reactions")
      .setDesc("Restores the default reactions for typing, clicks, copy, paste, hover, and idle.")
      .addButton((button) => button.setButtonText("Reset").onClick(() => this.resetActions()));
    this.plugin.settings.actionMappings.forEach((mapping, index) => {
      const setting = new Setting(containerEl).setName(mapping.name).setDesc(mapping.triggerType);
      setting.addToggle((t) => t.setValue(mapping.enabled).onChange((v) => {
        this.plugin.settings.actionMappings[index].enabled = v;
        this.plugin.saveSettings();
      }));
      setting.addDropdown((dropdown) => {
        Object.entries(REACTION_LABELS).forEach(([id, label]) => dropdown.addOption(id, label));
        dropdown.setValue(mapping.reactionPool[0] ?? "blink");
        dropdown.onChange((value) => {
          this.plugin.settings.actionMappings[index].reactionPool = [value as Reaction];
          this.plugin.saveSettings();
          this.plugin.controller.react("settings-preview", value as Reaction);
        });
      });
      setting.addSlider((slider) => slider.setLimits(0.2, 1.8, 0.1).setValue(mapping.intensity).onChange((value) => {
        this.plugin.settings.actionMappings[index].intensity = value;
        this.plugin.saveSettings();
      }));
      setting.addText((t) => t.setPlaceholder("cooldown ms").setValue(String(mapping.cooldownMs)).onChange((v) => {
        this.plugin.settings.actionMappings[index].cooldownMs = Number(v) || mapping.cooldownMs;
        this.plugin.saveSettings();
      }));
    });
    new Setting(containerEl).setName("Add custom action").setDesc("Creates a local event mapping you can trigger from commands or future extensions.").addButton((button) => {
      button.setButtonText("Add").onClick(async () => {
        this.plugin.settings.actionMappings.push({ name: `custom action ${this.plugin.settings.actionMappings.length + 1}`, triggerType: "command", enabled: true, reactionPool: ["happy", "blink"], intensity: 1, cooldownMs: 1000 });
        await this.plugin.saveSettings();
        this.display();
      });
    });

    containerEl.createEl("h3", { text: "Preview tools" });
    new Setting(containerEl).setName("Quick UI").addButton((b) => b.setButtonText("Open").onClick(() => new QuickUiModal(this.app, this.plugin).open()));
    new Setting(containerEl).setName("Irisidian tab").addButton((b) => b.setButtonText("Open").onClick(() => this.plugin.openPlayground()));
    new Setting(containerEl).setName("Onboarding").addButton((b) => b.setButtonText("Restart").onClick(() => new OnboardingModal(this.app, this.plugin).open()));
  }

  private dropdown<T extends string>(dropdown: { addOption: (value: string, display: string) => unknown; setValue: (value: string) => { onChange: (cb: (value: string) => unknown) => unknown } }, options: Record<T, string>, value: T, onChange: (value: string) => void): void {
    Object.entries(options).forEach(([id, label]) => dropdown.addOption(id, label as string));
    dropdown.setValue(value).onChange(onChange);
  }

  private async applyPreset(id: string): Promise<void> {
    Object.assign(this.plugin.settings, BEHAVIOR_PRESETS[id]);
    await this.plugin.saveSettings();
    this.plugin.controller.refresh();
    this.display();
  }

  private async resetActions(): Promise<void> {
    this.plugin.settings.actionMappings = DEFAULT_ACTIONS.map((action) => ({ ...action, reactionPool: [...action.reactionPool] }));
    await this.plugin.saveSettings();
    this.plugin.controller.refresh();
    this.display();
  }

  private async save<K extends keyof IrisidianSettings>(key: K, value: IrisidianSettings[K]): Promise<void> {
    this.plugin.settings[key] = value;
    await this.plugin.saveSettings();
    this.plugin.controller.refresh();
    this.display();
  }
}

export default class IrisidianPlugin extends Plugin {
  settings: IrisidianSettings = DEFAULT_SETTINGS;
  controller!: EyeController;
  private statusEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.controller = new EyeController(this);
    this.registerView(VIEW_TYPE_PLAYGROUND, (leaf) => new PlaygroundView(leaf, this));
    this.addSettingTab(new IrisidianSettingTab(this.app, this));
    this.addRibbonIcon("eye", "Irisidian", () => new QuickUiModal(this.app, this).open());
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("irisidian-statusbar");
    this.statusEl.setText("Irisidian");
    this.statusEl.addEventListener("click", () => new QuickUiModal(this.app, this).open());
    this.addCommands();
    this.app.workspace.onLayoutReady(() => {
      this.openPlayground();
      if (!this.settings.onboardingComplete) window.setTimeout(() => new OnboardingModal(this.app, this).open(), 600);
    });
  }

  onunload(): void {
    this.controller.unload();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_PLAYGROUND);
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      actionMappings: this.mergeActions(loaded?.actionMappings ?? [])
    };
    if (!AVAILABLE_SKIN_IDS.has(this.settings.skinId)) this.settings.skinId = DEFAULT_SETTINGS.skinId;
    if (loaded?.size === 96) this.settings.size = DEFAULT_SETTINGS.size;
    this.settings.pairConfigs = this.settings.pairConfigs.filter((config) => AVAILABLE_SKIN_IDS.has(config.skinId));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  addCommands(): void {
    this.addCommand({ id: "toggle-irisidian", name: "Toggle Irisidian", callback: () => this.toggleEnabled() });
    this.addCommand({ id: "show-hide-eyes", name: "Show / Hide Eyes", callback: () => this.controller.setVisible(!this.settings.visible) });
    this.addCommand({ id: "open-quick-ui", name: "Open Quick UI", callback: () => new QuickUiModal(this.app, this).open(), hotkeys: [{ modifiers: ["Mod", "Shift"], key: "E" }] });
    this.addCommand({ id: "open-playground", name: "Open Irisidian Tab", callback: () => this.openPlayground() });
    this.addCommand({ id: "randomize-personality", name: "Randomize Personality", callback: () => this.controller.randomizePersonality() });
    this.addCommand({ id: "toggle-focus-mode", name: "Toggle Focus Mode", callback: () => this.toggleFocusMode() });
    this.addCommand({ id: "switch-next-personality", name: "Switch Next Personality", callback: () => this.nextPersonality() });
    this.addCommand({ id: "pause-reactions", name: "Pause Reactions", callback: () => this.setPaused(true) });
    this.addCommand({ id: "resume-reactions", name: "Resume Reactions", callback: () => this.setPaused(false) });
  }

  async toggleEnabled(): Promise<void> {
    this.settings.enabled = !this.settings.enabled;
    await this.saveSettings();
    this.controller.applySettings();
    new Notice(`Irisidian ${this.settings.enabled ? "enabled" : "disabled"}`);
  }

  async toggleFocusMode(): Promise<void> {
    this.settings.focusModeActive = !this.settings.focusModeActive;
    await this.saveSettings();
    this.controller.applySettings();
  }

  async togglePauseReactions(): Promise<void> {
    await this.setPaused(!this.settings.pausedReactions);
  }

  async setPaused(paused: boolean): Promise<void> {
    this.settings.pausedReactions = paused;
    await this.saveSettings();
    this.controller.applySettings();
  }

  async nextStyle(): Promise<void> {
    const ids = SKINS.map((skin) => skin.id);
    this.settings.skinId = ids[(ids.indexOf(this.settings.skinId) + 1) % ids.length];
    await this.saveSettings();
    this.controller.refresh();
  }

  async nextPersonality(): Promise<void> {
    const ids = Object.keys(PERSONALITY_OPTIONS) as Personality[];
    this.settings.personality = ids[(ids.indexOf(this.settings.personality) + 1) % ids.length];
    await this.saveSettings();
    this.controller.refresh();
  }

  async openPlayground(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PLAYGROUND)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_PLAYGROUND, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private mergeActions(saved: ActionMapping[]): ActionMapping[] {
    const byName = new Map(saved.map((action) => [action.name, action]));
    return [
      ...DEFAULT_ACTIONS.map((action) => ({ ...action, ...(byName.get(action.name) ?? {}) })),
      ...saved.filter((action) => !DEFAULT_ACTIONS.some((base) => base.name === action.name))
    ];
  }
}
