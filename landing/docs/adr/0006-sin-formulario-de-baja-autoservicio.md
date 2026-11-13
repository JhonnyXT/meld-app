# 0006 — Sin formulario de baja autoservicio (solo por link de email)

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`/[lang]/unsubscribed` es la página a la que redirige `/api/unsubscribe` tras procesar una baja
(ver también ADR 0001).

## Decisión

El sitio NO expone un formulario tipo "escribí tu email para darte de baja". La única forma de
llegar a este flujo es con el link de un email real que ya se le envió a ESA persona (con su email
en el query string). Un formulario autoservicio permitiría que cualquiera diera de baja el email
de otra persona sin su consentimiento, solo con saberlo.

No agregar un formulario de baja en el sitio sin resolver antes cómo confirmar que quien lo pide
es dueño de ese email (ej. doble opt-in por el mismo email).

Código: `landing/src/app/[lang]/unsubscribed/page.tsx`.
