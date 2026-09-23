import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { GOOGLE_CLIENT_ID_WEB } from '@/constants/env';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * SDK nativo de Google (Play Services en Android, GIDSignIn en iOS). El
 * Client ID que importa acá es el WEB, no el Android/iOS — el de Android
 * solo está registrado en Google Cloud Console por su package+SHA-1 (para
 * que Play Services verifique que la app que pide el login es la legítima),
 * nunca se referencia en código. Ver RIDER_SETUP.md §11 para el porqué.
 */
if (Platform.OS !== 'web') {
  GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_ID_WEB });
}

/**
 * Web: flujo de navegador de expo-auth-session, Authorization Code + PKCE —
 * anda bien en `expo start --web`, nunca dio problemas.
 *
 * Nativo (iOS/Android): NO usa esto — usa `signInNative()` más abajo, con
 * el SDK nativo de Google. Motivo (confirmado con el panel "detalles del
 * error" de la pantalla de bloqueo de Google, no una corazonada — ver
 * RIDER_SETUP.md §11): los Client ID tipo Android/iOS de Google no están
 * pensados para el flujo genérico de navegador
 * (`/o/oauth2/v2/auth?redirect_uri=...`) — Google rechaza ese request con
 * "Error 400: invalid_request" señalando el `redirect_uri` como inválido,
 * sea cual sea el scheme que se le mande (se probó tanto un scheme custom
 * cualquiera como el "Client ID invertido" que sugiere la documentación
 * vieja de Google — ninguno funciona). El único camino soportado de verdad
 * para esos Client ID es el SDK nativo (Play Services / GIDSignIn), que no
 * usa redirect_uri en absoluto — por eso el cambio de librería.
 */
export function useGoogleIdTokenWeb() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID_WEB,
      scopes: ['openid', 'profile', 'email'],
      // path fijo: sin esto, en web toma la ruta actual del navegador
      // (ej. /sign-in), que no siempre coincide con lo registrado en
      // Google Cloud Console → redirect_uri_mismatch.
      redirectUri: AuthSession.makeRedirectUri({ path: 'redirect' }),
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        nonce: String(Date.now()),
        prompt: 'select_account',
      },
    },
    discovery,
  );

  return { request, response, promptAsync };
}

/** Canje del `code` del redirect (web) por tokens reales — ver comentario del hook de arriba. */
export async function exchangeCodeForIdTokenWeb(
  request: AuthSession.AuthRequest,
  code: string,
): Promise<string> {
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: GOOGLE_CLIENT_ID_WEB,
      code,
      redirectUri: request.redirectUri,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    discovery,
  );

  if (!tokenResponse.idToken) {
    throw new Error('Google no devolvió id_token en el canje de código');
  }

  return tokenResponse.idToken;
}

/**
 * Nativo (iOS/Android): abre el picker nativo de cuentas de Google (Play
 * Services) — sin browser, sin WebView, sin Custom Tab. Devuelve `null` si
 * el usuario cerró el picker sin elegir cuenta (no es un error a mostrar).
 */
export async function signInNative(): Promise<string | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type === 'cancelled') {
    return null;
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google no devolvió id_token');
  }

  return idToken;
}
