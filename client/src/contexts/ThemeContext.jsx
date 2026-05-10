import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext({ theme: "light", toggleTheme: () => { } });

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("appTheme") || "light";
        } catch {
            return "light";
        }
    });

    // Apply / remove .theme-dark on <html>
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("theme-dark");
        } else {
            root.classList.remove("theme-dark");
        }
        try {
            localStorage.setItem("appTheme", theme);
        } catch {
            // localStorage unavailable
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    const setThemeMode = useCallback((mode) => {
        setTheme(mode === "dark" ? "dark" : "light");
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode, isDark: theme === "dark" }}>
            {children}
        </ThemeContext.Provider>
    );
};
