"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect") || "/admin";
      window.location.href = redirect;
    } catch (err) {
      setError("Unexpected error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ background:"#0a0a0a", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", padding:20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .input{width:100%;background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:12px;color:#f5f0e8;padding:14px 16px;font-size:15px;outline:none;font-family:inherit}
        .input:focus{border-color:#c8973a}
        .login-btn{width:100%;background:#c8973a;color:#0a0a0a;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}
        .login-btn:disabled{background:#2a2a2a;color:#555;cursor:not-allowed}
        @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ width:"100%", maxWidth:400, animation:"fadeIn 0.4s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>☕</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#f5f0e8", marginBottom:4 }}>Zarin Café</h1>
          <p style={{ color:"#555", fontSize:14 }}>Staff Portal — Sign in to continue</p>
        </div>
        <div style={{ background:"#141414", border:"1px solid #222", borderRadius:20, padding:28 }}>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Sign In</h2>
          {error && (
            <div style={{ background:"#ef444418", border:"1px solid #ef444444", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#ef4444" }}>
              ⚠️ {error}
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:6 }}>Email</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:6 }}>Password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          </div>
          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </div>
      </div>
    </div>
  );
}