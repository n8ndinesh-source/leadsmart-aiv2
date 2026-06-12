import { User } from "../types";

const API_BASE = "/api";

export function getStoredToken(): string | null {
  return localStorage.getItem("leadsmart_token");
}

export function setStoredToken(token: string) {
  localStorage.setItem("leadsmart_token", token);
}

export function clearStoredToken() {
  localStorage.removeItem("leadsmart_token");
}

export function getStoredUser(): User | null {
  const json = localStorage.getItem("leadsmart_user");
  if (!json) return null;
  try {
    return JSON.parse(json) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  localStorage.setItem("leadsmart_user", JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem("leadsmart_user");
}

async function request<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
    let text = "";
  try {
    text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("API Error Response Text:", text);
    data = { error: `Failed to parse response: ${response.status} ${response.statusText}` };
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, "GET"),
  post: <T>(endpoint: string, body?: any) => request<T>(endpoint, "POST", body),
  put: <T>(endpoint: string, body?: any) => request<T>(endpoint, "PUT", body),
  delete: <T>(endpoint: string) => request<T>(endpoint, "DELETE"),
};
