import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, debounce, setIcon, type SettingDefinitionItem, type SettingGroupItem } from "obsidian";
import { GENERATED_LAYERED_SKINS, GENERATED_SKIN_AMBIENT_REACTIONS, GENERATED_SKIN_EYE_WINDOWS, GENERATED_SKINS } from "./generated-skins";

const VIEW_TYPE_PLAYGROUND = "googly-eyes-playground";

type VisibilityMode = "active" | "always" | "editing" | "hover" | "manual";
type FollowTarget = "mouse" | "text-cursor" | "smart" | "both";
type Personality = "calm" | "curious" | "dramatic" | "goofy" | "suspicious" | "sleepy" | "chaotic" | "shy" | "focused" | "mischievous";
type Intensity = "subtle" | "normal" | "expressive" | "chaotic" | "custom";
type Randomness = "low" | "medium" | "high" | "custom";
type SettingsMode = "simple" | "advanced";
type PositionPreset = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "sidebar" | "statusbar" | "floating" | "custom";
type FocusModeSetting = "manual" | "writing" | "fullscreen" | "off";
type TriggerType = "event" | "hover" | "idle" | "command" | "keyboard";
type Reaction =
  | "idle-neutral" | "blink" | "slow-blink" | "sleepy" | "look-left" | "look-right" | "look-up" | "look-down"
  | "wide-stare" | "happy" | "shocked" | "suspicious" | "angry" | "sad" | "confused" | "dizzy"
  | "cross-eyed" | "eye-roll" | "nervous" | "typing" | "cut" | "copy" | "paste" | "delete"
  | "undo" | "redo" | "idle-long" | "wake" | "hover-suspicious" | "fast-movement" | "peek"
  | "sleepy-idle" | "chaotic-stare" | "dramatic-shock" | "rapid-typing-focus" | "drag-tracking"
  | "furious" | "restless" | "in-love" | "dreamy" | "drunk" | "stoned" | "spacing-out"
  | "crying" | "laughing" | "wink-left" | "wink-right" | "panic" | "starstruck"
  | "disgust" | "guilt" | "shame" | "sympathy" | "curiosity" | "jealousy" | "pride"
  | "bored" | "apathy" | "acceptance" | "calm" | "inspiration" | "passion" | "hope"
  | "frustration" | "relief" | "embarrassment" | "surprise-delight" | "distrust"
  | "determination" | "confusion-spiral" | "mischief" | "annoyance" | "fear-freeze"
  | "excitement" | "satisfaction" | "skepticism" | "overwhelmed" | "loneliness"
  | "gratitude" | "trust" | "doubt" | "concentration" | "playfulness" | "impatience"
  | "surprise-fear" | "awe" | "tired-but-awake" | "contentment" | "alertness" | "suspense"
  | "shyness" | "awkwardness" | "guilt-panic" | "interest" | "disappointment" | "contempt"
  | "smug" | "concern" | "anticipation" | "startled-recovery" | "meditative" | "deadpan";

type ActionTuple = [string, TriggerType, Reaction[], number, number];

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

interface EyeWindow {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ReactionTuning {
  lidMultiplier?: number;
  gazeMultiplier?: number;
  pupilScaleMultiplier?: number;
  irisScaleMultiplier?: number;
  eyeBaseScaleMultiplier?: number;
  vibeMultiplier?: number;
  durationMultiplier?: number;
}

interface GooglyEyesSettings {
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
  settingsMode: SettingsMode;
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
  useSkinDefaultColors: boolean;
  irisColor: string;
  pupilColor: string;
  irisSizeScale: number;
  pupilSizeScale: number;
  eyelidColor: string;
  eyelidShadowColor: string;
  irisGlow: number;
  emotionStrength: number;
  blinkSpeed: number;
  reactionHoldMs: number;
  ambientEmotionsEnabled: boolean;
  ambientEmotionIntervalSec: number;
  ambientEmotionJitter: number;
  reduceMotion: boolean;
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
  quickUiExpanded: boolean;
  onboardingComplete: boolean;
  actionMappings: ActionMapping[];
  disabledActions: string[];
}

type GooglyEyesSettingKey = Extract<keyof GooglyEyesSettings, string>;

interface SkinDefinition {
  id: string;
  name: string;
  eyeLayout: "dual" | "single";
  flavor: string;
  supportsColorOverrides: boolean;
  iris: string;
  pupil: string;
  eyeWhite: string;
  outline: string;
  accent: string;
  irisSize: number;
  pupilSize: number;
  eyeStyle: {
    slotRadius: string;
    lidLeft: string;
    lidWidth: string;
    lidHeight: string;
    lidUpperRadius: string;
    lidLowerRadius: string;
  };
  eyeWindows: Record<"left" | "right", EyeWindow>;
  reactionTuning: Partial<Record<Reaction | "all", ReactionTuning>>;
  assets: {
    leftBase: string;
    rightBase: string;
    thumbnail: string;
    mask: string;
  };
}

interface AppWithSettings extends App {
  setting?: {
    open: () => void;
    openTabById: (id: string) => void;
  };
}

interface PersonalityPose {
  upperLeft: string;
  lowerLeft: string;
  upperRight: string;
  lowerRight: string;
  irisScale: string;
  pupilScale: string;
  irisY: number;
  pupilY: number;
  irisXLeft?: number;
  irisXRight?: number;
  pupilXLeft?: number;
  pupilXRight?: number;
  tiltLeft?: string;
  tiltRight?: string;
  lowerTiltLeft?: string;
  lowerTiltRight?: string;
  eyeVibe?: string;
  irisFilter?: string;
}

const REACTIONS: Reaction[] = [
  "idle-neutral", "blink", "slow-blink", "sleepy", "look-left", "look-right", "look-up", "look-down",
  "wide-stare", "happy", "shocked", "suspicious", "angry", "sad", "confused", "dizzy", "cross-eyed",
  "eye-roll", "nervous", "typing", "cut", "copy", "paste", "delete", "undo", "redo", "idle-long",
  "wake", "hover-suspicious", "fast-movement", "peek", "sleepy-idle", "chaotic-stare", "dramatic-shock",
  "rapid-typing-focus", "drag-tracking", "furious", "restless", "in-love", "dreamy", "drunk", "stoned",
  "spacing-out", "crying", "laughing", "wink-left", "wink-right", "panic", "starstruck",
  "disgust", "guilt", "shame", "sympathy", "curiosity", "jealousy", "pride", "bored",
  "apathy", "acceptance", "calm", "inspiration", "passion", "hope",
  "frustration", "relief", "embarrassment", "surprise-delight", "distrust",
  "determination", "confusion-spiral", "mischief", "annoyance", "fear-freeze",
  "excitement", "satisfaction", "skepticism", "overwhelmed", "loneliness",
  "gratitude", "trust", "doubt", "concentration", "playfulness", "impatience",
  "surprise-fear", "awe", "tired-but-awake", "contentment", "alertness", "suspense",
  "shyness", "awkwardness", "guilt-panic", "interest", "disappointment", "contempt",
  "smug", "concern", "anticipation", "startled-recovery", "meditative", "deadpan"
];

const REACTION_IDS = new Set<string>(REACTIONS);

function reactionEyeWhiteFilter(reaction: Reaction): string {
  switch (reaction) {
    case "happy":
    case "copy":
    case "paste":
    case "redo":
    case "laughing":
    case "inspiration":
    case "hope":
      return "sepia(0.22) saturate(1.32) hue-rotate(350deg) brightness(1.08)";
    case "surprise-delight":
      return "sepia(0.2) saturate(1.42) hue-rotate(344deg) brightness(1.16) contrast(1.04)";
    case "excitement":
      return "sepia(0.28) saturate(1.58) hue-rotate(332deg) brightness(1.14) contrast(1.08)";
    case "passion":
    case "pride":
    case "satisfaction":
      return "sepia(0.28) saturate(1.26) hue-rotate(342deg) brightness(1.04)";
    case "sad":
    case "undo":
    case "crying":
    case "sympathy":
    case "loneliness":
    case "disappointment":
      return "sepia(0.16) saturate(1.24) hue-rotate(172deg) brightness(1.02)";
    case "angry":
    case "delete":
    case "cut":
    case "frustration":
      return "sepia(0.3) saturate(1.7) hue-rotate(308deg) brightness(0.98)";
    case "furious":
      return "sepia(0.45) saturate(2.2) hue-rotate(305deg) brightness(0.9) contrast(1.12)";
    case "annoyance":
    case "impatience":
    case "guilt":
    case "shame":
    case "embarrassment":
    case "shyness":
    case "awkwardness":
      return "sepia(0.2) saturate(1.34) hue-rotate(300deg) brightness(1.02)";
    case "panic":
      return "sepia(0.05) saturate(1.3) hue-rotate(170deg) brightness(1.24) contrast(1.14)";
    case "fear-freeze":
      return "sepia(0.08) saturate(0.95) hue-rotate(176deg) brightness(1.1) contrast(1.18)";
    case "surprise-fear":
    case "guilt-panic":
    case "startled-recovery":
      return "sepia(0.06) saturate(1.16) hue-rotate(168deg) brightness(1.2) contrast(1.12)";
    case "shocked":
    case "wide-stare":
    case "wake":
    case "dramatic-shock":
      return "sepia(0.08) saturate(1.22) hue-rotate(166deg) brightness(1.18) contrast(1.05)";
    case "curiosity":
    case "interest":
    case "anticipation":
      return "sepia(0.18) saturate(1.18) hue-rotate(72deg) brightness(1.04)";
    case "suspicious":
    case "hover-suspicious":
    case "distrust":
    case "skepticism":
    case "doubt":
    case "contempt":
    case "smug":
      return "sepia(0.16) saturate(0.88) hue-rotate(82deg) brightness(0.92) contrast(1.08)";
    case "jealousy":
    case "mischief":
      return "sepia(0.22) saturate(1.18) hue-rotate(252deg) brightness(0.96)";
    case "bored":
    case "apathy":
    case "idle-long":
      return "grayscale(0.55) saturate(0.55) brightness(0.9)";
    case "sleepy":
    case "sleepy-idle":
    case "tired-but-awake":
      return "grayscale(0.28) sepia(0.08) saturate(0.74) hue-rotate(162deg) brightness(0.88)";
    case "calm":
    case "meditative":
      return "sepia(0.14) saturate(0.92) hue-rotate(52deg) brightness(1.04)";
    case "acceptance":
      return "grayscale(0.12) sepia(0.12) saturate(0.78) hue-rotate(58deg) brightness(0.98)";
    case "relief":
      return "sepia(0.1) saturate(0.72) hue-rotate(72deg) brightness(1.1)";
    case "trust":
      return "sepia(0.08) saturate(0.74) hue-rotate(88deg) brightness(1.08)";
    case "gratitude":
      return "sepia(0.18) saturate(1.0) hue-rotate(26deg) brightness(1.08)";
    case "contentment":
      return "sepia(0.12) saturate(0.72) hue-rotate(48deg) brightness(1.02)";
    case "deadpan":
      return "grayscale(0.18) saturate(0.72) brightness(0.96)";
    case "disgust":
      return "sepia(0.32) saturate(1.4) hue-rotate(58deg) brightness(0.88)";
    case "dizzy":
    case "confused":
    case "confusion-spiral":
    case "cross-eyed":
    case "eye-roll":
    case "overwhelmed":
      return "sepia(0.18) saturate(1.22) hue-rotate(214deg) brightness(1.0)";
    case "drunk":
      return "sepia(0.22) saturate(1.1) hue-rotate(24deg) brightness(0.96)";
    case "stoned":
      return "sepia(0.24) saturate(1.22) hue-rotate(78deg) brightness(0.9)";
    case "dreamy":
      return "sepia(0.16) saturate(1.1) hue-rotate(254deg) brightness(1.06)";
    case "spacing-out":
      return "sepia(0.2) saturate(1.18) hue-rotate(238deg) brightness(0.98)";
    case "determination":
    case "concentration":
    case "rapid-typing-focus":
    case "typing":
    case "alertness":
    case "suspense":
    case "concern":
      return "sepia(0.07) saturate(1.06) hue-rotate(170deg) brightness(1.04) contrast(1.08)";
    case "restless":
    case "nervous":
    case "chaotic-stare":
    case "fast-movement":
      return "sepia(0.22) saturate(1.28) hue-rotate(28deg) brightness(1.02)";
    case "in-love":
    case "playfulness":
      return "sepia(0.18) saturate(1.22) hue-rotate(292deg) brightness(1.06)";
    case "awe":
    case "starstruck":
      return "sepia(0.12) saturate(1.28) hue-rotate(182deg) brightness(1.12)";
    case "look-left":
    case "look-right":
    case "look-up":
    case "look-down":
    case "peek":
    case "drag-tracking":
      return "brightness(1.01)";
    case "slow-blink":
    case "blink":
    case "wink-left":
    case "wink-right":
    case "idle-neutral":
    default:
      return "none";
  }
}

function reactionIrisFilter(reaction: Reaction): string {
  switch (reaction) {
    case "sad":
    case "crying":
    case "loneliness":
    case "sleepy":
    case "sleepy-idle":
    case "tired-but-awake":
    case "bored":
    case "apathy":
    case "acceptance":
    case "disappointment":
    case "deadpan":
    case "meditative":
      return "brightness(0.96) saturate(0.96)";
    case "angry":
    case "furious":
    case "frustration":
    case "determination":
    case "concentration":
    case "alertness":
    case "suspense":
    case "concern":
    case "anticipation":
      return "brightness(0.98) contrast(1.04)";
    case "happy":
    case "laughing":
    case "surprise-delight":
    case "excitement":
    case "gratitude":
    case "trust":
    case "contentment":
    case "relief":
    case "pride":
    case "satisfaction":
    case "interest":
      return "brightness(1.03)";
    case "in-love":
    case "sympathy":
    case "embarrassment":
    case "shame":
    case "guilt":
    case "playfulness":
    case "mischief":
    case "shyness":
    case "awkwardness":
    case "smug":
      return "brightness(1.02) saturate(1.02)";
    case "guilt-panic":
    case "startled-recovery":
      return "brightness(1.04) contrast(1.04)";
    case "starstruck":
    case "awe":
      return "brightness(1.06) saturate(1.04)";
    case "dizzy":
    case "confusion-spiral":
      return "brightness(1.02) saturate(0.96) blur(0.2px)";
    case "stoned":
    case "drunk":
      return "brightness(0.96) saturate(0.88) blur(0.25px)";
    case "spacing-out":
      return "brightness(0.98) saturate(0.9) blur(0.18px)";
    default:
      return "none";
  }
}

const SKINS: SkinDefinition[] = GENERATED_SKINS.map((skin) => ({
  ...skin,
  assets: { ...skin.assets },
  supportsColorOverrides: true
}));

const SKINS_BY_NAME: SkinDefinition[] = [...SKINS].sort((a, b) => a.name.localeCompare(b.name));

const DEFAULT_EYE_WINDOWS: Record<"left" | "right", EyeWindow> = SKINS[0].eyeWindows;

const SKIN_EYE_WINDOWS = GENERATED_SKIN_EYE_WINDOWS as Record<string, Record<"left" | "right", EyeWindow>>;

const SKIN_AMBIENT_REACTIONS = GENERATED_SKIN_AMBIENT_REACTIONS as unknown as Record<string, readonly Reaction[]>;

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

const PERSONALITY_POSES: Record<Personality, PersonalityPose> = {
  calm: { upperLeft: "-56%", lowerLeft: "62%", upperRight: "-56%", lowerRight: "62%", irisScale: "0.96", pupilScale: "0.96", irisY: 2, pupilY: 3 },
  curious: { upperLeft: "-64%", lowerLeft: "66%", upperRight: "-64%", lowerRight: "66%", irisScale: "1.02", pupilScale: "1", irisY: -2, pupilY: -3 },
  dramatic: { upperLeft: "-76%", lowerLeft: "74%", upperRight: "-76%", lowerRight: "74%", irisScale: "1.08", pupilScale: "0.86", irisY: -3, pupilY: -4 },
  goofy: { upperLeft: "-58%", lowerLeft: "63%", upperRight: "-69%", lowerRight: "68%", irisScale: "1.02", pupilScale: "1.06", irisY: 0, pupilY: 0, irisXLeft: 5, irisXRight: -5, pupilXLeft: 9, pupilXRight: -9, tiltLeft: "-4deg", tiltRight: "5deg", lowerTiltLeft: "2deg", lowerTiltRight: "-2deg", eyeVibe: "1.5deg" },
  suspicious: { upperLeft: "-35%", lowerLeft: "57%", upperRight: "-47%", lowerRight: "62%", irisScale: "0.94", pupilScale: "0.92", irisY: 1, pupilY: 1, irisXLeft: 4, irisXRight: -4, pupilXLeft: 7, pupilXRight: -7, tiltLeft: "-7deg", tiltRight: "7deg", lowerTiltLeft: "3deg", lowerTiltRight: "-3deg" },
  sleepy: { upperLeft: "-25%", lowerLeft: "48%", upperRight: "-25%", lowerRight: "48%", irisScale: "0.9", pupilScale: "0.86", irisY: 7, pupilY: 10, irisFilter: "saturate(0.75) brightness(0.88)" },
  chaotic: { upperLeft: "-78%", lowerLeft: "75%", upperRight: "-44%", lowerRight: "59%", irisScale: "1.1", pupilScale: "0.8", irisY: -4, pupilY: -7, irisXLeft: -7, irisXRight: 7, pupilXLeft: -12, pupilXRight: 12, tiltLeft: "5deg", tiltRight: "-6deg", lowerTiltLeft: "-2deg", lowerTiltRight: "3deg", eyeVibe: "-2deg", irisFilter: "saturate(1.35)" },
  shy: { upperLeft: "-42%", lowerLeft: "58%", upperRight: "-42%", lowerRight: "58%", irisScale: "0.92", pupilScale: "0.96", irisY: 8, pupilY: 12, irisXLeft: -3, irisXRight: 3, pupilXLeft: -5, pupilXRight: 5, irisFilter: "saturate(0.9)" },
  focused: { upperLeft: "-44%", lowerLeft: "60%", upperRight: "-44%", lowerRight: "60%", irisScale: "0.9", pupilScale: "0.82", irisY: 0, pupilY: 0, irisFilter: "contrast(1.08) saturate(0.95)" },
  mischievous: { upperLeft: "-38%", lowerLeft: "58%", upperRight: "-62%", lowerRight: "64%", irisScale: "1", pupilScale: "0.95", irisY: -1, pupilY: -2, irisXLeft: 5, irisXRight: 5, pupilXLeft: 8, pupilXRight: 8, tiltLeft: "8deg", tiltRight: "-4deg", lowerTiltLeft: "-3deg", lowerTiltRight: "2deg" }
};

const DEFAULT_ACTION_TUPLES: ActionTuple[] = [
  ["mouse move", "event", ["idle-neutral"], 0.3, 150],
  ["click", "event", ["blink", "wide-stare"], 0.8, 500],
  ["double click", "event", ["shocked", "happy"], 1, 800],
  ["drag", "event", ["drag-tracking", "nervous", "restless"], 1, 350],
  ["typing", "keyboard", ["typing", "look-down", "rapid-typing-focus"], 0.8, 250],
  ["rapid typing", "keyboard", ["rapid-typing-focus", "cross-eyed", "nervous", "panic"], 1.1, 900],
  ["idle", "idle", ["blink", "slow-blink", "sleepy-idle", "dreamy", "spacing-out", "look-left", "look-right", "eye-roll"], 0.6, 5000],
  ["wake up", "event", ["wake", "wide-stare", "happy", "spacing-out"], 1, 1000],
  ["copy", "keyboard", ["copy", "suspicious", "happy"], 0.9, 900],
  ["cut", "keyboard", ["cut", "shocked", "angry"], 1.2, 900],
  ["paste", "keyboard", ["paste", "happy", "wide-stare"], 1, 900],
  ["delete", "keyboard", ["delete", "shocked", "suspicious"], 1, 800],
  ["backspace spam", "keyboard", ["nervous", "rapid-typing-focus", "confused"], 1.1, 950],
  ["undo", "keyboard", ["undo", "confused", "eye-roll"], 0.9, 850],
  ["redo", "keyboard", ["redo", "happy", "confused"], 0.8, 850],
  ["new note", "event", ["wake", "happy"], 0.8, 1200],
  ["open note", "event", ["wake", "happy", "wide-stare"], 0.7, 900],
  ["close note", "event", ["sad", "crying", "slow-blink"], 0.6, 1000],
  ["open command palette", "event", ["wide-stare", "suspicious"], 0.9, 1000],
  ["open search", "event", ["look-left", "look-right", "typing"], 0.8, 900],
  ["switch tab", "event", ["look-left", "look-right", "confused"], 0.7, 650],
  ["hover trash", "hover", ["hover-suspicious", "shocked", "suspicious"], 1.1, 900],
  ["hover command palette", "hover", ["wide-stare", "suspicious"], 0.8, 900],
  ["hover link", "hover", ["peek", "happy", "look-down"], 0.7, 600],
  ["scroll fast", "event", ["dizzy", "confused", "drunk"], 1, 850],
  ["quick mouse movement", "event", ["fast-movement", "look-left", "look-right", "wide-stare"], 0.85, 1200]
];

const DEFAULT_ACTIONS: ActionMapping[] = DEFAULT_ACTION_TUPLES.map(([name, triggerType, reactionPool, intensity, cooldownMs]) => ({
  name,
  triggerType,
  enabled: true,
  reactionPool,
  intensity,
  cooldownMs
}));

const DEFAULT_SETTINGS: GooglyEyesSettings = {
  enabled: true,
  visible: true,
  visibilityMode: "active",
  followTarget: "smart",
  followSensitivity: 0.95,
  smoothing: 0.18,
  reactionsEnabled: true,
  reactionIntensity: "normal",
  customIntensity: 1,
  randomness: "medium",
  settingsMode: "simple",
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
  useSkinDefaultColors: true,
  irisColor: "#42d9ff",
  pupilColor: "#07111b",
  irisSizeScale: 1,
  pupilSizeScale: 1,
  eyelidColor: "#2a2d30",
  eyelidShadowColor: "#030508",
  irisGlow: 0.7,
  emotionStrength: 1,
  blinkSpeed: 1,
  reactionHoldMs: 0,
  ambientEmotionsEnabled: true,
  ambientEmotionIntervalSec: 28,
  ambientEmotionJitter: 0.65,
  reduceMotion: false,
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
  quickUiExpanded: false,
  onboardingComplete: false,
  disabledActions: [],
  actionMappings: DEFAULT_ACTIONS
};

function baseEyeAsset(skin: SkinDefinition, side: "left" | "right"): string {
  return side === "left" ? skin.assets.leftBase : skin.assets.rightBase;
}

function thumbnailAsset(skin: SkinDefinition): string {
  return skin.assets.thumbnail;
}

function maskAsset(skin: SkinDefinition): string {
  return skin.assets.mask;
}

function effectiveIrisColor(settings: GooglyEyesSettings, skin: SkinDefinition): string {
  return settings.useSkinDefaultColors ? skin.iris : settings.irisColor;
}

function effectivePupilColor(settings: GooglyEyesSettings, skin: SkinDefinition): string {
  return settings.useSkinDefaultColors ? skin.pupil : settings.pupilColor;
}

function effectiveIrisSize(settings: GooglyEyesSettings, skin: SkinDefinition): number {
  return clamp(skin.irisSize * settings.irisSizeScale, 12, 90);
}

function effectivePupilSize(settings: GooglyEyesSettings, skin: SkinDefinition): number {
  return clamp(skin.pupilSize * settings.pupilSizeScale, 6, 78);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mergeReactionTuning(skin: SkinDefinition, reaction: Reaction): ReactionTuning {
  return {
    ...(skin.reactionTuning.all ?? {}),
    ...(skin.reactionTuning[reaction] ?? {})
  };
}

function readCssNumeric(element: HTMLElement, name: string, fallback: number): number {
  const raw = element.style.getPropertyValue(name).trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function multiplyCssNumber(element: HTMLElement, name: string, multiplier: number, unit = ""): void {
  if (multiplier === 1) return;
  const value = readCssNumeric(element, name, unit === "deg" ? 0 : 1);
  element.setCssProps({ [name]: `${value * multiplier}${unit}` });
}

function multiplyCssVars(element: HTMLElement, names: readonly string[], multiplier: number, unit: string): void {
  if (multiplier === 1) return;
  names.forEach((name) => multiplyCssNumber(element, name, multiplier, unit));
}

function pick<T>(items: readonly T[], randomness: number): T {
  if (!items.length) throw new Error("Cannot pick from an empty list.");
  if (randomness <= 0.1) return items[0];
  return items[Math.floor(Math.random() * items.length)];
}

function isReaction(value: string): value is Reaction {
  return REACTION_IDS.has(value);
}

function labels<T extends string>(record: Record<T, string>): Record<T, string> {
  return record;
}

interface InstanceOfCapable {
  instanceOf<T>(type: { new (): T }): this is T;
}

function isHtmlElement(value: unknown): value is HTMLElement {
  if (typeof value !== "object" || value === null || !("instanceOf" in value)) return false;
  const candidate = value as Partial<InstanceOfCapable>;
  return typeof candidate.instanceOf === "function" && candidate.instanceOf(HTMLElement);
}

function isSettingKey(key: string): key is GooglyEyesSettingKey {
  return key in DEFAULT_SETTINGS;
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

const FOCUS_LABELS = labels<FocusModeSetting>({
  manual: "Manual toggle",
  writing: "Auto during writing",
  fullscreen: "Auto during fullscreen",
  off: "Off"
});

const LAYERED_SKINS = GENERATED_LAYERED_SKINS;

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
  "drag-tracking": "Drag tracking",
  furious: "Furious",
  restless: "Restless",
  "in-love": "In love",
  dreamy: "Dreamy",
  drunk: "Drunk",
  stoned: "Stoned",
  "spacing-out": "Spacing out",
  crying: "Crying",
  laughing: "Laughing",
  "wink-left": "Wink left",
  "wink-right": "Wink right",
  panic: "Panic",
  starstruck: "Starstruck",
  disgust: "Disgust",
  guilt: "Guilt",
  shame: "Shame",
  sympathy: "Sympathy",
  curiosity: "Curiosity",
  jealousy: "Jealousy",
  pride: "Pride",
  bored: "Bored",
  apathy: "Apathy",
  acceptance: "Acceptance",
  calm: "Calm",
  inspiration: "Inspiration",
  passion: "Passion",
  hope: "Hope",
  frustration: "Frustration",
  relief: "Relief",
  embarrassment: "Embarrassment",
  "surprise-delight": "Surprise delight",
  distrust: "Distrust",
  determination: "Determination",
  "confusion-spiral": "Confusion spiral",
  mischief: "Mischief",
  annoyance: "Annoyance",
  "fear-freeze": "Fear freeze",
  excitement: "Excitement",
  satisfaction: "Satisfaction",
  skepticism: "Skepticism",
  overwhelmed: "Overwhelmed",
  loneliness: "Loneliness",
  gratitude: "Gratitude",
  trust: "Trust",
  doubt: "Doubt",
  concentration: "Concentration",
  playfulness: "Playfulness",
  impatience: "Impatience",
  "surprise-fear": "Surprise fear",
  awe: "Awe",
  "tired-but-awake": "Tired but awake",
  contentment: "Contentment",
  alertness: "Alertness",
  suspense: "Suspense",
  shyness: "Shyness",
  awkwardness: "Awkwardness",
  "guilt-panic": "Guilt panic",
  interest: "Interest",
  disappointment: "Disappointment",
  contempt: "Contempt",
  smug: "Smug",
  concern: "Concern",
  anticipation: "Anticipation",
  "startled-recovery": "Startled recovery",
  meditative: "Meditative",
  deadpan: "Deadpan"
});

const QUICK_REACTIONS: readonly Reaction[] = ["gratitude", "doubt", "concentration", "playfulness", "impatience", "awe", "alertness", "suspense", "awkwardness", "smug", "concern", "anticipation", "deadpan"];

const BEHAVIOR_PRESETS: Record<string, Partial<GooglyEyesSettings>> = {
  subtle: { personality: "focused", reactionIntensity: "subtle", randomness: "low", followSensitivity: 0.68, smoothing: 0.12, emotionStrength: 0.65, blinkSpeed: 0.85, ambientEmotionIntervalSec: 50, ambientEmotionJitter: 0.45 },
  lively: { personality: "curious", reactionIntensity: "expressive", randomness: "medium", followSensitivity: 1.05, smoothing: 0.2, emotionStrength: 1.1, blinkSpeed: 1.05, ambientEmotionIntervalSec: 24, ambientEmotionJitter: 0.75 },
  dramatic: { personality: "dramatic", reactionIntensity: "chaotic", randomness: "high", followSensitivity: 1.22, smoothing: 0.28, emotionStrength: 1.35, blinkSpeed: 1.2, ambientEmotionIntervalSec: 16, ambientEmotionJitter: 0.95 },
  sleepy: { personality: "sleepy", reactionIntensity: "subtle", randomness: "low", followSensitivity: 0.58, smoothing: 0.1, emotionStrength: 0.8, blinkSpeed: 0.72, ambientEmotionIntervalSec: 42, ambientEmotionJitter: 0.55 }
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
  private ambientTimer = 0;
  private ambientReturnTimer = 0;
  private dragging = false;
  private dragOffset = { x: 0, y: 0 };
  private cleanups: Array<() => void> = [];
  private lastAction = new Map<string, number>();
  private lastMouse = { x: 0, y: 0, t: Date.now() };
  private typingHits: number[] = [];
  private lifeSeed = Math.random() * Math.PI * 2;
  private reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private workspaceEventsRegistered = false;
  private resizeObserver: ResizeObserver | null = null;
  private observedParent: HTMLElement | null = null;

  constructor(private plugin: GooglyEyesPlugin) {}

  mount(parent: HTMLElement): void {
    if (!this.root) {
      this.root = parent.createDiv({ cls: "googly-eyes-root" });
      this.root.setAttr("aria-label", "GooglyEyes living eyes");
      this.root.setAttr("role", "img");
      this.root.tabIndex = 0;
      this.buildPairs();
    }
    if (this.root.parentElement !== parent) parent.appendChild(this.root);
    this.observeParent(parent);
    this.applySettings();
    if (!this.cleanups.length) this.registerListeners();
    if (!this.frame) this.loop();
  }

  unload(): void {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    if (this.frame) window.cancelAnimationFrame(this.frame);
    if (this.idleTimer) window.clearTimeout(this.idleTimer);
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer);
    if (this.ambientTimer) window.clearTimeout(this.ambientTimer);
    if (this.ambientReturnTimer) window.clearTimeout(this.ambientReturnTimer);
    this.resizeObserver?.disconnect();
    this.frame = 0;
    this.idleTimer = 0;
    this.blinkTimer = 0;
    this.ambientTimer = 0;
    this.ambientReturnTimer = 0;
    this.resizeObserver = null;
    this.observedParent = null;
    this.root?.remove();
    this.root = null;
    this.pairs = [];
  }

  refresh(): void {
    if (!this.root) return;
    this.buildPairs();
    this.applySettings();
    this.setReaction("idle-neutral");
  }

  refreshAmbientEmotions(): void {
    this.scheduleAmbientEmotion();
  }

  applySettings(): void {
    const s = this.plugin.settings;
    if (!this.root) return;
    this.root.toggleClass("is-hidden", !s.enabled || !s.visible || !this.visibilityAllowsDisplay());
    this.root.toggleClass("is-peeking", s.peekMode);
    this.root.toggleClass("is-focus-mode", this.isFocusMode());
    this.root.toggleClass("is-reduced-motion", this.motionReduced());
    this.root.toggleClass("show-debug", s.debugOverlay);
    this.root.setCssProps({
      "--googly-eyes-size": `${s.size}px`,
      "--googly-eyes-opacity": `${s.opacity}`,
      "--googly-eyes-z": `${s.zIndex}`,
      "--iris-color": s.irisColor,
      "--pupil-color": s.pupilColor,
      "--eyelid-color": s.eyelidColor,
      "--eyelid-shadow-color": s.eyelidShadowColor,
      "--iris-glow": `${s.irisGlow}`,
      "--lid-transition-scale": `${1 / Math.max(0.2, s.blinkSpeed)}`
    });
    this.root.parentElement?.setCssProps({ "--googly-eyes-size": `${s.size}px` });
    this.syncPanelBounds();
    this.positionRoot();
    this.updateAssets();
  }

  private observeParent(parent: HTMLElement): void {
    if (this.observedParent === parent) return;
    this.resizeObserver?.disconnect();
    this.observedParent = parent;
    this.resizeObserver = new ResizeObserver(() => this.syncPanelBounds());
    this.resizeObserver.observe(parent);
    this.syncPanelBounds();
  }

  private syncPanelBounds(): void {
    if (!this.root) return;
    if (!this.root.closest(".googly-eyes-stage")) {
      this.root.setCssProps({
        "--panel-left": "0px",
        "--panel-top": "0px",
        "--panel-width": "100%",
        "--panel-height": "100%"
      });
      return;
    }
    const parent = this.root.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const aspect = 1774 / 887;
    let width = rect.width;
    let height = width / aspect;
    if (height > rect.height) {
      height = rect.height;
      width = height * aspect;
    }
    this.root.setCssProps({
      "--panel-left": `${(rect.width - width) / 2}px`,
      "--panel-top": `${(rect.height - height) / 2}px`,
      "--panel-width": `${width}px`,
      "--panel-height": `${height}px`
    });
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
    void this.plugin.saveSettings();
    this.applySettings();
  }

  randomizeStyle(): void {
    this.plugin.settings.skinId = pick(SKINS.map((skin) => skin.id), 1);
    void this.plugin.saveSettings();
    this.refresh();
  }

  randomizePersonality(): void {
    this.plugin.settings.personality = pick(Object.keys(PERSONALITY_OPTIONS) as Personality[], 1);
    void this.plugin.saveSettings();
    this.refresh();
  }

  resetPosition(): void {
    this.plugin.settings.customX = 24;
    this.plugin.settings.customY = 80;
    void this.plugin.saveSettings();
    this.applySettings();
  }

  private buildPairs(): void {
    if (!this.root) return;
    this.root.empty();
    this.pairs = [];
    const count = clamp(this.plugin.settings.eyePairCount, 1, 12);
    for (let i = 0; i < count; i++) {
      const pair = this.root.createDiv({ cls: "googly-eyes-pair" });
      const layered = pair.createDiv({ cls: "googly-eyes-layered-eyes" });
      const leftSlot = layered.createDiv({ cls: "googly-eyes-eye-slot googly-eyes-eye-slot-left" });
      leftSlot.createEl("img", { cls: "googly-eyes-eye googly-eyes-eye-left", attr: { alt: "" } });
      leftSlot.createDiv({ cls: "googly-eyes-iris", attr: { "aria-hidden": "true" } }).createDiv({ cls: "googly-eyes-pupil" });
      leftSlot.createDiv({ cls: "googly-eyes-lid googly-eyes-lid-upper", attr: { "aria-hidden": "true" } });
      leftSlot.createDiv({ cls: "googly-eyes-lid googly-eyes-lid-lower", attr: { "aria-hidden": "true" } });
      const rightSlot = layered.createDiv({ cls: "googly-eyes-eye-slot googly-eyes-eye-slot-right" });
      rightSlot.createEl("img", { cls: "googly-eyes-eye googly-eyes-eye-right", attr: { alt: "" } });
      rightSlot.createDiv({ cls: "googly-eyes-iris", attr: { "aria-hidden": "true" } }).createDiv({ cls: "googly-eyes-pupil" });
      rightSlot.createDiv({ cls: "googly-eyes-lid googly-eyes-lid-upper", attr: { "aria-hidden": "true" } });
      rightSlot.createDiv({ cls: "googly-eyes-lid googly-eyes-lid-lower", attr: { "aria-hidden": "true" } });
      pair.createEl("img", { cls: "googly-eyes-peek-mask", attr: { alt: "" } });
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
    this.scheduleAmbientEmotion();
  }

  private hoverHandler = (event: MouseEvent): void => {
    const target = event.target;
    if (!isHtmlElement(target)) return;
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
      void this.plugin.saveSettings();
      this.applySettings();
      window.setTimeout(() => {
        if (this.plugin.settings.focusMode === "writing") {
          this.plugin.settings.focusModeActive = false;
          void this.plugin.saveSettings();
          this.applySettings();
        }
      }, 2500);
    }
  }

  private followTextCursorSoon(): void {
    window.setTimeout(() => {
      const cursor = document.querySelector<HTMLElement>(".cm-cursor-primary, .cm-cursor");
      if (!cursor) return;
      const rect = cursor.getBoundingClientRect();
      if (rect.width || rect.height) this.target = { x: rect.left, y: rect.top };
    }, 0);
  }

  private startDrag(event: PointerEvent): void {
    if (!this.plugin.settings.dragEnabled || !this.root) return;
    if (this.root.closest(".googly-eyes-stage")) return;
    this.dragging = true;
    const rect = this.root.getBoundingClientRect();
    this.dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.react("drag");
    if (isHtmlElement(event.target)) event.target.setPointerCapture?.(event.pointerId);
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
    void this.plugin.saveSettings();
  }

  private loop = (): void => {
    const s = this.plugin.settings;
    if (this.root && !this.root.hasClass("is-hidden")) {
      const now = Date.now();
      const smoothing = clamp(s.smoothing / PERSONALITY_OPTIONS[s.personality].lag, 0.04, 0.8);
      this.eased.x += (this.target.x - this.eased.x) * smoothing;
      this.eased.y += (this.target.y - this.eased.y) * smoothing;
      const lifePupilScale = this.motionReduced() ? 1 : this.pupilLifeScale(now);
      for (const pair of this.pairs) {
        pair.setCssProps({ "--life-pupil-scale": lifePupilScale.toFixed(3) });
        const rect = pair.getBoundingClientRect();
        const energy = this.isFocusMode() ? 0.35 : PERSONALITY_OPTIONS[s.personality].energy * this.intensity();
        const irises = pair.querySelectorAll<HTMLElement>(".googly-eyes-iris");
        if (irises.length) {
          irises.forEach((iris) => {
            const slot = iris.closest<HTMLElement>(".googly-eyes-eye-slot");
            const pupil = iris.querySelector<HTMLElement>(".googly-eyes-pupil");
            const eyeRect = slot?.getBoundingClientRect() ?? rect;
            const cx = eyeRect.left + eyeRect.width / 2 || rect.left + rect.width / 2;
            const cy = eyeRect.top + eyeRect.height / 2 || rect.top + rect.height / 2;
            const vx = this.eased.x - cx;
            const vy = this.eased.y - cy;
            const distance = Math.hypot(vx, vy);
            const baseTravel = Math.min(eyeRect.width, eyeRect.height) * s.followSensitivity * energy;
            const strength = clamp(distance / 280, 0, 1);
            const angle = Math.atan2(vy, vx);
            iris.setCssProps({
              "--iris-x": `${Math.cos(angle) * baseTravel * 0.085 * strength}px`,
              "--iris-y": `${Math.sin(angle) * baseTravel * 0.07 * strength}px`
            });
            pupil?.setCssProps({
              "--pupil-x": `${Math.cos(angle) * baseTravel * 0.055 * strength}px`,
              "--pupil-y": `${Math.sin(angle) * baseTravel * 0.048 * strength}px`
            });
          });
        }
      }
    }
    this.frame = window.requestAnimationFrame(this.loop);
  };

  private scheduleIdle(): void {
    const base = this.motionReduced() ? 14000 : this.isFocusMode() ? 9000 : 4500;
    const jitter = 6000 * this.randomness();
    this.idleTimer = window.setTimeout(() => {
      this.react("idle");
      this.scheduleIdle();
    }, base + Math.random() * jitter);
  }

  private scheduleBlink(): void {
    const personality = PERSONALITY_OPTIONS[this.plugin.settings.personality];
    const motionScale = this.motionReduced() ? 1.65 : 1;
    const interval = (2600 + Math.random() * 4200 * this.randomness()) * personality.blink * motionScale;
    this.blinkTimer = window.setTimeout(() => {
      this.setReaction(this.isFocusMode() ? "blink" : pick(["blink", "slow-blink"], this.randomness()));
      window.setTimeout(() => this.setReaction("idle-neutral"), 180 / Math.max(0.2, this.plugin.settings.blinkSpeed));
      this.scheduleBlink();
    }, interval);
  }

  private scheduleAmbientEmotion(): void {
    if (this.ambientTimer) window.clearTimeout(this.ambientTimer);
    if (this.motionReduced()) return;
    const s = this.plugin.settings;
    const base = clamp(s.ambientEmotionIntervalSec, 5, 240) * 1000;
    const jitter = base * clamp(s.ambientEmotionJitter, 0, 1.5);
    const interval = base + Math.random() * jitter;
    this.ambientTimer = window.setTimeout(() => {
      this.playAmbientEmotion();
      this.scheduleAmbientEmotion();
    }, interval);
  }

  private playAmbientEmotion(): void {
    const s = this.plugin.settings;
    if (!s.enabled || !s.visible || !s.reactionsEnabled || !s.ambientEmotionsEnabled || s.pausedReactions || s.dndMode || this.motionReduced() || this.dragging) return;
    if (this.root?.hasClass("is-hidden")) return;
    const skinId = this.plugin.settings.skinId;
    const pool: readonly Reaction[] = SKIN_AMBIENT_REACTIONS[skinId] ?? ["chaotic-stare", "sleepy-idle", "dizzy", "idle-long", "eye-roll", "suspicious", "confused", "dreamy", "restless", "laughing", "spacing-out", "happy", "curiosity", "bored", "calm", "hope", "pride", "relief", "mischief", "skepticism", "excitement", "loneliness", "gratitude", "trust", "doubt", "playfulness", "impatience", "awe", "tired-but-awake", "contentment", "alertness", "suspense", "shyness", "awkwardness", "guilt-panic", "interest", "disappointment", "contempt", "smug", "concern", "anticipation", "startled-recovery", "meditative", "deadpan"];
    const reaction = this.resolveReaction(pick(pool, Math.max(0.45, this.randomness())));
    this.setReaction(reaction);
    if (this.ambientReturnTimer) window.clearTimeout(this.ambientReturnTimer);
    const duration = this.ambientReactionDuration(reaction);
    this.ambientReturnTimer = window.setTimeout(() => {
      if (this.currentReaction === reaction) this.setReaction("idle-neutral");
    }, duration);
  }

  private setReaction(reaction: Reaction): void {
    this.currentReaction = this.resolveReaction(reaction);
    this.updateAssets();
  }

  private applyReactionState(pair: HTMLElement, skinDef?: SkinDefinition): void {
    const reaction = this.currentReaction;
    const strength = this.plugin.settings.emotionStrength;
    const pose = PERSONALITY_POSES[this.plugin.settings.personality];
    const set = (name: string, value: string) => pair.setCssProps({ [name]: value });
    const pct = (value: number) => `${value * strength}%`;
    set("--lid-upper-left", "-63%");
    set("--lid-lower-left", "65%");
    set("--lid-upper-right", "-63%");
    set("--lid-lower-right", "65%");
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
    set("--eye-base-x-left", "0%");
    set("--eye-base-y-left", "0%");
    set("--eye-base-x-right", "0%");
    set("--eye-base-y-right", "0%");
    set("--eye-base-scale-left", "1.04");
    set("--eye-base-scale-right", "1.04");
    set("--eye-base-rotate-left", "0deg");
    set("--eye-base-rotate-right", "0deg");
    set("--iris-scale", "1");
    set("--pupil-scale", "1");
    set("--life-pupil-scale", "1");
    set("--iris-opacity", "1");
    set("--iris-filter", "none");
    set("--eye-white-filter", reactionEyeWhiteFilter(reaction));
    set("--eye-vibe", "0deg");

    if (reaction === "idle-neutral") {
      set("--lid-upper-left", pose.upperLeft);
      set("--lid-lower-left", pose.lowerLeft);
      set("--lid-upper-right", pose.upperRight);
      set("--lid-lower-right", pose.lowerRight);
      set("--lid-tilt-left", pose.tiltLeft ?? "0deg");
      set("--lid-tilt-right", pose.tiltRight ?? "0deg");
      set("--lid-lower-tilt-left", pose.lowerTiltLeft ?? "0deg");
      set("--lid-lower-tilt-right", pose.lowerTiltRight ?? "0deg");
      set("--reaction-iris-x-left", pct(pose.irisXLeft ?? 0));
      set("--reaction-iris-x-right", pct(pose.irisXRight ?? 0));
      set("--reaction-pupil-x-left", pct(pose.pupilXLeft ?? 0));
      set("--reaction-pupil-x-right", pct(pose.pupilXRight ?? 0));
      set("--reaction-iris-y-left", pct(pose.irisY));
      set("--reaction-iris-y-right", pct(pose.irisY));
      set("--reaction-pupil-y-left", pct(pose.pupilY));
      set("--reaction-pupil-y-right", pct(pose.pupilY));
      set("--eye-base-x-left", pct((pose.irisXLeft ?? 0) * 0.2));
      set("--eye-base-x-right", pct((pose.irisXRight ?? 0) * 0.2));
      set("--eye-base-y-left", pct(pose.irisY * 0.18));
      set("--eye-base-y-right", pct(pose.irisY * 0.18));
      set("--iris-scale", pose.irisScale);
      set("--pupil-scale", pose.pupilScale);
      set("--iris-filter", pose.irisFilter ?? "none");
      set("--eye-vibe", pose.eyeVibe ?? "0deg");
    } else if (reaction === "blink" || reaction === "slow-blink") {
      set("--lid-upper-left", "4%");
      set("--lid-lower-left", "-2%");
      set("--lid-upper-right", "4%");
      set("--lid-lower-right", "-2%");
      set("--eye-base-y-left", "1%");
      set("--eye-base-y-right", "1%");
      set("--eye-base-scale-left", "0.98");
      set("--eye-base-scale-right", "0.98");
      set("--pupil-scale", "0.72");
    } else if (reaction === "sleepy" || reaction === "sleepy-idle" || reaction === "idle-long") {
      set("--lid-upper-left", "-10%");
      set("--lid-lower-left", "34%");
      set("--lid-upper-right", "-10%");
      set("--lid-lower-right", "34%");
      set("--lid-tilt-left", "-2deg");
      set("--lid-tilt-right", "2deg");
      set("--reaction-iris-y-left", pct(11));
      set("--reaction-iris-y-right", pct(11));
      set("--reaction-pupil-y-left", pct(15));
      set("--reaction-pupil-y-right", pct(15));
      set("--eye-base-y-left", pct(4));
      set("--eye-base-y-right", pct(4));
      set("--eye-base-scale-left", "0.99");
      set("--eye-base-scale-right", "0.99");
      set("--iris-opacity", "0.68");
      set("--iris-scale", "0.84");
      set("--pupil-scale", "0.78");
    } else if (reaction === "suspicious" || reaction === "hover-suspicious") {
      set("--lid-upper-left", "-15%");
      set("--lid-lower-left", "42%");
      set("--lid-upper-right", "-35%");
      set("--lid-lower-right", "58%");
      set("--lid-tilt-left", "-14deg");
      set("--lid-tilt-right", "13deg");
      set("--lid-lower-tilt-left", "8deg");
      set("--lid-lower-tilt-right", "-7deg");
      set("--reaction-iris-x-left", pct(9));
      set("--reaction-iris-x-right", pct(-9));
      set("--reaction-pupil-x-left", pct(14));
      set("--reaction-pupil-x-right", pct(-14));
      set("--eye-base-x-left", pct(3));
      set("--eye-base-x-right", pct(-3));
      set("--eye-base-y-left", pct(1));
      set("--eye-base-y-right", pct(-1));
      set("--eye-base-rotate-left", "-3deg");
      set("--eye-base-rotate-right", "3deg");
      set("--iris-scale", "0.88");
      set("--pupil-scale", "0.8");
      set("--iris-filter", "contrast(1.18) saturate(0.9)");
    } else if (reaction === "angry" || reaction === "delete" || reaction === "cut") {
      set("--lid-upper-left", "-13%");
      set("--lid-lower-left", "45%");
      set("--lid-upper-right", "-13%");
      set("--lid-lower-right", "45%");
      set("--lid-tilt-left", "18deg");
      set("--lid-tilt-right", "-18deg");
      set("--lid-lower-tilt-left", "-8deg");
      set("--lid-lower-tilt-right", "8deg");
      set("--reaction-iris-y-left", pct(-7));
      set("--reaction-iris-y-right", pct(-7));
      set("--reaction-pupil-y-left", pct(-11));
      set("--reaction-pupil-y-right", pct(-11));
      set("--eye-base-y-left", pct(-3));
      set("--eye-base-y-right", pct(-3));
      set("--eye-base-rotate-left", "3deg");
      set("--eye-base-rotate-right", "-3deg");
      set("--eye-base-scale-left", "1.08");
      set("--eye-base-scale-right", "1.08");
      set("--iris-scale", "0.95");
      set("--pupil-scale", "0.74");
      set("--iris-filter", "hue-rotate(155deg) saturate(1.55) contrast(1.12)");
    } else if (reaction === "furious") {
      set("--lid-upper-left", "0%");
      set("--lid-lower-left", "31%");
      set("--lid-upper-right", "0%");
      set("--lid-lower-right", "31%");
      set("--lid-tilt-left", "24deg");
      set("--lid-tilt-right", "-24deg");
      set("--lid-lower-tilt-left", "-11deg");
      set("--lid-lower-tilt-right", "11deg");
      set("--reaction-iris-x-left", pct(4));
      set("--reaction-iris-x-right", pct(-4));
      set("--reaction-pupil-x-left", pct(8));
      set("--reaction-pupil-x-right", pct(-8));
      set("--reaction-iris-y-left", pct(-12));
      set("--reaction-iris-y-right", pct(-12));
      set("--reaction-pupil-y-left", pct(-18));
      set("--reaction-pupil-y-right", pct(-18));
      set("--eye-base-y-left", pct(-5));
      set("--eye-base-y-right", pct(-5));
      set("--eye-base-rotate-left", "6deg");
      set("--eye-base-rotate-right", "-6deg");
      set("--eye-base-scale-left", "1.14");
      set("--eye-base-scale-right", "1.14");
      set("--iris-scale", "0.9");
      set("--pupil-scale", "0.48");
      set("--eye-vibe", "-4deg");
      set("--iris-filter", "hue-rotate(150deg) saturate(2.1) contrast(1.34) brightness(0.88)");
    } else if (reaction === "shocked" || reaction === "wide-stare" || reaction === "wake" || reaction === "dramatic-shock") {
      set("--lid-upper-left", "-92%");
      set("--lid-lower-left", "88%");
      set("--lid-upper-right", "-92%");
      set("--lid-lower-right", "88%");
      set("--lid-tilt-left", "2deg");
      set("--lid-tilt-right", "-2deg");
      set("--reaction-iris-y-left", pct(-3));
      set("--reaction-iris-y-right", pct(-3));
      set("--reaction-pupil-y-left", pct(-4));
      set("--reaction-pupil-y-right", pct(-4));
      set("--eye-base-y-left", pct(-2));
      set("--eye-base-y-right", pct(-2));
      set("--eye-base-scale-left", reaction === "dramatic-shock" ? "1.16" : "1.1");
      set("--eye-base-scale-right", reaction === "dramatic-shock" ? "1.16" : "1.1");
      set("--iris-scale", reaction === "dramatic-shock" ? "1.22" : "1.14");
      set("--pupil-scale", reaction === "wide-stare" ? "0.52" : "0.58");
      set("--eye-vibe", reaction === "dramatic-shock" ? "-2deg" : "0deg");
    } else if (reaction === "happy" || reaction === "copy" || reaction === "paste" || reaction === "redo") {
      set("--lid-upper-left", "-45%");
      set("--lid-lower-left", "36%");
      set("--lid-upper-right", "-45%");
      set("--lid-lower-right", "36%");
      set("--lid-tilt-left", "-9deg");
      set("--lid-tilt-right", "9deg");
      set("--lid-lower-tilt-left", "-7deg");
      set("--lid-lower-tilt-right", "7deg");
      set("--reaction-iris-y-left", pct(-8));
      set("--reaction-iris-y-right", pct(-8));
      set("--reaction-pupil-y-left", pct(-10));
      set("--reaction-pupil-y-right", pct(-10));
      set("--eye-base-y-left", pct(-3));
      set("--eye-base-y-right", pct(-3));
      set("--eye-base-rotate-left", "-2deg");
      set("--eye-base-rotate-right", "2deg");
      set("--eye-base-scale-left", "1.07");
      set("--eye-base-scale-right", "1.07");
      set("--iris-scale", "1.08");
      set("--pupil-scale", "1.04");
      set("--iris-filter", "brightness(1.08) saturate(1.18)");
    } else if (reaction === "laughing") {
      set("--lid-upper-left", "-15%");
      set("--lid-lower-left", "28%");
      set("--lid-upper-right", "-15%");
      set("--lid-lower-right", "28%");
      set("--lid-tilt-left", "-14deg");
      set("--lid-tilt-right", "14deg");
      set("--lid-lower-tilt-left", "-12deg");
      set("--lid-lower-tilt-right", "12deg");
      set("--reaction-iris-y-left", pct(-12));
      set("--reaction-iris-y-right", pct(-12));
      set("--reaction-pupil-y-left", pct(-15));
      set("--reaction-pupil-y-right", pct(-15));
      set("--eye-base-y-left", pct(-4));
      set("--eye-base-y-right", pct(-4));
      set("--eye-base-scale-left", "1.08");
      set("--eye-base-scale-right", "1.08");
      set("--iris-scale", "0.82");
      set("--pupil-scale", "0.78");
      set("--iris-filter", "brightness(1.12) saturate(1.22)");
    } else if (reaction === "in-love" || reaction === "starstruck") {
      set("--lid-upper-left", "-58%");
      set("--lid-lower-left", "45%");
      set("--lid-upper-right", "-58%");
      set("--lid-lower-right", "45%");
      set("--lid-tilt-left", "-8deg");
      set("--lid-tilt-right", "8deg");
      set("--reaction-iris-y-left", pct(reaction === "starstruck" ? -10 : -5));
      set("--reaction-iris-y-right", pct(reaction === "starstruck" ? -10 : -5));
      set("--reaction-pupil-y-left", pct(reaction === "starstruck" ? -13 : -7));
      set("--reaction-pupil-y-right", pct(reaction === "starstruck" ? -13 : -7));
      set("--eye-base-y-left", pct(-2));
      set("--eye-base-y-right", pct(-2));
      set("--eye-base-scale-left", reaction === "starstruck" ? "1.14" : "1.1");
      set("--eye-base-scale-right", reaction === "starstruck" ? "1.14" : "1.1");
      set("--iris-scale", reaction === "starstruck" ? "1.24" : "1.2");
      set("--pupil-scale", reaction === "starstruck" ? "1.08" : "1.22");
      set("--iris-filter", reaction === "starstruck" ? "brightness(1.18) saturate(1.45) contrast(1.08)" : "hue-rotate(305deg) brightness(1.16) saturate(1.55)");
    } else if (reaction === "sad" || reaction === "undo") {
      set("--lid-upper-left", "-18%");
      set("--lid-lower-left", "43%");
      set("--lid-upper-right", "-18%");
      set("--lid-lower-right", "43%");
      set("--lid-tilt-left", "-16deg");
      set("--lid-tilt-right", "16deg");
      set("--lid-lower-tilt-left", "7deg");
      set("--lid-lower-tilt-right", "-7deg");
      set("--reaction-iris-y-left", pct(13));
      set("--reaction-iris-y-right", pct(13));
      set("--reaction-pupil-y-left", pct(18));
      set("--reaction-pupil-y-right", pct(18));
      set("--eye-base-y-left", pct(5));
      set("--eye-base-y-right", pct(5));
      set("--eye-base-rotate-left", "-2deg");
      set("--eye-base-rotate-right", "2deg");
      set("--eye-base-scale-left", "0.98");
      set("--eye-base-scale-right", "0.98");
      set("--iris-opacity", "0.62");
      set("--iris-scale", "0.82");
      set("--pupil-scale", "0.86");
      set("--iris-filter", "saturate(0.65) brightness(0.86)");
    } else if (reaction === "crying") {
      set("--lid-upper-left", "-8%");
      set("--lid-lower-left", "34%");
      set("--lid-upper-right", "-8%");
      set("--lid-lower-right", "34%");
      set("--lid-tilt-left", "-18deg");
      set("--lid-tilt-right", "18deg");
      set("--lid-lower-tilt-left", "9deg");
      set("--lid-lower-tilt-right", "-9deg");
      set("--reaction-iris-y-left", pct(18));
      set("--reaction-iris-y-right", pct(18));
      set("--reaction-pupil-y-left", pct(24));
      set("--reaction-pupil-y-right", pct(24));
      set("--eye-base-y-left", pct(7));
      set("--eye-base-y-right", pct(7));
      set("--eye-base-scale-left", "0.96");
      set("--eye-base-scale-right", "0.96");
      set("--iris-opacity", "0.58");
      set("--iris-scale", "0.78");
      set("--pupil-scale", "0.92");
      set("--iris-filter", "hue-rotate(185deg) saturate(0.82) brightness(0.92)");
    } else if (reaction === "frustration") {
      set("--lid-upper-left", "-6%");
      set("--lid-lower-left", "38%");
      set("--lid-upper-right", "-6%");
      set("--lid-lower-right", "38%");
      set("--lid-tilt-left", "15deg");
      set("--lid-tilt-right", "-15deg");
      set("--reaction-iris-x-left", pct(-6));
      set("--reaction-iris-x-right", pct(6));
      set("--reaction-pupil-x-left", pct(-9));
      set("--reaction-pupil-x-right", pct(9));
      set("--reaction-iris-y-left", pct(-3));
      set("--reaction-iris-y-right", pct(-3));
      set("--reaction-pupil-y-left", pct(-5));
      set("--reaction-pupil-y-right", pct(-5));
      set("--eye-base-rotate-left", "3deg");
      set("--eye-base-rotate-right", "-3deg");
      set("--iris-scale", "0.82");
      set("--pupil-scale", "0.62");
      set("--iris-filter", "contrast(1.28) saturate(1.28) brightness(0.92)");
    } else if (reaction === "relief") {
      set("--lid-upper-left", "-30%");
      set("--lid-lower-left", "42%");
      set("--lid-upper-right", "-30%");
      set("--lid-lower-right", "42%");
      set("--lid-tilt-left", "-4deg");
      set("--lid-tilt-right", "4deg");
      set("--reaction-iris-y-left", pct(8));
      set("--reaction-iris-y-right", pct(8));
      set("--reaction-pupil-y-left", pct(12));
      set("--reaction-pupil-y-right", pct(12));
      set("--eye-base-y-left", pct(3));
      set("--eye-base-y-right", pct(3));
      set("--eye-base-scale-left", "0.98");
      set("--eye-base-scale-right", "0.98");
      set("--iris-opacity", "0.76");
      set("--iris-scale", "0.9");
      set("--pupil-scale", "0.88");
      set("--iris-filter", "saturate(0.72) brightness(1.08)");
    } else if (reaction === "embarrassment") {
      set("--lid-upper-left", "-20%");
      set("--lid-lower-left", "42%");
      set("--lid-upper-right", "-35%");
      set("--lid-lower-right", "50%");
      set("--lid-tilt-left", "-10deg");
      set("--lid-tilt-right", "8deg");
      set("--reaction-iris-x-left", pct(-10));
      set("--reaction-iris-x-right", pct(-10));
      set("--reaction-pupil-x-left", pct(-15));
      set("--reaction-pupil-x-right", pct(-15));
      set("--reaction-iris-y-left", pct(13));
      set("--reaction-iris-y-right", pct(9));
      set("--reaction-pupil-y-left", pct(19));
      set("--reaction-pupil-y-right", pct(13));
      set("--eye-base-y-left", pct(4));
      set("--eye-base-y-right", pct(3));
      set("--iris-opacity", "0.72");
      set("--iris-scale", "0.86");
      set("--pupil-scale", "0.92");
      set("--iris-filter", "hue-rotate(325deg) saturate(1.18) brightness(1.02)");
    } else if (reaction === "surprise-delight") {
      set("--lid-upper-left", "-94%");
      set("--lid-lower-left", "90%");
      set("--lid-upper-right", "-94%");
      set("--lid-lower-right", "90%");
      set("--reaction-iris-y-left", pct(-6));
      set("--reaction-iris-y-right", pct(-6));
      set("--reaction-pupil-y-left", pct(-8));
      set("--reaction-pupil-y-right", pct(-8));
      set("--eye-base-scale-left", "1.18");
      set("--eye-base-scale-right", "1.18");
      set("--iris-scale", "1.28");
      set("--pupil-scale", "1.08");
      set("--iris-filter", "brightness(1.26) saturate(1.38)");
    } else if (reaction === "distrust") {
      set("--lid-upper-left", "-10%");
      set("--lid-lower-left", "41%");
      set("--lid-upper-right", "-28%");
      set("--lid-lower-right", "53%");
      set("--lid-tilt-left", "-20deg");
      set("--lid-tilt-right", "18deg");
      set("--reaction-iris-x-left", pct(16));
      set("--reaction-iris-x-right", pct(-16));
      set("--reaction-pupil-x-left", pct(23));
      set("--reaction-pupil-x-right", pct(-23));
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(-2));
      set("--reaction-pupil-y-left", pct(-3));
      set("--reaction-pupil-y-right", pct(-3));
      set("--eye-base-rotate-left", "-5deg");
      set("--eye-base-rotate-right", "5deg");
      set("--iris-scale", "0.72");
      set("--pupil-scale", "0.58");
      set("--iris-filter", "saturate(0.45) brightness(0.72) contrast(1.35)");
    } else if (reaction === "determination") {
      set("--lid-upper-left", "-24%");
      set("--lid-lower-left", "54%");
      set("--lid-upper-right", "-24%");
      set("--lid-lower-right", "54%");
      set("--lid-tilt-left", "12deg");
      set("--lid-tilt-right", "-12deg");
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(-2));
      set("--reaction-pupil-y-left", pct(-3));
      set("--reaction-pupil-y-right", pct(-3));
      set("--eye-base-scale-left", "1.04");
      set("--eye-base-scale-right", "1.04");
      set("--iris-scale", "0.76");
      set("--pupil-scale", "0.46");
      set("--iris-filter", "contrast(1.42) saturate(0.9) brightness(1.05)");
    } else if (reaction === "confusion-spiral") {
      set("--lid-upper-left", "-64%");
      set("--lid-lower-left", "68%");
      set("--lid-upper-right", "-36%");
      set("--lid-lower-right", "55%");
      set("--lid-tilt-left", "10deg");
      set("--lid-tilt-right", "-12deg");
      set("--reaction-iris-x-left", pct(13));
      set("--reaction-iris-x-right", pct(-11));
      set("--reaction-pupil-x-left", pct(19));
      set("--reaction-pupil-x-right", pct(-16));
      set("--reaction-iris-y-left", pct(-11));
      set("--reaction-iris-y-right", pct(12));
      set("--reaction-pupil-y-left", pct(-16));
      set("--reaction-pupil-y-right", pct(18));
      set("--eye-base-rotate-left", "-8deg");
      set("--eye-base-rotate-right", "8deg");
      set("--eye-vibe", "5deg");
      set("--iris-scale", "0.82");
      set("--pupil-scale", "0.62");
      set("--iris-filter", "hue-rotate(60deg) saturate(1.55) contrast(1.1)");
    } else if (reaction === "mischief") {
      set("--lid-upper-left", "-22%");
      set("--lid-lower-left", "48%");
      set("--lid-upper-right", "-56%");
      set("--lid-lower-right", "64%");
      set("--lid-tilt-left", "14deg");
      set("--lid-tilt-right", "-9deg");
      set("--reaction-iris-x-left", pct(15));
      set("--reaction-iris-x-right", pct(15));
      set("--reaction-pupil-x-left", pct(22));
      set("--reaction-pupil-x-right", pct(22));
      set("--reaction-iris-y-left", pct(-4));
      set("--reaction-iris-y-right", pct(-7));
      set("--reaction-pupil-y-left", pct(-6));
      set("--reaction-pupil-y-right", pct(-10));
      set("--eye-base-rotate-left", "5deg");
      set("--eye-base-rotate-right", "-3deg");
      set("--iris-scale", "0.98");
      set("--pupil-scale", "0.82");
      set("--iris-filter", "brightness(1.12) saturate(1.25)");
    } else if (reaction === "annoyance") {
      set("--lid-upper-left", "-18%");
      set("--lid-lower-left", "44%");
      set("--lid-upper-right", "-18%");
      set("--lid-lower-right", "44%");
      set("--lid-tilt-left", "-8deg");
      set("--lid-tilt-right", "8deg");
      set("--reaction-iris-x-left", pct(-8));
      set("--reaction-iris-x-right", pct(-8));
      set("--reaction-pupil-x-left", pct(-12));
      set("--reaction-pupil-x-right", pct(-12));
      set("--reaction-iris-y-left", pct(2));
      set("--reaction-iris-y-right", pct(2));
      set("--reaction-pupil-y-left", pct(3));
      set("--reaction-pupil-y-right", pct(3));
      set("--iris-scale", "0.78");
      set("--pupil-scale", "0.62");
      set("--iris-filter", "saturate(0.8) brightness(0.9) contrast(1.18)");
    } else if (reaction === "fear-freeze") {
      set("--lid-upper-left", "-86%");
      set("--lid-lower-left", "82%");
      set("--lid-upper-right", "-86%");
      set("--lid-lower-right", "82%");
      set("--reaction-iris-x-left", pct(-4));
      set("--reaction-iris-x-right", pct(-4));
      set("--reaction-pupil-x-left", pct(-6));
      set("--reaction-pupil-x-right", pct(-6));
      set("--reaction-iris-y-left", pct(-10));
      set("--reaction-iris-y-right", pct(-10));
      set("--reaction-pupil-y-left", pct(-15));
      set("--reaction-pupil-y-right", pct(-15));
      set("--eye-base-scale-left", "1.12");
      set("--eye-base-scale-right", "1.12");
      set("--iris-scale", "0.9");
      set("--pupil-scale", "0.38");
      set("--iris-filter", "saturate(0.55) brightness(1.18) contrast(1.2)");
    } else if (reaction === "excitement") {
      set("--lid-upper-left", "-88%");
      set("--lid-lower-left", "84%");
      set("--lid-upper-right", "-88%");
      set("--lid-lower-right", "84%");
      set("--reaction-iris-x-left", pct(8));
      set("--reaction-iris-x-right", pct(8));
      set("--reaction-pupil-x-left", pct(12));
      set("--reaction-pupil-x-right", pct(12));
      set("--reaction-iris-y-left", pct(-12));
      set("--reaction-iris-y-right", pct(-12));
      set("--reaction-pupil-y-left", pct(-18));
      set("--reaction-pupil-y-right", pct(-18));
      set("--eye-base-scale-left", "1.16");
      set("--eye-base-scale-right", "1.16");
      set("--iris-scale", "1.18");
      set("--pupil-scale", "1.04");
      set("--iris-filter", "brightness(1.24) saturate(1.55)");
    } else if (reaction === "satisfaction") {
      set("--lid-upper-left", "-36%");
      set("--lid-lower-left", "34%");
      set("--lid-upper-right", "-36%");
      set("--lid-lower-right", "34%");
      set("--lid-tilt-left", "-7deg");
      set("--lid-tilt-right", "7deg");
      set("--reaction-iris-y-left", pct(-3));
      set("--reaction-iris-y-right", pct(-3));
      set("--reaction-pupil-y-left", pct(-4));
      set("--reaction-pupil-y-right", pct(-4));
      set("--eye-base-scale-left", "1.02");
      set("--eye-base-scale-right", "1.02");
      set("--iris-opacity", "0.82");
      set("--iris-scale", "0.9");
      set("--pupil-scale", "0.82");
      set("--iris-filter", "brightness(1.1) saturate(0.92)");
    } else if (reaction === "skepticism") {
      set("--lid-upper-left", "-8%");
      set("--lid-lower-left", "35%");
      set("--lid-upper-right", "-66%");
      set("--lid-lower-right", "70%");
      set("--lid-tilt-left", "-16deg");
      set("--lid-tilt-right", "5deg");
      set("--reaction-iris-x-left", pct(10));
      set("--reaction-iris-x-right", pct(10));
      set("--reaction-pupil-x-left", pct(15));
      set("--reaction-pupil-x-right", pct(15));
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(-5));
      set("--reaction-pupil-y-left", pct(-3));
      set("--reaction-pupil-y-right", pct(-8));
      set("--eye-base-rotate-left", "-5deg");
      set("--eye-base-rotate-right", "2deg");
      set("--iris-scale", "0.84");
      set("--pupil-scale", "0.66");
      set("--iris-filter", "contrast(1.2) saturate(0.75)");
    } else if (reaction === "overwhelmed") {
      set("--lid-upper-left", "-72%");
      set("--lid-lower-left", "62%");
      set("--lid-upper-right", "-18%");
      set("--lid-lower-right", "35%");
      set("--lid-tilt-left", "12deg");
      set("--lid-tilt-right", "-10deg");
      set("--reaction-iris-x-left", pct(-18));
      set("--reaction-iris-x-right", pct(16));
      set("--reaction-pupil-x-left", pct(-25));
      set("--reaction-pupil-x-right", pct(23));
      set("--reaction-iris-y-left", pct(-12));
      set("--reaction-iris-y-right", pct(18));
      set("--reaction-pupil-y-left", pct(-18));
      set("--reaction-pupil-y-right", pct(26));
      set("--eye-base-rotate-left", "-8deg");
      set("--eye-base-rotate-right", "7deg");
      set("--eye-base-scale-left", "1.1");
      set("--eye-base-scale-right", "0.96");
      set("--eye-vibe", "6deg");
      set("--iris-scale", "0.92");
      set("--pupil-scale", "0.54");
      set("--iris-filter", "saturate(0.75) brightness(1.02) contrast(1.28)");
    } else if (reaction === "loneliness") {
      set("--lid-upper-left", "-16%");
      set("--lid-lower-left", "36%");
      set("--lid-upper-right", "-16%");
      set("--lid-lower-right", "36%");
      set("--lid-tilt-left", "-5deg");
      set("--lid-tilt-right", "5deg");
      set("--reaction-iris-x-left", pct(3));
      set("--reaction-iris-x-right", pct(-3));
      set("--reaction-pupil-x-left", pct(5));
      set("--reaction-pupil-x-right", pct(-5));
      set("--reaction-iris-y-left", pct(22));
      set("--reaction-iris-y-right", pct(22));
      set("--reaction-pupil-y-left", pct(30));
      set("--reaction-pupil-y-right", pct(30));
      set("--eye-base-y-left", pct(8));
      set("--eye-base-y-right", pct(8));
      set("--eye-base-scale-left", "0.94");
      set("--eye-base-scale-right", "0.94");
      set("--iris-opacity", "0.44");
      set("--iris-scale", "0.66");
      set("--pupil-scale", "0.74");
      set("--iris-filter", "hue-rotate(195deg) saturate(0.42) brightness(0.78)");
    } else if (reaction === "gratitude") {
      set("--lid-upper-left", "-46%");
      set("--lid-lower-left", "50%");
      set("--lid-upper-right", "-46%");
      set("--lid-lower-right", "50%");
      set("--lid-tilt-left", "-6deg");
      set("--lid-tilt-right", "6deg");
      set("--reaction-iris-y-left", pct(3));
      set("--reaction-iris-y-right", pct(3));
      set("--reaction-pupil-y-left", pct(4));
      set("--reaction-pupil-y-right", pct(4));
      set("--eye-base-y-left", pct(2));
      set("--eye-base-y-right", pct(2));
      set("--iris-scale", "1.08");
      set("--pupil-scale", "1.12");
      set("--iris-filter", "hue-rotate(18deg) brightness(1.12) saturate(1.1)");
    } else if (reaction === "trust") {
      set("--lid-upper-left", "-62%");
      set("--lid-lower-left", "64%");
      set("--lid-upper-right", "-62%");
      set("--lid-lower-right", "64%");
      set("--reaction-iris-y-left", pct(0));
      set("--reaction-iris-y-right", pct(0));
      set("--reaction-pupil-y-left", pct(0));
      set("--reaction-pupil-y-right", pct(0));
      set("--eye-base-scale-left", "1.02");
      set("--eye-base-scale-right", "1.02");
      set("--iris-scale", "1");
      set("--pupil-scale", "1.06");
      set("--iris-filter", "saturate(0.9) brightness(1.08)");
    } else if (reaction === "doubt") {
      set("--lid-upper-left", "-25%");
      set("--lid-lower-left", "48%");
      set("--lid-upper-right", "-58%");
      set("--lid-lower-right", "65%");
      set("--lid-tilt-left", "-12deg");
      set("--lid-tilt-right", "9deg");
      set("--reaction-iris-x-left", pct(-6));
      set("--reaction-iris-x-right", pct(8));
      set("--reaction-pupil-x-left", pct(-9));
      set("--reaction-pupil-x-right", pct(12));
      set("--reaction-iris-y-left", pct(8));
      set("--reaction-iris-y-right", pct(-2));
      set("--reaction-pupil-y-left", pct(12));
      set("--reaction-pupil-y-right", pct(-3));
      set("--eye-base-rotate-left", "-3deg");
      set("--eye-base-rotate-right", "4deg");
      set("--iris-scale", "0.84");
      set("--pupil-scale", "0.72");
      set("--iris-filter", "saturate(0.72) brightness(0.96)");
    } else if (reaction === "concentration") {
      set("--lid-upper-left", "-30%");
      set("--lid-lower-left", "58%");
      set("--lid-upper-right", "-30%");
      set("--lid-lower-right", "58%");
      set("--lid-tilt-left", "5deg");
      set("--lid-tilt-right", "-5deg");
      set("--reaction-iris-y-left", pct(3));
      set("--reaction-iris-y-right", pct(3));
      set("--reaction-pupil-y-left", pct(4));
      set("--reaction-pupil-y-right", pct(4));
      set("--eye-base-scale-left", "1.01");
      set("--eye-base-scale-right", "1.01");
      set("--iris-scale", "0.78");
      set("--pupil-scale", "0.5");
      set("--iris-filter", "contrast(1.28) saturate(0.82)");
    } else if (reaction === "playfulness") {
      set("--lid-upper-left", "-72%");
      set("--lid-lower-left", "70%");
      set("--lid-upper-right", "-42%");
      set("--lid-lower-right", "48%");
      set("--lid-tilt-left", "-8deg");
      set("--lid-tilt-right", "13deg");
      set("--reaction-iris-x-left", pct(12));
      set("--reaction-iris-x-right", pct(12));
      set("--reaction-pupil-x-left", pct(18));
      set("--reaction-pupil-x-right", pct(18));
      set("--reaction-iris-y-left", pct(-6));
      set("--reaction-iris-y-right", pct(6));
      set("--reaction-pupil-y-left", pct(-9));
      set("--reaction-pupil-y-right", pct(9));
      set("--eye-base-rotate-left", "-5deg");
      set("--eye-base-rotate-right", "5deg");
      set("--iris-scale", "1.08");
      set("--pupil-scale", "0.94");
      set("--iris-filter", "brightness(1.16) saturate(1.32)");
    } else if (reaction === "impatience") {
      set("--lid-upper-left", "-14%");
      set("--lid-lower-left", "43%");
      set("--lid-upper-right", "-14%");
      set("--lid-lower-right", "43%");
      set("--lid-tilt-left", "-10deg");
      set("--lid-tilt-right", "10deg");
      set("--reaction-iris-x-left", pct(15));
      set("--reaction-iris-x-right", pct(15));
      set("--reaction-pupil-x-left", pct(22));
      set("--reaction-pupil-x-right", pct(22));
      set("--reaction-iris-y-left", pct(1));
      set("--reaction-iris-y-right", pct(1));
      set("--reaction-pupil-y-left", pct(2));
      set("--reaction-pupil-y-right", pct(2));
      set("--eye-base-x-left", pct(3));
      set("--eye-base-x-right", pct(3));
      set("--iris-scale", "0.72");
      set("--pupil-scale", "0.56");
      set("--iris-filter", "saturate(0.8) brightness(0.88) contrast(1.22)");
    } else if (reaction === "surprise-fear") {
      set("--lid-upper-left", "-94%");
      set("--lid-lower-left", "88%");
      set("--lid-upper-right", "-94%");
      set("--lid-lower-right", "88%");
      set("--reaction-iris-x-left", pct(-8));
      set("--reaction-iris-x-right", pct(8));
      set("--reaction-pupil-x-left", pct(-12));
      set("--reaction-pupil-x-right", pct(12));
      set("--reaction-iris-y-left", pct(-12));
      set("--reaction-iris-y-right", pct(-12));
      set("--reaction-pupil-y-left", pct(-18));
      set("--reaction-pupil-y-right", pct(-18));
      set("--eye-base-scale-left", "1.16");
      set("--eye-base-scale-right", "1.16");
      set("--iris-scale", "0.86");
      set("--pupil-scale", "0.34");
      set("--iris-filter", "saturate(0.52) brightness(1.18) contrast(1.3)");
    } else if (reaction === "awe") {
      set("--lid-upper-left", "-96%");
      set("--lid-lower-left", "88%");
      set("--lid-upper-right", "-96%");
      set("--lid-lower-right", "88%");
      set("--reaction-iris-y-left", pct(-18));
      set("--reaction-iris-y-right", pct(-18));
      set("--reaction-pupil-y-left", pct(-24));
      set("--reaction-pupil-y-right", pct(-24));
      set("--eye-base-y-left", pct(-5));
      set("--eye-base-y-right", pct(-5));
      set("--eye-base-scale-left", "1.2");
      set("--eye-base-scale-right", "1.2");
      set("--iris-scale", "1.2");
      set("--pupil-scale", "1");
      set("--iris-filter", "brightness(1.28) saturate(1.18)");
    } else if (reaction === "tired-but-awake") {
      set("--lid-upper-left", "-7%");
      set("--lid-lower-left", "31%");
      set("--lid-upper-right", "-7%");
      set("--lid-lower-right", "31%");
      set("--lid-tilt-left", "2deg");
      set("--lid-tilt-right", "-2deg");
      set("--reaction-iris-y-left", pct(12));
      set("--reaction-iris-y-right", pct(12));
      set("--reaction-pupil-y-left", pct(18));
      set("--reaction-pupil-y-right", pct(18));
      set("--eye-base-y-left", pct(5));
      set("--eye-base-y-right", pct(5));
      set("--eye-base-scale-left", "0.98");
      set("--eye-base-scale-right", "0.98");
      set("--iris-opacity", "0.62");
      set("--iris-scale", "0.76");
      set("--pupil-scale", "0.82");
      set("--iris-filter", "saturate(0.6) brightness(0.9)");
    } else if (reaction === "contentment") {
      set("--lid-upper-left", "-42%");
      set("--lid-lower-left", "39%");
      set("--lid-upper-right", "-42%");
      set("--lid-lower-right", "39%");
      set("--lid-tilt-left", "-5deg");
      set("--lid-tilt-right", "5deg");
      set("--reaction-iris-y-left", pct(-1));
      set("--reaction-iris-y-right", pct(-1));
      set("--reaction-pupil-y-left", pct(-1));
      set("--reaction-pupil-y-right", pct(-1));
      set("--eye-base-scale-left", "1.01");
      set("--eye-base-scale-right", "1.01");
      set("--iris-opacity", "0.78");
      set("--iris-scale", "0.86");
      set("--pupil-scale", "0.78");
      set("--iris-filter", "saturate(0.72) brightness(1.02)");
    } else if (reaction === "alertness") {
      set("--lid-upper-left", "-78%");
      set("--lid-lower-left", "78%");
      set("--lid-upper-right", "-78%");
      set("--lid-lower-right", "78%");
      set("--reaction-iris-x-left", pct(-4));
      set("--reaction-iris-x-right", pct(-4));
      set("--reaction-pupil-x-left", pct(-6));
      set("--reaction-pupil-x-right", pct(-6));
      set("--reaction-iris-y-left", pct(-6));
      set("--reaction-iris-y-right", pct(-6));
      set("--reaction-pupil-y-left", pct(-9));
      set("--reaction-pupil-y-right", pct(-9));
      set("--eye-base-scale-left", "1.08");
      set("--eye-base-scale-right", "1.08");
      set("--iris-scale", "0.92");
      set("--pupil-scale", "0.44");
      set("--iris-filter", "contrast(1.36) saturate(1.08) brightness(1.08)");
    } else if (reaction === "suspense") {
      set("--lid-upper-left", "-46%");
      set("--lid-lower-left", "61%");
      set("--lid-upper-right", "-46%");
      set("--lid-lower-right", "61%");
      set("--lid-tilt-left", "6deg");
      set("--lid-tilt-right", "-6deg");
      set("--reaction-iris-x-left", pct(-18));
      set("--reaction-iris-x-right", pct(-18));
      set("--reaction-pupil-x-left", pct(-25));
      set("--reaction-pupil-x-right", pct(-25));
      set("--reaction-iris-y-left", pct(-4));
      set("--reaction-iris-y-right", pct(-4));
      set("--reaction-pupil-y-left", pct(-6));
      set("--reaction-pupil-y-right", pct(-6));
      set("--eye-base-x-left", pct(-5));
      set("--eye-base-x-right", pct(-5));
      set("--eye-base-scale-left", "1.04");
      set("--eye-base-scale-right", "1.04");
      set("--iris-scale", "0.88");
      set("--pupil-scale", "0.5");
      set("--iris-filter", "saturate(0.65) brightness(0.86) contrast(1.25)");
    } else if (reaction === "disgust") {
      set("--lid-upper-left", "-18%");
      set("--lid-lower-left", "47%");
      set("--lid-upper-right", "-42%");
      set("--lid-lower-right", "58%");
      set("--lid-tilt-left", "-18deg");
      set("--lid-tilt-right", "-10deg");
      set("--lid-lower-tilt-left", "8deg");
      set("--lid-lower-tilt-right", "2deg");
      set("--reaction-iris-x-left", pct(-14));
      set("--reaction-iris-x-right", pct(-10));
      set("--reaction-pupil-x-left", pct(-20));
      set("--reaction-pupil-x-right", pct(-15));
      set("--reaction-iris-y-left", pct(7));
      set("--reaction-iris-y-right", pct(4));
      set("--reaction-pupil-y-left", pct(10));
      set("--reaction-pupil-y-right", pct(6));
      set("--eye-base-rotate-left", "-5deg");
      set("--eye-base-rotate-right", "-2deg");
      set("--iris-scale", "0.76");
      set("--pupil-scale", "0.66");
      set("--iris-filter", "hue-rotate(88deg) saturate(0.7) brightness(0.82) contrast(1.2)");
    } else if (reaction === "guilt" || reaction === "shame") {
      const isShame = reaction === "shame";
      set("--lid-upper-left", isShame ? "-4%" : "-14%");
      set("--lid-lower-left", isShame ? "30%" : "39%");
      set("--lid-upper-right", isShame ? "-4%" : "-14%");
      set("--lid-lower-right", isShame ? "30%" : "39%");
      set("--lid-tilt-left", "-8deg");
      set("--lid-tilt-right", "8deg");
      set("--reaction-iris-x-left", pct(isShame ? -5 : 6));
      set("--reaction-iris-x-right", pct(isShame ? -5 : 6));
      set("--reaction-pupil-x-left", pct(isShame ? -8 : 9));
      set("--reaction-pupil-x-right", pct(isShame ? -8 : 9));
      set("--reaction-iris-y-left", pct(isShame ? 22 : 17));
      set("--reaction-iris-y-right", pct(isShame ? 22 : 17));
      set("--reaction-pupil-y-left", pct(isShame ? 30 : 24));
      set("--reaction-pupil-y-right", pct(isShame ? 30 : 24));
      set("--eye-base-y-left", pct(isShame ? 8 : 6));
      set("--eye-base-y-right", pct(isShame ? 8 : 6));
      set("--eye-base-scale-left", isShame ? "0.92" : "0.96");
      set("--eye-base-scale-right", isShame ? "0.92" : "0.96");
      set("--iris-opacity", isShame ? "0.46" : "0.6");
      set("--iris-scale", isShame ? "0.68" : "0.78");
      set("--pupil-scale", isShame ? "0.72" : "0.84");
      set("--iris-filter", "saturate(0.58) brightness(0.78)");
    } else if (reaction === "sympathy") {
      set("--lid-upper-left", "-33%");
      set("--lid-lower-left", "46%");
      set("--lid-upper-right", "-33%");
      set("--lid-lower-right", "46%");
      set("--lid-tilt-left", "-7deg");
      set("--lid-tilt-right", "7deg");
      set("--reaction-iris-y-left", pct(6));
      set("--reaction-iris-y-right", pct(6));
      set("--reaction-pupil-y-left", pct(8));
      set("--reaction-pupil-y-right", pct(8));
      set("--eye-base-y-left", pct(2));
      set("--eye-base-y-right", pct(2));
      set("--eye-base-scale-left", "1.03");
      set("--eye-base-scale-right", "1.03");
      set("--iris-scale", "1.08");
      set("--pupil-scale", "1.1");
      set("--iris-filter", "brightness(1.06) saturate(0.92)");
    } else if (reaction === "shyness") {
      set("--lid-upper-left", "-24%");
      set("--lid-lower-left", "45%");
      set("--lid-upper-right", "-32%");
      set("--lid-lower-right", "50%");
      set("--lid-tilt-left", "-8deg");
      set("--lid-tilt-right", "7deg");
      set("--reaction-iris-x-left", pct(-10));
      set("--reaction-iris-x-right", pct(-10));
      set("--reaction-pupil-x-left", pct(-15));
      set("--reaction-pupil-x-right", pct(-15));
      set("--reaction-iris-y-left", pct(13));
      set("--reaction-iris-y-right", pct(10));
      set("--reaction-pupil-y-left", pct(19));
      set("--reaction-pupil-y-right", pct(15));
      set("--eye-base-y-left", pct(4));
      set("--eye-base-y-right", pct(3));
      set("--iris-scale", "0.98");
      set("--pupil-scale", "1.16");
      set("--iris-opacity", "0.78");
    } else if (reaction === "awkwardness") {
      set("--lid-upper-left", "-18%");
      set("--lid-lower-left", "43%");
      set("--lid-upper-right", "-62%");
      set("--lid-lower-right", "67%");
      set("--lid-tilt-left", "9deg");
      set("--lid-tilt-right", "-11deg");
      set("--reaction-iris-x-left", pct(-13));
      set("--reaction-iris-x-right", pct(11));
      set("--reaction-pupil-x-left", pct(-19));
      set("--reaction-pupil-x-right", pct(16));
      set("--reaction-iris-y-left", pct(12));
      set("--reaction-iris-y-right", pct(-5));
      set("--reaction-pupil-y-left", pct(18));
      set("--reaction-pupil-y-right", pct(-8));
      set("--eye-base-rotate-left", "-4deg");
      set("--eye-base-rotate-right", "4deg");
      set("--iris-scale", "0.92");
      set("--pupil-scale", "0.9");
      set("--eye-vibe", "3deg");
    } else if (reaction === "guilt-panic") {
      set("--lid-upper-left", "-86%");
      set("--lid-lower-left", "80%");
      set("--lid-upper-right", "-58%");
      set("--lid-lower-right", "67%");
      set("--lid-tilt-left", "9deg");
      set("--lid-tilt-right", "-12deg");
      set("--reaction-iris-x-left", pct(19));
      set("--reaction-iris-x-right", pct(19));
      set("--reaction-pupil-x-left", pct(27));
      set("--reaction-pupil-x-right", pct(27));
      set("--reaction-iris-y-left", pct(-10));
      set("--reaction-iris-y-right", pct(-5));
      set("--reaction-pupil-y-left", pct(-15));
      set("--reaction-pupil-y-right", pct(-8));
      set("--eye-base-scale-left", "1.14");
      set("--eye-base-scale-right", "1.06");
      set("--iris-scale", "1.05");
      set("--pupil-scale", "0.48");
      set("--eye-vibe", "-5deg");
    } else if (reaction === "interest") {
      set("--lid-upper-left", "-70%");
      set("--lid-lower-left", "70%");
      set("--lid-upper-right", "-70%");
      set("--lid-lower-right", "70%");
      set("--reaction-iris-y-left", pct(-5));
      set("--reaction-iris-y-right", pct(-5));
      set("--reaction-pupil-y-left", pct(-7));
      set("--reaction-pupil-y-right", pct(-7));
      set("--eye-base-scale-left", "1.04");
      set("--eye-base-scale-right", "1.04");
      set("--iris-scale", "1.06");
      set("--pupil-scale", "1.12");
    } else if (reaction === "disappointment") {
      set("--lid-upper-left", "-12%");
      set("--lid-lower-left", "38%");
      set("--lid-upper-right", "-12%");
      set("--lid-lower-right", "38%");
      set("--lid-tilt-left", "-9deg");
      set("--lid-tilt-right", "9deg");
      set("--reaction-iris-y-left", pct(17));
      set("--reaction-iris-y-right", pct(17));
      set("--reaction-pupil-y-left", pct(24));
      set("--reaction-pupil-y-right", pct(24));
      set("--eye-base-y-left", pct(6));
      set("--eye-base-y-right", pct(6));
      set("--iris-opacity", "0.58");
      set("--iris-scale", "0.76");
      set("--pupil-scale", "0.68");
    } else if (reaction === "contempt") {
      set("--lid-upper-left", "-9%");
      set("--lid-lower-left", "43%");
      set("--lid-upper-right", "-46%");
      set("--lid-lower-right", "61%");
      set("--lid-tilt-left", "-19deg");
      set("--lid-tilt-right", "9deg");
      set("--reaction-iris-x-left", pct(18));
      set("--reaction-iris-x-right", pct(12));
      set("--reaction-pupil-x-left", pct(25));
      set("--reaction-pupil-x-right", pct(18));
      set("--reaction-iris-y-left", pct(2));
      set("--reaction-iris-y-right", pct(-3));
      set("--reaction-pupil-y-left", pct(3));
      set("--reaction-pupil-y-right", pct(-5));
      set("--eye-base-rotate-left", "-5deg");
      set("--eye-base-rotate-right", "2deg");
      set("--iris-scale", "0.78");
      set("--pupil-scale", "0.62");
    } else if (reaction === "smug") {
      set("--lid-upper-left", "-30%");
      set("--lid-lower-left", "53%");
      set("--lid-upper-right", "-18%");
      set("--lid-lower-right", "43%");
      set("--lid-tilt-left", "6deg");
      set("--lid-tilt-right", "-13deg");
      set("--reaction-iris-x-left", pct(10));
      set("--reaction-iris-x-right", pct(10));
      set("--reaction-pupil-x-left", pct(15));
      set("--reaction-pupil-x-right", pct(15));
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(3));
      set("--reaction-pupil-y-left", pct(-3));
      set("--reaction-pupil-y-right", pct(4));
      set("--eye-base-rotate-left", "2deg");
      set("--eye-base-rotate-right", "-4deg");
      set("--iris-scale", "0.9");
      set("--pupil-scale", "0.88");
    } else if (reaction === "concern") {
      set("--lid-upper-left", "-52%");
      set("--lid-lower-left", "63%");
      set("--lid-upper-right", "-52%");
      set("--lid-lower-right", "63%");
      set("--lid-tilt-left", "-13deg");
      set("--lid-tilt-right", "13deg");
      set("--reaction-iris-y-left", pct(-2));
      set("--reaction-iris-y-right", pct(-2));
      set("--reaction-pupil-y-left", pct(-3));
      set("--reaction-pupil-y-right", pct(-3));
      set("--eye-base-scale-left", "1.08");
      set("--eye-base-scale-right", "1.08");
      set("--iris-scale", "1.04");
      set("--pupil-scale", "0.72");
    } else if (reaction === "anticipation") {
      set("--lid-upper-left", "-58%");
      set("--lid-lower-left", "66%");
      set("--lid-upper-right", "-58%");
      set("--lid-lower-right", "66%");
      set("--reaction-iris-x-left", pct(8));
      set("--reaction-iris-x-right", pct(8));
      set("--reaction-pupil-x-left", pct(12));
      set("--reaction-pupil-x-right", pct(12));
      set("--reaction-iris-y-left", pct(-4));
      set("--reaction-iris-y-right", pct(-4));
      set("--reaction-pupil-y-left", pct(-6));
      set("--reaction-pupil-y-right", pct(-6));
      set("--eye-base-scale-left", "1.06");
      set("--eye-base-scale-right", "1.06");
      set("--iris-scale", "1.02");
      set("--pupil-scale", "1.06");
    } else if (reaction === "startled-recovery") {
      set("--lid-upper-left", "-88%");
      set("--lid-lower-left", "84%");
      set("--lid-upper-right", "-88%");
      set("--lid-lower-right", "84%");
      set("--reaction-iris-y-left", pct(-6));
      set("--reaction-iris-y-right", pct(-6));
      set("--reaction-pupil-y-left", pct(-9));
      set("--reaction-pupil-y-right", pct(-9));
      set("--eye-base-scale-left", "1.16");
      set("--eye-base-scale-right", "1.16");
      set("--iris-scale", "1.16");
      set("--pupil-scale", "0.52");
      set("--eye-vibe", "-3deg");
    } else if (reaction === "meditative") {
      set("--lid-upper-left", "-2%");
      set("--lid-lower-left", "24%");
      set("--lid-upper-right", "-2%");
      set("--lid-lower-right", "24%");
      set("--reaction-iris-y-left", pct(12));
      set("--reaction-iris-y-right", pct(12));
      set("--reaction-pupil-y-left", pct(18));
      set("--reaction-pupil-y-right", pct(18));
      set("--eye-base-y-left", pct(5));
      set("--eye-base-y-right", pct(5));
      set("--iris-opacity", "0.42");
      set("--iris-scale", "0.62");
      set("--pupil-scale", "0.72");
    } else if (reaction === "deadpan") {
      set("--lid-upper-left", "-20%");
      set("--lid-lower-left", "40%");
      set("--lid-upper-right", "-20%");
      set("--lid-lower-right", "40%");
      set("--reaction-iris-y-left", pct(2));
      set("--reaction-iris-y-right", pct(2));
      set("--reaction-pupil-y-left", pct(2));
      set("--reaction-pupil-y-right", pct(2));
      set("--eye-base-scale-left", "0.96");
      set("--eye-base-scale-right", "0.96");
      set("--iris-opacity", "0.72");
      set("--iris-scale", "0.82");
      set("--pupil-scale", "0.74");
    } else if (reaction === "curiosity") {
      set("--lid-upper-left", "-76%");
      set("--lid-lower-left", "76%");
      set("--lid-upper-right", "-34%");
      set("--lid-lower-right", "52%");
      set("--lid-tilt-left", "-4deg");
      set("--lid-tilt-right", "11deg");
      set("--reaction-iris-x-left", pct(13));
      set("--reaction-iris-x-right", pct(13));
      set("--reaction-pupil-x-left", pct(19));
      set("--reaction-pupil-x-right", pct(19));
      set("--reaction-iris-y-left", pct(-8));
      set("--reaction-iris-y-right", pct(-3));
      set("--reaction-pupil-y-left", pct(-12));
      set("--reaction-pupil-y-right", pct(-5));
      set("--eye-base-rotate-left", "-3deg");
      set("--eye-base-rotate-right", "7deg");
      set("--eye-base-scale-left", "1.08");
      set("--eye-base-scale-right", "1.02");
      set("--iris-scale", "1.04");
      set("--pupil-scale", "0.86");
      set("--iris-filter", "brightness(1.12) saturate(1.2)");
    } else if (reaction === "jealousy") {
      set("--lid-upper-left", "-16%");
      set("--lid-lower-left", "46%");
      set("--lid-upper-right", "-30%");
      set("--lid-lower-right", "55%");
      set("--lid-tilt-left", "-16deg");
      set("--lid-tilt-right", "16deg");
      set("--reaction-iris-x-left", pct(-16));
      set("--reaction-iris-x-right", pct(-16));
      set("--reaction-pupil-x-left", pct(-23));
      set("--reaction-pupil-x-right", pct(-23));
      set("--reaction-iris-y-left", pct(-4));
      set("--reaction-iris-y-right", pct(-4));
      set("--reaction-pupil-y-left", pct(-6));
      set("--reaction-pupil-y-right", pct(-6));
      set("--eye-base-x-left", pct(-4));
      set("--eye-base-x-right", pct(-4));
      set("--eye-base-rotate-left", "-4deg");
      set("--eye-base-rotate-right", "-4deg");
      set("--iris-scale", "0.9");
      set("--pupil-scale", "0.68");
      set("--iris-filter", "hue-rotate(105deg) saturate(1.55) brightness(0.9)");
    } else if (reaction === "pride") {
      set("--lid-upper-left", "-50%");
      set("--lid-lower-left", "54%");
      set("--lid-upper-right", "-50%");
      set("--lid-lower-right", "54%");
      set("--lid-tilt-left", "7deg");
      set("--lid-tilt-right", "-7deg");
      set("--reaction-iris-y-left", pct(-16));
      set("--reaction-iris-y-right", pct(-16));
      set("--reaction-pupil-y-left", pct(-22));
      set("--reaction-pupil-y-right", pct(-22));
      set("--eye-base-y-left", pct(-5));
      set("--eye-base-y-right", pct(-5));
      set("--eye-base-scale-left", "1.05");
      set("--eye-base-scale-right", "1.05");
      set("--iris-scale", "1.06");
      set("--pupil-scale", "0.84");
      set("--iris-filter", "brightness(1.18) saturate(1.22) contrast(1.08)");
    } else if (reaction === "bored" || reaction === "apathy" || reaction === "acceptance" || reaction === "calm") {
      const isApathy = reaction === "apathy";
      const isAcceptance = reaction === "acceptance";
      const isCalm = reaction === "calm";
      set("--lid-upper-left", isCalm ? "-40%" : isAcceptance ? "-25%" : isApathy ? "-2%" : "-12%");
      set("--lid-lower-left", isCalm ? "57%" : isAcceptance ? "44%" : isApathy ? "22%" : "34%");
      set("--lid-upper-right", isCalm ? "-40%" : isAcceptance ? "-25%" : isApathy ? "-2%" : "-12%");
      set("--lid-lower-right", isCalm ? "57%" : isAcceptance ? "44%" : isApathy ? "22%" : "34%");
      set("--lid-tilt-left", isCalm ? "0deg" : isAcceptance ? "-3deg" : "1deg");
      set("--lid-tilt-right", isCalm ? "0deg" : isAcceptance ? "3deg" : "-1deg");
      set("--reaction-iris-x-left", pct(isApathy ? 0 : isAcceptance ? 0 : isCalm ? 0 : -6));
      set("--reaction-iris-x-right", pct(isApathy ? 0 : isAcceptance ? 0 : isCalm ? 0 : -6));
      set("--reaction-pupil-x-left", pct(isApathy ? 0 : isAcceptance ? 0 : isCalm ? 0 : -9));
      set("--reaction-pupil-x-right", pct(isApathy ? 0 : isAcceptance ? 0 : isCalm ? 0 : -9));
      set("--reaction-iris-y-left", pct(isCalm ? 1 : isAcceptance ? 10 : isApathy ? 3 : 18));
      set("--reaction-iris-y-right", pct(isCalm ? 1 : isAcceptance ? 10 : isApathy ? 3 : 18));
      set("--reaction-pupil-y-left", pct(isCalm ? 1 : isAcceptance ? 14 : isApathy ? 4 : 25));
      set("--reaction-pupil-y-right", pct(isCalm ? 1 : isAcceptance ? 14 : isApathy ? 4 : 25));
      set("--eye-base-y-left", pct(isCalm ? 0 : isAcceptance ? 3 : isApathy ? 1 : 6));
      set("--eye-base-y-right", pct(isCalm ? 0 : isAcceptance ? 3 : isApathy ? 1 : 6));
      set("--eye-base-scale-left", isCalm ? "1" : isApathy ? "0.9" : "0.96");
      set("--eye-base-scale-right", isCalm ? "1" : isApathy ? "0.9" : "0.96");
      set("--iris-opacity", isCalm ? "0.82" : isAcceptance ? "0.7" : isApathy ? "0.28" : "0.5");
      set("--iris-scale", isCalm ? "0.96" : isAcceptance ? "0.86" : isApathy ? "0.54" : "0.7");
      set("--pupil-scale", isCalm ? "0.9" : isAcceptance ? "0.8" : isApathy ? "0.48" : "0.62");
      set("--iris-filter", isCalm ? "saturate(0.78) brightness(1.04)" : isAcceptance ? "saturate(0.62) brightness(0.96)" : isApathy ? "grayscale(1) opacity(0.6)" : "saturate(0.45) brightness(0.86)");
    } else if (reaction === "inspiration" || reaction === "passion" || reaction === "hope") {
      const isPassion = reaction === "passion";
      const isHope = reaction === "hope";
      set("--lid-upper-left", isPassion ? "-74%" : isHope ? "-60%" : "-82%");
      set("--lid-lower-left", isPassion ? "69%" : isHope ? "66%" : "76%");
      set("--lid-upper-right", isPassion ? "-74%" : isHope ? "-60%" : "-82%");
      set("--lid-lower-right", isPassion ? "69%" : isHope ? "66%" : "76%");
      set("--lid-tilt-left", isPassion ? "10deg" : "-4deg");
      set("--lid-tilt-right", isPassion ? "-10deg" : "4deg");
      set("--reaction-iris-y-left", pct(isPassion ? -10 : isHope ? -7 : -18));
      set("--reaction-iris-y-right", pct(isPassion ? -10 : isHope ? -7 : -18));
      set("--reaction-pupil-y-left", pct(isPassion ? -15 : isHope ? -10 : -25));
      set("--reaction-pupil-y-right", pct(isPassion ? -15 : isHope ? -10 : -25));
      set("--eye-base-y-left", pct(isPassion ? -3 : -5));
      set("--eye-base-y-right", pct(isPassion ? -3 : -5));
      set("--eye-base-scale-left", isPassion ? "1.14" : isHope ? "1.06" : "1.12");
      set("--eye-base-scale-right", isPassion ? "1.14" : isHope ? "1.06" : "1.12");
      set("--iris-scale", isPassion ? "1.26" : isHope ? "1.08" : "1.18");
      set("--pupil-scale", isPassion ? "0.86" : isHope ? "0.78" : "0.7");
      set("--iris-filter", isPassion ? "hue-rotate(335deg) saturate(1.9) brightness(1.08)" : isHope ? "hue-rotate(55deg) saturate(1.18) brightness(1.18)" : "hue-rotate(25deg) saturate(1.55) brightness(1.24)");
    } else if (reaction === "dreamy") {
      set("--lid-upper-left", "-24%");
      set("--lid-lower-left", "43%");
      set("--lid-upper-right", "-24%");
      set("--lid-lower-right", "43%");
      set("--lid-tilt-left", "-7deg");
      set("--lid-tilt-right", "7deg");
      set("--reaction-iris-x-left", pct(7));
      set("--reaction-iris-x-right", pct(7));
      set("--reaction-pupil-x-left", pct(10));
      set("--reaction-pupil-x-right", pct(10));
      set("--reaction-iris-y-left", pct(-12));
      set("--reaction-iris-y-right", pct(-12));
      set("--reaction-pupil-y-left", pct(-16));
      set("--reaction-pupil-y-right", pct(-16));
      set("--eye-base-y-left", pct(-4));
      set("--eye-base-y-right", pct(-4));
      set("--eye-base-scale-left", "0.98");
      set("--eye-base-scale-right", "0.98");
      set("--iris-opacity", "0.72");
      set("--iris-scale", "1.05");
      set("--pupil-scale", "1.18");
      set("--iris-filter", "hue-rotate(285deg) saturate(1.05) brightness(1.16)");
    } else if (reaction === "stoned") {
      set("--lid-upper-left", "2%");
      set("--lid-lower-left", "23%");
      set("--lid-upper-right", "-1%");
      set("--lid-lower-right", "25%");
      set("--lid-tilt-left", "-1deg");
      set("--lid-tilt-right", "1deg");
      set("--reaction-iris-x-left", pct(4));
      set("--reaction-iris-x-right", pct(4));
      set("--reaction-pupil-x-left", pct(6));
      set("--reaction-pupil-x-right", pct(6));
      set("--reaction-iris-y-left", pct(15));
      set("--reaction-iris-y-right", pct(15));
      set("--reaction-pupil-y-left", pct(22));
      set("--reaction-pupil-y-right", pct(22));
      set("--eye-base-y-left", pct(7));
      set("--eye-base-y-right", pct(7));
      set("--eye-base-scale-left", "0.96");
      set("--eye-base-scale-right", "0.96");
      set("--eye-base-rotate-left", "-2deg");
      set("--eye-base-rotate-right", "2deg");
      set("--iris-opacity", "0.58");
      set("--iris-scale", "1.18");
      set("--pupil-scale", "1.5");
      set("--iris-filter", "hue-rotate(78deg) saturate(0.78) brightness(0.78) blur(0.45px)");
    } else if (reaction === "spacing-out") {
      set("--lid-upper-left", "-88%");
      set("--lid-lower-left", "83%");
      set("--lid-upper-right", "-88%");
      set("--lid-lower-right", "83%");
      set("--reaction-iris-x-left", pct(-17));
      set("--reaction-iris-x-right", pct(17));
      set("--reaction-pupil-x-left", pct(-24));
      set("--reaction-pupil-x-right", pct(24));
      set("--reaction-iris-y-left", pct(-1));
      set("--reaction-iris-y-right", pct(-1));
      set("--reaction-pupil-y-left", pct(-2));
      set("--reaction-pupil-y-right", pct(-2));
      set("--eye-base-scale-left", "1.08");
      set("--eye-base-scale-right", "1.08");
      set("--iris-opacity", "0.38");
      set("--iris-scale", "0.62");
      set("--pupil-scale", "0.42");
      set("--iris-filter", "saturate(0.32) brightness(1.25) contrast(0.8)");
    } else if (reaction === "nervous") {
      set("--lid-upper-left", "-34%");
      set("--lid-lower-left", "53%");
      set("--lid-upper-right", "-26%");
      set("--lid-lower-right", "49%");
      set("--lid-tilt-left", "9deg");
      set("--lid-tilt-right", "-7deg");
      set("--lid-lower-tilt-left", "-4deg");
      set("--lid-lower-tilt-right", "5deg");
      set("--reaction-iris-x-left", pct(-11));
      set("--reaction-iris-x-right", pct(-8));
      set("--reaction-pupil-x-left", pct(-16));
      set("--reaction-pupil-x-right", pct(-12));
      set("--reaction-iris-y-left", pct(-8));
      set("--reaction-iris-y-right", pct(5));
      set("--reaction-pupil-y-left", pct(-12));
      set("--reaction-pupil-y-right", pct(8));
      set("--eye-base-x-left", pct(-3));
      set("--eye-base-x-right", pct(-2));
      set("--eye-base-rotate-left", "-3deg");
      set("--eye-base-rotate-right", "2deg");
      set("--eye-base-scale-left", "1.06");
      set("--eye-base-scale-right", "1.02");
      set("--iris-scale", "0.78");
      set("--pupil-scale", "0.58");
      set("--iris-filter", "contrast(1.16) saturate(1.18) brightness(1.05)");
    } else if (reaction === "restless" || reaction === "panic") {
      const isPanic = reaction === "panic";
      set("--lid-upper-left", isPanic ? "-78%" : "-28%");
      set("--lid-lower-left", isPanic ? "72%" : "50%");
      set("--lid-upper-right", isPanic ? "-78%" : "-46%");
      set("--lid-lower-right", isPanic ? "72%" : "60%");
      set("--lid-tilt-left", isPanic ? "8deg" : "13deg");
      set("--lid-tilt-right", isPanic ? "-8deg" : "-11deg");
      set("--reaction-iris-x-left", pct(isPanic ? -15 : -9));
      set("--reaction-iris-x-right", pct(isPanic ? 15 : 12));
      set("--reaction-pupil-x-left", pct(isPanic ? -22 : -15));
      set("--reaction-pupil-x-right", pct(isPanic ? 22 : 18));
      set("--reaction-iris-y-left", pct(isPanic ? -10 : 8));
      set("--reaction-iris-y-right", pct(isPanic ? 9 : -8));
      set("--reaction-pupil-y-left", pct(isPanic ? -15 : 12));
      set("--reaction-pupil-y-right", pct(isPanic ? 13 : -12));
      set("--eye-base-x-left", pct(isPanic ? -4 : -2));
      set("--eye-base-x-right", pct(isPanic ? 4 : 2));
      set("--eye-base-rotate-left", isPanic ? "-8deg" : "-5deg");
      set("--eye-base-rotate-right", isPanic ? "8deg" : "5deg");
      set("--eye-base-scale-left", isPanic ? "1.16" : "1.04");
      set("--eye-base-scale-right", isPanic ? "1.16" : "1.04");
      set("--eye-vibe", isPanic ? "7deg" : "4deg");
      set("--iris-scale", isPanic ? "1.12" : "0.86");
      set("--pupil-scale", isPanic ? "0.52" : "0.7");
      set("--iris-filter", isPanic ? "contrast(1.25) saturate(1.35)" : "contrast(1.18) saturate(1.15)");
    } else if (reaction === "drunk") {
      set("--lid-upper-left", "-8%");
      set("--lid-lower-left", "37%");
      set("--lid-upper-right", "-31%");
      set("--lid-lower-right", "51%");
      set("--lid-tilt-left", "9deg");
      set("--lid-tilt-right", "-14deg");
      set("--reaction-iris-x-left", pct(18));
      set("--reaction-iris-x-right", pct(-18));
      set("--reaction-pupil-x-left", pct(26));
      set("--reaction-pupil-x-right", pct(-26));
      set("--reaction-iris-y-left", pct(12));
      set("--reaction-iris-y-right", pct(-8));
      set("--reaction-pupil-y-left", pct(18));
      set("--reaction-pupil-y-right", pct(-12));
      set("--eye-base-rotate-left", "-9deg");
      set("--eye-base-rotate-right", "9deg");
      set("--eye-base-scale-left", "1.02");
      set("--eye-base-scale-right", "1.02");
      set("--eye-vibe", "7deg");
      set("--iris-scale", "0.92");
      set("--pupil-scale", "1.18");
      set("--iris-filter", "hue-rotate(40deg) saturate(1.35) blur(0.35px)");
    } else if (reaction === "wink-left" || reaction === "wink-right") {
      const leftClosed = reaction === "wink-left";
      set("--lid-upper-left", leftClosed ? "4%" : "-54%");
      set("--lid-lower-left", leftClosed ? "-2%" : "42%");
      set("--lid-upper-right", leftClosed ? "-54%" : "4%");
      set("--lid-lower-right", leftClosed ? "42%" : "-2%");
      set("--lid-tilt-left", leftClosed ? "-2deg" : "-10deg");
      set("--lid-tilt-right", leftClosed ? "10deg" : "2deg");
      set("--lid-lower-tilt-left", leftClosed ? "0deg" : "-7deg");
      set("--lid-lower-tilt-right", leftClosed ? "7deg" : "0deg");
      set("--reaction-iris-y-left", pct(leftClosed ? 10 : -7));
      set("--reaction-iris-y-right", pct(leftClosed ? -7 : 10));
      set("--reaction-pupil-y-left", pct(leftClosed ? 15 : -10));
      set("--reaction-pupil-y-right", pct(leftClosed ? -10 : 15));
      set("--eye-base-scale-left", leftClosed ? "0.96" : "1.08");
      set("--eye-base-scale-right", leftClosed ? "1.08" : "0.96");
      set("--iris-scale", "1.02");
      set("--pupil-scale", "0.98");
      set("--iris-filter", "brightness(1.08) saturate(1.14)");
    } else if (reaction === "confused" || reaction === "dizzy" || reaction === "cross-eyed" || reaction === "eye-roll") {
      if (reaction === "cross-eyed") {
        set("--reaction-iris-x-left", pct(15));
        set("--reaction-iris-x-right", pct(-15));
        set("--reaction-pupil-x-left", pct(22));
        set("--reaction-pupil-x-right", pct(-22));
        set("--eye-base-x-left", pct(4));
        set("--eye-base-x-right", pct(-4));
        set("--eye-base-rotate-left", "4deg");
        set("--eye-base-rotate-right", "-4deg");
      } else if (reaction === "eye-roll") {
        set("--lid-upper-left", "-80%");
        set("--lid-lower-left", "70%");
        set("--lid-upper-right", "-80%");
        set("--lid-lower-right", "70%");
        set("--reaction-iris-y-left", pct(-18));
        set("--reaction-iris-y-right", pct(-18));
        set("--reaction-pupil-y-left", pct(-24));
        set("--reaction-pupil-y-right", pct(-24));
        set("--eye-base-y-left", pct(-5));
        set("--eye-base-y-right", pct(-5));
        set("--eye-base-scale-left", "1.05");
        set("--eye-base-scale-right", "1.05");
      } else {
        set("--lid-upper-left", "-32%");
        set("--lid-lower-left", "54%");
        set("--lid-upper-right", "-72%");
        set("--lid-lower-right", "74%");
        set("--lid-tilt-left", "12deg");
        set("--lid-tilt-right", "-9deg");
        set("--reaction-iris-x-left", pct(-12));
        set("--reaction-iris-x-right", pct(10));
        set("--reaction-pupil-x-left", pct(-18));
        set("--reaction-pupil-x-right", pct(15));
        set("--reaction-iris-y-left", pct(7));
        set("--reaction-iris-y-right", pct(-6));
        set("--reaction-pupil-y-left", pct(11));
        set("--reaction-pupil-y-right", pct(-9));
        set("--eye-base-x-left", pct(-3));
        set("--eye-base-x-right", pct(3));
        set("--eye-base-y-left", pct(3));
        set("--eye-base-y-right", pct(-3));
        set("--eye-base-rotate-left", reaction === "dizzy" ? "-7deg" : "-4deg");
        set("--eye-base-rotate-right", reaction === "dizzy" ? "7deg" : "4deg");
      }
      set("--eye-vibe", reaction === "dizzy" ? "5deg" : "-2deg");
      set("--iris-scale", reaction === "dizzy" ? "0.82" : "0.9");
      set("--pupil-scale", reaction === "dizzy" ? "0.72" : "0.82");
      set("--iris-filter", reaction === "dizzy" ? "hue-rotate(55deg) saturate(1.45)" : "saturate(1.05)");
    } else if (reaction === "typing" || reaction === "rapid-typing-focus") {
      set("--lid-upper-left", reaction === "rapid-typing-focus" ? "-38%" : "-44%");
      set("--lid-lower-left", reaction === "rapid-typing-focus" ? "50%" : "58%");
      set("--lid-upper-right", reaction === "rapid-typing-focus" ? "-38%" : "-44%");
      set("--lid-lower-right", reaction === "rapid-typing-focus" ? "50%" : "58%");
      set("--reaction-iris-y-left", pct(reaction === "rapid-typing-focus" ? 10 : 6));
      set("--reaction-iris-y-right", pct(reaction === "rapid-typing-focus" ? 10 : 6));
      set("--reaction-pupil-y-left", pct(reaction === "rapid-typing-focus" ? 15 : 9));
      set("--reaction-pupil-y-right", pct(reaction === "rapid-typing-focus" ? 15 : 9));
      set("--eye-base-y-left", pct(reaction === "rapid-typing-focus" ? 4 : 2));
      set("--eye-base-y-right", pct(reaction === "rapid-typing-focus" ? 4 : 2));
      set("--eye-base-scale-left", reaction === "rapid-typing-focus" ? "1.03" : "1.01");
      set("--eye-base-scale-right", reaction === "rapid-typing-focus" ? "1.03" : "1.01");
      set("--iris-scale", reaction === "rapid-typing-focus" ? "0.9" : "0.98");
      set("--pupil-scale", reaction === "rapid-typing-focus" ? "0.82" : "0.94");
      set("--iris-filter", "saturate(1.25) contrast(1.08)");
    } else if (reaction === "look-left" || reaction === "peek") {
      set("--reaction-iris-x-left", pct(-10));
      set("--reaction-iris-x-right", pct(-10));
      set("--reaction-pupil-x-left", pct(-15));
      set("--reaction-pupil-x-right", pct(-15));
      set("--eye-base-x-left", pct(-3));
      set("--eye-base-x-right", pct(-3));
      set("--pupil-scale", reaction === "peek" ? "1.04" : "0.98");
    } else if (reaction === "look-right" || reaction === "drag-tracking" || reaction === "fast-movement") {
      set("--reaction-iris-x-left", pct(10));
      set("--reaction-iris-x-right", pct(10));
      set("--reaction-pupil-x-left", pct(15));
      set("--reaction-pupil-x-right", pct(15));
      set("--eye-base-x-left", pct(3));
      set("--eye-base-x-right", pct(3));
      set("--pupil-scale", reaction === "fast-movement" ? "0.86" : reaction === "drag-tracking" ? "0.96" : "0.98");
    } else if (reaction === "chaotic-stare") {
      set("--lid-upper-left", "-90%");
      set("--lid-lower-left", "82%");
      set("--lid-upper-right", "-24%");
      set("--lid-lower-right", "48%");
      set("--lid-tilt-left", "12deg");
      set("--lid-tilt-right", "-15deg");
      set("--lid-lower-tilt-left", "-8deg");
      set("--lid-lower-tilt-right", "7deg");
      set("--reaction-iris-x-left", pct(-18));
      set("--reaction-iris-x-right", pct(15));
      set("--reaction-pupil-x-left", pct(-26));
      set("--reaction-pupil-x-right", pct(22));
      set("--reaction-iris-y-left", pct(-15));
      set("--reaction-iris-y-right", pct(14));
      set("--reaction-pupil-y-left", pct(-22));
      set("--reaction-pupil-y-right", pct(20));
      set("--eye-base-x-left", pct(-5));
      set("--eye-base-x-right", pct(4));
      set("--eye-base-y-left", pct(-4));
      set("--eye-base-y-right", pct(4));
      set("--eye-base-rotate-left", "-10deg");
      set("--eye-base-rotate-right", "8deg");
      set("--eye-base-scale-left", "1.16");
      set("--eye-base-scale-right", "0.98");
      set("--eye-vibe", "8deg");
      set("--iris-scale", "1.16");
      set("--pupil-scale", "0.5");
      set("--iris-filter", "saturate(1.65) contrast(1.18)");
    } else if (reaction === "look-up") {
      set("--reaction-iris-y-left", pct(-10));
      set("--reaction-iris-y-right", pct(-10));
      set("--reaction-pupil-y-left", pct(-15));
      set("--reaction-pupil-y-right", pct(-15));
      set("--eye-base-y-left", pct(-3));
      set("--eye-base-y-right", pct(-3));
      set("--pupil-scale", "0.98");
    } else if (reaction === "look-down") {
      set("--reaction-iris-y-left", pct(10));
      set("--reaction-iris-y-right", pct(10));
      set("--reaction-pupil-y-left", pct(15));
      set("--reaction-pupil-y-right", pct(15));
      set("--eye-base-y-left", pct(3));
      set("--eye-base-y-right", pct(3));
      set("--pupil-scale", "1.02");
    }
    set("--iris-filter", reactionIrisFilter(reaction));
    if (skinDef) this.applySkinReactionTuning(pair, skinDef, reaction);
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
      this.applyReactionState(pair, skinDef);
      pair.toggleClass("has-layered-assets", hasLayeredAssets);
      pair.toggleClass("has-peek-mask", hasPeekMask);
      pair.toggleClass("has-single-eye", skinDef.eyeLayout === "single");
      const eyeWindows = SKIN_EYE_WINDOWS[skinDef.id] ?? DEFAULT_EYE_WINDOWS;
      pair.setCssProps({
        "--accent": skinDef.accent,
        "--iris-color": effectiveIrisColor(s, skinDef),
        "--pupil-color": effectivePupilColor(s, skinDef),
        "--skin-iris-size": `${effectiveIrisSize(s, skinDef)}%`,
        "--skin-pupil-size": `${effectivePupilSize(s, skinDef)}%`,
        "--skin-eye-slot-radius": skinDef.eyeStyle.slotRadius,
        "--skin-lid-left": skinDef.eyeStyle.lidLeft,
        "--skin-lid-width": skinDef.eyeStyle.lidWidth,
        "--skin-lid-height": skinDef.eyeStyle.lidHeight,
        "--skin-lid-upper-radius": skinDef.eyeStyle.lidUpperRadius,
        "--skin-lid-lower-radius": skinDef.eyeStyle.lidLowerRadius,
        "--eye-left-x": `${eyeWindows.left.x * 100}%`,
        "--eye-left-y": `${eyeWindows.left.y * 100}%`,
        "--eye-left-w": `${eyeWindows.left.w * 100}%`,
        "--eye-left-h": `${eyeWindows.left.h * 100}%`,
        "--eye-right-x": `${eyeWindows.right.x * 100}%`,
        "--eye-right-y": `${eyeWindows.right.y * 100}%`,
        "--eye-right-w": `${eyeWindows.right.w * 100}%`,
        "--eye-right-h": `${eyeWindows.right.h * 100}%`
      });
      const left = pair.querySelector<HTMLImageElement>(".googly-eyes-eye-left");
      const right = pair.querySelector<HTMLImageElement>(".googly-eyes-eye-right");
      const mask = pair.querySelector<HTMLImageElement>(".googly-eyes-peek-mask");
      if (left) left.setAttr("src", hasLayeredAssets ? this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${baseEyeAsset(skinDef, "left")}`) : "");
      if (right) right.setAttr("src", hasLayeredAssets ? this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${baseEyeAsset(skinDef, "right")}`) : "");
      if (mask) mask.setAttr("src", hasPeekMask ? this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${maskAsset(skinDef)}`) : "");
      pair.setCssStyles({ transform: `translate(${index * 10}px, ${index * 8}px)` });
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
    if (this.root.closest(".googly-eyes-stage")) {
      this.root.removeClasses(["pos-top-left", "pos-top-right", "pos-bottom-left", "pos-bottom-right", "pos-sidebar", "pos-statusbar", "pos-floating", "pos-custom"]);
      this.root.setCssStyles({ left: "", top: "", right: "", bottom: "" });
      return;
    }
    const s = this.plugin.settings;
    this.root.removeClasses(["pos-top-left", "pos-top-right", "pos-bottom-left", "pos-bottom-right", "pos-sidebar", "pos-statusbar", "pos-floating", "pos-custom"]);
    this.root.addClass(`pos-${s.positionPreset}`);
    if (s.positionPreset === "floating" || s.positionPreset === "custom") {
      this.root.setCssStyles({ left: `${s.customX}px`, top: `${s.customY}px`, right: "", bottom: "" });
    } else {
      this.root.setCssStyles({ left: "", top: "", right: "", bottom: "" });
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
    if (this.motionReduced()) return 0.32;
    if (this.plugin.settings.subtleMode) return 0.45;
    if (this.isFocusMode()) return 0.35;
    return { subtle: 0.45, normal: 1, expressive: 1.35, chaotic: 1.8, custom: this.plugin.settings.customIntensity }[this.plugin.settings.reactionIntensity];
  }

  private randomness(): number {
    return { low: 0.2, medium: 0.55, high: 0.85, custom: this.plugin.settings.customRandomness }[this.plugin.settings.randomness];
  }

  private pupilLifeScale(now: number): number {
    const personality = PERSONALITY_OPTIONS[this.plugin.settings.personality];
    const idle = this.currentReaction === "idle-neutral";
    const baseAmplitude = idle ? 0.026 : 0.014;
    const amplitude = clamp(baseAmplitude * personality.energy * this.intensity() * (0.7 + this.randomness() * 0.4), 0.006, 0.045);
    const t = now / 1000;
    const slowPulse = Math.sin(t * 0.85 + this.lifeSeed) * 0.62;
    const unevenPulse = Math.sin(t * 1.57 + this.lifeSeed * 1.9) * 0.26;
    const tinyCatch = Math.sin(t * 2.83 + this.lifeSeed * 0.4) * 0.08;
    return clamp(1 + (slowPulse + unevenPulse + tinyCatch) * amplitude, 0.94, 1.07);
  }

  private reactionDuration(reaction: Reaction, multiplier: number): number {
    const longRead: Reaction[] = ["sad", "crying", "loneliness", "sleepy", "sleepy-idle", "dreamy", "stoned", "spacing-out", "in-love", "relief", "gratitude", "trust", "contentment", "calm", "acceptance", "awe", "bored", "apathy", "tired-but-awake", "shyness", "interest", "disappointment", "meditative", "deadpan"];
    const punchyRead: Reaction[] = ["shocked", "wide-stare", "dramatic-shock", "panic", "surprise-fear", "surprise-delight", "excitement", "furious", "frustration", "impatience", "overwhelmed", "confusion-spiral", "dizzy", "laughing", "starstruck", "awkwardness", "guilt-panic", "anticipation", "startled-recovery"];
    const base = reaction.includes("typing")
      ? 650
      : longRead.includes(reaction)
        ? 1800
        : punchyRead.includes(reaction) || reaction.includes("shock")
          ? 1450
          : 1150;
    const skin = SKINS.find((item) => item.id === this.plugin.settings.skinId) ?? SKINS[0];
    const tunedMultiplier = multiplier * (mergeReactionTuning(skin, reaction).durationMultiplier ?? 1);
    return this.motionReduced() ? 650 : base * tunedMultiplier * this.intensity() + 350 + this.plugin.settings.reactionHoldMs;
  }

  private ambientReactionDuration(reaction: Reaction): number {
    if (this.motionReduced()) return 900;
    const longRead: Reaction[] = ["sleepy-idle", "idle-long", "dreamy", "stoned", "spacing-out", "crying", "in-love", "relief", "loneliness", "apathy", "acceptance", "calm", "hope", "satisfaction", "gratitude", "trust", "tired-but-awake", "contentment", "awe", "shyness", "interest", "disappointment", "meditative", "deadpan"];
    const punchy: Reaction[] = ["dizzy", "chaotic-stare", "restless", "panic", "drunk", "furious", "laughing", "starstruck", "frustration", "surprise-delight", "confusion-spiral", "fear-freeze", "excitement", "overwhelmed", "impatience", "surprise-fear", "alertness", "suspense", "awkwardness", "guilt-panic", "anticipation", "startled-recovery"];
    const base = longRead.includes(reaction) ? 5200 : punchy.includes(reaction) ? 4200 : 3600;
    const skin = SKINS.find((item) => item.id === this.plugin.settings.skinId) ?? SKINS[0];
    return (base + Math.random() * 1200) * (mergeReactionTuning(skin, reaction).durationMultiplier ?? 1) + this.plugin.settings.reactionHoldMs;
  }

  private isFocusMode(): boolean {
    return this.plugin.settings.focusModeActive || this.plugin.settings.focusMode === "fullscreen" && !!document.fullscreenElement;
  }

  private motionReduced(): boolean {
    return this.plugin.settings.reduceMotion || this.reduceMotion.matches;
  }

  private applySkinReactionTuning(pair: HTMLElement, skin: SkinDefinition, reaction: Reaction): void {
    const tuning = mergeReactionTuning(skin, reaction);
    if (tuning.lidMultiplier !== undefined) {
      multiplyCssVars(pair, [
        "--lid-upper-left", "--lid-lower-left", "--lid-upper-right", "--lid-lower-right"
      ], tuning.lidMultiplier, "%");
    }
    if (tuning.gazeMultiplier !== undefined) {
      multiplyCssVars(pair, [
        "--reaction-iris-x-left", "--reaction-iris-y-left", "--reaction-iris-x-right", "--reaction-iris-y-right",
        "--reaction-pupil-x-left", "--reaction-pupil-y-left", "--reaction-pupil-x-right", "--reaction-pupil-y-right",
        "--eye-base-x-left", "--eye-base-y-left", "--eye-base-x-right", "--eye-base-y-right"
      ], tuning.gazeMultiplier, "%");
    }
    multiplyCssNumber(pair, "--pupil-scale", tuning.pupilScaleMultiplier ?? 1);
    multiplyCssNumber(pair, "--iris-scale", tuning.irisScaleMultiplier ?? 1);
    multiplyCssNumber(pair, "--eye-base-scale-left", tuning.eyeBaseScaleMultiplier ?? 1);
    multiplyCssNumber(pair, "--eye-base-scale-right", tuning.eyeBaseScaleMultiplier ?? 1);
    if (tuning.vibeMultiplier !== undefined) multiplyCssNumber(pair, "--eye-vibe", tuning.vibeMultiplier, "deg");
  }
}

class QuickUiModal extends Modal {
  constructor(app: App, private plugin: GooglyEyesPlugin) {
    super(app);
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("googly-eyes-modal");
    contentEl.createDiv({ text: "GooglyEyes Quick UI", cls: "googly-eyes-modal-title" });

    const header = contentEl.createDiv({ cls: "googly-eyes-quick-header" });
    header.createSpan({ text: this.plugin.settings.quickUiExpanded ? "Quick controls are visible" : "Quick controls are hidden" });
    this.button(header, this.plugin.settings.quickUiExpanded ? "Hide controls" : "Show controls", () => {
      this.plugin.settings.quickUiExpanded = !this.plugin.settings.quickUiExpanded;
      void this.plugin.saveSettings().then(() => this.render());
      return false;
    });

    if (!this.plugin.settings.quickUiExpanded) return;

    const skinStrip = contentEl.createDiv({ cls: "googly-eyes-quick-skins" });
    SKINS_BY_NAME.forEach((skin) => {
      const button = skinStrip.createEl("button", { cls: `googly-eyes-quick-skin ${skin.id === this.plugin.settings.skinId ? "is-selected" : ""}` });
      button.setAttr("aria-label", `Use ${skin.name} skin`);
      button.createEl("img", { attr: { src: this.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${thumbnailAsset(skin)}`), alt: "" } });
      button.createSpan({ text: skin.name });
      button.addEventListener("click", () => {
        this.plugin.settings.skinId = skin.id;
        void this.plugin.saveSettings().then(() => {
          this.plugin.controller.refresh();
          this.render();
        });
      });
    });

    const selectors = contentEl.createDiv({ cls: "googly-eyes-quick-selectors" });
    new Setting(selectors).setName("Personality").addDropdown((dropdown) => {
      Object.entries(PERSONALITY_OPTIONS).forEach(([id, option]) => {
        dropdown.addOption(id, option.label);
      });
      dropdown.setValue(this.plugin.settings.personality);
      dropdown.onChange((value) => {
        this.plugin.settings.personality = value as Personality;
        void this.plugin.saveSettings().then(() => {
          this.plugin.controller.refresh();
          this.render();
        });
      });
    });

    const grid = contentEl.createDiv({ cls: "googly-eyes-quick-grid" });
    this.button(grid, this.plugin.settings.visible ? "Hide eyes" : "Show eyes", () => this.plugin.controller.setVisible(!this.plugin.settings.visible));
    this.button(grid, "Next skin", () => void this.plugin.nextStyle());
    this.button(grid, "Next personality", () => void this.plugin.nextPersonality());
    this.button(grid, this.plugin.settings.pausedReactions ? "Resume reactions" : "Pause reactions", () => void this.plugin.togglePauseReactions());
    this.button(grid, "Reset view", () => void this.plugin.resetQuickView());
    this.button(grid, "GooglyEyes tab", () => {
      this.close();
      void this.plugin.openPlayground();
      return false;
    });
    this.button(grid, "Fullscreen", () => {
      this.close();
      void this.plugin.enterFullscreen();
      return false;
    });
    this.button(grid, this.plugin.settings.focusModeActive ? "Focus off" : "Focus mode", () => void this.plugin.toggleFocusMode());
    this.button(grid, "Full settings", () => {
      this.close();
      const settings = (this.app as AppWithSettings).setting;
      settings?.open();
      settings?.openTabById(this.plugin.manifest.id);
      return false;
    });

    const emotionGrid = contentEl.createDiv({ cls: "googly-eyes-quick-emotions" });
    QUICK_REACTIONS.forEach((reaction) => {
      this.button(emotionGrid, REACTION_LABELS[reaction], () => this.plugin.controller.react("quick ui", reaction));
    });
  }

  private button(parent: HTMLElement, label: string, onClick: () => void | boolean | Promise<void | boolean>): void {
    const button = parent.createEl("button", { text: label, cls: "mod-cta" });
    button.addEventListener("click", () => {
      void Promise.resolve(onClick()).then((shouldRender) => {
        this.plugin.controller.applySettings();
        if (shouldRender === false) return;
        this.render();
      });
    });
  }
}

class OnboardingModal extends Modal {
  private step = 0;
  private steps = [
    "Welcome",
    "Choose a skin",
    "Choose behavior",
    "Privacy",
    "Start"
  ];

  constructor(app: App, private plugin: GooglyEyesPlugin) {
    super(app);
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("googly-eyes-modal");
    contentEl.createDiv({ text: this.steps[this.step], cls: "googly-eyes-modal-title" });
    if (this.step === 1) {
      this.select(contentEl, SKINS_BY_NAME.map((s) => [s.id, s.name]), this.plugin.settings.skinId, (value) => this.plugin.settings.skinId = value);
    } else if (this.step === 2) {
      this.select(contentEl, Object.entries(PERSONALITY_OPTIONS).map(([id, p]) => [id, p.label]), this.plugin.settings.personality, (value) => this.plugin.settings.personality = value as Personality);
      this.select(contentEl, Object.entries(FOLLOW_LABELS), this.plugin.settings.followTarget, (value) => this.plugin.settings.followTarget = value as FollowTarget);
      this.select(contentEl, Object.entries(INTENSITY_LABELS), this.plugin.settings.reactionIntensity, (value) => this.plugin.settings.reactionIntensity = value as Intensity);
    } else if (this.step === 3) {
      contentEl.createEl("p", { text: "GooglyEyes reacts to local UI events only. It does not read note text, clipboard contents, accounts, analytics, or the internet." });
    } else if (this.step === 4) {
      contentEl.createEl("p", { text: "Open the embedded tab and try your selected skin with the Quick UI in the lower-left corner." });
    } else {
      contentEl.createEl("p", { text: "Pick a skin, choose a behavior style, then open the embedded tab." });
    }
    const nav = contentEl.createDiv({ cls: "googly-eyes-modal-nav" });
    if (this.step > 0) this.navButton(nav, "Back", () => this.step--);
    this.navButton(nav, this.step === this.steps.length - 1 ? "Start" : "Next", () => {
      if (this.step === this.steps.length - 1) {
        this.plugin.settings.onboardingComplete = true;
        this.plugin.settings.quickUiExpanded = true;
        void this.plugin.saveSettings().then(() => {
          this.plugin.controller.refresh();
          this.close();
          void this.plugin.openPlayground();
        });
      } else {
        this.step++;
        void this.plugin.saveSettings().then(() => this.plugin.controller.refresh());
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
      options.forEach(([id, label]) => {
        dropdown.addOption(id, label);
      });
      dropdown.setValue(value);
      dropdown.onChange((next) => {
        onChange(next);
        void this.plugin.saveSettings();
        this.plugin.controller.refresh();
      });
    });
  }
}

class PlaygroundView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: GooglyEyesPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PLAYGROUND;
  }

  getDisplayText(): string {
    return "GooglyEyes";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.plugin.exitFullscreen();
    this.plugin.controller.unload();
  }

  render(): void {
    const el = this.containerEl.children[1];
    if (!el.instanceOf(HTMLElement)) return;
    el.empty();
    el.addClass("googly-eyes-playground");
    const stage = el.createDiv({ cls: "googly-eyes-stage" });
    this.plugin.controller.mount(stage);
    const quickButton = stage.createEl("button", { cls: "googly-eyes-tab-quick-button clickable-icon" });
    quickButton.setAttr("aria-label", "Open Quick UI");
    quickButton.setAttr("title", "Quick UI");
    setIcon(quickButton, "sliders-horizontal");
    quickButton.addEventListener("click", () => {
      new QuickUiModal(this.app, this.plugin).open();
    });
  }
}

class GooglyEyesSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: GooglyEyesPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<GooglyEyesSettingKey>[] {
    const advanced = () => this.plugin.settings.settingsMode === "advanced";
    return [
      {
        type: "group",
        heading: "Start",
        items: [
          this.dropdownDef("Settings mode", "Simple keeps the page short. Advanced shows every tuning control.", "settingsMode", { simple: "Simple", advanced: "Advanced" }),
          this.toggleDef("Enable plugin", "enabled"),
          this.renderDef("Skin", "Choose the face used in the embedded tab.", (setting) => this.renderSkinGrid(setting)),
          this.dropdownDef("Personality", undefined, "personality", Object.fromEntries(Object.entries(PERSONALITY_OPTIONS).map(([id, p]) => [id, p.label]))),
          this.renderDef("Quick behavior", "Start here, then fine-tune in Advanced.", (setting) => this.renderPresetButtons(setting)),
          this.renderDef("Quick actions", undefined, (setting) => this.renderPreviewButtons(setting))
        ]
      },
      {
        type: "group",
        heading: "Look",
        items: [
          this.sliderDef("Size", "size", 36, 220, 2),
          this.toggleDef("Use skin default eye colors", "useSkinDefaultColors", "Each skin gets a matching iris and pupil color. Turn this off to use one custom color set."),
          this.colorDef("Iris color", "irisColor"),
          this.colorDef("Pupil color", "pupilColor", advanced),
          this.sliderDef("Iris size", "irisSizeScale", 0.6, 1.6, 0.05),
          this.sliderDef("Pupil size", "pupilSizeScale", 0.5, 2, 0.05),
          this.colorDef("Eyelid color", "eyelidColor"),
          this.colorDef("Eyelid shadow", "eyelidShadowColor", advanced),
          this.sliderDef("Iris glow", "irisGlow", 0, 1.5, 0.05, advanced)
        ]
      },
      {
        type: "group",
        heading: "Reactions",
        items: [
          this.toggleDef("Enable reactions", "reactionsEnabled"),
          this.dropdownDef("Reaction intensity", undefined, "reactionIntensity", INTENSITY_LABELS),
          this.sliderDef("Emotion strength", "emotionStrength", 0.25, 1.8, 0.05),
          this.toggleDef("Reduce motion", "reduceMotion", "Softens movement, disables ambient emotions, and respects sensitive-motion users."),
          this.toggleDef("Ambient emotions", "ambientEmotionsEnabled", "Occasionally shows a natural random expression, then returns to mouse tracking."),
          this.sliderDef("Ambient interval", "ambientEmotionIntervalSec", 5, 120, 1, advanced),
          this.sliderDef("Ambient variation", "ambientEmotionJitter", 0, 1.5, 0.05, advanced),
          this.toggleDef("Pause reactions", "pausedReactions", undefined, advanced),
          this.dropdownDef("Randomness", undefined, "randomness", RANDOMNESS_LABELS, advanced),
          this.sliderDef("Reaction hold", "reactionHoldMs", 0, 1200, 50, advanced),
          this.sliderDef("Blink speed", "blinkSpeed", 0.35, 1.8, 0.05, advanced)
        ]
      },
      {
        type: "group",
        heading: "Tracking",
        items: [
          this.sliderDef("Mouse follow strength", "followSensitivity", 0.1, 1.5, 0.05),
          this.dropdownDef("Visibility mode", undefined, "visibilityMode", VISIBILITY_LABELS, advanced),
          this.dropdownDef("Follow target", undefined, "followTarget", FOLLOW_LABELS, advanced),
          this.sliderDef("Smoothing", "smoothing", 0.04, 0.8, 0.02, advanced),
          this.toggleDef("Peek mode", "peekMode", undefined, advanced),
          this.toggleDef("Embedded panel mask", "peekFaceMask", "Adds the full-width tab panel overlay.", advanced),
          this.toggleDef("Debug eye windows", "debugOverlay", "Shows the eye-window boxes and centers while tuning a skin.", advanced),
          this.sliderDef("Opacity", "opacity", 0.2, 1, 0.05, advanced),
          this.numberDef("Layering / z-index", "zIndex", 1, 999999, 1, advanced),
          this.sliderDef("Animation smoothness", "animationSmoothness", 8, 60, 1, advanced),
          this.sliderDef("Number of eye pairs", "eyePairCount", 1, 6, 1, advanced),
          this.toggleDef("Per-pair variation", "perPairVariation", undefined, advanced)
        ]
      },
      {
        type: "group",
        heading: "Focus and accessibility",
        visible: advanced,
        items: [
          this.dropdownDef("Focus mode", undefined, "focusMode", FOCUS_LABELS),
          this.toggleDef("DND mode", "dndMode"),
          this.toggleDef("Subtle mode", "subtleMode"),
          this.toggleDef("Sound effects", "soundEffects", "Off by default. V1 focuses on visual feedback.")
        ]
      },
      {
        type: "group",
        heading: "Action reactions",
        visible: advanced,
        items: [
          this.renderDef("Mappings", "Tune what expression each local event triggers.", (setting) => this.renderActionMappings(setting))
        ]
      }
    ];
  }

  getControlValue(key: string): unknown {
    if (!isSettingKey(key)) return undefined;
    return this.plugin.settings[key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingKey(key)) return;
    (this.plugin.settings[key] as unknown) = value;
    if (key === "irisColor" || key === "pupilColor") this.plugin.settings.useSkinDefaultColors = false;
    await this.plugin.saveSettings();
    this.plugin.controller.refresh();
    if (key.startsWith("ambientEmotion") || key === "reduceMotion") this.plugin.controller.refreshAmbientEmotions();
    this.update();
  }

  private toggleDef(name: string, key: GooglyEyesSettingKey, desc?: string, visible?: boolean | (() => boolean)): SettingGroupItem<GooglyEyesSettingKey> {
    return { name, desc, visible, control: { type: "toggle", key } };
  }

  private dropdownDef(name: string, desc: string | undefined, key: GooglyEyesSettingKey, options: Record<string, string>, visible?: boolean | (() => boolean)): SettingGroupItem<GooglyEyesSettingKey> {
    return { name, desc, visible, control: { type: "dropdown", key, options } };
  }

  private sliderDef(name: string, key: GooglyEyesSettingKey, min: number, max: number, step: number, visible?: boolean | (() => boolean)): SettingGroupItem<GooglyEyesSettingKey> {
    return { name, visible, control: { type: "slider", key, min, max, step } };
  }

  private colorDef(name: string, key: GooglyEyesSettingKey, visible?: boolean | (() => boolean)): SettingGroupItem<GooglyEyesSettingKey> {
    return { name, visible, control: { type: "color", key } };
  }

  private numberDef(name: string, key: GooglyEyesSettingKey, min: number, max: number, step: number, visible?: boolean | (() => boolean)): SettingGroupItem<GooglyEyesSettingKey> {
    return { name, visible, control: { type: "number", key, min, max, step } };
  }

  private renderDef(name: string, desc: string | undefined, render: (setting: Setting) => void, visible?: boolean | (() => boolean)): SettingGroupItem<GooglyEyesSettingKey> {
    return { name, desc, visible, render };
  }

  private renderPresetButtons(setting: Setting): void {
    setting.controlEl.empty();
    const row = setting.controlEl.createDiv({ cls: "googly-eyes-button-row" });
    Object.keys(BEHAVIOR_PRESETS).forEach((id) => {
      row.createEl("button", { text: id[0].toUpperCase() + id.slice(1), cls: "mod-cta" }).addEventListener("click", () => {
        void this.applyPreset(id);
      });
    });
  }

  private renderPreviewButtons(setting: Setting): void {
    setting.controlEl.empty();
    const row = setting.controlEl.createDiv({ cls: "googly-eyes-button-row" });
    row.createEl("button", { text: "Quick UI" }).addEventListener("click", () => {
      new QuickUiModal(this.app, this.plugin).open();
    });
    row.createEl("button", { text: "Open tab" }).addEventListener("click", () => {
      void this.plugin.openPlayground();
    });
    row.createEl("button", { text: "Fullscreen" }).addEventListener("click", () => {
      void this.plugin.enterFullscreen();
    });
    row.createEl("button", { text: "Reset view" }).addEventListener("click", () => {
      void this.plugin.resetQuickView().then(() => this.update());
    });
  }

  private renderSkinGrid(setting: Setting): void {
    setting.settingEl.addClass("googly-eyes-setting-wide");
    setting.controlEl.empty();
    const skinGrid = setting.controlEl.createDiv({ cls: "googly-eyes-skin-grid googly-eyes-skin-grid-compact" });
    SKINS_BY_NAME.forEach((skin) => {
      const selected = skin.id === this.plugin.settings.skinId;
      const card = skinGrid.createDiv({ cls: `googly-eyes-skin-card ${selected ? "is-selected" : ""}` });
      card.createEl("img", { attr: { src: this.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/${thumbnailAsset(skin)}`), alt: "" } });
      card.createSpan({ text: skin.name, cls: "googly-eyes-skin-card-name" });
      card.createSpan({ text: skin.flavor });
      card.addEventListener("click", () => {
        this.save("skinId", skin.id);
      });
    });
  }

  private renderActionMappings(setting: Setting): void {
    setting.settingEl.addClass("googly-eyes-setting-wide");
    setting.controlEl.empty();
    new Setting(setting.controlEl)
      .setName("Reset reactions")
      .setDesc("Restores the default reactions for typing, clicks, hover, idle, and common actions.")
      .addButton((button) => button.setButtonText("Reset").onClick(() => {
        void this.resetActions();
      }));
    this.plugin.settings.actionMappings.forEach((mapping, index) => {
      const row = new Setting(setting.controlEl).setName(mapping.name).setDesc(mapping.triggerType);
      row.addToggle((toggle) => toggle.setValue(mapping.enabled).onChange((value) => {
        this.plugin.settings.actionMappings[index].enabled = value;
        void this.plugin.saveSettings();
      }));
      row.addDropdown((dropdown) => {
        Object.entries(REACTION_LABELS).forEach(([id, label]) => {
          dropdown.addOption(id, label);
        });
        dropdown.setValue(mapping.reactionPool[0] ?? "blink");
        dropdown.onChange((value) => {
          const reaction = isReaction(value) ? value : "blink";
          this.plugin.settings.actionMappings[index].reactionPool = [reaction];
          void this.plugin.saveSettings();
          this.plugin.controller.react("settings-preview", reaction);
        });
      });
      row.addSlider((slider) => slider.setLimits(0.2, 1.8, 0.1).setValue(mapping.intensity).onChange((value) => {
        this.plugin.settings.actionMappings[index].intensity = value;
        void this.plugin.saveSettings();
      }));
      row.addText((text) => text.setPlaceholder("cooldown ms").setValue(String(mapping.cooldownMs)).onChange((value) => {
        this.plugin.settings.actionMappings[index].cooldownMs = Number(value) || mapping.cooldownMs;
        void this.plugin.saveSettings();
      }));
    });
    new Setting(setting.controlEl).setName("Add custom action").setDesc("Creates a local event mapping you can trigger from commands or future extensions.").addButton((button) => {
      button.setButtonText("Add").onClick(() => {
        this.plugin.settings.actionMappings.push({ name: `custom action ${this.plugin.settings.actionMappings.length + 1}`, triggerType: "command", enabled: true, reactionPool: ["happy", "blink"], intensity: 1, cooldownMs: 1000 });
        void this.plugin.saveSettings().then(() => this.update());
      });
    });
  }

  private async applyPreset(id: string): Promise<void> {
    Object.assign(this.plugin.settings, BEHAVIOR_PRESETS[id]);
    await this.plugin.saveSettings();
    this.plugin.controller.refresh();
    this.plugin.controller.refreshAmbientEmotions();
    this.update();
  }

  private async resetActions(): Promise<void> {
    this.plugin.settings.actionMappings = DEFAULT_ACTIONS.map((action) => ({ ...action, reactionPool: [...action.reactionPool] }));
    await this.plugin.saveSettings();
    this.plugin.controller.refresh();
    this.update();
  }

  private save<K extends keyof GooglyEyesSettings>(key: K, value: GooglyEyesSettings[K]): void {
    this.plugin.settings[key] = value;
    void this.plugin.saveSettings().then(() => {
      this.plugin.controller.refresh();
      if (String(key).startsWith("ambientEmotion") || key === "reduceMotion") this.plugin.controller.refreshAmbientEmotions();
      this.update();
    });
  }

  private saveCustomEyeColor(key: "irisColor" | "pupilColor", value: string): void {
    this.plugin.settings[key] = value;
    this.plugin.settings.useSkinDefaultColors = false;
    void this.plugin.saveSettings().then(() => {
      this.plugin.controller.refresh();
      this.update();
    });
  }
}

export default class GooglyEyesPlugin extends Plugin {
  settings: GooglyEyesSettings = DEFAULT_SETTINGS;
  controller!: EyeController;
  private statusEl: HTMLElement | null = null;
  private fullscreenEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.controller = new EyeController(this);
    this.registerView(VIEW_TYPE_PLAYGROUND, (leaf) => new PlaygroundView(leaf, this));
    this.addSettingTab(new GooglyEyesSettingTab(this.app, this));
    this.addRibbonIcon("eye", "GooglyEyes", () => new QuickUiModal(this.app, this).open());
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("googly-eyes-statusbar");
    this.statusEl.setText("GooglyEyes");
    this.statusEl.addEventListener("click", () => {
      new QuickUiModal(this.app, this).open();
    });
    this.addCommands();
    this.registerDomEvent(document, "keydown", (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !this.fullscreenEl) return;
      event.preventDefault();
      this.exitFullscreen();
    });
    this.app.workspace.onLayoutReady(() => {
      void this.openPlayground();
      if (!this.settings.onboardingComplete) window.setTimeout(() => new OnboardingModal(this.app, this).open(), 600);
    });
  }

  onunload(): void {
    this.exitFullscreen();
    this.controller.unload();
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<GooglyEyesSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      actionMappings: this.mergeActions(loaded?.actionMappings ?? [])
    };
    if (loaded && loaded.useSkinDefaultColors === undefined && (loaded.irisColor !== undefined || loaded.pupilColor !== undefined)) {
      const loadedIris = loaded.irisColor ?? DEFAULT_SETTINGS.irisColor;
      const loadedPupil = loaded.pupilColor ?? DEFAULT_SETTINGS.pupilColor;
      this.settings.useSkinDefaultColors = loadedIris === DEFAULT_SETTINGS.irisColor && loadedPupil === DEFAULT_SETTINGS.pupilColor;
    }
    if (loaded?.followSensitivity === 0.8) this.settings.followSensitivity = DEFAULT_SETTINGS.followSensitivity;
    if (!AVAILABLE_SKIN_IDS.has(this.settings.skinId)) this.settings.skinId = DEFAULT_SETTINGS.skinId;
    if (loaded?.size === 96) this.settings.size = DEFAULT_SETTINGS.size;
    this.settings.irisSizeScale = clamp(this.settings.irisSizeScale, 0.6, 1.6);
    this.settings.pupilSizeScale = clamp(this.settings.pupilSizeScale, 0.5, 2);
    this.settings.pairConfigs = this.settings.pairConfigs.filter((config) => AVAILABLE_SKIN_IDS.has(config.skinId));
    const quickMouse = this.settings.actionMappings.find((mapping) => mapping.name === "quick mouse movement");
    if (quickMouse && quickMouse.reactionPool.some((reaction) => reaction === "panic" || reaction === "chaotic-stare" || reaction === "dizzy")) {
      quickMouse.reactionPool = ["fast-movement", "look-left", "look-right", "wide-stare"];
      quickMouse.intensity = Math.min(quickMouse.intensity, 0.85);
      quickMouse.cooldownMs = Math.max(quickMouse.cooldownMs, 1200);
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  addCommands(): void {
    this.addCommand({ id: "toggle", name: "Toggle", callback: () => void this.toggleEnabled() });
    this.addCommand({ id: "show-hide", name: "Show / hide eyes", callback: () => void this.controller.setVisible(!this.settings.visible) });
    this.addCommand({ id: "open-quick-ui", name: "Open quick UI", callback: () => new QuickUiModal(this.app, this).open() });
    this.addCommand({ id: "open-tab", name: "Open tab", callback: () => void this.openPlayground() });
    this.addCommand({ id: "open-fullscreen", name: "Open fullscreen", callback: () => void this.enterFullscreen() });
    this.addCommand({ id: "randomize-personality", name: "Randomize personality", callback: () => void this.controller.randomizePersonality() });
    this.addCommand({ id: "toggle-focus-mode", name: "Toggle focus mode", callback: () => void this.toggleFocusMode() });
    this.addCommand({ id: "switch-next-personality", name: "Switch next personality", callback: () => void this.nextPersonality() });
    this.addCommand({ id: "pause-reactions", name: "Pause reactions", callback: () => void this.setPaused(true) });
    this.addCommand({ id: "resume-reactions", name: "Resume reactions", callback: () => void this.setPaused(false) });
  }

  async toggleEnabled(): Promise<void> {
    this.settings.enabled = !this.settings.enabled;
    await this.saveSettings();
    this.controller.applySettings();
    new Notice(`GooglyEyes ${this.settings.enabled ? "enabled" : "disabled"}`);
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

  async resetQuickView(): Promise<void> {
    this.settings.enabled = true;
    this.settings.visible = true;
    this.settings.positionPreset = DEFAULT_SETTINGS.positionPreset;
    this.settings.customX = DEFAULT_SETTINGS.customX;
    this.settings.customY = DEFAULT_SETTINGS.customY;
    this.settings.size = DEFAULT_SETTINGS.size;
    this.settings.irisSizeScale = DEFAULT_SETTINGS.irisSizeScale;
    this.settings.pupilSizeScale = DEFAULT_SETTINGS.pupilSizeScale;
    this.settings.opacity = DEFAULT_SETTINGS.opacity;
    this.settings.focusModeActive = false;
    this.settings.pausedReactions = false;
    this.settings.dndMode = false;
    this.settings.reduceMotion = DEFAULT_SETTINGS.reduceMotion;
    this.settings.peekMode = DEFAULT_SETTINGS.peekMode;
    this.settings.quickUiExpanded = true;
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

  async enterFullscreen(): Promise<void> {
    const leaf = await this.openPlayground();
    const view = leaf.view as ItemView;
    const el = view.containerEl.children[1];
    if (!el.instanceOf(HTMLElement)) return;
    this.exitFullscreen();
    this.fullscreenEl = el;
    this.fullscreenEl.addClass("googly-eyes-fullscreen");
    this.controller.refresh();
  }

  exitFullscreen(): void {
    if (!this.fullscreenEl) return;
    this.fullscreenEl.removeClass("googly-eyes-fullscreen");
    this.fullscreenEl = null;
    this.controller.refresh();
  }

  async openPlayground(): Promise<WorkspaceLeaf> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PLAYGROUND)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return existing;
    }
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_PLAYGROUND, active: true });
    await this.app.workspace.revealLeaf(leaf);
    return leaf;
  }

  private mergeActions(saved: ActionMapping[]): ActionMapping[] {
    const byName = new Map(saved.map((action) => [action.name, action]));
    return [
      ...DEFAULT_ACTIONS.map((action) => ({ ...action, ...(byName.get(action.name) ?? {}) })),
      ...saved.filter((action) => !DEFAULT_ACTIONS.some((base) => base.name === action.name))
    ];
  }
}
