import type { WatermarkPosition, WatermarkType } from "./watermark";

const POSITIONS: readonly WatermarkPosition[] = [
  "TOP_LEFT",
  "TOP_CENTER",
  "TOP_RIGHT",
  "MIDDLE_LEFT",
  "CENTER",
  "MIDDLE_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_CENTER",
  "BOTTOM_RIGHT",
];

export interface ParsedWatermarkFields {
  type: WatermarkType;
  text: string;
  position: WatermarkPosition;
  sizePercent: number;
  opacity: number;
  rotationDeg: number;
  marginPercent: number;
  logoFile: File | null;
}

/** Parses and clamps the watermark customization fields shared by the config-save and preview routes. */
export function parseWatermarkFields(form: FormData): ParsedWatermarkFields {
  const typeRaw = String(form.get("type") ?? "text").toLowerCase();
  const type: WatermarkType = typeRaw === "logo" ? "logo" : "text";

  const positionRaw = String(form.get("position") ?? "CENTER").toUpperCase();
  const position = (POSITIONS as readonly string[]).includes(positionRaw)
    ? (positionRaw as WatermarkPosition)
    : "CENTER";

  const num = (key: string, fallback: number, min: number, max: number) => {
    const raw = form.get(key);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };

  const logo = form.get("logo");

  return {
    type,
    text: String(form.get("text") ?? "").trim(),
    position,
    sizePercent: num("sizePercent", 40, 1, 100),
    opacity: num("opacity", 30, 0, 100) / 100,
    rotationDeg: num("rotation", -30, -359, 359),
    marginPercent: num("marginPercent", 4, 0, 40),
    logoFile: logo instanceof File && logo.size > 0 ? logo : null,
  };
}
