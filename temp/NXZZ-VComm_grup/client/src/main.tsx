import { createRoot } from "react-dom/client";
import SimplestApp from "./SimplestApp";
import "./index.css";

// Set dark mode as default immediately
const savedTheme = localStorage.getItem("militaryCommsTheme");
if (!savedTheme) {
  localStorage.setItem("militaryCommsTheme", "dark");
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.add(savedTheme);
}

createRoot(document.getElementById("root")!).render(
  <SimplestApp />
);
