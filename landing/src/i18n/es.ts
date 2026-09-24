// Textos de la landing en español (idioma por defecto). `en.ts` debe tener
// exactamente la misma forma — el tipo `Dictionary` sale de este archivo.
// Español neutro, sin voseo ("elige", "únete"), igual que la app.

export const es = {
  meta: {
    title: 'Meld — Todo tu día. Una sola app.',
    description:
      'Tareas, eventos, notas, notas de voz, fotos y hábitos en una sola línea de tiempo. Gratis para siempre, sin cuenta y sin internet.',
  },
  nav: {
    language: 'Idioma',
    openMenu: 'Abrir menú de secciones',
    closeMenu: 'Cerrar menú de secciones',
    prev: 'Sección anterior',
    next: 'Sección siguiente',
    joined: 'En la lista',
    join: 'Unirme',
    sections: {
      top: 'Inicio',
      funciones: 'Funciones',
      voz: 'Por voz',
      momentos: 'Momentos',
      habitos: 'Hábitos',
      detalles: 'Detalles',
      pantallas: 'Pantallas',
      planes: 'Planes',
    },
  },
  hero: {
    iconAlt: 'Ícono de Meld',
    title1: 'Todo tu día.',
    title2: 'Una sola app.',
    subtitle:
      'Tareas, eventos, notas, notas de voz, fotos y hábitos, en una sola línea de tiempo. Para que nada se quede en otra app.',
    finePrint: 'Sin cuenta. Sin registro. Todo se queda en tu teléfono.',
    freeForever: 'Gratis para siempre',
    widgetsNote: 'Widgets en tu inicio',
  },
  waitlist: {
    label: 'Avísame cuando Meld esté disponible',
    placeholder: 'tu@email.com',
    submit: 'Unirme a la lista',
    sending: 'Enviando…',
    success: '¡Estás dentro!',
    successDetail: 'Te escribiremos a {email} el día del lanzamiento. Nada más.',
    onList: 'Estás en la lista',
    change: 'Cambiar',
    invalid: 'Revisa tu email, parece que falta algo.',
    error: 'No pudimos guardar tu email. Inténtalo de nuevo en un momento.',
  },
  phone: {
    work: 'Trabajo',
    personal: 'Personal',
  },
  types: {
    titleA: 'Seis cosas,',
    titleB: 'una sola línea',
    subtitle: 'Todo lo que haces en el día vive en el mismo lugar, en el orden en que pasa.',
    healthNote: 'Hábitos de salud: ponle una meta de pasos, sueño o entrenamiento',
    items: {
      task: {
        row: 'Revisar números del Q3',
        title: 'Tareas',
        desc: 'Lo que tienes que hacer, con un recordatorio que sí llega. Prioridad, categoría y enlace incluidos. Si no la terminas, mañana aparece sola.',
      },
      event: {
        row: 'Almuerzo con Ana',
        title: 'Eventos',
        desc: 'Tus citas, en el día en que pasan. Con duración, repetición y un aviso a tiempo para llegar.',
      },
      voice: {
        row: 'Idea para la intro',
        title: 'Notas de voz',
        desc: 'Dos toques y la idea queda guardada. Pausa, reanuda y escúchala sin salir de tu lista.',
      },
      moment: {
        row: 'Tarde en el lago',
        title: 'Momentos',
        desc: 'Una foto guardada en el día en que pasó, no perdida en el carrete.',
      },
      note: {
        row: 'Empacar el cargador',
        title: 'Notas',
        desc: 'Texto con título y cuerpo, guardado bajo su día. Ponle una hora y deja de ser algo que se olvida.',
      },
      habit: {
        row: '10.000 pasos',
        title: 'Hábitos',
        desc: 'Una racha que vive en tu día, no en otra app. Todos los días, días de semana o 3 veces por semana.',
      },
    },
  },
  voice: {
    eyebrow: 'Agregar por voz',
    title: 'Dilo, y queda agendado',
    subtitle:
      'Toca +, habla y Meld llena el tipo, el día, la hora, la prioridad y la categoría. Tú solo confirmas.',
    bullets: [
      'Funciona sin conexión, en español e inglés',
      'Dicta también el título de cualquier ítem',
      '¿Prefieres escribir? Quick Add en un toque',
    ],
    understood: 'Meld entendió',
    examples: [
      {
        quote: 'Gym mañana a las 7 am, prioridad alta',
        type: 'task',
        chips: ['Tarea · Gym', 'Mañana', '7:00 AM'],
        priority: 'Alta',
      },
      {
        quote: 'Reunión con Ana el viernes a las 4',
        type: 'event',
        chips: ['Evento · Reunión con Ana', 'Viernes', '4:00 PM'],
        priority: null,
      },
      {
        quote: 'Leer 20 minutos todos los días',
        type: 'habit',
        chips: ['Hábito · Leer 20 minutos', 'Todos los días'],
        priority: null,
      },
    ] as { quote: string; type: 'task' | 'event' | 'habit'; chips: string[]; priority: string | null }[],
  },
  moments: {
    titleA: 'Guarda',
    chip: 'un momento',
    titleB: 'al día',
    subtitle:
      'Una foto guardada en el día en que pasó. Al final del mes, tu calendario se lee como un diario.',
    cards: [
      { place: 'Santorini', date: 'Sep 3', alt: 'Casas blancas y cúpulas azules de Oia, en Santorini, Grecia' },
      { place: 'Kioto', date: 'Sep 9', alt: 'Templo Higashi-Honganji reflejado en un estanque, en Kioto, Japón' },
      { place: 'Lago Moraine', date: 'Sep 16', alt: 'Lago Moraine rodeado de montañas nevadas, en Canadá' },
      { place: 'Fitz Roy', date: 'Sep 22', alt: 'Cerro Fitz Roy sobre una laguna, en la Patagonia' },
    ],
    photos: 'Fotos',
    publicDomain: 'dominio público',
    via: 'vía Wikimedia Commons',
  },
  habits: {
    titleA: 'Hábitos que',
    titleB: 'se sostienen',
    subtitle: 'Racha, progreso semanal y el mapa de tu año, calculados con lo que de verdad hiciste.',
    habitName: 'Meditar · 2026',
    done: 'Cumplido',
    missed: 'Pendiente',
    heatmapLabel: 'Mapa del año: días cumplidos y pendientes',
    stats: [
      { value: '12', label: 'días de racha' },
      { value: '4/5', label: 'esta semana' },
      { value: '78%', label: 'del año' },
    ],
  },
  built: {
    title: 'Hecha como debe ser',
    items: {
      overdue: { t: 'Nada se pierde', d: 'Lo que no terminaste pasa solo a hoy, no a una pila.' },
      quickAdd: { t: 'Agregar en dos toques', d: 'Un botón para todo: escríbelo o díctalo.' },
      widgets: { t: 'Widgets', d: 'Marca tareas y hábitos desde la pantalla de inicio.' },
      badge: { t: 'Pendientes en el ícono', d: 'Un número sobre el ícono: lo que te falta hoy.' },
      drag: { t: 'Arrastra la hora', d: 'Desliza sobre la pantalla y la hora cambia de 15 en 15.' },
      categories: { t: 'Tus categorías', d: 'Crea las tuyas, con ícono y color.' },
      theme: { t: 'Claro, oscuro y tu color', d: 'Se adapta al sistema y a tu acento.' },
      language: { t: 'Español e inglés', d: 'Toda la app, y también el dictado.' },
      privacy: { t: 'Privado por diseño', d: 'Sin cuenta, sin servidor, sin internet.' },
    },
  },
  screens: {
    title: 'Míralo en tu teléfono',
    subtitle: 'Cuatro pantallas de la app, tal como se ve.',
    prev: 'Pantalla anterior',
    next: 'Pantalla siguiente',
    goTo: 'Ir a la pantalla',
    items: [
      { a: 'Todo tu día.', b: 'Una sola app.', alt: 'Pantalla Hoy de Meld' },
      { a: 'Captura rápido,', b: 'clasifica después', alt: 'Bandeja de entrada de Meld' },
      { a: 'El mes entero,', b: 'de un vistazo', alt: 'Vista de mes del calendario de Meld' },
      { a: 'Una foto', b: 'para cada día', alt: 'Pantalla Momentos de Meld' },
    ],
  },
  plans: {
    title: 'Gratis para siempre',
    subtitle: 'El plan Free es la app completa y no vence. Pro suma lo avanzado cuando lo necesites.',
    free: {
      name: 'Free',
      price: '$0',
      per: 'Para siempre, sin cuenta',
      items: [
        'Los 6 tipos, sin límite',
        'Hábitos con racha y mapa del año',
        'Agregar por voz y por texto',
        'Calendario Mes, Semana y Año',
        'Recordatorios exactos',
        'Widgets y contador en el ícono',
      ],
    },
    pro: {
      name: 'Pro',
      soon: 'Próximamente',
      price: '$7.99',
      per: '/mes',
      alt: 'o $59.99/año · 14 días de prueba',
      items: {
        health: { t: 'Hábitos con Salud', d: 'Se marcan solos al conectar Apple Health o Google Fit.' },
        sync: { t: 'Sync y respaldo en la nube', d: 'Tu día en todos tus dispositivos, siempre respaldado.' },
        calendars: { t: 'Google Calendar y Outlook', d: 'Tu calendario de trabajo, dentro de tu día.' },
        ai: { t: 'Agregar con IA', d: 'Varios ítems en una sola frase, y un resumen de tu día.' },
        focus: { t: 'Pomodoro', d: 'Enfócate en una tarea sin salir de Meld.' },
        widgets: { t: 'Widgets avanzados', d: 'Más tamaños, configurables, y Live Activities.' },
      },
    },
  },
  cta: {
    titleA: 'Cinco apps menos.',
    titleB: 'Un día más claro.',
    note: 'Te avisamos el día del lanzamiento. Nada más.',
  },
  legal: {
    back: 'Volver al inicio',
  },
  unsubscribe: {
    title: 'Baja de la lista',
    okTitle: 'Listo, te diste de baja',
    okBody: 'Ya no recibirás nuestro email de lanzamiento. Si te arrepientes, puedes anotarte de nuevo cuando quieras.',
    errorTitle: 'No pudimos procesar la baja',
    errorBody: 'Escríbenos y lo hacemos manualmente mientras tanto.',
    backHome: 'Ir al inicio',
  },
  footer: {
    privacy: 'Privacidad',
    terms: 'Términos',
    support: 'Soporte',
    rights: '© 2026 Meld',
  },
};

export type Dictionary = typeof es;
