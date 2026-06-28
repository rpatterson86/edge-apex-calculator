let mode = "grip";
let currentResult = "Grip Length: 154.5 mm";

const APP_VERSION = "1.8.4";
const BASE_SUPPORT_RADIUS = 6;
const BASE_OFFSET = 154.43;
const BASE_END_OFFSET = 14.11;
const SUPPORT_DIAMETER = 12;

const FIELD_IDS = [
  "angleGrip",
  "clearance",
  "angleClearance",
  "gripLength",
  "wheel",
  "defaultAngle",
  "defaultClearance",
  "defaultGripLength"
];

function el(id) {
  return document.getElementById(id);
}

function unitFor(id) {
  if (id === "angleGrip" || id === "angleClearance" || id === "defaultAngle") return "°";
  return " mm";
}

function n(id) {
  const element = el(id);
  if (!element) return NaN;
  return parseFloat(String(element.value).replace(/[^0-9.\-]/g, ""));
}

function setN(id, value) {
  const element = el(id);
  if (!element) return;
  const rounded = Math.round(value * 10) / 10;
  element.value = rounded.toString();
}

function formatVisibleValues() {
  FIELD_IDS.forEach(id => {
    const value = n(id);
    if (Number.isFinite(value)) setN(id, value);
  });
}

function ensureDefaultFields() {
  if (!Number.isFinite(n("defaultAngle"))) setN("defaultAngle", 15);
  if (!Number.isFinite(n("defaultClearance"))) setN("defaultClearance", 80);
  if (!Number.isFinite(n("defaultGripLength"))) setN("defaultGripLength", 154.5);
  if (!Number.isFinite(n("wheel"))) setN("wheel", 250);
}

function constants() {
  const supportRadius = SUPPORT_DIAMETER / 2;
  const delta = supportRadius - BASE_SUPPORT_RADIUS;

  return {
    distanceOffset: BASE_OFFSET + delta,
    endOffset: BASE_END_OFFSET - delta
  };
}

function err(out, help, msg) {
  out.className = "result-value error";
  out.textContent = msg;
  if (help) help.textContent = "";
}

function show(out, help, label, value, instruction) {
  out.className = "result-value";
  out.textContent = value.toFixed(1) + " mm";
  if (help) help.textContent = instruction.replace("{value}", value.toFixed(1));
  currentResult = label + ": " + value.toFixed(1) + " mm";
}

function common(out, help) {
  const wheel = n("wheel");

  if (!Number.isFinite(wheel) || wheel < 200 || wheel > 300) {
    err(out, help, "Wheel 200–300 mm");
    return false;
  }
  return true;
}

function gripLengthFromClearance(angle, clearance) {
  const wheelRadius = n("wheel") / 2;
  const angleRad = angle * Math.PI / 180;
  const c = constants();

  return Math.sqrt(
    Math.pow(clearance + c.distanceOffset, 2) -
    Math.pow(wheelRadius * Math.cos(angleRad), 2)
  ) - wheelRadius * Math.sin(angleRad) - c.endOffset;
}

function clearanceFromGripLength(angle, gripLength) {
  const wheelRadius = n("wheel") / 2;
  const angleRad = angle * Math.PI / 180;
  const c = constants();

  return Math.sqrt(
    Math.pow(gripLength + c.endOffset + wheelRadius * Math.sin(angleRad), 2) +
    Math.pow(wheelRadius * Math.cos(angleRad), 2)
  ) - c.distanceOffset;
}

function calcGripLength() {
  const out = el("gripLengthResult");
  const help = el("gripHelp");
  const angle = n("angleGrip");
  const clearance = n("clearance");

  if (!common(out, help)) return;

  if (!Number.isFinite(angle) || angle < 5 || angle > 35) {
    err(out, help, "Angle 5–35°");
    return;
  }
  if (!Number.isFinite(clearance) || clearance < 40 || clearance > 120) {
    err(out, help, "Clearance 40–120 mm");
    return;
  }

  show(out, help, "Grip Length", gripLengthFromClearance(angle, clearance), "Set your knife grip length to {value} mm.");
  saveSessionValues();
}

function calcClearance() {
  const out = el("clearanceResult");
  const help = el("clearanceHelp");
  const angle = n("angleClearance");
  const gripLength = n("gripLength");

  if (!common(out, help)) return;

  if (!Number.isFinite(angle) || angle < 5 || angle > 35) {
    err(out, help, "Angle 5–35°");
    return;
  }
  if (!Number.isFinite(gripLength) || gripLength < 80 || gripLength > 230) {
    err(out, help, "Grip Length 80–230 mm");
    return;
  }

  show(out, help, "Support Clearance", clearanceFromGripLength(angle, gripLength), "Set wheel-to-support clearance to {value} mm.");
  saveSessionValues();
}

function update() {
  if (mode === "grip") calcGripLength();
  else calcClearance();
}

function switchMode(nextMode) {
  mode = nextMode;
  el("gripPanel").className = mode === "grip" ? "panel" : "panel hidden";
  el("clearancePanel").className = mode === "clearance" ? "panel" : "panel hidden";
  el("tabGrip").className = mode === "grip" ? "tab active" : "tab";
  el("tabClearance").className = mode === "clearance" ? "tab active" : "tab";
  update();
}

function stepValue(id, step) {
  let value = n(id);
  if (!Number.isFinite(value)) value = 0;
  setN(id, value + step);
  update();
  saveSessionValues();
}

function saveMySetup() {
  // Save the values currently shown in Preferences as the user's opening defaults.
  const setup = {
    wheel: n("wheel"),
    defaultAngle: n("defaultAngle"),
    defaultClearance: n("defaultClearance"),
    defaultGripLength: n("defaultGripLength")
  };

  try {
    localStorage.setItem("edgeApexSetupV18", JSON.stringify(setup));
  } catch (e) {}

  // Also apply the setup to the calculator immediately so the user sees what was saved.
  if (Number.isFinite(setup.wheel)) setN("wheel", setup.wheel);
  if (Number.isFinite(setup.defaultAngle)) {
    setN("angleGrip", setup.defaultAngle);
    setN("angleClearance", setup.defaultAngle);
  }
  if (Number.isFinite(setup.defaultClearance)) setN("clearance", setup.defaultClearance);
  if (Number.isFinite(setup.defaultGripLength)) setN("gripLength", setup.defaultGripLength);

  update();
  showToast("My Setup Saved");
}

function loadMySetup() {
  try {
    const setup = JSON.parse(localStorage.getItem("edgeApexSetupV18") || "{}");

    if (Number.isFinite(setup.wheel)) setN("wheel", setup.wheel);
    if (Number.isFinite(setup.defaultAngle)) {
      setN("defaultAngle", setup.defaultAngle);
      setN("angleGrip", setup.defaultAngle);
      setN("angleClearance", setup.defaultAngle);
    }
    if (Number.isFinite(setup.defaultClearance)) {
      setN("defaultClearance", setup.defaultClearance);
      setN("clearance", setup.defaultClearance);
    }
    if (Number.isFinite(setup.defaultGripLength)) {
      setN("defaultGripLength", setup.defaultGripLength);
      setN("gripLength", setup.defaultGripLength);
    }
  } catch (e) {}
}

function copyResult() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentResult).then(() => showToast("Copied")).catch(() => alert(currentResult));
  } else {
    alert(currentResult);
  }
}

function showToast(message = "Copied") {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}

function resetDefaults() {
  setN("defaultAngle", 15);
  setN("defaultClearance", 80);
  setN("defaultGripLength", 154.5);
  setN("angleGrip", 15);
  setN("clearance", 80);
  setN("angleClearance", 15);
  setN("gripLength", 154.5);
  setN("wheel", 250);
  saveMySetup();
}

function parseVersion(version) {
  return String(version).split(".").map(part => parseInt(part, 10) || 0);
}

function isNewerVersion(remote, current) {
  const r = parseVersion(remote);
  const c = parseVersion(current);
  const length = Math.max(r.length, c.length);
  for (let i = 0; i < length; i++) {
    if ((r[i] || 0) > (c[i] || 0)) return true;
    if ((r[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdate(showIfCurrent = false) {
  try {
    const response = await fetch("./version.json?cacheBust=" + Date.now(), { cache: "no-store" });
    const info = await response.json();
    const card = el("updateCard");
    const msg = el("updateMessage");

    if (isNewerVersion(info.version, APP_VERSION)) {
      const updateText = "Update available: version " + info.version + ". You are using version " + APP_VERSION + ".";
      msg.textContent = updateText;
      card.classList.remove("hidden");

      if (showIfCurrent) {
        alert(updateText + "\n\nTap Update Now, then close and reopen the Home Screen app.");
      }
    } else if (showIfCurrent) {
      alert("You are up to date. Current version: " + APP_VERSION);
    }
  } catch (error) {
    if (showIfCurrent) {
      alert("Could not check for updates. Try again while connected to the internet.");
    }
  }
}

async function updateNow() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
      }
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    window.location.reload();
  } catch (error) {
    alert("To update: close this app completely, then reopen it. If needed, remove it from Home Screen and add it again from Safari.");
  }
}

function saveSessionValues() {
  try {
    FIELD_IDS.forEach(id => {
      const element = el(id);
      if (element) localStorage.setItem("edgeApexSessionV18_" + id, element.value);
    });
    localStorage.setItem("edgeApexSessionV18_mode", mode);
  } catch (e) {}
}

function loadSessionValues() {
  try {
    FIELD_IDS.forEach(id => {
      const value = localStorage.getItem("edgeApexSessionV18_" + id);
      if (value !== null && el(id)) el(id).value = value;
    });
    const savedMode = localStorage.getItem("edgeApexSessionV18_mode");
    if (savedMode === "clearance") mode = "clearance";
  } catch (e) {}
}

el("tabGrip").onclick = () => switchMode("grip");
el("tabClearance").onclick = () => switchMode("clearance");

FIELD_IDS.forEach(id => {
  const element = el(id);
  if (!element) return;

  element.addEventListener("focus", () => element.select());
  element.addEventListener("input", update);
  element.addEventListener("change", () => {
    const value = n(id);
    if (Number.isFinite(value)) setN(id, value);
    update();
    saveSessionValues();
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

loadSessionValues();
ensureDefaultFields();
loadMySetup();
formatVisibleValues();
switchMode(mode);
checkForUpdate(false);
