"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const EMOJIS = ["☕","🍽️","🍕","🍔","🌮","🍜","🥘","🍱","🍰","🥗"];
const COLORS = ["#c8973a","#ef4444","#22c55e","#6366f1","#f59e0b","#ec4899","#06b6d4"];

const slugify = (str) =>
  str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function SignupPage() {
  const [step, setStep]         = useState(1); // 1: account, 2: restaurant details
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug]         = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [logoEmoji, setLogoEmoji]   = useState("☕");
  const [color, setColor]           = useState("#c8973a");
  const [city, setCity]             = useState("");
  const [phone, setPhone]           = useState("");
  const [locale, setLocale]         = useState("ku");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const router = useRouter();

  const handleNameChange = (val) => {
    setRestaurantName(val);
    if (!slugEdited) setSlug(slugify(val));
  };

  const checkSlug = async (value) => {
    if (!value) { setSlugAvailable(null); return; }
    const { data } = await supabase.from("restaurants").select("id").eq("slug", value).maybeSingle();
    setSlugAvailable(!data);
  };

  const goToStep2 = () => {
    if (!email || !password) { setError("Please fill in email and password"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError(null);
    setStep(2);
  };

  const handleSignup = async () => {
    if (!restaurantName || !slug) { setError("Please fill in restaurant name"); return; }
    if (slugAvailable === false) { setError("This URL is already taken — choose another name"); return; }

    setLoading(true);
    setError(null);

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      setError("Signup failed — please try logging in, your account may already exist.");
      setLoading(false);
      return;
    }

    // 2. Sign in immediately (in case auto-confirm is on)
    await supabase.auth.signInWithPassword({ email: email.trim(), password });

    // 3. Create the restaurant
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .insert({
        slug,
        name: restaurantName,
        logo_emoji: logoEmoji,
        primary_color: color,
        owner_id: userId,
        city: city || null,
        phone: phone || null,
        locale,
      })
      .select()
      .single();

    if (restError) {
      setError("Restaurant creation failed: " + restError.message);
      setLoading(false);
      return;
    }

    // 4. Create a default category + table so the new owner isn't starting from zero
    await supabase.from("menu_categories").insert({
      restaurant_id: restaurant.id,
      name_ku: "خواردنی سەرەکی", name_ar: "الأطباق الرئيسية", name_en: "Main Dishes",
      icon: "🍽️", sort_order: 1,
    });
    await supabase.from("tables").insert({
      restaurant_id: restaurant.id,
      label: "Table 1",
      qr_token: `tbl_${slug}_1_${Date.now()}`,
    });

    setLoading(false);
    router.push(`/r/${slug}/admin`);
  };

  return (
    <div style={{ background:"#0a0a0a", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", padding:20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .input{width:100%;background:#1a1a1a;border:1.5px solid #2a2a2a;border-radius:12px;color:#f5f0e8;padding:14px 16px;font-size:15px;outline:none;font-family:inherit;transition:border-color 0.2s}
        .input:focus{border-color:#c8973a}
        .btn-primary{width:100%;background:#c8973a;color:#0a0a0a;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;transition:background 0.15s}
        .btn-primary:hover{background:#a67c2e}
        .btn-primary:disabled{background:#2a2a2a;color:#555;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1.5px solid #2a2a2a;color:#888;border-radius:12px;padding:15px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
        .emoji-pick{width:44px;height:44px;border-radius:12px;border:2px solid #2a2a2a;background:#1a1a1a;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
        .emoji-pick.active{border-color:#c8973a;background:#c8973a22}
        .color-pick{width:32px;height:32px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all 0.15s}
        .color-pick.active{border-color:#f5f0e8;transform:scale(1.15)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .step-dot{width:8px;height:8px;border-radius:50%;background:#2a2a2a;transition:all 0.2s}
        .step-dot.active{background:#c8973a;width:24px;border-radius:4px}
      `}</style>

      <div style={{ width:"100%", maxWidth:440, animation:"fadeIn 0.4s ease" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:44, marginBottom:8 }}>🚀</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#f5f0e8", marginBottom:4 }}>Start Your Restaurant</h1>
          <p style={{ color:"#555", fontSize:14 }}>Create your free QR ordering system in 2 minutes</p>
        </div>

        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:24 }}>
          <div className={`step-dot${step>=1?" active":""}`}/>
          <div className={`step-dot${step>=2?" active":""}`}/>
        </div>

        <div style={{ background:"#141414", border:"1px solid #222", borderRadius:20, padding:28 }}>
          {error && (
            <div style={{ background:"#ef444418", border:"1px solid #ef444444", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#ef4444" }}>
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1 — ACCOUNT */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize:17, fontWeight:700, marginBottom:18 }}>1. Create your account</h2>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Email</label>
                <input className="input" type="email" placeholder="you@restaurant.com" value={email} onChange={e=>setEmail(e.target.value)}/>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Password</label>
                <input className="input" type="password" placeholder="At least 6 characters" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&goToStep2()}/>
              </div>
              <button className="btn-primary" onClick={goToStep2}>Continue →</button>
            </>
          )}

          {/* STEP 2 — RESTAURANT */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize:17, fontWeight:700, marginBottom:18 }}>2. Set up your restaurant</h2>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Restaurant Name</label>
                <input className="input" placeholder="e.g. Zarin Café" value={restaurantName} onChange={e=>handleNameChange(e.target.value)}/>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Your Menu URL</label>
                <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                  <span style={{ background:"#1a1a1a", border:"1.5px solid #2a2a2a", borderRight:"none", borderRadius:"12px 0 0 12px", padding:"14px 10px", fontSize:13, color:"#555" }}>/r/</span>
                  <input
                    className="input"
                    style={{ borderRadius:"0 12px 12px 0" }}
                    value={slug}
                    onChange={e=>{ setSlug(slugify(e.target.value)); setSlugEdited(true); checkSlug(slugify(e.target.value)); }}
                  />
                </div>
                {slugAvailable === true && <div style={{ fontSize:12, color:"#22c55e", marginTop:6 }}>✓ Available</div>}
                {slugAvailable === false && <div style={{ fontSize:12, color:"#ef4444", marginTop:6 }}>✕ Already taken</div>}
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Logo Icon</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {EMOJIS.map(e=>(
                    <button key={e} className={`emoji-pick${logoEmoji===e?" active":""}`} onClick={()=>setLogoEmoji(e)}>{e}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Brand Color</label>
                <div style={{ display:"flex", gap:10 }}>
                  {COLORS.map(c=>(
                    <button key={c} className={`color-pick${color===c?" active":""}`} style={{background:c}} onClick={()=>setColor(c)}/>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>City</label>
                  <input className="input" placeholder="Erbil" value={city} onChange={e=>setCity(e.target.value)}/>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Phone</label>
                  <input className="input" placeholder="0750..." value={phone} onChange={e=>setPhone(e.target.value)}/>
                </div>
              </div>

              <div style={{ marginBottom:22 }}>
                <label style={{ fontSize:12, color:"#555", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Default Language</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[["ku","کوردی"],["ar","عربي"],["en","English"]].map(([code,label])=>(
                    <button key={code} className={`emoji-pick${locale===code?" active":""}`} style={{width:"auto",padding:"0 16px",fontSize:13}} onClick={()=>setLocale(code)}>{label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-ghost" onClick={()=>setStep(1)} style={{flex:"0 0 100px"}}>← Back</button>
                <button className="btn-primary" onClick={handleSignup} disabled={loading}>
                  {loading?"Creating...":"Create My Restaurant 🚀"}
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign:"center", color:"#333", fontSize:12, marginTop:20 }}>
          Already have an account? <a href="/login" style={{color:"#c8973a"}}>Sign in</a>
        </p>
      </div>
    </div>
  );
}