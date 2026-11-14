"use strict";

const FILTER = [{ vendorId: 0xA8A5, productId: 0x2255, usagePage: 0xFF01, usage: 0x0010 }];
const POLLING = { 1: 125, 2: 250, 3: 500, 4: 1000 };
const EFFECTS = [
  { id: 6, name: "Void", pattern: "Lights off" },
  { id: 0, name: "Aurora", pattern: "Wave · flowing spectrum" },
  { id: 1, name: "Neon Bloom", pattern: "Neon · bright color cycle" },
  { id: 2, name: "Comet Rally", pattern: "Touring flash · moving flashes" },
  { id: 3, name: "Orbit Bounce", pattern: "YOLO ball · bouncing light" },
  { id: 4, name: "Photon Sweep", pattern: "One-way flash · single direction" },
  { id: 5, name: "Lumen Breath", pattern: "Circulatory respiration · slow breathing" },
];

const state = { device: null, profile: null, battery: null, selectedEffect: 0, colorStops: [] };
const $ = (id) => document.getElementById(id);
let toastTimer;

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 3400);
}

function setConnected(connected) {
  $("connection-pill").classList.toggle("connected", connected);
  $("connection-label").textContent = connected ? "Receiver connected" : "Not connected";
  $("side-device").textContent = connected ? "Receiver connected" : "Receiver not connected";
  $("connect-button").innerHTML = connected ? "Disconnect" : "<span>＋</span> Connect receiver";
  $("connect-button").classList.toggle("button-secondary", connected);
  $("connect-button").classList.toggle("button-primary", !connected);
  $("lighting-connect-note").textContent = connected ? "Connected · 2.4 GHz" : "Connect receiver to apply effects";
  $("apply-mode").disabled = !connected;
  $("footer-state").textContent = connected ? "WebHID · receiver connected" : "WebHID · disconnected";
}

function batteryUpdate(level, chargeFlag) {
  if (!Number.isFinite(level) || level < 0 || level > 100) return;
  state.battery = level;
  $("battery-value").textContent = `${level}`;
  $("battery-suffix").textContent = "%";
  $("battery-bar").style.width = `${level}%`;
  $("battery-bar").classList.toggle("low", level <= 20);
  $("battery-bar").title = `${level}%`;
  $("battery-panel").querySelector(".battery-track").setAttribute("aria-label", `Battery ${level}%`);
  $("battery-status").textContent = level <= 20 ? "Low battery · please charge" : "Battery report received";
  $("charge-status").textContent = chargeFlag ? "Charging" : "On battery";
  document.title = level <= 20 ? `⚠ ${level}% · Phantom Control` : "Phantom X12 Control";
}

function applyProfile(bytes) {
  if (bytes.length < 25 || bytes[0] !== 0xAA || bytes[1] !== 0x0E) {
    throw new Error("The receiver returned an unexpected DPI profile.");
  }
  const stages = [];
  for (let offset = 13; offset < 25; offset += 2) stages.push(bytes[offset] | (bytes[offset + 1] << 8));
  const active = bytes[12];
  state.profile = { lightMode: bytes[9], pollingLevel: bytes[10], count: bytes[11], activeStage: active, stages };
  $("active-dpi").textContent = (stages[active - 1] || 0).toLocaleString("en-US");
  $("stage-label").textContent = `Active stage ${active || "—"}`;
  $("poll-label").textContent = `Polling ${POLLING[bytes[10]] || "—"} Hz`;
  $("poll-value").textContent = `${POLLING[bytes[10]] || "Unknown"} Hz`;
  $("dpi-read-status").textContent = "Read from receiver";
  $("dpi-strip").replaceChildren();
  $("dpi-editor").replaceChildren();
  stages.forEach((dpi, index) => {
    const stage = document.createElement("button");
    stage.className = `dpi-stage${index + 1 === active ? " active" : ""}`;
    stage.title = `Stage ${index + 1}: ${dpi} DPI`;
    stage.innerHTML = `<span>${dpi.toLocaleString("en-US")}</span>`;
    $("dpi-strip").append(stage);

    const row = document.createElement("div");
    row.className = `dpi-row${index + 1 === active ? " active" : ""}`;
    row.innerHTML = `<label>STAGE ${index + 1}</label><input type="range" min="200" max="12000" step="100" value="${Math.max(200, Math.min(12000, dpi))}" disabled><output>${dpi.toLocaleString("en-US")} DPI</output>`;
    $("dpi-editor").append(row);
  });
  const effect = EFFECTS.find((item) => item.id === bytes[9]);
  const effectName = effect ? effect.name : `Mode ${bytes[9]}`;
  $("active-effect-label").textContent = effectName;
  $("device-effect").textContent = effectName;
  const effectButton = document.querySelector(`[data-mode="${bytes[9]}"]`);
  if (effectButton) selectEffect(bytes[9], false);
}

function handleReport(report) {
  const bytes = Array.from(new Uint8Array(report.data.buffer, report.data.byteOffset, report.data.byteLength));
  if (bytes.length < 2 || bytes[0] !== 0xAA) return;
  if (bytes[1] === 0xFA) {
    if (bytes.length > 10 && bytes[8] === 0xD0) {
      batteryUpdate(bytes[9], bytes[10]);
    } else if (bytes.length > 10 && bytes[2] === 0xAE) {
      const stage = bytes[9];
      const rate = bytes[10];
      if (state.profile && stage >= 1 && stage <= state.profile.stages.length) {
        state.profile.activeStage = stage;
        $("active-dpi").textContent = state.profile.stages[stage - 1].toLocaleString("en-US");
        $("stage-label").textContent = `Active stage ${stage}`;
        document.querySelectorAll(".dpi-stage,.dpi-row").forEach((item, index) => item.classList.toggle("active", index % state.profile.stages.length === stage - 1));
      }
      if (POLLING[rate]) $("poll-label").textContent = `Polling ${POLLING[rate]} Hz`;
    }
  }
}

function selectEffect(id, notify = true) {
  state.selectedEffect = Number(id);
  const effect = EFFECTS.find((item) => item.id === state.selectedEffect);
  document.querySelectorAll(".mode-card").forEach((button) => button.classList.toggle("selected", Number(button.dataset.mode) === state.selectedEffect));
  $("selected-mode-note").textContent = `Selected: ${effect?.name || "Unknown mode"} · command ${state.selectedEffect} · ${state.device ? "Ready to apply" : "Connect receiver to apply"}`;
  $("device-effect").textContent = effect?.name || "Custom preview";
  [$("mouse-led"), $("mouse-led-large")].forEach((led) => {
    led.className = `mouse-led led-effect-${state.selectedEffect}`;
  });
  $("mouse-led").style.setProperty("--led-color", $("color-picker").value);
  $("mouse-led-large").style.setProperty("--led-color", $("color-picker").value);
  if (notify) toast(`${effect?.name || "Effect"} selected. Click Apply effect to send it to the mouse.`);
}

function buildQuery(command) {
  const report = new Uint8Array(64);
  report[0] = 0x55;
  report[1] = command;
  return report;
}

function waitForCommand(command, timeout = 1400) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      state.device?.removeEventListener("inputreport", listener);
      reject(new Error(`No response to command 0x${command.toString(16).padStart(2, "0")}.`));
    }, timeout);
    const listener = (event) => {
      const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
      if (data[0] === 0xAA && data[1] === command) {
        clearTimeout(timer);
        state.device?.removeEventListener("inputreport", listener);
        resolve(Array.from(data));
      }
    };
    state.device.addEventListener("inputreport", listener);
  });
}

async function query(command) {
  const pending = waitForCommand(command);
  await state.device.sendReport(0, buildQuery(command));
  return pending;
}

async function loadState() {
  await query(0x03);
  const profile = await query(0x0E);
  applyProfile(profile);
  toast("Receiver profile loaded. Battery events will update as the receiver reports them.");
}

async function connect() {
  if (!("hid" in navigator)) {
    toast("WebHID is unavailable. Open this app in Chrome or Edge.");
    return;
  }
  try {
    const [device] = await navigator.hid.requestDevice({ filters: FILTER });
    if (!device) return;
    await device.open();
    state.device = device;
    device.addEventListener("inputreport", (event) => handleReport(event));
    device.addEventListener("disconnect", disconnect);
    setConnected(true);
    $("device-name").textContent = device.productName || "A8A5:2255 receiver";
    $("device-mode").textContent = "Connected via 2.4 GHz receiver";
    await loadState();
  } catch (error) {
    console.error(error);
    if (state.device) await disconnect();
    toast(error?.message || "Could not connect to the receiver.");
  }
}

async function disconnect() {
  const device = state.device;
  state.device = null;
  if (device?.opened) {
    try { await device.close(); } catch (error) { console.warn(error); }
  }
  setConnected(false);
  $("device-name").textContent = "Acer Phantom X12";
  $("device-mode").textContent = "Waiting for receiver";
}

function buildLightingPacket(modeId) {
  // OEM configurator source: 55 21 00 00 03 00 00 00 00 00 <mode> ...
  const packet = new Uint8Array(64);
  packet.set([0x55, 0x21, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, modeId]);
  return packet;
}

async function applyEffect() {
  if (!state.device) return toast("Connect the 2.4 GHz receiver first.");
  const effect = EFFECTS.find((item) => item.id === state.selectedEffect);
  if (!effect) return;
  try {
    const pending = waitForCommand(0x21);
    await state.device.sendReport(0, buildLightingPacket(effect.id));
    await pending;
    $("active-effect-label").textContent = effect.name;
    $("device-effect").textContent = effect.name;
    toast(`${effect.name} · ${effect.pattern} (command ${effect.id}) acknowledged by the receiver.`);
  } catch (error) {
    console.error(error);
    toast(`Effect command sent, but the receiver did not confirm it: ${error.message}`);
  }
}

function setSceneColor(color) {
  $("color-picker").value = color;
  $("hex-value").value = color.toUpperCase();
  $("color-preview").style.setProperty("--scene-color", color);
  $("mouse-led").style.setProperty("--led-color", color);
  $("mouse-led-large").style.setProperty("--led-color", color);
  updateScenePreview();
}

function updateScenePreview() {
  const style = $("creator-style").value;
  $("color-preview").classList.remove("solid", "breathing", "pulse");
  if (style === "solid") $("color-preview").classList.add("solid");
  if (style === "breathing") $("color-preview").classList.add("breathing");
  if (style === "pulse") $("color-preview").classList.add("pulse");
  const colors = state.colorStops.length ? state.colorStops : [$("color-picker").value];
  $("color-preview").style.background = style === "solid"
    ? $("color-picker").value
    : `conic-gradient(from 25deg, ${[...colors, colors[0]].join(",")})`;
  $("color-preview").style.animationDuration = `${Math.max(0.5, 5 - Number($("creator-speed").value) * 0.04)}s`;
  const brightness = Number($("creator-brightness").value);
  $("color-preview").style.filter = `brightness(${0.2 + brightness / 125})`;
  $("speed-value").textContent = `${$("creator-speed").value}%`;
  $("brightness-value").textContent = `${brightness}%`;
}

function saveScene() {
  const scenes = JSON.parse(localStorage.getItem("phantom-scenes") || "[]");
  scenes.push({ name: `Scene ${scenes.length + 1}`, color: $("color-picker").value, colors: state.colorStops.length ? [...state.colorStops] : [$("color-picker").value], style: $("creator-style").value, speed: Number($("creator-speed").value), brightness: Number($("creator-brightness").value) });
  localStorage.setItem("phantom-scenes", JSON.stringify(scenes));
  renderScenes();
  toast("Scene saved in this browser. Device color output is not confirmed yet.");
}

function renderScenes() {
  const root = $("scene-list");
  const scenes = JSON.parse(localStorage.getItem("phantom-scenes") || "[]");
  root.replaceChildren();
  if (!scenes.length) {
    root.innerHTML = '<span class="empty-scenes">Your saved scenes will appear here.</span>';
    return;
  }
  scenes.forEach((scene, index) => {
    const chip = document.createElement("span");
    chip.className = "scene-chip";
    chip.style.setProperty("--chip", scene.color);
    chip.innerHTML = `<i></i>${scene.name}<button title="Delete scene" aria-label="Delete ${scene.name}">×</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      scenes.splice(index, 1);
      localStorage.setItem("phantom-scenes", JSON.stringify(scenes));
      renderScenes();
    });
    chip.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      state.colorStops = scene.colors?.length ? [...scene.colors] : [scene.color];
      setSceneColor(scene.color);
      $("creator-style").value = scene.style || "spectrum";
      $("creator-speed").value = String(scene.speed || 50);
      $("creator-brightness").value = String(scene.brightness || 75);
      renderColorStops();
      updateScenePreview();
      toast(`${scene.name} loaded into the preview.`);
    });
    root.append(chip);
  });
}

function renderColorStops() {
  const root = $("color-stops");
  root.replaceChildren();
  if (!state.colorStops.length) {
    root.innerHTML = '<span class="stops-empty">Pick a color and add it to your scene.</span>';
    return;
  }
  state.colorStops.forEach((color, index) => {
    const stop = document.createElement("span");
    stop.className = "color-stop";
    stop.style.setProperty("--stop", color);
    stop.innerHTML = `<i></i>${color.toUpperCase()}<button type="button" aria-label="Remove ${color}" title="Remove color">×</button>`;
    stop.querySelector("button").addEventListener("click", () => {
      if (state.colorStops.length === 1) return toast("Keep at least one color in the scene.");
      state.colorStops.splice(index, 1);
      renderColorStops();
      updateScenePreview();
    });
    root.append(stop);
  });
}

function showPage(page) {
  document.querySelectorAll(".page").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  history.replaceState(null, "", `#${page}`);
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => showPage(button.dataset.page)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showPage(button.dataset.go)));
document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => selectEffect(button.dataset.mode)));
$("connect-button").addEventListener("click", () => state.device ? disconnect() : connect());
$("apply-mode").addEventListener("click", applyEffect);
$("color-picker").addEventListener("input", (event) => setSceneColor(event.target.value));
$("hex-value").addEventListener("change", (event) => {
  if (/^#[0-9a-f]{6}$/i.test(event.target.value)) setSceneColor(event.target.value);
  else event.target.value = $("color-picker").value.toUpperCase();
});
document.querySelectorAll("[data-color]").forEach((button) => button.addEventListener("click", () => setSceneColor(button.dataset.color)));
$("creator-style").addEventListener("change", updateScenePreview);
$("creator-speed").addEventListener("input", updateScenePreview);
$("creator-brightness").addEventListener("input", updateScenePreview);
$("save-scene").addEventListener("click", saveScene);
$("add-color").addEventListener("click", () => {
  state.colorStops.push($("color-picker").value);
  renderColorStops();
  updateScenePreview();
  toast("Color added to the local scene preview.");
});
$("apply-scene").addEventListener("click", () => toast("Custom color upload stays locked until we confirm the receiver's color packet."));
document.querySelectorAll("[data-poll]").forEach((button) => button.addEventListener("click", () => toast("Polling rate editing will be enabled after the lighting command pass.")));
document.querySelectorAll("[data-battery-view]").forEach((button) => button.addEventListener("click", () => {
  const view = button.dataset.batteryView;
  $("battery-panel").dataset.view = view;
  document.querySelectorAll("[data-battery-view]").forEach((item) => item.classList.toggle("active", item === button));
  localStorage.setItem("phantom-battery-view", view);
}));

const pageFromHash = location.hash.slice(1);
if (document.getElementById(`page-${pageFromHash}`)) showPage(pageFromHash);
const savedBatteryView = localStorage.getItem("phantom-battery-view");
if (["both", "percent", "bar"].includes(savedBatteryView)) {
  $("battery-panel").dataset.view = savedBatteryView;
  document.querySelectorAll("[data-battery-view]").forEach((button) => button.classList.toggle("active", button.dataset.batteryView === savedBatteryView));
}
renderScenes();
renderColorStops();
updateScenePreview();
selectEffect(0, false);
if (!("hid" in navigator)) toast("This browser does not support WebHID. Use Chrome or Edge.");
