import React from "react";

const Unauthorized = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f59e42 0%, #ef4444 100%)",
        color: "#fff",
        fontFamily: "sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: 56,
          margin: 0,
          color: "#fff",
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        403
      </h1>
      <h2
        style={{
          fontSize: 22,
          margin: "16px 0 8px 0",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        Access Denied
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "#fef3c7",
          marginBottom: 32,
          maxWidth: 320,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        You do not have permission to view this page.
        <br />
        If you believe this is a mistake, please contact support.
      </p>
      <a
        href="/"
        style={{
          color: "#fff",
          background: "#ef4444",
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
        onMouseOver={(e) => (e.currentTarget.style.background = "#b91c1c")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
      >
        Back to Home
      </a>
    </div>
  );
};

export default Unauthorized;
