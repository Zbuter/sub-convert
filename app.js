const DEFAULTS = Object.freeze({
  apiUrl: "https://api.wcc.best",
  sourceUrls: "",
  configUrl: "https://zbuter.github.io/sub-convert/config.ini",
  useConfig: true,
  clientId: "clash",
  emoji: true,
  udp: true,
  sort: false,
  scv: false,
  nodeList: false,
  newName: true,
});

const CLIENTS = Object.freeze([
  { id: "clash", name: "Clash", note: "Mihomo / Meta", target: "clash", icon: "CL" },
  { id: "clashr", name: "ClashR", note: "ClashR 格式", target: "clashr", icon: "CR" },
  { id: "singbox", name: "sing-box", note: "JSON 配置", target: "singbox", icon: "SB" },
  { id: "surge4", name: "Surge 4+", note: "macOS / iOS", target: "surge", version: "4", icon: "S4" },
  { id: "surge3", name: "Surge 3", note: "兼容旧版本", target: "surge", version: "3", icon: "S3" },
  { id: "surge2", name: "Surge 2", note: "兼容旧版本", target: "surge", version: "2", icon: "S2" },
  { id: "quan", name: "Quantumult", note: "经典版本", target: "quan", icon: "QU" },
  { id: "quanx", name: "Quantumult X", note: "iOS 客户端", target: "quanx", icon: "QX" },
  { id: "loon", name: "Loon", note: "iOS 客户端", target: "loon", icon: "LO" },
  { id: "surfboard", name: "Surfboard", note: "Android 客户端", target: "surfboard", icon: "SF" },
  { id: "mellow", name: "Mellow", note: "规则配置", target: "mellow", icon: "ME" },
  { id: "mixed", name: "Mixed", note: "混合节点列表", target: "mixed", icon: "MX" },
  { id: "ss", name: "Shadowsocks", note: "SIP002", target: "ss", icon: "SS" },
  { id: "ssd", name: "SSD", note: "SSD 订阅", target: "ssd", icon: "SD" },
  { id: "ssr", name: "SSR", note: "ShadowsocksR", target: "ssr", icon: "SR" },
  { id: "v2ray", name: "V2Ray", note: "Base64 订阅", target: "v2ray", icon: "V2" },
  { id: "trojan", name: "Trojan", note: "Trojan 节点", target: "trojan", icon: "TR" },
]);

const STORAGE_KEY = "subconvert-settings-v1";
const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#converterForm"),
  apiUrl: $("#apiUrl"),
  apiPresets: $("#apiPresets"),
  customApiShell: $("#customApiShell"),
  sourceUrls: $("#sourceUrls"),
  sourceCount: $("#sourceCount"),
  configUrl: $("#configUrl"),
  configShell: $("#configShell"),
  useConfig: $("#useConfig"),
  clientGrid: $("#clientGrid"),
  selectedClientLabel: $("#selectedClientLabel"),
  resultClientIcon: $("#resultClientIcon"),
  resultClientName: $("#resultClientName"),
  resultTarget: $("#resultTarget"),
  resultUrl: $("#resultUrl"),
  validationMessage: $("#validationMessage"),
  copyButton: $("#copyButton"),
  openButton: $("#openButton"),
  resetButton: $("#resetButton"),
  toast: $("#toast"),
  clientCount: $("#clientCount"),
  emoji: $("#emoji"),
  udp: $("#udp"),
  sort: $("#sort"),
  scv: $("#scv"),
  nodeList: $("#nodeList"),
  newName: $("#newName"),
};

let selectedClientId = DEFAULTS.clientId;
let toastTimer;

function renderClients() {
  elements.clientGrid.innerHTML = CLIENTS.map((client) => `
    <button class="client-option${client.id === selectedClientId ? " selected" : ""}" type="button"
      role="radio" aria-checked="${client.id === selectedClientId}" data-client-id="${client.id}">
      <span class="client-icon">${client.icon}</span>
      <span class="client-text"><strong>${client.name}</strong><small>${client.note}</small></span>
    </button>
  `).join("");
  elements.clientCount.textContent = String(CLIENTS.length);
}

function getSelectedClient() {
  return CLIENTS.find((client) => client.id === selectedClientId) || CLIENTS[0];
}

function normalizeLines(value) {
  return value.split(/\r?\n|\|/).map((line) => line.trim()).filter(Boolean);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getSubEndpoint(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /\/sub$/i.test(trimmed) ? trimmed : `${trimmed}/sub`;
}

function readState() {
  return {
    apiUrl: elements.apiUrl.value.trim(),
    sourceUrls: elements.sourceUrls.value,
    configUrl: elements.configUrl.value.trim(),
    useConfig: elements.useConfig.checked,
    clientId: selectedClientId,
    emoji: elements.emoji.checked,
    udp: elements.udp.checked,
    sort: elements.sort.checked,
    scv: elements.scv.checked,
    nodeList: elements.nodeList.checked,
    newName: elements.newName.checked,
  };
}

function applyState(state) {
  const merged = { ...DEFAULTS, ...state };
  elements.apiUrl.value = merged.apiUrl;
  elements.sourceUrls.value = merged.sourceUrls;
  elements.configUrl.value = merged.configUrl;
  elements.useConfig.checked = Boolean(merged.useConfig);
  selectedClientId = CLIENTS.some((client) => client.id === merged.clientId) ? merged.clientId : DEFAULTS.clientId;
  ["emoji", "udp", "sort", "scv", "nodeList", "newName"].forEach((key) => {
    elements[key].checked = Boolean(merged[key]);
  });
  renderClients();
  syncApiPreset();
  syncConfigState();
  updateResult();
}

function validate(state) {
  if (!isHttpUrl(state.apiUrl)) return "请输入有效的 HTTP(S) 后端 API 地址。";
  const sources = normalizeLines(state.sourceUrls);
  if (!sources.length) return "请先填写至少一个订阅地址。";
  if (sources.some((url) => !isHttpUrl(url))) return "订阅地址中存在无效链接，请检查后重试。";
  if (state.useConfig && !isHttpUrl(state.configUrl)) return "请输入有效的 HTTP(S) 远程配置地址，或关闭远程配置。";
  return "";
}

function buildConversionUrl(state) {
  const client = getSelectedClient();
  const params = new URLSearchParams();
  params.set("target", client.target);
  params.set("url", normalizeLines(state.sourceUrls).join("|"));
  if (state.useConfig) params.set("config", state.configUrl);
  if (client.version) params.set("ver", client.version);
  params.set("emoji", String(state.emoji));
  params.set("udp", String(state.udp));
  params.set("sort", String(state.sort));
  params.set("scv", String(state.scv));
  params.set("list", String(state.nodeList));
  params.set("new_name", String(state.newName));
  return `${getSubEndpoint(state.apiUrl)}?${params.toString()}`;
}

function updateResult() {
  const state = readState();
  const sources = normalizeLines(state.sourceUrls);
  const client = getSelectedClient();
  const error = validate(state);

  elements.sourceCount.textContent = `${sources.length} 个地址`;
  elements.selectedClientLabel.textContent = client.name;
  elements.resultClientIcon.textContent = client.icon;
  elements.resultClientName.textContent = client.name;
  elements.resultTarget.textContent = `target=${client.target}${client.version ? ` · ver=${client.version}` : ""}`;
  elements.validationMessage.textContent = sources.length ? error : "";
  elements.resultUrl.value = error ? "" : buildConversionUrl(state);
  elements.copyButton.disabled = Boolean(error);
  elements.openButton.disabled = Boolean(error);

  saveState(state);
}

function syncApiPreset() {
  const value = elements.apiUrl.value.trim().replace(/\/+$/, "");
  const presetValues = ["https://api.wcc.best", "https://api.dler.io"];
  const activeValue = presetValues.includes(value) ? value : "custom";
  elements.apiPresets.querySelectorAll("[data-api]").forEach((button) => {
    button.classList.toggle("active", button.dataset.api === activeValue);
  });
}

function syncConfigState() {
  const enabled = elements.useConfig.checked;
  elements.configUrl.disabled = !enabled;
  elements.configShell.classList.toggle("disabled", !enabled);
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Private mode may block storage. */ }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

async function copyResult() {
  if (!elements.resultUrl.value) return;
  try {
    await navigator.clipboard.writeText(elements.resultUrl.value);
  } catch {
    elements.resultUrl.select();
    document.execCommand("copy");
    window.getSelection()?.removeAllRanges();
  }
  showToast("已复制到剪贴板");
}

function showToast(message) {
  elements.toast.querySelector("span").textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

elements.apiPresets.addEventListener("click", (event) => {
  const button = event.target.closest("[data-api]");
  if (!button) return;
  if (button.dataset.api === "custom") {
    elements.apiPresets.querySelectorAll("[data-api]").forEach((presetButton) => {
      presetButton.classList.toggle("active", presetButton === button);
    });
    elements.apiUrl.focus();
    elements.apiUrl.select();
    return;
  }
  elements.apiUrl.value = button.dataset.api;
  updateResult();
  syncApiPreset();
});

elements.clientGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-client-id]");
  if (!button) return;
  selectedClientId = button.dataset.clientId;
  renderClients();
  updateResult();
});

elements.form.addEventListener("input", (event) => {
  if (event.target === elements.apiUrl) syncApiPreset();
  if (event.target === elements.useConfig) syncConfigState();
  updateResult();
});

elements.form.addEventListener("change", (event) => {
  if (event.target === elements.useConfig) syncConfigState();
  updateResult();
});

elements.copyButton.addEventListener("click", copyResult);
elements.openButton.addEventListener("click", () => {
  if (elements.resultUrl.value) window.open(elements.resultUrl.value, "_blank", "noopener,noreferrer");
});
elements.resetButton.addEventListener("click", () => {
  applyState(DEFAULTS);
  showToast("已恢复默认设置");
});

applyState(loadState());
