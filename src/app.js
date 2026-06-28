let mode = "grip";
let currentResult = "Grip Length: 154.5 mm";

const BASE_SUPPORT_RADIUS = 6;
const BASE_OFFSET = 154.43;
const BASE_END_OFFSET = 14.11;

function el(id) {
  return document.getElementById(id);
}

function n(id) {
  return parseFloat(el(id).value);
}

function setN(id, value) {
  el(id).value = (Math.round(value * 10) / 10).toString();
}

function constants() {
  const supportRadius = n("support") / 2;
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
  const support = n("support");

  if (!Number.isFinite(wheel) || wheel < 200 || wheel > 300) {
    err(out, help, "Wheel 200–300 mm");
    return false;
  }

  if (!Number.isFinite(support) || support < 8 || support > 20) {
    err(out, help, "Support 8–20 mm");
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
  save();
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
  save();
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
}

function copyResult() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentResult).then(showToast).catch(() => alert(currentResult));
  } else {
    alert(currentResult);
  }
}

function showToast() {
  const toast = el("toast");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1200);
}

function resetDefaults() {
  setN("angleGrip", 15);
  setN("clearance", 80);
  setN("angleClearance", 15);
  setN("gripLength", 154.5);
  setN("wheel", 250);
  setN("support", 12);
  update();
}

function save() {
  try {
    ["angleGrip", "clearance", "angleClearance", "gripLength", "wheel", "support"].forEach(id => {
      localStorage.setItem("edgeApexV42_" + id, el(id).value);
    });
    localStorage.setItem("edgeApexV42_mode", mode);
  } catch (e) {}
}

function load() {
  try {
    ["angleGrip", "clearance", "angleClearance", "gripLength", "wheel", "support"].forEach(id => {
      const value = localStorage.getItem("edgeApexV42_" + id);
      if (value !== null) el(id).value = value;
    });

    const savedMode = localStorage.getItem("edgeApexV42_mode");
    if (savedMode === "clearance") mode = "clearance";
  } catch (e) {}
}

el("tabGrip").onclick = () => switchMode("grip");
el("tabClearance").onclick = () => switchMode("clearance");

["angleGrip", "clearance", "angleClearance", "gripLength", "wheel", "support"].forEach(id => {
  el(id).addEventListener("input", update);
  el(id).addEventListener("change", update);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

load();
switchMode(mode);
