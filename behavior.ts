export const MOOD_PROFILES = {
  warm: { label: "Warm", energy: 0.95, blink: 1.1, reactions: ["gratitude", "trust", "contentment", "sympathy", "happy", "shyness"] },
  playful: { label: "Playful", energy: 1.08, blink: 0.95, reactions: ["playfulness", "mischief", "surprise-delight", "curiosity", "wink-left", "laughing"] },
  vigilant: { label: "Vigilant", energy: 1.02, blink: 1.15, reactions: ["alertness", "suspicious", "concentration", "determination", "suspense", "skepticism"] },
  serene: { label: "Serene", energy: 0.85, blink: 1.3, reactions: ["calm", "meditative", "acceptance", "relief", "hope", "contentment"] },
  mysterious: { label: "Mysterious", energy: 0.95, blink: 1.2, reactions: ["suspicious", "doubt", "interest", "awe", "anticipation", "smug"] },
  mechanical: { label: "Mechanical", energy: 0.9, blink: 1.4, reactions: ["concentration", "deadpan", "alertness", "confused", "interest", "determination"] }
} as const;

export type MoodProfile = keyof typeof MOOD_PROFILES;
export type MoodSelection = "skin" | "off" | MoodProfile;

export function closedLidOffsets(height: string): { upper: string; lower: string } {
  const parsed = height.endsWith("%") ? Number.parseFloat(height) : 122;
  const ratio = (Number.isFinite(parsed) ? Math.max(100, parsed) : 122) / 100;
  // Each lid covers 52% of the slot; the overlap hides subpixel seams.
  const travel = (1 - 0.52 / ratio) * 100;
  return { upper: `${(-travel).toFixed(4)}%`, lower: `${travel.toFixed(4)}%` };
}

export function blinkTiming(slow: boolean, speed: number): { closeMs: number; holdMs: number } {
  const safeSpeed = Number.isFinite(speed) ? Math.max(0.2, speed) : 1;
  return { closeMs: (slow ? 260 : 145) / safeSpeed, holdMs: (slow ? 440 : 220) / safeSpeed };
}

export function isMoodProfile(value: unknown): value is MoodProfile {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MOOD_PROFILES, value);
}

export function eyeContactWeight(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs <= 0 || elapsedMs >= durationMs) return 0;
  const ramp = Math.min(650, durationMs / 3);
  const t = Math.min(1, elapsedMs / ramp, (durationMs - elapsedMs) / ramp);
  return t * t * (3 - 2 * t);
}
