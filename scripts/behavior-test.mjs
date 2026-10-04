import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: `${readFileSync("main.ts", "utf8")}\nexport { EyeController, DEFAULT_SETTINGS, MOOD_PROFILES, eyeContactWeight, closedLidOffsets, blinkTiming };`,
    resolveDir: process.cwd(), loader: "ts"
  },
  bundle: true, platform: "node", format: "cjs", write: false, external: ["obsidian"]
});

function harness() {
  let now = 100000;
  let nextTimer = 0;
  let focused = true;
  const timers = new Map();
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require: () => ({ Plugin: class {}, PluginSettingTab: class {}, ItemView: class {}, Modal: class {} }),
    Date: { now: () => now },
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    document: { hasFocus: () => focused, hidden: false },
    window: {
      innerWidth: 1200, innerHeight: 800,
      matchMedia: () => ({ matches: false }),
      setTimeout: (fn) => { timers.set(++nextTimer, fn); return nextTimer; },
      clearTimeout: (id) => timers.delete(id),
      requestAnimationFrame: () => 1
    }
  };
  vm.runInNewContext(compiled.outputFiles[0].text, sandbox);
  const { EyeController, DEFAULT_SETTINGS, MOOD_PROFILES, eyeContactWeight, closedLidOffsets, blinkTiming } = sandbox.module.exports;
  const plugin = { settings: { ...DEFAULT_SETTINGS }, saveSettings: async () => {} };
  const controller = new EyeController(plugin);
  controller.root = { hasClass: () => false };
  controller.updateAssets = () => {};
  return { controller, plugin, timers, MOOD_PROFILES, eyeContactWeight, closedLidOffsets, blinkTiming, advance: (ms) => now += ms, blur: () => focused = false };
}

test("eye contact eases in, holds, and eases out without a jump", () => {
  const { eyeContactWeight: weight } = harness();
  assert.equal(weight(0, 3000), 0);
  assert.equal(weight(1500, 3000), 1);
  assert.equal(weight(3000, 3000), 0);
  assert.equal(weight(325, 3000), 0.5);
  assert.equal(weight(2675, 3000), 0.5);
});

test("regular blink reactions do not postpone eye contact forever", () => {
  const { controller, advance } = harness();
  controller.contactWeight(100000);
  const scheduled = controller.nextEyeContact;
  controller.setReaction("blink");
  controller.setReaction("idle-neutral");
  assert.equal(controller.nextEyeContact, scheduled);
  advance(40000);
  controller.contactWeight(140000);
  assert.equal(controller.eyeContactStart, 140000);
  assert.equal(controller.contactWeight(141500), 1);
  assert.equal(controller.contactWeight(143000), 0);
  assert.ok(controller.nextEyeContact > 143000);
});

test("pause, reduced motion, focus, and inactive windows cancel eye contact", () => {
  for (const key of ["pausedReactions", "dndMode", "reduceMotion", "focusModeActive"]) {
    const { controller, plugin } = harness();
    controller.eyeContactStart = 99900;
    plugin.settings[key] = true;
    assert.equal(controller.contactWeight(100000), 0);
    assert.equal(controller.eyeContactStart, 0);
  }
  const { controller, blur } = harness();
  blur();
  assert.equal(controller.contactWeight(100000), 0);
});

test("new reactions cancel stale return timers and spontaneous emotions wait", () => {
  const { controller, timers } = harness();
  controller.react("preview", "sad");
  const previous = controller.reactionTimer;
  controller.react("preview", "happy");
  assert.equal(timers.has(previous), false);
  assert.equal(controller.currentReaction, "happy");
  controller.playAmbientEmotion();
  assert.equal(controller.currentReaction, "happy");
  controller.scheduleBlink();
  timers.get(controller.blinkTimer)();
  assert.equal(controller.currentReaction, "happy");
});

test("rendered iris and pupil center during eye contact and resume cursor tracking", () => {
  const { controller, advance } = harness();
  const irisProps = {};
  const pupilProps = {};
  const pairProps = {};
  const iris = {
    closest: () => ({ getBoundingClientRect: () => ({ left: 100, top: 100, width: 300, height: 200 }) }),
    querySelector: () => ({ setCssProps: (props) => Object.assign(pupilProps, props) }),
    setCssProps: (props) => Object.assign(irisProps, props)
  };
  controller.pairs = [{
    setCssProps: (props) => Object.assign(pairProps, props),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 600 }),
    querySelectorAll: () => [iris]
  }];
  controller.loop();
  assert.ok(parseFloat(irisProps["--iris-x"]) > 0);
  advance(40000);
  controller.loop();
  advance(1500);
  controller.loop();
  assert.equal(parseFloat(irisProps["--iris-x"]), 0);
  assert.equal(parseFloat(pupilProps["--pupil-x"]), 0);
  assert.equal(pairProps["--gaze-pose-weight"], "0.000");
  advance(1500);
  controller.loop();
  assert.ok(parseFloat(irisProps["--iris-x"]) > 0);
  assert.equal(pairProps["--gaze-pose-weight"], "1.000");
});

test("all skin profiles and preferred emotions exist; manual overrides work", () => {
  const { controller, plugin, MOOD_PROFILES } = harness();
  const manifest = JSON.parse(readFileSync("assets/skins.json", "utf8"));
  for (const id of manifest.skins) {
    const skin = JSON.parse(readFileSync(`assets/skins/${id}/skin.json`, "utf8"));
    assert.ok(MOOD_PROFILES[skin.moodProfile], id);
  }
  for (const profile of Object.values(MOOD_PROFILES)) {
    for (const reaction of profile.reactions) assert.ok(manifest.reactions.includes(reaction), reaction);
  }
  assert.equal(controller.mood().label, "Mechanical");
  plugin.settings.skinId = "panda";
  assert.equal(controller.mood().label, "Warm");
  plugin.settings.moodProfile = "serene";
  assert.equal(controller.mood().label, "Serene");
  plugin.settings.moodProfile = "off";
  assert.equal(controller.mood(), null);
});

test("closed lids overlap across every skin's lid geometry", () => {
  const { closedLidOffsets } = harness();
  const manifest = JSON.parse(readFileSync("assets/skins.json", "utf8"));
  for (const id of manifest.skins) {
    const skin = JSON.parse(readFileSync(`assets/skins/${id}/skin.json`, "utf8"));
    const height = parseFloat(skin.eyeStyle.lidHeight) / 100;
    const offsets = closedLidOffsets(skin.eyeStyle.lidHeight);
    const upperEdge = height * (1 + parseFloat(offsets.upper) / 100);
    const lowerEdge = 1 - height + height * parseFloat(offsets.lower) / 100;
    assert.ok(upperEdge > lowerEdge + 0.039, id);
  }
});

test("full closure bypasses emotion strength and per-skin lid tuning; winks close one side", () => {
  const { controller, plugin } = harness();
  for (const strength of [0.25, 1, 1.8]) {
    plugin.settings.emotionStrength = strength;
    for (const reaction of ["blink", "slow-blink", "wink-left", "wink-right", "idle-neutral"]) {
      const classes = new Set();
      const props = {};
      const pair = {
        toggleClass: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        setCssProps: (values) => Object.assign(props, values),
        style: { getPropertyValue: (name) => props[name] ?? "" }
      };
      controller.currentReaction = reaction;
      controller.applyReactionState(pair, { eyeStyle: { lidHeight: "122%" }, reactionTuning: { all: { lidMultiplier: 0.55 } } });
      assert.equal(classes.has("is-left-eye-closed"), ["blink", "slow-blink", "wink-left"].includes(reaction));
      assert.equal(classes.has("is-right-eye-closed"), ["blink", "slow-blink", "wink-right"].includes(reaction));
      assert.equal(props["--lid-closed-upper-y"], "-57.3770%");
    }
  }
});

test("blink always has time to finish closing, including slow blink and speed limits", () => {
  const { controller, plugin, blinkTiming } = harness();
  for (const speed of [0.35, 1, 1.8]) {
    plugin.settings.blinkSpeed = speed;
    for (const slow of [false, true]) {
      const timing = blinkTiming(slow, speed);
      const reaction = slow ? "slow-blink" : "blink";
      assert.ok(timing.holdMs > timing.closeMs);
      assert.equal(controller.reactionDuration(reaction, 0.2), timing.holdMs);
      assert.equal(controller.ambientReactionDuration(reaction), timing.holdMs);
    }
    assert.ok(blinkTiming(true, speed).holdMs > blinkTiming(false, speed).holdMs);
  }
});
