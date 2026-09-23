import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Alert, Platform } from 'react-native';

import {
  type AuthUser,
  loginWithGoogle,
  logout as logoutClient,
  restoreSession,
} from './auth-client';
import { exchangeCodeForIdTokenWeb, signInNative, useGoogleIdTokenWeb } from './google-auth';

interface SessionContextValue {
  user: AuthUser | null;
  /** Restaurando sesión guardada al abrir la app. */
  isLoading: boolean;
  /** Esperando que el usuario complete el login de Google. */
  isSigningIn: boolean;
  /** El request de Google todavía no terminó de armarse (deshabilita el botón). Solo aplica a web — en nativo siempre es true. */
  canSignIn: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
  /** Limpia la sesión en memoria sin pegarle a /auth/logout — para cuando el refresh ya falló. */
  clearLocalSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Se llama siempre (hooks no pueden ser condicionales), pero solo se USA
  // en web — en nativo el login es imperativo (signInNative), sin
  // request/response/promptAsync.
  const { request, response, promptAsync } = useGoogleIdTokenWeb();

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  // Solo web: reacciona al redirect de vuelta con el `code` y lo canjea.
  useEffect(() => {
    if (Platform.OS !== 'web' || !response) {
      return;
    }

    if (response.type === 'success' && response.params.code) {
      if (!request) {
        // No debería pasar (si hubo response, el request que lo generó ya
        // existió), pero sin request no hay code_verifier para canjear.
        return;
      }
      setIsSigningIn(true);
      exchangeCodeForIdTokenWeb(request, response.params.code)
        .then((idToken) => loginWithGoogle(idToken))
        .then(setUser)
        .catch(() => Alert.alert('No se pudo iniciar sesión', 'Intentá de nuevo.'))
        .finally(() => setIsSigningIn(false));
      return;
    }

    if (response.type === 'error') {
      Alert.alert(
        'No se pudo iniciar sesión',
        response.error?.message ?? 'Error desconocido de Google',
      );
    }
  }, [response, request]);

  async function signIn() {
    if (Platform.OS === 'web') {
      void promptAsync();
      return;
    }

    setIsSigningIn(true);
    try {
      const idToken = await signInNative();
      if (!idToken) {
        // Usuario cerró el picker de cuentas sin elegir — no es error.
        return;
      }
      setUser(await loginWithGoogle(idToken));
    } catch {
      Alert.alert('No se pudo iniciar sesión', 'Intentá de nuevo.');
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    await logoutClient();
    setUser(null);
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading,
        isSigningIn,
        canSignIn: Platform.OS === 'web' ? !!request : true,
        signIn: () => void signIn(),
        signOut,
        clearLocalSession: () => setUser(null),
      }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return context;
}
