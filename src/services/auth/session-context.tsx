import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Alert } from 'react-native';

import {
  type AuthUser,
  loginWithGoogle,
  logout as logoutClient,
  restoreSession,
} from './auth-client';
import { useGoogleIdToken } from './google-auth';

interface SessionContextValue {
  user: AuthUser | null;
  /** Restaurando sesión guardada al abrir la app. */
  isLoading: boolean;
  /** Esperando que el usuario complete el login de Google. */
  isSigningIn: boolean;
  /** El request de Google todavía no terminó de armarse (deshabilita el botón). */
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
  const { request, response, promptAsync } = useGoogleIdToken();

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === 'success' && response.params.id_token) {
      setIsSigningIn(true);
      loginWithGoogle(response.params.id_token)
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
  }, [response]);

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
        canSignIn: !!request,
        signIn: () => void promptAsync(),
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
