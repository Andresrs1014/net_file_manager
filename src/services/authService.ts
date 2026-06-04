/**
 * authService — Gestiona la sesión con la intranet ZYMO.
 *
 * El token JWT NUNCA vive en el renderer / localStorage.
 * Se guarda cifrado en el proceso main (userData/zymo-auth.json) y se
 * accede sólo via IPC.
 */

export interface ZymoUser {
  id:        number;
  email:     string;
  full_name: string | null;
  role:      string;
  area:      string | null;
  sede:      string | null;
  app_permissions?: string[];
}

export interface AuthSession {
  loggedIn:    boolean;
  user:        ZymoUser | null;
  intranetUrl: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipc = () => (window.electronAPI as any);

export async function loginToIntranet(
  intranetUrl: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; user?: ZymoUser }> {
  return ipc().auth.login(intranetUrl, email, password);
}

export async function logoutFromIntranet(): Promise<void> {
  await ipc().auth.logout();
}

/** Lee la sesión guardada del proceso main (no hace petición HTTP). */
export async function getStoredSession(): Promise<AuthSession> {
  const s = await ipc().auth.getSession();
  return {
    loggedIn:    Boolean(s?.loggedIn),
    user:        (s?.user && Object.keys(s.user).length) ? s.user as ZymoUser : null,
    intranetUrl: s?.intranetUrl ?? '',
  };
}

/**
 * Llama a /api/netvault/auth/ping para verificar que el token guardado sigue
 * siendo válido en el servidor. Devuelve la sesión actualizada.
 */
export async function pingSession(): Promise<AuthSession & { error?: string }> {
  const res = await ipc().auth.ping();
  return {
    loggedIn:    Boolean(res?.loggedIn),
    user:        res?.user ?? null,
    intranetUrl: (await getStoredSession()).intranetUrl,
    error:       res?.error,
  };
}
