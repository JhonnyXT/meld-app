# 0013 — La "X" de `QuickAddSheet` solo cierra, nunca borra

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`QuickAddSheet.tsx` (demo de Quick Add / detalle de ítem) tiene una "X" en el header, igual que la
app real.

## Decisión

La "X" únicamente cierra la hoja — nunca borra el ítem que se está editando. Borrar un ítem
existente es deslizar la fila en la lista (`DemoRow`), no un botón dentro de la hoja. Es fiel al
comportamiento real de `QuickAddSheet`/`ItemDetailSheet` de la app: "agregarle" una acción de
borrado a la X reintroduciría una diferencia con el comportamiento real que la demo busca replicar.

Código: `landing/src/demo/QuickAddSheet.tsx`.
