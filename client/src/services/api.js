import axios from "axios";

const configuredApiUrl =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_ORIGIN;
const apiUrl = configuredApiUrl?.trim();
const apiUrlWithProtocol =
  apiUrl && !apiUrl.startsWith("/") && !/^https?:\/\//i.test(apiUrl)
    ? `https://${apiUrl}`
    : apiUrl;
const apiUrlWithoutTrailingSlash = apiUrlWithProtocol?.replace(/\/+$/, "");
const baseURL = apiUrlWithoutTrailingSlash
  ? /\/api$/i.test(apiUrlWithoutTrailingSlash)
    ? apiUrlWithoutTrailingSlash
    : `${apiUrlWithoutTrailingSlash}/api`
  : "/api";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kisansathi_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login") &&
      !error.config?.url?.includes("/auth/register")
    ) {
      localStorage.removeItem("kisansathi_token");
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register" &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
