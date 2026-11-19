import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import {
  TiffGetter,
  events,
  type CleanupResult,
  type FetchEvent,
  type FetchRequest,
  type PreflightInfo,
  type Point,
  type Residual,
  type Settings,
  type SourceInfo,
} from "./mygo";

// ---------- 元素引用 ----------

const $ = <T extends HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;

const sourceSelect = $<HTMLSelectElement>("#source");
const attributionEl = $("#attribution");
const experimentalEl = $("#experimental");
const sourceCapacityEl = $("#source-capacity");
const sourceNoteEl = $("#source-note");
const preflightEl = $("#preflight");
const themePairSelect = $<HTMLSelectElement>("#theme-pair");
const modeToggle = $<HTMLButtonElement>("#mode-toggle");
const themeStatus = $("#status-theme");
const sourceStatus = $("#status-source");

const latInput = $<HTMLInputElement>("#lat");
const lonInput = $<HTMLInputElement>("#lon");
const coordHint = $("#coord-hint");
const zoomInput = $<HTMLInputElement>("#zoom");
const bufferInput = $<HTMLInputElement>("#buffer");
const dateStartInput = $<HTMLInputElement>("#date-start");
const dateEndInput = $<HTMLInputElement>("#date-end");
const singleOutputInput = $<HTMLInputElement>("#single-output");
const dedupInput = $<HTMLInputElement>("#dedup");
const startSingleButton = $<HTMLButtonElement>("#start-single");
const stopSingleButton = $<HTMLButtonElement>("#stop-single");

const coordsFileInput = $<HTMLInputElement>("#coords-file");
const batchBadge = $("#batch-badge");
const batchZoomInput = $<HTMLInputElement>("#batch-zoom");
const batchBufferInput = $<HTMLInputElement>("#batch-buffer");
const batchConcurrencyInput = $<HTMLInputElement>("#batch-concurrency");
const batchDateStartInput = $<HTMLInputElement>("#batch-date-start");
const batchDateEndInput = $<HTMLInputElement>("#batch-date-end");
const batchOutputInput = $<HTMLInputElement>("#batch-output");
const batchDedupInput = $<HTMLInputElement>("#batch-dedup");
const startBatchButton = $<HTMLButtonElement>("#start-batch");
const stopBatchButton = $<HTMLButtonElement>("#stop-batch");
const previewSummary = $("#preview-summary");
const previewTableBody = $("#preview-table tbody") as HTMLTableSectionElement;

const cleanupTableBody = $("#cleanup-table tbody") as HTMLTableSectionElement;
const cleanupSummary = $("#cleanup-summary");
const cleanupTempOnly = $<HTMLInputElement>("#cleanup-temp-only");

const resultTableBody = $("#result-table tbody") as HTMLTableSectionElement;
const resultSummary = $("#result-summary");
const batchFailuresEl = $("#batch-failures");
const batchFailureList = $<HTMLUListElement>("#batch-failure-list");

const runBanner = $("#run-banner");
const runBannerText = $("#run-banner-text");
const failureDetailsButton = $<HTMLButtonElement>("#failure-details");

const progressBar = $("#progress-bar");
const progressText = $("#progress-text");
const logBody = $("#log");
const autoScrollInput = $<HTMLInputElement>("#auto-scroll");
const statusText = $("#status-text");
const statusJob = $("#status-job");

const mapModal = $("#modal-map");
const mapAttributionEl = $("#map-attribution");
const mapCoordsEl = $("#map-coords");
const basemapSelect = $<HTMLSelectElement>("#basemap");

const failureModal = $("#modal-failure");
const failureText = $<HTMLPreElement>("#failure-text");

const confirmModal = $("#modal-confirm");
const confirmTitle = $("#confirm-title");
const confirmMessage = $("#confirm-message");
const confirmOk = $<HTMLButtonElement>("#confirm-ok");
const confirmCancel = $<HTMLButtonElement>("#confirm-cancel");

const toastEl = $("#toast");

// ---------- 主题 ----------

type Palette = {
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentContrast: string;
  logBg: string;
  logFg: string;
};

type ThemePair = {
  label: string;
  dark: Palette;
  light: Palette;
};

const THEMES: Record<string, ThemePair> = {
  "tokyo-night": {
    label: "Tokyo Night",
    dark: {
      bg: "#1a1b26",
      panel: "#24283b",
      panel2: "#1f2335",
      border: "#3b4261",
      text: "#c0caf5",
      muted: "#7982a9",
      accent: "#7aa2f7",
      accentContrast: "#15161e",
      logBg: "#16161e",
      logFg: "#a9b1d6",
    },
    light: {
      bg: "#f5f7ff",
      panel: "#ffffff",
      panel2: "#e8ecf4",
      border: "#c8d0e0",
      text: "#343b58",
      muted: "#6b7391",
      accent: "#2e7de9",
      accentContrast: "#ffffff",
      logBg: "#fbfcff",
      logFg: "#343b58",
    },
  },
  everforest: {
    label: "Everforest",
    dark: {
      bg: "#2d353b",
      panel: "#343f44",
      panel2: "#272e33",
      border: "#475258",
      text: "#d3c6aa",
      muted: "#859289",
      accent: "#a7c080",
      accentContrast: "#1e2326",
      logBg: "#232a2e",
      logFg: "#d3c6aa",
    },
    light: {
      bg: "#fdf6e3",
      panel: "#fffcf2",
      panel2: "#efebd4",
      border: "#d8d3ba",
      text: "#5c6a72",
      muted: "#829181",
      accent: "#8da101",
      accentContrast: "#ffffff",
      logBg: "#fdf6e3",
      logFg: "#5c6a72",
    },
  },
  dracula: {
    label: "Dracula",
    dark: {
      bg: "#282a36",
      panel: "#343746",
      panel2: "#21222c",
      border: "#44475a",
      text: "#f8f8f2",
      muted: "#9aa0c0",
      accent: "#bd93f9",
      accentContrast: "#21222c",
      logBg: "#1e1f29",
      logFg: "#f8f8f2",
    },
    light: {
      bg: "#f8f8f2",
      panel: "#ffffff",
      panel2: "#e9e9ee",
      border: "#cfcfe0",
      text: "#282a36",
      muted: "#6a6c88",
      accent: "#7c3aed",
      accentContrast: "#ffffff",
      logBg: "#fbfbf7",
      logFg: "#282a36",
    },
  },
  catppuccin: {
    label: "Catppuccin",
    dark: {
      bg: "#1e1e2e",
      panel: "#313244",
      panel2: "#181825",
      border: "#45475a",
      text: "#cdd6f4",
      muted: "#9399b2",
      accent: "#89b4fa",
      accentContrast: "#11111b",
      logBg: "#181825",
      logFg: "#cdd6f4",
    },
    light: {
      bg: "#eff1f5",
      panel: "#ffffff",
      panel2: "#e6e9ef",
      border: "#ccd0da",
      text: "#4c4f69",
      muted: "#7c7f93",
      accent: "#1e66f5",
      accentContrast: "#ffffff",
      logBg: "#f7f9fc",
      logFg: "#4c4f69",
    },
  },
  nord: {
    label: "Nord",
    dark: {
      bg: "#2e3440",
      panel: "#3b4252",
      panel2: "#272c36",
      border: "#4c566a",
      text: "#eceff4",
      muted: "#9aa7bd",
      accent: "#88c0d0",
      accentContrast: "#1b2029",
      logBg: "#242933",
      logFg: "#e5e9f0",
    },
    light: {
      bg: "#eceff4",
      panel: "#ffffff",
      panel2: "#e5e9f0",
      border: "#c6cfdd",
      text: "#2e3440",
      muted: "#67728a",
      accent: "#5e81ac",
      accentContrast: "#ffffff",
      logBg: "#f7f9fc",
      logFg: "#2e3440",
    },
  },
  gruvbox: {
    label: "Gruvbox",
    dark: {
      bg: "#282828",
      panel: "#3c3836",
      panel2: "#1d2021",
      border: "#504945",
      text: "#ebdbb2",
      muted: "#a89984",
      accent: "#fabd2f",
      accentContrast: "#282828",
      logBg: "#1d2021",
      logFg: "#ebdbb2",
    },
    light: {
      bg: "#fbf1c7",
      panel: "#fff9e8",
      panel2: "#f2e5bc",
      border: "#d5c4a1",
      text: "#3c3836",
      muted: "#7c6f64",
      accent: "#b57614",
      accentContrast: "#ffffff",
      logBg: "#fdf7df",
      logFg: "#3c3836",
    },
  },
  vapor: {
    label: "Vapor",
    dark: {
      bg: "#1a1030",
      panel: "#2b1b4d",
      panel2: "#160b2a",
      border: "#4d2f80",
      text: "#f0e6ff",
      muted: "#a894c9",
      accent: "#ff71ce",
      accentContrast: "#1a1030",
      logBg: "#120822",
      logFg: "#f0e6ff",
    },
    light: {
      bg: "#fdf3ff",
      panel: "#ffffff",
      panel2: "#f3e3ff",
      border: "#dfc2f5",
      text: "#3b2354",
      muted: "#7b5d99",
      accent: "#c026d3",
      accentContrast: "#ffffff",
      logBg: "#fbf0ff",
      logFg: "#3b2354",
    },
  },
  minty: {
    label: "Minty",
    dark: {
      bg: "#0f1f1a",
      panel: "#17352b",
      panel2: "#0b1814",
      border: "#285444",
      text: "#d7f5e9",
      muted: "#82b8a4",
      accent: "#3ddc97",
      accentContrast: "#08120f",
      logBg: "#0a1512",
      logFg: "#d7f5e9",
    },
    light: {
      bg: "#f2fbf7",
      panel: "#ffffff",
      panel2: "#e0f5ec",
      border: "#b8e2d2",
      text: "#134e3a",
      muted: "#4f8573",
      accent: "#0f9f6e",
      accentContrast: "#ffffff",
      logBg: "#f8fdfb",
      logFg: "#134e3a",
    },
  },
};

// ---------- 运行状态 ----------

const FAILURE_LABELS: Record<string, string> = {
  no_releases: "无可用版本",
  out_of_range: "范围越界",
  network: "网络错误",
  timeout: "请求超时",
  tls: "TLS 证书错误",
  http_error: "HTTP 错误",
  forbidden: "访问被拒绝 (403)",
  rate_limited: "请求过多 (429)",
  server: "服务端错误 (5xx)",
  blocked: "服务商拦截",
  invalid_content: "响应内容无效",
  incomplete_tiles: "瓦片不完整",
  interface_changed: "外部接口已变更",
  internal: "内部错误",
  cancelled: "任务已取消",
};

const FAILURE_ADVICE: Record<string, string> = {
  no_releases: "换用其他日期范围或其他数据源。",
  out_of_range: "检查坐标与缩放级别，确认瓦片存在。",
  network: "检查网络连接或代理设置后重试。",
  timeout: "降低并发、缩小范围或稍后重试。",
  tls: "检查代理证书；必要时关闭 TLS 校验或更换网络。",
  http_error: "稍后重试；持续失败时更换数据源。",
  forbidden: "等待一段时间，或改用 Esri / Bing。",
  rate_limited: "降低并发、增大请求间隔后重试。",
  server: "服务端临时故障，稍后重试。",
  blocked: "更换数据源；OSM 不适合批量抓取。",
  invalid_content: "确认瓦片服务地址仍有效。",
  incomplete_tiles: "重试该日期；检查网络稳定性。",
  interface_changed: "外部接口可能已变更，更新程序或更换数据源。",
  internal: "查看日志中的详细错误并重试。",
  cancelled: "任务已按请求停止，已完成结果已保留。",
};

const STATUS_LABELS: Record<string, string> = {
  success: "✅ 成功",
  existing: "📁 已存在",
  duplicate: "♻️ 重复",
  failed: "❌ 失败",
};

type ResultRow = {
  key: string;
  label: string;
  status: string;
  statusText: string;
  reason: string;
  path: string;
  folder: string;
  kind: string;
  detail: string;
  failedTiles: number;
  counts: Record<string, number>;
  samples: FetchEvent["samples"];
  metadataSource: string;
  date: string;
  name: string;
};

type BatchFailure = {
  index: number;
  name: string;
  lat: number;
  lon: number;
  success: number;
  total: number;
};

type CleanupRow = {
  item: Residual;
  selected: boolean;
};

type ThemeMode = "dark" | "light";

// ---------- 初始化数据 ----------

const sources = await TiffGetter.sources();
const defaults = await TiffGetter.defaults();
const stored = await TiffGetter.loadSettings();
let settings: Settings = { ...defaults, ...stored };
let themePair = THEMES[settings.theme] ? settings.theme : "tokyo-night";
let themeMode: ThemeMode = settings.mode === "light" ? "light" : "dark";

let singleOutputEdited = false;
let batchOutputEdited = false;
let previewPoints: Point[] = [];
let previewPath = "";
let previewFormat = "";
let results: ResultRow[] = [];
let batchFailures: BatchFailure[] = [];
let cleanupRows: CleanupRow[] = [];
let currentJob = "";
let running = false;
let activeMode: "single" | "batch" = "single";
let runMode: "single" | "batch" = "single";
let runPointTotal = 1;
let estimatedTotalDates = 0;
let preflightInfo: PreflightInfo | null = null;
let saveTimer: number | undefined;
let preflightTimer: number | undefined;

// ---------- 通用工具 ----------

/** 显示短暂提示。 */
function showToast(message: string, kind: "ok" | "error" | "" = ""): void {
  toastEl.textContent = message;
  toastEl.className = `toast ${kind}`.trim();
  window.clearTimeout(Number(toastEl.dataset.timer ?? "0"));
  const timer = window.setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 3200);
  toastEl.dataset.timer = String(timer);
}

/** 格式化文件大小。 */
function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const text = unit === 0 ? String(Math.round(value)) : value.toFixed(1);
  return `${text} ${units[unit]}`;
}

/** 格式化修改时间。 */
function formatTime(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 取路径所在目录。 */
function dirname(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index > 0 ? path.slice(0, index) : path;
}

/** 当前数据源信息。 */
function currentSource(): SourceInfo {
  return sources.find((item) => item.name === sourceSelect.value) ?? sources[0]!;
}

/** 数据源默认单点输出目录。 */
function defaultSingleOutput(info: SourceInfo): string {
  if (info.name === "wayback") {
    return "data\\output\\historical";
  }
  return `data\\output\\${info.name}`;
}

/** 数据源默认批量输出目录。 */
function defaultBatchOutput(info: SourceInfo): string {
  if (info.name === "wayback") {
    return "data\\output\\batch";
  }
  return `data\\output\\${info.name}`;
}

/** 追加日志行。 */
function appendLog(message: string, level: "info" | "ok" | "warn" | "error" | "muted" = "info"): void {
  const line = document.createElement("div");
  line.className = `log-line ${level}`;
  line.textContent = message;
  logBody.appendChild(line);
  while (logBody.childElementCount > 3000) {
    logBody.firstElementChild?.remove();
  }
  if (autoScrollInput.checked) {
    logBody.scrollTop = logBody.scrollHeight;
  }
}

/** 复制文本到剪贴板。 */
async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** 主题应用。 */
function applyTheme(): void {
  const pair = THEMES[themePair] ?? THEMES["tokyo-night"]!;
  const palette = pair[themeMode];
  const root = document.documentElement;
  root.style.setProperty("--bg", palette.bg);
  root.style.setProperty("--panel", palette.panel);
  root.style.setProperty("--panel-2", palette.panel2);
  root.style.setProperty("--border", palette.border);
  root.style.setProperty("--text", palette.text);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-contrast", palette.accentContrast);
  root.style.setProperty("--log-bg", palette.logBg);
  root.style.setProperty("--log-fg", palette.logFg);
  root.style.colorScheme = themeMode;
  modeToggle.textContent = themeMode === "dark" ? "☀ 亮色" : "🌙 暗色";
  themeStatus.textContent = `主题：${pair.label} / ${themeMode === "dark" ? "暗色" : "亮色"}`;
  themePairSelect.value = themePair;
}

/** 渲染主题下拉。 */
function renderThemeOptions(): void {
  themePairSelect.innerHTML = "";
  for (const [key, pair] of Object.entries(THEMES)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = pair.label;
    themePairSelect.appendChild(option);
  }
  themePairSelect.value = themePair;
}

/** 收集当前设置。 */
function collectSettings(): Settings {
  return {
    source: sourceSelect.value,
    zoom: Number(zoomInput.value) || defaults.zoom,
    buffer_radius_m: Number(bufferInput.value) || defaults.buffer_radius_m,
    dedup: dedupInput.checked,
    coord_concurrency: Number(batchConcurrencyInput.value) || defaults.coord_concurrency,
    single_output: singleOutputInput.value.trim(),
    batch_output: batchOutputInput.value.trim(),
    lat: latInput.value.trim(),
    lon: lonInput.value.trim(),
    date_start: dateStartInput.value,
    date_end: dateEndInput.value,
    last_coords_file: coordsFileInput.value || settings.last_coords_file,
    theme: themePair,
    mode: themeMode,
  };
}

/** 防抖保存设置。 */
function scheduleSave(): void {
  settings = collectSettings();
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    TiffGetter.saveSettings(settings).catch((error: unknown) => {
      showToast(`保存设置失败：${String(error)}`, "error");
    });
  }, 350);
}

/** 预检刷新。 */
function schedulePreflight(): void {
  window.clearTimeout(preflightTimer);
  preflightTimer = window.setTimeout(() => {
    void refreshPreflight();
  }, 450);
}

/** 执行预检并渲染提示。 */
async function refreshPreflight(): Promise<void> {
  const dir = activeMode === "batch" ? batchOutputInput.value.trim() : singleOutputInput.value.trim();
  preflightInfo = await TiffGetter.preflight(dir);
  preflightEl.innerHTML = "";
  const chips: Array<[string, string]> = [];
  if (preflightInfo.rasterio) {
    chips.push(["GeoTIFF 可用", "ok"]);
  } else {
    chips.push(["仅 PNG（缺少 rasterio）", "warn"]);
  }
  if (preflightInfo.proxy) {
    chips.push([`代理：${preflightInfo.proxy}`, "warn"]);
  }
  if (preflightInfo.output_writable) {
    chips.push(["输出目录可写", "ok"]);
  } else {
    chips.push([`输出目录不可写：${preflightInfo.output_dir}`, "danger"]);
  }
  for (const [text, kind] of chips) {
    const chip = document.createElement("span");
    chip.className = `chip ${kind}`;
    chip.textContent = text;
    preflightEl.appendChild(chip);
  }
}

// ---------- 数据源与输出联动 ----------

/** 渲染数据源下拉。 */
function renderSources(): void {
  sourceSelect.innerHTML = "";
  for (const info of sources) {
    const option = document.createElement("option");
    option.value = info.name;
    option.textContent = info.display_name;
    sourceSelect.appendChild(option);
  }
}

/** 联动数据源能力、日期、zoom 与提示。 */
function applySource(name: string, initial: boolean): void {
  const info = sources.find((item) => item.name === name) ?? sources[0]!;
  sourceSelect.value = info.name;
  settings.source = info.name;
  attributionEl.textContent = `版权：${info.attribution}`;
  experimentalEl.classList.toggle("hidden", !info.experimental);
  sourceCapacityEl.textContent = `zoom ${info.min_zoom}..${info.max_zoom} · 并发上限 ${info.max_concurrency}`;
  sourceStatus.textContent = `数据源：${info.display_name}`;
  if (info.usage_note) {
    sourceNoteEl.textContent = `⚠ ${info.usage_note}`;
    sourceNoteEl.classList.remove("hidden");
    sourceNoteEl.style.color = info.name === "osm"
      ? "#c0392b"
      : info.name === "google"
        ? "#d35400"
        : "var(--warn)";
  } else {
    sourceNoteEl.textContent = "";
    sourceNoteEl.classList.add("hidden");
  }

  const supportsHistory = info.supports_history;
  for (const input of [dateStartInput, dateEndInput, batchDateStartInput, batchDateEndInput]) {
    input.disabled = !supportsHistory;
  }
  if (!supportsHistory) {
    dateStartInput.value = "";
    dateEndInput.value = "";
    batchDateStartInput.value = "";
    batchDateEndInput.value = "";
  }

  for (const input of [zoomInput, batchZoomInput]) {
    input.min = String(info.min_zoom);
    input.max = String(info.max_zoom);
    const value = Number(input.value);
    const clamped = Math.min(Math.max(value, info.min_zoom), info.max_zoom);
    if (clamped !== value) {
      input.value = String(clamped);
    }
  }

  if (!singleOutputEdited) {
    singleOutputInput.value = defaultSingleOutput(info);
  }
  if (!batchOutputEdited) {
    batchOutputInput.value = defaultBatchOutput(info);
  }

  if (!initial) {
    appendLog(`当前数据源: ${info.display_name}（版权：${info.attribution}）`, "info");
    if (info.usage_note) {
      appendLog(`数据源提示: ${info.usage_note}`, "warn");
    } else if (info.experimental) {
      appendLog("提示：该数据源为实验性，接口可能失效", "warn");
    }
  }
  scheduleSave();
  schedulePreflight();
}

/** 校验坐标校验提示。 */
function refreshCoordinateHint(): void {
  const latText = latInput.value.trim();
  const lonText = lonInput.value.trim();
  if (!latText && !lonText) {
    coordHint.textContent = "请填入纬度和经度";
    coordHint.className = "hint";
    return;
  }
  const lat = Number(latText);
  const lon = Number(lonText);
  const reasons: string[] = [];
  if (!latText || Number.isNaN(lat)) {
    reasons.push("lat 为空/非数字");
  } else if (lat < -90 || lat > 90) {
    reasons.push("lat 越界");
  }
  if (!lonText || Number.isNaN(lon)) {
    reasons.push("lon 为空/非数字");
  } else if (lon < -180 || lon > 180) {
    reasons.push("lon 越界");
  }
  if (reasons.length === 0) {
    coordHint.textContent = "✓ 坐标合法";
    coordHint.className = "hint ok";
    return;
  }
  coordHint.textContent = `✗ ${reasons.join(" / ")}`;
  coordHint.className = "hint error";
}

/** 读取并校验坐标输入。 */
function readCoordinates(): { lat: number; lon: number } {
  const lat = Number(latInput.value.trim());
  const lon = Number(lonInput.value.trim());
  if (!Number.isFinite(lat)) {
    throw new Error("纬度必须是数字");
  }
  if (lat < -90 || lat > 90) {
    throw new Error(`纬度越界 ${lat}`);
  }
  if (!Number.isFinite(lon)) {
    throw new Error("经度必须是数字");
  }
  if (lon < -180 || lon > 180) {
    throw new Error(`经度越界 ${lon}`);
  }
  return { lat, lon };
}

/** 读取日期范围。 */
function readDateRange(startInput: HTMLInputElement, endInput: HTMLInputElement): { start: string | null; end: string | null } {
  const start = startInput.value.trim();
  const end = endInput.value.trim();
  if (!start && !end) {
    return { start: null, end: null };
  }
  if (!start || !end) {
    throw new Error("起始和截止日期必须同时填写或同时留空");
  }
  if (start > end) {
    throw new Error("起始日期不能晚于截止日期");
  }
  return { start, end };
}

/** 校验数字范围。 */
function readRange(input: HTMLInputElement, min: number, max: number, label: string): number {
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}越界 ${input.value}`);
  }
  return Math.trunc(value);
}

// ---------- 任务启动 ----------

/** 设置运行态按钮与状态。 */
function setRunning(value: boolean): void {
  running = value;
  startSingleButton.disabled = value;
  startBatchButton.disabled = value;
  stopSingleButton.disabled = !value;
  stopBatchButton.disabled = !value;
  statusText.textContent = value ? "运行中..." : "就绪";
}

/** 重置一次运行的界面状态。 */
function resetRun(mode: "single" | "batch"): void {
  runMode = mode;
  runPointTotal = mode === "batch" ? previewPoints.length : 1;
  currentJob = "";
  estimatedTotalDates = 0;
  results = [];
  batchFailures = [];
  resultTableBody.innerHTML = "";
  batchFailureList.innerHTML = "";
  batchFailuresEl.classList.add("hidden");
  runBanner.className = "run-banner hidden";
  failureDetailsButton.classList.add("hidden");
  logBody.innerHTML = "";
  progressBar.style.width = "0%";
  progressText.textContent = "0 / 0";
  resultSummary.textContent = "尚无结果";
  estimatedTotalDates = 0;
  schedulePreflight();
}

/** 提交单点任务。 */
async function startSingle(): Promise<void> {
  if (running) {
    return;
  }
  const info = currentSource();
  try {
    const { lat, lon } = readCoordinates();
    const zoom = readRange(zoomInput, 1, 20, "缩放级别");
    const buffer = readRange(bufferInput, 50, 5000, "缓冲区");
    const output = singleOutputInput.value.trim();
    if (!output) {
      throw new Error("输出目录不能为空");
    }
    const range = info.supports_history
      ? readDateRange(dateStartInput, dateEndInput)
      : { start: null, end: null };
    if (preflightInfo && preflightInfo.output_dir === output && !preflightInfo.output_writable) {
      throw new Error(`输出目录不可写：${output}`);
    }
    const request: FetchRequest = {
      schema_version: "1.0",
      request_id: crypto.randomUUID(),
      source: info.name,
      points: [{ id: "p1", name: "", lat, lon }],
      options: {
        zoom,
        buffer_radius_m: buffer,
        date_start: range.start,
        date_end: range.end,
        dedup: dedupInput.checked,
        coord_concurrency: 1,
      },
      output: { root: output, layout: "explicit" },
    };
    resetRun("single");
    setRunning(true);
    appendLog(`单点任务：${info.display_name} ${lat.toFixed(6)}, ${lon.toFixed(6)} · zoom ${zoom} · buffer ${buffer}m`, "info");
    if (range.start && range.end) {
      appendLog(`日期范围：${range.start} ~ ${range.end}`, "info");
    }
    const jobID = await TiffGetter.startFetch(request);
    if (running && currentJob === "") {
      currentJob = jobID;
      statusJob.textContent = `任务 ${jobID}`;
      appendLog(`任务已提交：${jobID}`, "info");
    }
  } catch (error) {
    setRunning(false);
    currentJob = "";
    showBanner("warn", `⚠️ 参数或输入错误：${String(error)}`, false);
    appendLog(`参数错误：${String(error)}`, "error");
    showToast(String(error), "error");
  }
}

/** 提交批量任务。 */
async function startBatch(): Promise<void> {
  if (running) {
    return;
  }
  const info = currentSource();
  try {
    const path = coordsFileInput.value.trim();
    if (!path) {
      throw new Error("请选择坐标文件");
    }
    if (previewPath !== path || previewPoints.length === 0) {
      await previewCoordinates();
    }
    if (previewPoints.length === 0) {
      throw new Error("坐标文件中没有可用坐标");
    }
    const zoom = readRange(batchZoomInput, 1, 20, "缩放级别");
    const buffer = readRange(batchBufferInput, 50, 5000, "缓冲区");
    const concurrency = readRange(batchConcurrencyInput, 1, 16, "并发数");
    const output = batchOutputInput.value.trim();
    if (!output) {
      throw new Error("输出根目录不能为空");
    }
    const range = info.supports_history
      ? readDateRange(batchDateStartInput, batchDateEndInput)
      : { start: null, end: null };
    if (info.name === "osm") {
      const ok = await confirmDialog(
        "OSM 批量下载确认",
        "当前数据源为 OpenStreetMap（OSM 公共瓦片）。\n\nOSM 公共瓦片仅适合轻量、单点使用，批量下载请改用 ESRI 或 Bing，否则可能被限流或封禁。\n\n仍要继续吗？",
        "继续下载",
      );
      if (!ok) {
        return;
      }
    }
    const points: Point[] = previewPoints.map((point, index) => ({
      id: point.id || `p${index + 1}`,
      name: point.name || `point-${index + 1}`,
      lat: point.lat,
      lon: point.lon,
    }));
    const request: FetchRequest = {
      schema_version: "1.0",
      request_id: crypto.randomUUID(),
      source: info.name,
      points,
      options: {
        zoom,
        buffer_radius_m: buffer,
        date_start: range.start,
        date_end: range.end,
        dedup: batchDedupInput.checked,
        coord_concurrency: concurrency,
      },
      output: { root: output, layout: "explicit" },
    };
    resetRun("batch");
    runPointTotal = points.length;
    setRunning(true);
    appendLog(`批量任务：${info.display_name} · ${points.length} 个坐标 · zoom ${zoom} · buffer ${buffer}m · 并发 ${concurrency}`, "info");
    if (range.start && range.end) {
      appendLog(`日期范围：${range.start} ~ ${range.end}`, "info");
    }
    const jobID = await TiffGetter.startFetch(request);
    if (running && currentJob === "") {
      currentJob = jobID;
      statusJob.textContent = `任务 ${jobID}`;
      appendLog(`任务已提交：${jobID}`, "info");
    }
  } catch (error) {
    setRunning(false);
    currentJob = "";
    showBanner("warn", `⚠️ 参数或输入错误：${String(error)}`, false);
    appendLog(`参数错误：${String(error)}`, "error");
    showToast(String(error), "error");
  }
}

/** 取消当前任务。 */
async function stopJob(): Promise<void> {
  if (!running || !currentJob) {
    return;
  }
  statusText.textContent = "正在停止...";
  stopSingleButton.disabled = true;
  stopBatchButton.disabled = true;
  try {
    await TiffGetter.cancelFetch(currentJob);
    appendLog("已发送取消请求，正在等待任务停止", "warn");
  } catch (error) {
    showToast(`取消失败：${String(error)}`, "error");
  }
}

// ---------- 事件处理 ----------

/** 处理一条采集事件。 */
function handleEvent(event: FetchEvent): void {
  switch (event.type) {
    case "log": {
      const level = event.level === "ERROR" ? "error" : event.level === "WARNING" ? "warn" : "info";
      appendLog(event.message, level);
      break;
    }
    case "progress": {
      const perPoint = runMode === "batch" ? event.total * Math.max(runPointTotal, 1) : event.total;
      estimatedTotalDates = Math.max(estimatedTotalDates, perPoint);
      updateProgress(event.current, event.total, estimatedTotalDates);
      const target = event.point_name || event.point_id || "";
      statusText.textContent = target
        ? `处理 ${target} · 第 ${event.current}/${event.total} 个日期`
        : `第 ${event.current}/${event.total} 个日期`;
      break;
    }
    case "date_result": {
      addDateResult(event);
      break;
    }
    case "coordinate_result": {
      addCoordinateResult(event);
      break;
    }
    case "run_summary": {
      finishRun(event);
      break;
    }
    default:
      break;
  }
}

/** 更新进度条与文本。 */
function updateProgress(current: number, total: number, estimated: number): void {
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;
  progressBar.style.width = `${Math.round(ratio * 100)}%`;
  const estimateText = estimated > 0 ? `（预计 ${estimated}）` : "";
  progressText.textContent = `${current} / ${total}${estimateText}`;
}

/** 插入或更新一条日期结果。 */
function addDateResult(event: FetchEvent): void {
  const key = `${event.coord_index}-${event.date}-${event.release_id}`;
  const label = runMode === "batch"
    ? `${event.point_name || event.name || `#${event.coord_index}`} · ${event.date}`
    : event.date;
  const kind = event.kind;
  const reason = kind ? FAILURE_LABELS[kind] ?? kind : event.detail;
  const row: ResultRow = {
    key,
    label,
    status: event.status,
    statusText: STATUS_LABELS[event.status] ?? event.status,
    reason: rowReason(event.status, reason, event.detail),
    path: event.path,
    folder: event.path ? dirname(event.path) : "",
    kind,
    detail: event.detail,
    failedTiles: event.failed_tiles,
    counts: event.tile_failure_counts ?? {},
    samples: event.samples ?? [],
    metadataSource: event.metadata_source,
    date: event.date,
    name: event.point_name || event.name,
  };
  const existingIndex = results.findIndex((item) => item.key === key);
  if (existingIndex >= 0) {
    results[existingIndex] = row;
  } else {
    results.push(row);
  }
  renderResults();

  if (event.status === "failed") {
    appendLog(`[FAIL] ${label}：${row.reason || event.detail || "未知错误"}`, "error");
  } else if (event.status === "duplicate") {
    appendLog(`[DUP] ${label}：${event.path || "去重命中"}`, "warn");
  } else if (event.status === "existing") {
    appendLog(`[SKIP] ${label}：已存在 ${event.path}`, "muted");
  } else {
    appendLog(`[OK] ${label} → ${event.path}`, "ok");
  }
  if (event.metadata_source) {
    appendLog(`  元数据来源：${event.metadata_source}${event.metadata_fetched_at ? ` · ${event.metadata_fetched_at}` : ""}`, "muted");
  }
}

/** 结果表失败原因文本。 */
function rowReason(status: string, reason: string, detail: string): string {
  if (status !== "failed") {
    return "";
  }
  if (reason) {
    return reason;
  }
  return detail || "未知错误";
}

/** 渲染结果表。 */
function renderResults(): void {
  resultTableBody.innerHTML = "";
  if (results.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "运行后在此显示每日结果，双击行打开文件";
    row.appendChild(cell);
    resultTableBody.appendChild(row);
    resultSummary.textContent = "尚无结果";
    return;
  }
  let ok = 0;
  let failed = 0;
  for (const item of results) {
    const row = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.textContent = item.label;
    labelCell.title = item.label;
    const statusCell = document.createElement("td");
    statusCell.textContent = item.statusText;
    statusCell.className = item.status === "failed"
      ? "status-failed"
      : item.status === "success"
        ? "status-success"
        : "status-partial";
    const reasonCell = document.createElement("td");
    reasonCell.textContent = item.reason;
    reasonCell.title = item.reason;
    const pathCell = document.createElement("td");
    pathCell.textContent = item.path || item.folder;
    pathCell.title = item.path || item.folder;
    row.append(labelCell, statusCell, reasonCell, pathCell);
    row.addEventListener("dblclick", () => {
      openResult(item);
    });
    resultTableBody.appendChild(row);
    if (item.status === "failed") {
      failed += 1;
    } else {
      ok += 1;
    }
  }
  resultSummary.textContent = `共 ${results.length} 条 · 成功/跳过 ${ok} · 失败 ${failed}`;
}

/** 打开结果文件或所在目录。 */
function openResult(item: ResultRow): void {
  if (item.path) {
    TiffGetter.openPath(item.path).catch((error: unknown) => {
      showToast(`打开文件失败：${String(error)}`, "error");
    });
    return;
  }
  if (item.folder) {
    TiffGetter.openFolder(item.folder).catch((error: unknown) => {
      showToast(`打开目录失败：${String(error)}`, "error");
    });
  }
}

/** 处理坐标完成事件。 */
function addCoordinateResult(event: FetchEvent): void {
  if (runMode !== "batch") {
    return;
  }
  if (event.failed > 0) {
    batchFailures.push({
      index: event.coord_index,
      name: event.name,
      lat: event.lat,
      lon: event.lon,
      success: event.success,
      total: event.total_dates,
    });
    renderBatchFailures();
  }
  const totalPoints = runPointTotal;
  const index = event.coord_index;
  progressBar.style.width = totalPoints > 0 ? `${Math.round((index / totalPoints) * 100)}%` : "0%";
  progressText.textContent = `${index} / ${totalPoints} 坐标`;
  statusText.textContent = `完成坐标 ${event.name} · 成功 ${event.success}/${event.total_dates}`;
  appendLog(
    `[${event.failed > 0 ? "PART" : "OK"}] ${event.name} (${event.lat.toFixed(6)}, ${event.lon.toFixed(6)}) 成功 ${event.success}/${event.total_dates}`,
    event.failed > 0 ? "warn" : "ok",
  );
}

/** 渲染批量失败坐标。 */
function renderBatchFailures(): void {
  batchFailureList.innerHTML = "";
  if (batchFailures.length === 0) {
    batchFailuresEl.classList.add("hidden");
    return;
  }
  for (const item of batchFailures) {
    const li = document.createElement("li");
    li.textContent = `${item.name} (${item.lat.toFixed(6)}, ${item.lon.toFixed(6)}) · 成功 ${item.success}/${item.total}`;
    batchFailureList.appendChild(li);
  }
  batchFailuresEl.classList.remove("hidden");
}

/** 运行收尾：横幅、进度与状态。 */
function finishRun(event: FetchEvent): void {
  setRunning(false);
  progressBar.style.width = "100%";
  const code = event.exit_code;
  const cancelled = event.cancelled || code === 6;
  if (cancelled) {
    showBanner("warn", "⏹ 任务已取消，已完成的结果已保留", false);
    statusText.textContent = "已取消";
    appendLog("任务已取消", "warn");
    return;
  }
  switch (code) {
    case 0:
      showBanner("success", "✅ 运行完成：全部成功", false);
      statusText.textContent = "完成";
      break;
    case 2:
      showBanner("warn", `⚠️ 参数或输入错误：${event.error || "请检查配置"}`, false);
      statusText.textContent = "参数错误";
      break;
    case 3:
      showBanner("warn", "⚠️ 部分日期失败，请查看失败详情", true);
      statusText.textContent = "部分失败";
      break;
    case 4:
      showBanner("danger", "❌ 全部日期失败，请查看失败详情", true);
      statusText.textContent = "全部失败";
      break;
    case 5:
      showBanner("danger", "❌ 外部接口可能已变更，请更新程序或改用其他数据源", true);
      statusText.textContent = "接口变更";
      break;
    case 6:
      showBanner("warn", "⏹ 任务已取消，已完成的结果已保留", false);
      statusText.textContent = "已取消";
      break;
    default:
      showBanner("warn", `运行结束（退出码 ${code}）`, results.some((item) => item.status === "failed"));
      statusText.textContent = "完成";
      break;
  }
  const failedCount = results.filter((item) => item.status === "failed").length;
  appendLog(
    `运行结束：状态 ${event.status}，退出码 ${code}，成功 ${event.success}，失败 ${event.failed}，失败结果 ${failedCount}`,
    code === 0 ? "ok" : "warn",
  );
  if (event.failure_counts && Object.keys(event.failure_counts).length > 0) {
    const counts = Object.entries(event.failure_counts)
      .map(([kind, count]) => `${FAILURE_LABELS[kind] ?? kind}=${count}`)
      .join(", ");
    appendLog(`失败分类：${counts}`, "warn");
  }
  currentJob = "";
  statusJob.textContent = "";
  schedulePreflight();
}

/** 显示运行横幅。 */
function showBanner(kind: "success" | "warn" | "danger", text: string, details: boolean): void {
  runBannerText.textContent = text;
  runBanner.className = `run-banner ${kind}`;
  failureDetailsButton.classList.toggle("hidden", !details);
}

/** 生成失败详情文本。 */
function failureReport(): string {
  const failedRows = results.filter((item) => item.status === "failed");
  if (failedRows.length === 0) {
    return "本次运行没有可用的失败详情";
  }
  const lines: string[] = [];
  for (const item of failedRows) {
    lines.push(`== ${item.label} ==`);
    lines.push(`原因: ${item.kind ? FAILURE_LABELS[item.kind] ?? item.kind : "未知"}`);
    lines.push(`详情: ${item.detail || "无"}`);
    lines.push(`失败瓦片: ${item.failedTiles} 张`);
    const counts = Object.entries(item.counts)
      .map(([kind, count]) => `${FAILURE_LABELS[kind] ?? kind}=${count}`)
      .join(", ");
    lines.push(`分类: ${counts || "无"}`);
    lines.push(`元数据来源: ${item.metadataSource || "未知"}`);
    lines.push("示例:");
    if (item.samples.length === 0) {
      lines.push("  无");
    }
    for (const sample of item.samples) {
      const status = sample.http_status === null ? "" : ` HTTP ${sample.http_status}`;
      lines.push(`  [${sample.kind}]${status} ${sample.url}`);
      if (sample.detail) {
        lines.push(`    ${sample.detail}`);
      }
    }
    lines.push("");
  }
  const kinds = new Set(failedRows.map((item) => item.kind).filter(Boolean));
  for (const kind of kinds) {
    const advice = FAILURE_ADVICE[kind];
    if (advice) {
      lines.push(`建议（${FAILURE_LABELS[kind] ?? kind}）：${advice}`);
    }
  }
  return lines.join("\n");
}

/** 打开失败详情弹窗。 */
function openFailureDetails(): void {
  failureText.textContent = failureReport();
  failureModal.classList.remove("hidden");
}

// ---------- 地图选点 ----------

let leafletMap: L.Map | null = null;
let marker: L.Marker | null = null;
let pickedCoordinate: { lat: number; lon: number } | null = null;
let satelliteLayer: L.TileLayer | null = null;
let streetLayer: L.TileLayer | null = null;

/** 打开地图选点窗口。 */
function openMapPicker(): void {
  mapModal.classList.remove("hidden");
  const currentLat = Number(latInput.value);
  const currentLon = Number(lonInput.value);
  const lat = Number.isFinite(currentLat) && currentLat >= -90 && currentLat <= 90 ? currentLat : 35.6586;
  const lon = Number.isFinite(currentLon) && currentLon >= -180 && currentLon <= 180 ? currentLon : 139.7454;
  pickedCoordinate = null;
  mapCoordsEl.textContent = "未选择点位";
  if (leafletMap === null) {
    leafletMap = L.map("map", { zoomControl: true }).setView([lat, lon], 12);
    satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri, Maxar, Earthstar Geographics",
      },
    );
    streetLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors",
      },
    );
    satelliteLayer.addTo(leafletMap);
    leafletMap.on("click", (event: L.LeafletMouseEvent) => {
      setPickedCoordinate(event.latlng.lat, event.latlng.lng);
    });
    leafletMap.on("baselayerchange", () => {
      applyBasemapAttribution();
    });
  } else {
    leafletMap.setView([lat, lon], Math.max(leafletMap.getZoom(), 12));
    if (marker) {
      marker.remove();
      marker = null;
    }
  }
  applyBasemap();
  applyBasemapAttribution();
  window.setTimeout(() => {
    leafletMap?.invalidateSize();
  }, 50);
}

/** 设置地图上的选点标记。 */
function setPickedCoordinate(lat: number, lon: number): void {
  pickedCoordinate = { lat, lon };
  mapCoordsEl.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  if (!leafletMap) {
    return;
  }
  if (marker) {
    marker.setLatLng([lat, lon]);
  } else {
    marker = L.marker([lat, lon], {
      icon: L.divIcon({ className: "picker-marker", iconSize: [18, 18] }),
    }).addTo(leafletMap);
  }
}

/** 切换底图。 */
function applyBasemap(): void {
  if (!leafletMap || !satelliteLayer || !streetLayer) {
    return;
  }
  if (basemapSelect.value === "street") {
    if (leafletMap.hasLayer(satelliteLayer)) {
      leafletMap.removeLayer(satelliteLayer);
    }
    if (!leafletMap.hasLayer(streetLayer)) {
      streetLayer.addTo(leafletMap);
    }
  } else {
    if (leafletMap.hasLayer(streetLayer)) {
      leafletMap.removeLayer(streetLayer);
    }
    if (!leafletMap.hasLayer(satelliteLayer)) {
      satelliteLayer.addTo(leafletMap);
    }
  }
}

/** 刷新底图版权与地图归属文本。 */
function applyBasemapAttribution(): void {
  mapAttributionEl.textContent = basemapSelect.value === "street"
    ? "© Esri, HERE, Garmin, © OpenStreetMap contributors"
    : "© Esri, Maxar, Earthstar Geographics";
}

/** 确认地图选点。 */
function confirmMapPicker(): void {
  if (!pickedCoordinate) {
    showToast("请先在地图上点击选择点位", "error");
    return;
  }
  latInput.value = pickedCoordinate.lat.toFixed(6);
  lonInput.value = pickedCoordinate.lon.toFixed(6);
  refreshCoordinateHint();
  scheduleSave();
  mapModal.classList.add("hidden");
}

// ---------- 批量坐标 ----------

/** 预览坐标文件。 */
async function previewCoordinates(): Promise<void> {
  const path = coordsFileInput.value.trim();
  if (!path) {
    showToast("请先选择坐标文件", "error");
    batchBadge.textContent = "未选择文件";
    return;
  }
  batchBadge.textContent = "解析中...";
  try {
    const points = await TiffGetter.previewCoordinates(path);
    previewPoints = points;
    previewPath = path;
    previewFormat = path.toLowerCase().endsWith(".shp") ? "SHP" : "CSV";
    renderPreview();
    appendLog(`预览：解析到 ${points.length} 个坐标点`, points.length > 0 ? "ok" : "warn");
    scheduleSave();
  } catch (error) {
    previewPoints = [];
    previewPath = "";
    renderPreview();
    batchBadge.textContent = "解析失败";
    appendLog(`坐标解析失败：${String(error)}`, "error");
    showToast(`坐标解析失败：${String(error)}`, "error");
  }
}

/** 渲染坐标预览表。 */
function renderPreview(): void {
  previewTableBody.innerHTML = "";
  if (previewPoints.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = previewPath ? "坐标文件中没有可用坐标" : "选择坐标文件后点击预览";
    row.appendChild(cell);
    previewTableBody.appendChild(row);
    previewSummary.textContent = previewPath ? "解析结果为空" : "尚未解析坐标文件";
    batchBadge.textContent = previewPath ? "0 个点" : "待加载";
    return;
  }
  const limit = Math.min(previewPoints.length, 100);
  for (let index = 0; index < limit; index += 1) {
    const point = previewPoints[index]!;
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = point.name || point.id || `point-${index + 1}`;
    const latCell = document.createElement("td");
    latCell.textContent = point.lat.toFixed(6);
    const lonCell = document.createElement("td");
    lonCell.textContent = point.lon.toFixed(6);
    const sourceCell = document.createElement("td");
    sourceCell.textContent = previewFormat;
    row.append(nameCell, latCell, lonCell, sourceCell);
    previewTableBody.appendChild(row);
  }
  if (previewPoints.length > 100) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = `仅显示前 100 行，共 ${previewPoints.length} 个坐标`;
    row.appendChild(cell);
    previewTableBody.appendChild(row);
  }
  const suffix = previewPoints.length > 100 ? "（预览前 100 行）" : "";
  previewSummary.textContent = `共 ${previewPoints.length} 个坐标点${suffix}`;
  batchBadge.textContent = `共 ${previewPoints.length} 个点`;
}

// ---------- 清理 ----------

/** 扫描可清理残留。 */
async function scanCleanup(): Promise<void> {
  cleanupSummary.textContent = "扫描中...";
  try {
    const items = await TiffGetter.scanCleanup();
    cleanupRows = items.map((item) => ({ item, selected: false }));
    renderCleanup();
    const total = items.reduce((sum, item) => sum + item.size_bytes, 0);
    appendLog(`扫描：发现 ${items.length} 个可清理条目，共 ${formatSize(total)}`, items.length > 0 ? "warn" : "info");
  } catch (error) {
    cleanupSummary.textContent = "扫描失败";
    appendLog(`扫描失败：${String(error)}`, "error");
    showToast(`扫描失败：${String(error)}`, "error");
  }
}

/** 当前可见的清理条目。 */
function visibleCleanupRows(): CleanupRow[] {
  if (cleanupTempOnly.checked) {
    return cleanupRows.filter((row) => row.item.kind === "temp_tiles");
  }
  return cleanupRows;
}

/** 渲染清理表。 */
function renderCleanup(): void {
  cleanupTableBody.innerHTML = "";
  const rows = visibleCleanupRows();
  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = cleanupRows.length === 0 ? "点击“扫描残留”查看可清理项" : "没有符合“仅临时”条件的条目";
    row.appendChild(cell);
    cleanupTableBody.appendChild(row);
    cleanupSummary.textContent = cleanupRows.length === 0 ? "尚未扫描" : "0 个可见条目";
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    const checkCell = document.createElement("td");
    checkCell.className = "col-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = row.selected;
    checkbox.disabled = row.item.active;
    checkbox.title = row.item.active ? "使用中，不可选择" : "选择该条目";
    checkbox.addEventListener("change", () => {
      row.selected = checkbox.checked;
    });
    checkCell.appendChild(checkbox);
    const kindCell = document.createElement("td");
    kindCell.textContent = row.item.kind === "temp_tiles" ? "临时瓦片" : "历史日期";
    const statusCell = document.createElement("td");
    statusCell.textContent = row.item.active ? "使用中" : "可清理";
    statusCell.className = row.item.active ? "status-partial" : "status-success";
    const sizeCell = document.createElement("td");
    sizeCell.className = "num";
    sizeCell.textContent = formatSize(row.item.size_bytes);
    const timeCell = document.createElement("td");
    timeCell.textContent = formatTime(row.item.mtime);
    const pathCell = document.createElement("td");
    pathCell.textContent = row.item.path;
    pathCell.title = row.item.path;
    tr.append(checkCell, kindCell, statusCell, sizeCell, timeCell, pathCell);
    cleanupTableBody.appendChild(tr);
  }
  const visibleSize = rows.reduce((sum, row) => sum + row.item.size_bytes, 0);
  const selected = rows.filter((row) => row.selected && !row.item.active).length;
  cleanupSummary.textContent = `共 ${rows.length} 条 · ${formatSize(visibleSize)} · 已勾选 ${selected}`;
}

/** 全选可清理条目。 */
function selectAllCleanup(): void {
  for (const row of visibleCleanupRows()) {
    if (!row.item.active) {
      row.selected = true;
    }
  }
  renderCleanup();
}

/** 反选可清理条目。 */
function invertCleanup(): void {
  for (const row of visibleCleanupRows()) {
    if (!row.item.active) {
      row.selected = !row.selected;
    }
  }
  renderCleanup();
}

/** 按勾选执行清理。 */
async function executeCleanup(): Promise<void> {
  const selectedRows = cleanupRows.filter((row) => row.selected && !row.item.active);
  if (selectedRows.length === 0) {
    showToast("未勾选任何条目", "error");
    return;
  }
  const preview = selectedRows.slice(0, 20).map((row) => `  - ${row.item.path}`).join("\n");
  const more = selectedRows.length > 20 ? `\n  ... 还有 ${selectedRows.length - 20} 项` : "";
  const ok = await confirmDialog(
    "二次确认",
    `将永久删除 ${selectedRows.length} 个目录：\n${preview}${more}\n\n确认继续？`,
    "永久删除",
  );
  if (!ok) {
    return;
  }
  cleanupSummary.textContent = "清理中...";
  try {
    const result = await TiffGetter.runCleanup(
      selectedRows.map((row) => row.item.path),
      cleanupTempOnly.checked,
    );
    reportCleanup(result);
    await scanCleanup();
  } catch (error) {
    cleanupSummary.textContent = "清理失败";
    appendLog(`清理失败：${String(error)}`, "error");
    showToast(`清理失败：${String(error)}`, "error");
  }
}

/** 仅清理临时瓦片目录。 */
async function quickCleanTemp(): Promise<void> {
  const paths = cleanupRows
    .filter((row) => row.item.kind === "temp_tiles" && !row.item.active)
    .map((row) => row.item.path);
  if (paths.length === 0) {
    showToast("没有可清理的临时瓦片目录，请先扫描", "error");
    return;
  }
  const ok = await confirmDialog(
    "清理临时瓦片",
    `将清理 ${paths.length} 个临时瓦片目录。使用中的目录会被跳过。继续？`,
    "清理",
  );
  if (!ok) {
    return;
  }
  cleanupSummary.textContent = "清理中...";
  try {
    const result = await TiffGetter.runCleanup(paths, true);
    reportCleanup(result);
    await scanCleanup();
  } catch (error) {
    cleanupSummary.textContent = "清理失败";
    appendLog(`清理失败：${String(error)}`, "error");
    showToast(`清理失败：${String(error)}`, "error");
  }
}

/** 输出清理结果。 */
function reportCleanup(result: CleanupResult): void {
  appendLog(
    `清理完成：删除 ${result.deleted.length} 项，跳过 ${result.skipped.length} 项，失败 ${result.failed.length} 项`,
    result.failed.length > 0 ? "warn" : "ok",
  );
  for (const failure of result.failed) {
    appendLog(`  失败: ${failure.path} - ${failure.error}`, "error");
  }
  showToast(`清理完成：删除 ${result.deleted.length} 项`, result.failed.length > 0 ? "error" : "ok");
}

// ---------- 确认弹窗 ----------

/** 显示确认弹窗并返回用户选择。 */
function confirmDialog(title: string, message: string, okLabel: string): Promise<boolean> {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOk.textContent = okLabel;
  confirmModal.classList.remove("hidden");
  return new Promise<boolean>((resolve) => {
    const finish = (value: boolean): void => {
      confirmModal.classList.add("hidden");
      confirmOk.onclick = null;
      confirmCancel.onclick = null;
      resolve(value);
    };
    confirmOk.onclick = () => finish(true);
    confirmCancel.onclick = () => finish(false);
  });
}

// ---------- 事件绑定 ----------

/** 绑定数据源与主题控件。 */
function wireHeader(): void {
  sourceSelect.addEventListener("change", () => {
    applySource(sourceSelect.value, false);
  });
  themePairSelect.addEventListener("change", () => {
    themePair = themePairSelect.value;
    applyTheme();
    scheduleSave();
  });
  modeToggle.addEventListener("click", () => {
    themeMode = themeMode === "dark" ? "light" : "dark";
    applyTheme();
    scheduleSave();
  });
}

/** 绑定单点页控件。 */
function wireSingleTab(): void {
  latInput.addEventListener("input", refreshCoordinateHint);
  lonInput.addEventListener("input", refreshCoordinateHint);
  latInput.addEventListener("change", scheduleSave);
  lonInput.addEventListener("change", scheduleSave);
  $("#paste-coords").addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      const match = text.trim().match(/^([-0-9.]+)[,\s]+([-0-9.]+)$/);
      if (!match) {
        showToast("剪贴板内容不是“纬度, 经度”格式", "error");
        return;
      }
      const lat = Number(match[1]);
      const lon = Number(match[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        showToast("剪贴板坐标超出合法范围", "error");
        return;
      }
      latInput.value = lat.toFixed(6);
      lonInput.value = lon.toFixed(6);
      refreshCoordinateHint();
      scheduleSave();
    } catch (error) {
      showToast(`读取剪贴板失败：${String(error)}`, "error");
    }
  });
  $("#reset-coords").addEventListener("click", () => {
    latInput.value = defaults.lat;
    lonInput.value = defaults.lon;
    refreshCoordinateHint();
    scheduleSave();
  });
  $("#open-map").addEventListener("click", openMapPicker);
  $("#single-output-browse").addEventListener("click", async () => {
    const path = await TiffGetter.chooseDirectory();
    if (path) {
      singleOutputInput.value = path;
      singleOutputEdited = true;
      scheduleSave();
      schedulePreflight();
    }
  });
  singleOutputInput.addEventListener("input", () => {
    singleOutputEdited = true;
    scheduleSave();
  });
  singleOutputInput.addEventListener("change", schedulePreflight);
  zoomInput.addEventListener("change", () => {
    const info = currentSource();
    const value = Number(zoomInput.value);
    const clamped = Math.min(Math.max(value, info.min_zoom), info.max_zoom);
    if (clamped !== value) {
      zoomInput.value = String(clamped);
      appendLog(`zoom ${value} 超出 ${info.display_name} 范围，已截断为 ${clamped}`, "warn");
    }
    scheduleSave();
  });
  bufferInput.addEventListener("change", scheduleSave);
  dateStartInput.addEventListener("change", scheduleSave);
  dateEndInput.addEventListener("change", scheduleSave);
  dedupInput.addEventListener("change", scheduleSave);
  startSingleButton.addEventListener("click", () => {
    void startSingle();
  });
  stopSingleButton.addEventListener("click", () => {
    void stopJob();
  });
}

/** 绑定批量页控件。 */
function wireBatchTab(): void {
  $("#choose-coords").addEventListener("click", async () => {
    try {
      const path = await TiffGetter.chooseFile("coords");
      if (!path) {
        return;
      }
      coordsFileInput.value = path;
      previewPoints = [];
      previewPath = "";
      renderPreview();
      scheduleSave();
      await previewCoordinates();
    } catch (error) {
      showToast(`选择文件失败：${String(error)}`, "error");
    }
  });
  $("#preview-coords").addEventListener("click", () => {
    void previewCoordinates();
  });
  $("#export-template").addEventListener("click", async () => {
    try {
      const path = await TiffGetter.chooseFile("template");
      if (!path) {
        return;
      }
      await TiffGetter.exportTemplate(path);
      appendLog(`已导出坐标模板：${path}`, "ok");
      showToast("坐标模板已导出", "ok");
    } catch (error) {
      showToast(`导出模板失败：${String(error)}`, "error");
    }
  });
  $("#batch-output-browse").addEventListener("click", async () => {
    const path = await TiffGetter.chooseDirectory();
    if (path) {
      batchOutputInput.value = path;
      batchOutputEdited = true;
      scheduleSave();
      schedulePreflight();
    }
  });
  batchOutputInput.addEventListener("input", () => {
    batchOutputEdited = true;
    scheduleSave();
  });
  batchOutputInput.addEventListener("change", schedulePreflight);
  batchZoomInput.addEventListener("change", () => {
    const info = currentSource();
    const value = Number(batchZoomInput.value);
    const clamped = Math.min(Math.max(value, info.min_zoom), info.max_zoom);
    if (clamped !== value) {
      batchZoomInput.value = String(clamped);
      appendLog(`zoom ${value} 超出 ${info.display_name} 范围，已截断为 ${clamped}`, "warn");
    }
    scheduleSave();
  });
  for (const input of [batchBufferInput, batchConcurrencyInput, batchDateStartInput, batchDateEndInput]) {
    input.addEventListener("change", scheduleSave);
  }
  batchDedupInput.addEventListener("change", scheduleSave);
  startBatchButton.addEventListener("click", () => {
    void startBatch();
  });
  stopBatchButton.addEventListener("click", () => {
    void stopJob();
  });
}

/** 绑定清理页控件。 */
function wireCleanupTab(): void {
  $("#scan-cleanup").addEventListener("click", () => {
    void scanCleanup();
  });
  $("#quick-temp").addEventListener("click", () => {
    void quickCleanTemp();
  });
  $("#execute-cleanup").addEventListener("click", () => {
    void executeCleanup();
  });
  $("#select-all-cleanup").addEventListener("click", selectAllCleanup);
  $("#invert-cleanup").addEventListener("click", invertCleanup);
  cleanupTempOnly.addEventListener("change", renderCleanup);
}

/** 绑定全局日志、主题、标签与弹窗。 */
function wireShell(): void {
  for (const tab of document.querySelectorAll<HTMLButtonElement>(".tab")) {
    tab.addEventListener("click", () => {
      for (const item of document.querySelectorAll<HTMLButtonElement>(".tab")) {
        item.classList.toggle("active", item === tab);
      }
      const target = tab.dataset.tab ?? "single";
      for (const panel of document.querySelectorAll<HTMLElement>(".tab-panel")) {
        panel.classList.toggle("hidden", panel.id !== `tab-${target}`);
      }
      activeMode = target === "batch" ? "batch" : "single";
      if (target === "cleanup") {
        schedulePreflight();
      } else {
        schedulePreflight();
      }
    });
  }
  $("#clear-log").addEventListener("click", () => {
    logBody.innerHTML = "";
  });
  $("#copy-log").addEventListener("click", () => {
    copyText(logBody.innerText)
      .then(() => showToast("日志已复制", "ok"))
      .catch((error: unknown) => showToast(`复制失败：${String(error)}`, "error"));
  });
  autoScrollInput.addEventListener("change", () => {
    if (autoScrollInput.checked) {
      logBody.scrollTop = logBody.scrollHeight;
    }
  });
  failureDetailsButton.addEventListener("click", openFailureDetails);
  $("#close-failure").addEventListener("click", () => {
    failureModal.classList.add("hidden");
  });
  $("#copy-failure").addEventListener("click", () => {
    copyText(failureText.textContent ?? "")
      .then(() => showToast("失败详情已复制", "ok"))
      .catch((error: unknown) => showToast(`复制失败：${String(error)}`, "error"));
  });
  $("#map-cancel").addEventListener("click", () => {
    mapModal.classList.add("hidden");
  });
  $("#map-confirm").addEventListener("click", confirmMapPicker);
  basemapSelect.addEventListener("change", () => {
    applyBasemap();
    applyBasemapAttribution();
  });
  mapModal.addEventListener("click", (event) => {
    if (event.target === mapModal) {
      mapModal.classList.add("hidden");
    }
  });
  failureModal.addEventListener("click", (event) => {
    if (event.target === failureModal) {
      failureModal.classList.add("hidden");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      mapModal.classList.add("hidden");
      failureModal.classList.add("hidden");
    }
  });
}

// ---------- 启动 ----------

/** 应用持久化设置到界面。 */
function applyStoredSettings(): void {
  renderSources();
  renderThemeOptions();
  applyTheme();

  const info = sources.find((item) => item.name === settings.source) ?? sources[0]!;
  sourceSelect.value = info.name;
  latInput.value = settings.lat;
  lonInput.value = settings.lon;
  zoomInput.value = String(settings.zoom);
  batchZoomInput.value = String(settings.zoom);
  bufferInput.value = String(settings.buffer_radius_m);
  batchBufferInput.value = String(settings.buffer_radius_m);
  batchConcurrencyInput.value = String(settings.coord_concurrency);
  dedupInput.checked = settings.dedup;
  batchDedupInput.checked = settings.dedup;
  dateStartInput.value = settings.date_start;
  dateEndInput.value = settings.date_end;
  batchDateStartInput.value = settings.date_start;
  batchDateEndInput.value = settings.date_end;
  coordsFileInput.value = settings.last_coords_file;

  singleOutputEdited = settings.single_output !== "" && settings.single_output !== defaultSingleOutput(info);
  batchOutputEdited = settings.batch_output !== "" && settings.batch_output !== defaultBatchOutput(info);
  singleOutputInput.value = settings.single_output || defaultSingleOutput(info);
  batchOutputInput.value = settings.batch_output || defaultBatchOutput(info);

  refreshCoordinateHint();
  renderPreview();
  applySource(info.name, true);
}

/** 启动应用。 */
async function boot(): Promise<void> {
  wireHeader();
  wireSingleTab();
  wireBatchTab();
  wireCleanupTab();
  wireShell();
  events.fetch.on(handleEvent);
  applyStoredSettings();
  appendLog("就绪。选择数据源、填写坐标或加载坐标文件后开始。", "info");
}

await boot();
