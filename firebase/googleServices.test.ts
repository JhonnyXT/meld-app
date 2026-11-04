import { webClientIdFrom } from './googleServices';

// Forma real de un google-services.json con dos apps Android en el mismo proyecto.
const json = {
  project_info: { project_id: 'meld-test-b197c' },
  client: [
    {
      client_info: { android_client_info: { package_name: 'app.meld.mobile.test' } },
      oauth_client: [
        { client_id: 'android-test.apps.googleusercontent.com', client_type: 1 },
        { client_id: 'web.apps.googleusercontent.com', client_type: 3 },
      ],
    },
    {
      client_info: { android_client_info: { package_name: 'app.meld' } },
      oauth_client: [{ client_id: 'web-prod.apps.googleusercontent.com', client_type: 3 }],
    },
  ],
};

describe('webClientIdFrom', () => {
  it('devuelve el cliente web (tipo 3) del paquete pedido', () => {
    expect(webClientIdFrom(json, 'app.meld.mobile.test')).toBe('web.apps.googleusercontent.com');
    expect(webClientIdFrom(json, 'app.meld')).toBe('web-prod.apps.googleusercontent.com');
  });

  it('undefined si el paquete no está o Google aún no se habilitó', () => {
    expect(webClientIdFrom(json, 'app.meld.mobile')).toBeUndefined();
    expect(
      webClientIdFrom(
        { client: [{ client_info: { android_client_info: { package_name: 'x' } }, oauth_client: [] }] },
        'x',
      ),
    ).toBeUndefined();
    expect(webClientIdFrom(null, 'x')).toBeUndefined();
  });
});
