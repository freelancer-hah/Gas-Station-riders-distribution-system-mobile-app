import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: For Expo Go on a PHYSICAL DEVICE, use your computer's LAN IP for ALL platforms.
// - localhost only works on web (expo start --web) or an iOS simulator
// - Physical device (Expo Go on iPhone/Android): use LAN IP like http://192.168.2.50:5000/api
const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000/api"
    : "http://192.168.2.44:5000/api"; // ← your computer's LAN IP

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      await AsyncStorage.removeItem("token");
      // You can emit an event or use a global state to handle this
      console.log("Session expired - please login again");
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
