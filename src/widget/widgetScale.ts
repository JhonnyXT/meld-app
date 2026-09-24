/** El tamaño real que un widget de Android termina teniendo en pantalla lo
 * decide el launcher del usuario (su propia grilla de celdas — confirmado
 * con logcat real en un Samsung: un widget "chico" (`targetCellWidth/
 * Height: 2`) terminó en 226dp de alto, bastante más que las ~172dp del
 * diseño de referencia). Sin escalar el
 * contenido a ese tamaño real, todo (íconos, tipografía, el círculo del
 * FAB, la fracción grande) queda chico y disperso en una caja más grande de
 * lo esperado — se ve "poco prolijo" en vez de una fila más cómoda y
 * legible, que es como se ve un widget bien pulido. Usado por los 4 tipos
 * de widget: `QuickAddAndroidWidget`/`ProgressAndroidWidget` (elemento
 * "hero" único) y `TodayAndroidWidget`/`HabitsAndroidWidget` (tipografía,
 * íconos Y el alto de fila que usa `pickVisibleItemCount` para decidir
 * cuántas filas entran — deben ir de la mano: si las filas se ven más
 * grandes, entran menos). */
const REFERENCE_SIZE_DP = 172;
const MIN_SCALE = 1;
const MAX_SCALE = 2.2;

export function widgetContentScale(widthDp: number | undefined, heightDp: number | undefined): number {
  const size = Math.min(widthDp ?? REFERENCE_SIZE_DP, heightDp ?? REFERENCE_SIZE_DP);
  return Math.max(MIN_SCALE, Math.min(size / REFERENCE_SIZE_DP, MAX_SCALE));
}
