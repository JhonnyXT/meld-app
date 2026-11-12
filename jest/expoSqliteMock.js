/** Mock mínimo de `expo-sqlite` para que `src/data/local/db.ts` sea importable bajo Jest (el
 * módulo real requiere el runtime nativo de Expo, inexistente en Node). Solo existe para que el
 * módulo cargue — las migraciones mismas se testean contra `better-sqlite3` en
 * `db.migrations.test.ts`, inyectando la conexión real a `initDb(conn)`. Un Proxy que devuelve una
 * función no-op para cualquier propiedad cubre lo que `drizzle-orm/expo-sqlite` llame al
 * construirse, sin tener que enumerar su API. */
function makeDummyConnection() {
  return new Proxy(
    {},
    {
      get: () => () => undefined,
    },
  );
}

module.exports = {
  openDatabaseSync: () => makeDummyConnection(),
};
