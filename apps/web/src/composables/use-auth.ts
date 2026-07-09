import { computed, ref } from "vue";

const TOKEN_KEY = "auth_token";

const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
const user = ref<{ id: number; email: string } | null>(null);

// The auth module hasn't been rebuilt on the Fastify API yet (deferred —
// see root README). These throw until /api/v1/auth/* routes exist.
export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);

  function clearToken() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  async function login(_email: string, _password: string): Promise<never> {
    throw new Error("Auth is not implemented yet on the Fastify API");
  }

  async function register(_email: string, _password: string): Promise<never> {
    throw new Error("Auth is not implemented yet on the Fastify API");
  }

  async function fetchMe() {
    if (!token.value)
      return null;
    clearToken();
    return null;
  }

  function logout() {
    clearToken();
  }

  return { token, user, isAuthenticated, login, register, logout, fetchMe };
}
