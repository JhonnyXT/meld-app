/**
 * Lectura del `google-services.json` de Firebase. CommonJS a propósito: lo carga `app.config.ts`
 * al compilar, y el cargador de config de Expo transpila solo ese archivo, no los .ts que importa.
 * Tipos en `googleServices.d.ts`; tests en `googleServices.test.ts`.
 */

/** Tipo 3 = cliente OAuth "web", el que Firebase Auth acepta como audiencia del idToken. */
const WEB_CLIENT_TYPE = 3;

/**
 * `webClientId` del cliente web OAuth para `packageName`, que Google Sign-In (versión gratis) no
 * detecta solo. Existe solo después de habilitar Google en Authentication → Sign-in method.
 */
function webClientIdFrom(json, packageName) {
  const clients = (json && json.client) || [];
  const client = clients.find(
    (c) =>
      c.client_info &&
      c.client_info.android_client_info &&
      c.client_info.android_client_info.package_name === packageName,
  );
  const web = ((client && client.oauth_client) || []).find((o) => o.client_type === WEB_CLIENT_TYPE);
  return web ? web.client_id : undefined;
}

module.exports = { webClientIdFrom };
