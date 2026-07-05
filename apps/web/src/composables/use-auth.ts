import { computed, ref } from "vue";

import apiClient from "@/web/lib/api-client";

const TOKEN_KEY = "auth_token";

const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
const user = ref<{ id: number; email: string } | null>(null);

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem(TOKEN_KEY, newToken);
  }

  function clearToken() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  async function login(email: string, password: string) {
    const response = await apiClient.api.v1.auth.login.$post({ json: { email, password } });
    const json = await response.json();
    if (!response.ok || !("token" in json)) {
      throw new Error("message" in json ? (json as { message: string }).message : "Login failed");
    }
    const success = json as { token: string; user: { id: number; email: string } };
    setToken(success.token);
    user.value = success.user;
    return success;
  }

  async function register(email: string, password: string) {
    const response = await apiClient.api.v1.auth.register.$post({ json: { email, password } });
    const json = await response.json();
    if (!response.ok || !("token" in json)) {
      throw new Error("message" in json ? (json as { message: string }).message : "Registration failed");
    }
    const success = json as { token: string; user: { id: number; email: string } };
    setToken(success.token);
    user.value = success.user;
    return success;
  }

  async function fetchMe() {
    if (!token.value)
      return null;
    const response = await apiClient.api.v1.auth.me.$get(
      {},
      { headers: { Authorization: `Bearer ${token.value}` } },
    );
    if (!response.ok) {
      clearToken();
      return null;
    }
    const json = await response.json();
    user.value = json;
    return json;
  }

  function logout() {
    clearToken();
  }

  return { token, user, isAuthenticated, login, register, logout, fetchMe };
}
