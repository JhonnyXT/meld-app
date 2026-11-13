# 0008 — Los textos legales reflejan el producto actual; hay que revisarlos si cambia

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`src/legal/docs.ts` tiene los textos de Privacidad y Términos. Fueron escritos para describir
cómo funciona Meld en el momento en que se redactaron (plan Free 100% local, sin cuenta, sin
analíticas; dictado vía el reconocedor del sistema; Pro todavía sin lanzar).

## Riesgo si se olvida

Si cambia algo real del producto (sync en la nube, pagos, analíticas, cambio de proveedor de la
lista de espera) y no se actualizan estos textos (ni `UPDATED`), la política de privacidad/
términos publicados dejan de ser ciertos — un problema legal real, no solo de documentación.

**Nota en 2026-11**: la app mobile ya tiene sync opcional a Firebase para categorías compartidas
(ver `meld-app/CLAUDE.md` § "Categorías configurables" y `docs/decisions.md` / `docs/adr/`) — si
este texto todavía dice "sin cuenta, sin sync en la nube", conviene que el dueño del proyecto lo
revise contra el estado real del producto antes de publicar.

## Decisión

Los valores entre `[CORCHETES]` los completa el dueño del proyecto antes de publicar. Esto no es
asesoría legal: conviene que un profesional lo revise antes de publicar o de cualquier cambio de
fondo.

Código: `landing/src/legal/docs.ts`.
