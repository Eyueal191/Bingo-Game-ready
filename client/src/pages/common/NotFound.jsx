import React from "react";

const NotFound = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #6d28d9 0%, #312e81 60%, #2563eb 100%)",
        color: "#fff",
        fontFamily: "sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: 64,
          margin: 0,
          color: "#a78bfa",
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontSize: 24,
          margin: "16px 0 8px 0",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        Page Not Found
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "#d1d5db",
          marginBottom: 32,
          maxWidth: 320,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        The page you are looking for doesn't exist or has been moved.
      </p>
      <a
        href="/"
        style={{
          color: "#fff",
          background: "#22c55e",
          padding: "12px 32px",
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: "none",
          fontSize: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          transition: "background 0.2s",
          display: "inline-block",
          width: "100%",
          maxWidth: 240,
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#16a34a")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#22c55e")}
      >
        Back to Home
      </a>
    </div>
  );
};

export default NotFound;
