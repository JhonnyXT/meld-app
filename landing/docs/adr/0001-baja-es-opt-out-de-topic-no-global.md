# 0001 — La baja de la lista de espera es un opt-out de topic, nunca global

**Fecha:** histórica (previa a esta limpieza).

## Contexto

Esta landing (`meld-app/landing`) comparte la cuenta de Resend con `my-wallet-app/landing`.
Las altas a la lista de espera de Meld se hacen en joblan (joblanstudio.com/?app=meld#avisame),
que escribe contactos en el topic `Meld — Lanzamiento` (id `53887fa0-e713-48da-91d3-80974e28e3fb`,
creado a mano en el dashboard de Resend el 2026-09-24; sobreescribible por env var
`RESEND_TOPIC_ID`). Esta landing solo implementa la BAJA, vía `/api/unsubscribe` →
`src/lib/waitlist.ts` → `unsubscribeEmail()`, pensada para el link "darte de baja" de un futuro
email de lanzamiento (al momento de esta nota ese email todavía no existe — esto es la
infraestructura, lista para cuando se envíe).

## Decisión

`unsubscribeEmail()` hace `PATCH /contacts/{email}/topics` con `subscription: 'opt_out'` sobre
ESE topic específico — nunca `unsubscribed: true` sobre el contacto completo. Marcar el contacto
como `unsubscribed` globalmente lo sacaría también de cualquier lista de `my-wallet-app`, si esa
persona usó el mismo email para ambos productos.

Si Resend responde 404 (el contacto no existe en ese topic), se trata como éxito igual: lo que le
importa a quien hace clic es "ya no estoy en la lista", y eso ya es cierto.

## Variables de entorno

`RESEND_API_KEY` es obligatoria. Sin ella: en desarrollo se loguea y no hace nada; en producción
lanza `WaitlistNotConfiguredError` en vez de fingir que la baja se procesó.

## Por qué el endpoint es GET y no POST

`/api/unsubscribe` se llega haciendo clic en el link "darte de baja" de un email (no hay
formulario propio en el sitio), así que tiene que responder a una navegación normal del
navegador — un POST no se dispara solo con un clic en un link.

Código: `landing/src/lib/waitlist.ts`, `landing/src/app/api/unsubscribe/route.ts`.
