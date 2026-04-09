function normalizeApiBaseUrl(value) {
  return (value || "/api").replace(/\/$/, "");
}

function buildApiErrorMessage(text, response) {
  const trimmed = text.trim();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return "API returned HTML instead of JSON. Refresh the page or restart the frontend dev server.";
  }

  if (!response.ok) {
    return `Request failed with status ${response.status}.`;
  }

  return "API returned an unexpected response.";
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(buildApiErrorMessage(text, response));
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Request failed.");
  }

  return data;
}
