import { parseVoiceInput } from './voiceParser';

// Miércoles 11 de noviembre de 2026 — fecha de referencia fija para que los tests sean
// deterministas (detectDate calcula "mañana"/"el lunes"/etc. relativo a `now`).
const NOW = new Date(2026, 10, 11);

describe('parseVoiceInput — tipo', () => {
  it('detecta un evento por palabra clave', () => {
    const r = parseVoiceInput('reunion con el equipo manana', 'es', NOW);
    expect(r.type).toBe('event');
  });

  it('detecta una nota por palabra clave', () => {
    const r = parseVoiceInput('nota sobre el proyecto', 'es', NOW);
    expect(r.type).toBe('note');
  });

  it('sin palabra clave, con fecha puntual, es una tarea por default', () => {
    const r = parseVoiceInput('llamar al dentista manana', 'es', NOW);
    expect(r.type).toBe('task');
  });

  it('sin tipo explícito pero con recurrencia diaria y sin fecha puntual, es un hábito', () => {
    const r = parseVoiceInput('leer 20 minutos todos los dias', 'es', NOW);
    expect(r.type).toBe('habit');
  });
});

describe('parseVoiceInput — fecha', () => {
  it('"hoy"', () => {
    expect(parseVoiceInput('comprar leche hoy', 'es', NOW).dateKey).toBe('2026-11-11');
  });

  it('"mañana"', () => {
    expect(parseVoiceInput('comprar leche manana', 'es', NOW).dateKey).toBe('2026-11-12');
  });

  it('"pasado mañana"', () => {
    expect(parseVoiceInput('comprar leche pasado manana', 'es', NOW).dateKey).toBe('2026-11-13');
  });

  it('"de/por la mañana" no se confunde con "mañana" (el día)', () => {
    expect(parseVoiceInput('llamar por la manana', 'es', NOW).dateKey).toBeNull();
  });

  it('el próximo día de la semana (hoy es miércoles)', () => {
    expect(parseVoiceInput('reunion el lunes', 'es', NOW).dateKey).toBe('2026-11-16');
  });

  it('sin ninguna señal de fecha, queda null', () => {
    expect(parseVoiceInput('comprar leche', 'es', NOW).dateKey).toBeNull();
  });
});

describe('parseVoiceInput — hora', () => {
  it('"a las 3" (heurística PM para horas 1-7 sin am/pm explícito)', () => {
    expect(parseVoiceInput('reunion a las 3', 'es', NOW).timeMinutes).toBe(15 * 60);
  });

  it('"a las 9 am"', () => {
    expect(parseVoiceInput('reunion a las 9 am', 'es', NOW).timeMinutes).toBe(9 * 60);
  });

  it('formato "15:30"', () => {
    expect(parseVoiceInput('reunion a las 15:30', 'es', NOW).timeMinutes).toBe(15 * 60 + 30);
  });

  it('mediodía y medianoche', () => {
    expect(parseVoiceInput('almuerzo al mediodia', 'es', NOW).timeMinutes).toBe(12 * 60);
    expect(parseVoiceInput('cena a medianoche', 'es', NOW).timeMinutes).toBe(0);
  });
});

describe('parseVoiceInput — prioridad, categoría y repetición', () => {
  it('prioridad alta por "urgente"', () => {
    expect(parseVoiceInput('entregar el informe urgente', 'es', NOW).priority).toBe('high');
  });

  it('categoría Work por "trabajo"', () => {
    expect(parseVoiceInput('reunion de trabajo manana', 'es', NOW).category?.label).toBe('Work');
  });

  it('repetición diaria para una tarea explícita', () => {
    expect(parseVoiceInput('tarea tomar la pastilla todos los dias', 'es', NOW).repeat).toBe('Daily');
  });

  it('sin tipo explícito y con recurrencia diaria, se infiere hábito con su propia repetición', () => {
    const r = parseVoiceInput('tomar la pastilla todos los dias', 'es', NOW);
    expect(r.type).toBe('habit');
    expect(r.repeat).toBe('Every day');
  });

  it('repetición "Weekdays" para un hábito', () => {
    expect(parseVoiceInput('ejercicio entre semana', 'es', NOW).repeat).toBe('Weekdays');
  });
});

describe('parseVoiceInput — limpieza de título', () => {
  it('quita el imperativo y los marcadores detectados, deja el núcleo capitalizado', () => {
    const r = parseVoiceInput('recuerdame llamar al dentista manana', 'es', NOW);
    expect(r.title).toBe('Llamar al dentista');
  });

  it('si queda vacío tras limpiar, usa el transcript crudo', () => {
    const r = parseVoiceInput('manana', 'es', NOW);
    expect(r.title.length).toBeGreaterThan(0);
    expect(r.transcript).toBe('manana');
  });
});
