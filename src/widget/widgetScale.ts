const REFERENCE_SIZE_DP = 172;
const MIN_SCALE = 1;
const MAX_SCALE = 2.2;

export function widgetContentScale(widthDp: number | undefined, heightDp: number | undefined): number {
  const size = Math.min(widthDp ?? REFERENCE_SIZE_DP, heightDp ?? REFERENCE_SIZE_DP);
  return Math.max(MIN_SCALE, Math.min(size / REFERENCE_SIZE_DP, MAX_SCALE));
}
