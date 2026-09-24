# Meld — landing

Landing page de Meld (Next.js 16, App Router, Tailwind v4). Proyecto npm
aparte de la app de Expo: tiene su propio `package.json`/`node_modules`, y el
Metro/`tsconfig` de la raíz lo ignoran.

```bash
cd landing
npm install
npm run dev          # http://localhost:3000 → redirige a /es o /en
npm run build && npm start
```

- **Idiomas**: todo el texto vive en `src/i18n/es.ts` (el tipo sale de ahí) y
  `src/i18n/en.ts`. `src/proxy.ts` redirige `/` al idioma del navegador;
  solo existen `/es` y `/en` (páginas estáticas).
- **Secciones**: `src/components/sections/*`, en el orden de `src/app/[lang]/page.tsx`.
  La barra flotante (`DockBar`) usa los `id` de cada sección.
- **Lista de espera**: `POST /api/waitlist` → `src/lib/waitlist.ts` → crea un
  contacto en **Resend** (`POST https://api.resend.com/contacts`). Variables:
  `RESEND_API_KEY` (obligatoria) y `RESEND_SEGMENT_ID` (opcional), ver
  `.env.example`. Sin la key: en dev solo loguea; en producción responde 503
  (nunca finge que guardó). Tiene un campo trampa `website` contra bots.
- **Portada interactiva = la pantalla Hoy de la app funcionando en el
  navegador** (`src/demo/`): agregar los 5 tipos con Quick Add (tarea,
  evento, nota de voz grabada de verdad con `MediaRecorder`, nota, hábito),
  "Por voz" con el reconocimiento de voz del navegador + el MISMO parser de
  la app (`src/demo/voiceParser.ts` es una copia de `src/domain/voiceParser.ts`
  — si se mejora allá, copiar acá), completar con Deshacer, tocar para
  editar, deslizar para borrar, ‹ › para cambiar de día, buscar, agrupar por
  tipo, recordatorios (⋯) y el menú ☰ (las otras pantallas avisan que están
  en la app). Los widgets Hoy/Hábitos de la portada comparten el mismo
  estado (`useDemo`). **Solo en memoria**: al recargar vuelve a los datos de
  ejemplo (decisión explícita).
- **Quick Add fiel al diseño real** (`src/demo/QuickAddSheet.tsx` +
  `src/demo/quickAdd/`, 2026-09-24 a pedido explícito "que sea exactamente
  el diseño que tenemos en la app"): switch de tipo con thumb deslizante
  (`TypeTabs.tsx`), caja de título con dictado por voz en vivo, UNA sola
  tarjeta de configuración con filas divididas por `border-b` (no varias
  cajas sueltas), acordeones colapsados para Categoría/Prioridad/presets
  fijos (Repetir, Alerta previa, Frecuencia/Hora preferida de hábito —
  `FieldParts.tsx`), pickers de rueda con scroll-snap para hora/duración
  (`WheelColumn.tsx`, `TimePickerModal.tsx`, `DurationPickerModal.tsx`) y un
  calendario de mes para el día (`DatePickerModal.tsx`), enlace para
  tarea/evento, y auto-registro de hábito con las 15 métricas de salud en 3
  grupos (`healthMetrics.ts`, `AutoTrackModal.tsx`, modal-sobre-modal igual
  que en la app). La "X" solo cierra, nunca borra — borrar un ítem existente
  sigue siendo deslizar la fila en la lista (`DemoRow.tsx`), no hay botón de
  borrar dentro de la hoja. `dateFormat.ts` existe aparte (no dentro de
  `DemoPhone.tsx`) para que `QuickAddSheet.tsx` pueda usar `dayTitle` sin
  crear un import circular entre los dos archivos.
- **Baja de la lista**: `GET /api/unsubscribe?email=…&lang=es` (piensa en
  ser el link "darte de baja" de un futuro email, no un formulario del
  sitio — a propósito, no queremos invitar a que cualquiera dé de baja a
  cualquiera) → `unsubscribeEmail` en `src/lib/waitlist.ts`
  (`PATCH /contacts/{email}` en Resend) → redirige a
  `/[lang]/unsubscribed` con la confirmación. Probado de punta a punta
  contra Resend real (crear contacto de prueba → dar de baja → verificar
  `unsubscribed:true` → borrar el contacto de prueba). **Todavía no hay
  ningún email real que use este link** — es la infraestructura, lista para
  cuando se arme el email de lanzamiento (Resend Broadcasts); ahí hay que
  incluir `https://<dominio>/api/unsubscribe?email={{email}}&lang=es` (o
  `en`) en el pie del email.
- **Privacidad y Términos**: `/[lang]/privacy` y `/[lang]/terms`, textos en
  `src/legal/docs.ts` (es + en). Describen la app TAL COMO ES HOY (Free 100%
  local, sin analíticas, dictado vía el reconocedor del sistema, Pro sin
  lanzar): si eso cambia, actualizar el texto y la fecha. Tienen
  marcadores `[NOMBRE O RAZÓN SOCIAL]`, `[TU EMAIL DE CONTACTO]`,
  `[PAÍS / JURISDICCIÓN]` y `[NOMBRE DEL PROVEEDOR]` para completar; no es
  asesoría legal, conviene que lo revise un profesional.
- **Animaciones**: `StackedCards` apila las 6 tarjetas de tipos al hacer
  scroll (sticky + achicado/oscurecido por JS en cada evento de scroll);
  Momentos tiene hover por foto (CSS, `group-has`); el carrusel de
  pantallas es centrado con snap para que las flechas siempre tengan algo
  que mover.
- **Desplegado**: proyecto `meld-landing` en Vercel (org
  `jonathanblandon1017-5123s-projects`), enlazado con `vercel link` — ver
  `.vercel/project.json` (no se commitea). `RESEND_API_KEY` y
  `NEXT_PUBLIC_SITE_URL` ya cargadas en Production y Preview. URL actual:
  `https://meld-landing-ashy.vercel.app` (alias `*.vercel.app`, sin dominio
  propio todavía).
- **Pendiente**: dominio propio (ver "Dominio y verificación de Resend"
  abajo), completar los marcadores legales en `src/legal/docs.ts`, enlace de
  Soporte real (`Footer.tsx`) y una imagen Open Graph propia (hoy usa el
  ícono).

## Dominio y verificación de Resend

Sin dominio propio: el sitio vive en `*.vercel.app` y los emails de la lista
de espera salen del dominio de prueba de Resend (`onboarding@resend.dev` o
similar) — funciona, pero con más chance de caer en spam y sin una dirección
"@meld.app" propia.

Pasos para cuando haya un dominio:

1. **Comprar el dominio** — lo más simple es desde el mismo proyecto en
   Vercel (`vercel domains buy <dominio>`, o Dashboard → Domains → Buy),
   porque el DNS del dominio del SITIO queda auto-gestionado por Vercel sin
   tocar nada más. Si se compra en otro proveedor (Namecheap, GoDaddy, etc.),
   apuntar sus nameservers a Vercel o agregar el registro que indique
   `vercel domains add <dominio>`.
2. **Verificar el dominio en Resend** — `POST https://api.resend.com/domains`
   con `{"name": "<dominio>"}` devuelve los registros DNS exactos a agregar
   (SPF vía MX, DKIM vía TXT/CNAME, y opcionalmente DMARC) — son ÚNICOS por
   dominio, hay que pedirlos a la API/dashboard de Resend en el momento, no
   se pueden adivinar. Si el dominio ya vive en Vercel DNS, esos registros se
   agregan igual ahí (Dashboard → Domains → el dominio → DNS Records).
   Verificación automática, unos minutos una vez que el DNS propaga.
3. Actualizar `[NOMBRE DEL PROVEEDOR]`... en realidad ya dice "Resend" en
   `src/legal/docs.ts` — revisar igual `[TU EMAIL DE CONTACTO]` para que sea
   una dirección real del dominio nuevo (p. ej. `hola@<dominio>`).
4. Actualizar `NEXT_PUBLIC_SITE_URL` en Vercel al dominio propio y volver a
   desplegar (`vercel env rm/add` + `vercel deploy --prod`).

## Gotcha: animaciones con `@keyframes`

Tailwind v4 **elimina del CSS final** los `@keyframes` declarados dentro de
`@theme` que ninguna clase de Tailwind usa (vía `--animate-*`). Si una
animación se usa desde un estilo en línea (`style={{ animation: 'x …' }}`),
su `@keyframes` tiene que ir FUERA de `@theme`, en `globals.css` normal — si
no, desaparece en silencio del build y el elemento queda quieto (pasó con el
check de la lista de espera, las barras de voz y la barra de Deshacer).
Verificar con: `grep -l "@keyframes <nombre>" .next/static/chunks/*.css`.
