# 0009 — `addColumnIfMissing` antes del índice que la usa, siempre

**Fecha:** histórica (sesión anterior)

## Problema encontrado (bug real)

En `initDb()` (`src/data/local/db.ts`), crear un índice sobre una columna ANTES de asegurar que
esa columna existe rompía en un dispositivo con datos previos: el `CREATE TABLE IF NOT EXISTS` es
un no-op cuando la tabla ya existe (sin la columna nueva), así que crear el índice de
`category_id` antes de `addColumnIfMissing('day_items', 'category_id TEXT')` tiraba "no such
column: category_id" — y como ese `execSync` no está en try/catch (a diferencia de
`addColumnIfMissing`, que sí absorbe "duplicate column name"), **tiraba abajo `initDb()` entero**
sin terminar de migrar nada más.

Probado con los 42 ítems reales del usuario en el S24 Ultra — confirmado en `db.migrations.test.ts`
(caso "crear el índice de category_id no rompe aunque la tabla sea vieja").

## Decisión

Todo `CREATE INDEX`/`CREATE UNIQUE INDEX` sobre una columna que pudo no existir en una instalación
vieja va DESPUÉS del `addColumnIfMissing` correspondiente, nunca antes. Regla general para
cualquier migración nueva en `initDb()`.

Código: `src/data/local/db.ts`.
