import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_WEB,
} from '@/constants/env';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

function clientIdParaPlataforma(): string {
  if (Platform.OS === 'ios') {
    return GOOGLE_CLIENT_ID_IOS;
  }
  if (Platform.OS === 'android') {
    return GOOGLE_CLIENT_ID_ANDROID;
  }
  return GOOGLE_CLIENT_ID_WEB;
}

/**
 * Flujo OAuth genérico de expo-auth-session (funciona en Expo Go, sin
 * development build) — ver DOCUMENTACION_RIDER.md. El id_token llega en
 * `response.params.id_token` (docs.expo.dev/versions/v57.0.0/sdk/auth-session).
 *
 * Ojo con Google y redirect_uri: en Expo Go, makeRedirectUri() genera un
 * exp://<ip-local>:<puerto>/--/... que Google normalmente NO acepta como
 * redirect URI registrada. Funciona confiable en `expo start --web`
 * (redirect http://localhost:<puerto>, sí aceptado por Google) — en
 * dispositivo/emulador nativo probablemente haga falta un development build
 * más adelante.
 */
export function useGoogleIdToken() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientIdParaPlataforma(),
      scopes: ['openid', 'profile', 'email'],
      // path fijo: sin esto, en web toma la ruta actual del navegador
      // (ej. /sign-in), que no siempre coincide con lo registrado en
      // Google Cloud Console → redirect_uri_mismatch.
      redirectUri: AuthSession.makeRedirectUri({ path: 'redirect' }),
      responseType: AuthSession.ResponseType.IdToken,
      // PKCE es solo para el flujo de código (response_type=code); con
      // IdToken (implícito) Google rechaza el request si viaja
      // code_challenge_method (Error 400: invalid_request).
      // PASOS paso 1, cliente se loguea y manda la solicitud de autorizacion,
      //  el code challenger y el metodo opcionalmente al servidor, 
      // 2. el servidor genera un codigo y lo manda a la aplicacion,
      //  3. ahora el usuario manda una solicitud de token, el codigo
      //  enviado por el servidor y el verificador de codigo,
      // 4. el servidor entonces tiene el verificador de codigo,
      //  el codigo "ticket", todo lo necesario, entonces con la misma 
      // funcion de hasheado, hashea al verificador de codigo, y lo
      //  compara con el code challenge, ya con eso estan aprobada la
      //  solicitud de token, y el token es devuelto, 
      usePKCE: false,
      extraParams: { nonce: String(Date.now()) },
    },
    discovery,
  );

  return { request, response, promptAsync };
}
