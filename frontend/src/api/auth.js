import { requestJson } from "./client";
import { signInWithGooglePopup } from "../firebase";

const TOKEN_STORAGE_KEY = "bananas-cinema-auth-token";


function jsonRequest(path, options = {}) {
  const token = getStoredToken();
  return requestJson(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
}


export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}


export function setStoredToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}


export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}


export function fetchCurrentUser() {
  return jsonRequest("/auth/me/");
}


export async function login(payload) {
  const data = await jsonRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setStoredToken(data.token);
  return data;
}


export async function signup(payload) {
  const data = await jsonRequest("/auth/signup/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setStoredToken(data.token);
  return data;
}


export async function logout() {
  await jsonRequest("/auth/logout/", {
    method: "POST",
  });
  clearStoredToken();
}


export async function loginWithGoogle() {
  const idToken = await signInWithGooglePopup();
  const data = await jsonRequest("/auth/google/", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  setStoredToken(data.token);
  return data;
}
