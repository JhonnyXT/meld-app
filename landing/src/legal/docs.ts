// Textos de Privacidad y Términos. Reflejan cómo funciona Meld HOY (plan
// Free 100% local, sin cuenta, sin analíticas; dictado vía el reconocedor
// del sistema; Pro todavía sin lanzar). Si cambia algo de eso (sync en la
// nube, pagos, analíticas, proveedor de la lista de espera), actualizar
// estos textos y `UPDATED`.
//
// Los valores entre [CORCHETES] los completa el dueño del proyecto antes de
// publicar. No es asesoría legal: conviene que lo revise un profesional.

import type { Locale } from '@/i18n/config';

export type LegalSection = { h: string; p?: string[]; list?: string[] };
export type LegalDoc = { title: string; updated: string; intro: string[]; sections: LegalSection[] };

const CONTACT = '[TU EMAIL DE CONTACTO]';
const OWNER = '[NOMBRE O RAZÓN SOCIAL]';
const JURISDICTION = '[PAÍS / JURISDICCIÓN]';

const privacyEs: LegalDoc = {
  title: 'Política de privacidad',
  updated: 'Última actualización: 23 de septiembre de 2026',
  intro: [
    `Esta política explica qué datos maneja Meld (la app para iPhone y Android) y este sitio web, operados por ${OWNER} ("nosotros"). La versión corta: en el plan Free, todo lo que guardas en Meld se queda en tu teléfono y nosotros no lo vemos.`,
  ],
  sections: [
    {
      h: '1. Lo que guardas en la app se queda en tu teléfono',
      p: [
        'Tus tareas, eventos, hábitos, notas, notas de voz, fotos (Momentos), categorías y ajustes se guardan en una base de datos local dentro de tu dispositivo. No necesitas crear una cuenta y la app no envía ese contenido a ningún servidor nuestro.',
        'Si desinstalas la app o borras sus datos, ese contenido se elimina de forma permanente. En el plan Free no existe una copia en la nube, así que no podemos recuperarlo.',
      ],
    },
    {
      h: '2. Permisos que pide la app y para qué',
      list: [
        'Micrófono: para grabar notas de voz y para dictar ítems por voz. Solo se usa mientras grabas o dictas.',
        'Reconocimiento de voz: para convertir tu dictado en texto. Meld usa el reconocedor del sistema operativo (Google en Android, Apple en iOS). Según tu dispositivo y su configuración, ese servicio puede procesar el audio en sus propios servidores, bajo la política de privacidad de Google o Apple. Nosotros no recibimos ese audio ni el texto.',
        'Fotos y cámara: para agregar una foto a un día (Momentos). La foto queda en tu dispositivo.',
        'Notificaciones y alarmas exactas: para avisarte a la hora de tus recordatorios. Son notificaciones locales, programadas en tu teléfono.',
      ],
      p: ['Puedes negar o retirar cualquiera de estos permisos desde los ajustes de tu teléfono; solo dejará de funcionar la función que lo necesita.'],
    },
    {
      h: '3. Widgets y contador del ícono',
      p: [
        'Los widgets de la pantalla de inicio y el número de pendientes sobre el ícono leen los mismos datos locales de la app. No salen de tu dispositivo.',
      ],
    },
    {
      h: '4. Sin analíticas, sin publicidad, sin rastreo',
      p: [
        'La app no incluye herramientas de analítica, publicidad ni rastreo de terceros, y no vendemos ni compartimos datos personales.',
      ],
    },
    {
      h: '5. Este sitio web y la lista de espera',
      p: [
        'Si te unes a la lista de espera, guardamos solo tu email para avisarte cuando Meld esté disponible. No lo usamos para nada más y puedes pedir que lo borremos en cualquier momento escribiendo a ' +
          CONTACT +
          ' o usando el enlace para darte de baja que incluiremos en cada email.',
        'El email se guarda con un proveedor de envío de correos que actúa en nuestro nombre: Resend (resend.com). El sitio no usa cookies de rastreo ni analíticas; las fuentes tipográficas se sirven desde nuestro propio dominio.',
      ],
    },
    {
      h: '6. Plan Pro (próximamente)',
      p: [
        'Algunas funciones de Pro, como la sincronización y el respaldo en la nube o la conexión con Google Calendar, Outlook, Apple Health o Google Fit, sí requerirán procesar datos fuera de tu teléfono. Antes de lanzarlas actualizaremos esta política para explicar qué datos se procesan, dónde y cómo, y solo se activarán si tú lo eliges.',
      ],
    },
    {
      h: '7. Niños',
      p: ['Meld no está dirigida a menores de 13 años y no recopilamos a sabiendas datos de menores.'],
    },
    {
      h: '8. Tus derechos',
      p: [
        'Como el contenido de la app vive solo en tu dispositivo, tú tienes control total sobre él: puedes editarlo o borrarlo en cualquier momento. Para cualquier consulta sobre los datos de la lista de espera (acceso, corrección o eliminación), escríbenos a ' +
          CONTACT +
          '.',
      ],
    },
    {
      h: '9. Cambios a esta política',
      p: [
        'Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha de actualización. Si el cambio es importante, también lo avisaremos dentro de la app.',
      ],
    },
    { h: '10. Contacto', p: [`${OWNER} · ${CONTACT}`] },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'Last updated: September 23, 2026',
  intro: [
    `This policy explains what data Meld (the iPhone and Android app) and this website, operated by ${OWNER} ("we"), handle. The short version: on the Free plan, everything you save in Meld stays on your phone and we never see it.`,
  ],
  sections: [
    {
      h: '1. What you save in the app stays on your phone',
      p: [
        'Your tasks, events, habits, notes, voice memos, photos (Moments), categories and settings are stored in a local database on your device. You don’t need an account, and the app does not send that content to any server of ours.',
        'If you uninstall the app or clear its data, that content is permanently deleted. There is no cloud copy on the Free plan, so we cannot recover it.',
      ],
    },
    {
      h: '2. Permissions the app asks for, and why',
      list: [
        'Microphone: to record voice memos and to dictate items. Only used while you record or dictate.',
        'Speech recognition: to turn your dictation into text. Meld uses the operating system’s recognizer (Google on Android, Apple on iOS). Depending on your device and settings, that service may process the audio on its own servers under Google’s or Apple’s privacy policy. We never receive that audio or text.',
        'Photos and camera: to add a photo to a day (Moments). The photo stays on your device.',
        'Notifications and exact alarms: to remind you at the time you set. These are local notifications scheduled on your phone.',
      ],
      p: ['You can deny or revoke any of these permissions in your phone’s settings; only the feature that needs it will stop working.'],
    },
    {
      h: '3. Widgets and the icon badge',
      p: ['Home-screen widgets and the pending count on the app icon read the same local data. It never leaves your device.'],
    },
    {
      h: '4. No analytics, no ads, no tracking',
      p: ['The app includes no third-party analytics, advertising or tracking tools, and we do not sell or share personal data.'],
    },
    {
      h: '5. This website and the waitlist',
      p: [
        'If you join the waitlist, we store only your email to let you know when Meld is available. We use it for nothing else, and you can ask us to delete it at any time by writing to ' +
          CONTACT +
          ' or by using the unsubscribe link included in every email.',
        'Your email is stored with an email provider acting on our behalf: Resend (resend.com). The site uses no tracking cookies or analytics; fonts are served from our own domain.',
      ],
    },
    {
      h: '6. Pro plan (coming soon)',
      p: [
        'Some Pro features, such as cloud sync and backup or connecting Google Calendar, Outlook, Apple Health or Google Fit, will require processing data outside your phone. Before launching them we will update this policy to explain what data is processed, where and how, and they will only be turned on if you choose to.',
      ],
    },
    {
      h: '7. Children',
      p: ['Meld is not directed at children under 13, and we do not knowingly collect data from children.'],
    },
    {
      h: '8. Your rights',
      p: [
        'Because the app’s content lives only on your device, you are fully in control of it: you can edit or delete it at any time. For any request about your waitlist data (access, correction or deletion), write to ' +
          CONTACT +
          '.',
      ],
    },
    {
      h: '9. Changes to this policy',
      p: ['If we change this policy, we will post the new version here with its update date. If the change is significant, we will also let you know in the app.'],
    },
    { h: '10. Contact', p: [`${OWNER} · ${CONTACT}`] },
  ],
};

const termsEs: LegalDoc = {
  title: 'Términos y condiciones',
  updated: 'Última actualización: 23 de septiembre de 2026',
  intro: [
    `Estos términos regulan el uso de Meld (la app) y de este sitio web, ofrecidos por ${OWNER}. Al usar la app o el sitio, aceptas estos términos. Si no estás de acuerdo, no los uses.`,
  ],
  sections: [
    {
      h: '1. El servicio',
      p: [
        'Meld es un planificador diario para iPhone y Android que reúne tareas, eventos, hábitos, notas, notas de voz y fotos en una línea de tiempo por día.',
      ],
    },
    {
      h: '2. Plan Free',
      p: [
        'El plan Free es gratuito, no vence y no requiere cuenta. Te damos una licencia personal, no exclusiva e intransferible para usar la app en tus dispositivos.',
      ],
    },
    {
      h: '3. Plan Pro (cuando esté disponible)',
      list: [
        'Pro será una suscripción opcional, mensual o anual, con el precio que se muestre en la tienda de aplicaciones al momento de contratar.',
        'Podrá incluir una prueba gratuita; si no cancelas antes de que termine, se cobrará el período elegido.',
        'El cobro, la renovación automática, la cancelación y los reembolsos los gestiona la tienda donde contrates (App Store o Google Play), según sus propias condiciones. Puedes cancelar la renovación en cualquier momento desde los ajustes de tu cuenta de la tienda.',
        'Si cancelas, conservas Pro hasta el final del período ya pagado y luego vuelves al plan Free sin perder tu contenido local.',
      ],
    },
    {
      h: '4. Tu contenido',
      p: [
        'Todo lo que creas en Meld es tuyo. En el plan Free se guarda solo en tu dispositivo: eres responsable de conservarlo, y si desinstalas la app o pierdes el teléfono, se pierde con él. No tenemos acceso a ese contenido ni podemos recuperarlo.',
      ],
    },
    {
      h: '5. Uso aceptable',
      p: [
        'No puedes copiar, modificar, distribuir, vender ni hacer ingeniería inversa de la app, salvo lo que la ley permita expresamente, ni usarla para fines ilegales.',
      ],
    },
    {
      h: '6. Servicios de terceros',
      p: [
        'Algunas funciones dependen de servicios de terceros, como el reconocimiento de voz del sistema operativo o, en Pro, calendarios y apps de salud. Su uso se rige por las condiciones de esos terceros y no somos responsables de su funcionamiento.',
      ],
    },
    {
      h: '7. Recordatorios',
      p: [
        'Hacemos lo posible para que los recordatorios lleguen a tiempo, pero su entrega depende del sistema operativo y de la configuración de tu dispositivo (ahorro de batería, permisos, modo no molestar). No uses Meld como único aviso para asuntos críticos, como medicación o emergencias.',
      ],
    },
    {
      h: '8. Sin garantías',
      p: [
        'La app se ofrece "tal cual" y "según disponibilidad". En la medida en que la ley lo permita, no garantizamos que funcione sin interrupciones ni errores.',
      ],
    },
    {
      h: '9. Limitación de responsabilidad',
      p: [
        'En la medida máxima permitida por la ley, no seremos responsables de daños indirectos, pérdida de datos o lucro cesante derivados del uso de la app. Nuestra responsabilidad total no superará lo que hayas pagado por Meld en los 12 meses anteriores al reclamo.',
      ],
    },
    {
      h: '10. Cambios',
      p: [
        'Podemos actualizar la app y estos términos. Publicaremos la versión vigente aquí con su fecha; si el cambio es importante, lo avisaremos en la app. Seguir usando Meld después de un cambio implica aceptarlo.',
      ],
    },
    {
      h: '11. Ley aplicable',
      p: [`Estos términos se rigen por las leyes de ${JURISDICTION}, sin perjuicio de los derechos que te otorgue la ley de protección al consumidor de tu país.`],
    },
    { h: '12. Contacto', p: [`${OWNER} · ${CONTACT}`] },
  ],
};

const termsEn: LegalDoc = {
  title: 'Terms of Service',
  updated: 'Last updated: September 23, 2026',
  intro: [
    `These terms govern your use of Meld (the app) and this website, provided by ${OWNER}. By using the app or the site, you agree to these terms. If you don’t agree, please don’t use them.`,
  ],
  sections: [
    {
      h: '1. The service',
      p: ['Meld is a daily planner for iPhone and Android that brings tasks, events, habits, notes, voice memos and photos together on one timeline per day.'],
    },
    {
      h: '2. Free plan',
      p: ['The Free plan is free, never expires and requires no account. We grant you a personal, non-exclusive, non-transferable license to use the app on your devices.'],
    },
    {
      h: '3. Pro plan (once available)',
      list: [
        'Pro will be an optional monthly or yearly subscription, at the price shown in the app store when you subscribe.',
        'It may include a free trial; if you don’t cancel before it ends, the chosen period will be charged.',
        'Billing, auto-renewal, cancellation and refunds are handled by the store where you subscribe (App Store or Google Play) under its own terms. You can turn off renewal at any time in your store account settings.',
        'If you cancel, you keep Pro until the end of the paid period and then return to the Free plan without losing your local content.',
      ],
    },
    {
      h: '4. Your content',
      p: [
        'Everything you create in Meld is yours. On the Free plan it is stored only on your device: you are responsible for keeping it, and if you uninstall the app or lose your phone, it is lost with it. We have no access to that content and cannot recover it.',
      ],
    },
    {
      h: '5. Acceptable use',
      p: ['You may not copy, modify, distribute, sell or reverse engineer the app, except as expressly permitted by law, or use it for unlawful purposes.'],
    },
    {
      h: '6. Third-party services',
      p: [
        'Some features rely on third-party services, such as the operating system’s speech recognition or, on Pro, calendars and health apps. Their use is governed by those third parties’ terms and we are not responsible for how they work.',
      ],
    },
    {
      h: '7. Reminders',
      p: [
        'We do our best to deliver reminders on time, but delivery depends on the operating system and your device settings (battery saving, permissions, do not disturb). Don’t rely on Meld as your only reminder for critical matters such as medication or emergencies.',
      ],
    },
    {
      h: '8. No warranties',
      p: ['The app is provided "as is" and "as available". To the extent permitted by law, we do not guarantee it will be uninterrupted or error-free.'],
    },
    {
      h: '9. Limitation of liability',
      p: [
        'To the fullest extent permitted by law, we are not liable for indirect damages, data loss or lost profits arising from use of the app. Our total liability will not exceed what you paid for Meld in the 12 months before the claim.',
      ],
    },
    {
      h: '10. Changes',
      p: [
        'We may update the app and these terms. We will post the current version here with its date; if the change is significant, we will let you know in the app. Continuing to use Meld after a change means you accept it.',
      ],
    },
    {
      h: '11. Governing law',
      p: [`These terms are governed by the laws of ${JURISDICTION}, without prejudice to any rights you have under the consumer protection laws of your country.`],
    },
    { h: '12. Contact', p: [`${OWNER} · ${CONTACT}`] },
  ],
};

export const legalDocs: Record<'privacy' | 'terms', Record<Locale, LegalDoc>> = {
  privacy: { es: privacyEs, en: privacyEn },
  terms: { es: termsEs, en: termsEn },
};
