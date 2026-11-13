# 0016 — El gate de plan Pro en `ShareCategorySheet` no debe bloquear a un invitado

**Fecha:** histórica (sesión anterior) — bug real reportado por el usuario, 2026-11-06, probando
con dos cuentas reales.

## Contexto

T9 del roadmap: solo quien COMPARTE (convierte una categoría personal en espacio) necesita Pro —
un invitado, sea editor o lector, participa igual sin pagar nada.

## Problema

El gate bloqueaba por `plan !== 'pro'` sin mirar `alreadyShared`, así que un invitado Free ni
siquiera podía ver la lista de miembros o salir de la categoría compartida.

## Decisión

El gate de plan solo aplica cuando `!alreadyShared && plan !== 'pro'` (la categoría todavía NO es
un espacio — recién ahí hace falta Pro para convertirla). Una categoría ya compartida muestra
siempre la lista de miembros y las acciones de salir/eliminar, sin importar el plan de quien mira.

Código: `src/components/settings/ShareCategorySheet.tsx`.
