"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const LANG_CONFIG = {
  ku: { dir: "rtl", label: "کوردی" },
  ar: { dir: "rtl", label: "عربي" },
  en: { dir: "ltr", label: "English" },
};

const UI = {
  ku: { addNote: "تێبینی زیاد بکە...", confirmTitle: "داواکارییەکەت نێردرا! ✓", confirmMsg: "خزمەتگوزار دێتەوە بۆ میزەکەت.", popular: "بەناوبانگ", total: "کۆی گشتی", pieces: "دانە", yourOrder: "داواکاریەکەت", tableNo: "ژمارەی مێز", sendOrder: "داواکاری بنێرە", loading: "بارکردن...", sending: "ناردن..." },
  ar: { addNote: "أضف ملاحظة...", confirmTitle: "تم إرسال طلبك! ✓", confirmMsg: "سيأتي النادل إلى طاولتك.", popular: "الأكثر طلباً", total: "المجموع", pieces: "قطعة", yourOrder: "طلبك", tableNo: "رقم الطاولة", sendOrder: "إرسال الطلب", loading: "جار التحميل...", sending: "جار الإرسال..." },
  en: { addNote: "Add a note...", confirmTitle: "Order Sent! ✓", confirmMsg: "Your waiter is on the way.", popular: "Popular", total: "Total", pieces: "pcs", yourOrder: "Your Order", tableNo: "Table", sendOrder: "Place Order", loading: "Loading...", sending: "Sending..." },
};

const TAG_COLORS = { halal: "#16a34a", vegan: "#059669", vegetarian: "#0891b2", spicy: "#dc2626" };
const TAG_LABELS = {
  ku: { halal: "حەلاڵ", vegan: "ڤیگان", vegetarian: "سەوزە", spicy: "تیژ" },
  ar: { halal: "حلال", vegan: "نباتي", vegetarian: "خضار", spicy: "حار" },
  en: { halal: "Halal", vegan: "Vegan", vegetarian: "Vegetarian", spicy: "Spicy" },
};

// Default table for testing — later this comes from the QR code URL (?table=tbl_007)
const DEFAULT_TABLE_TOKEN = "tbl_007";

export default function QRMenu() {
  const [lang, setLang] = useState("ku");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [animItem, setAnimItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tableInfo, setTableInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const t = UI[lang];
  const dir = LANG_CONFIG[lang].dir;
  const isRTL = dir === "rtl";

  // Get table token from URL (?table=tbl_007), fallback to default
  const getTableToken = () => {
    if (typeof window === "undefined") return DEFAULT_TABLE_TOKEN;
    const params = new URLSearchParams(window.location.search);
    return params.get("table") || DEFAULT_TABLE_TOKEN;
  };

  // Load menu + table info from Supabase
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);

      const [catRes, itemRes, tableRes] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("menu_items").select("*").eq("is_available", true).order("sort_order"),
        supabase.from("tables").select("*").eq("qr_token", getTableToken()).single(),
      ]);

      if (catRes.error || itemRes.error) {
        setErrorMsg("Could not load menu. Check your Supabase connection.");
        setLoading(false);
        return;
      }

      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
      setTableInfo(tableRes.data || { label: "Table ?", id: null });
      if (catRes.data?.length > 0) setActiveCategory(catRes.data[0].id);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredItems = items.filter((i) => i.category_id === activeCategory);
  const cartEntries = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartCount = cartEntries.reduce((s, [, q]) => s + q, 0);
  const cartTotal = cartEntries.reduce((s, [id, q]) => {
    const item = items.find((i) => i.id === id);
    return s + (item ? Number(item.price) * q : 0);
  }, 0);

  const addToCart = (id) => {
    setAnimItem(id);
    setTimeout(() => setAnimItem(null), 400);
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  // ── PLACE REAL ORDER IN SUPABASE ──────────────────────────────
  const placeOrder = async () => {
    if (!tableInfo?.id || cartEntries.length === 0) return;
    setSending(true);

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: tableInfo.id,
        status: "new",
        note: note || null,
        total: cartTotal,
      })
      .select()
      .single();

    if (orderError) {
      setErrorMsg("Failed to place order. Try again.");
      setSending(false);
      return;
    }

    // 2. Create the order items (snapshot name + price at order time)
    const orderItemsPayload = cartEntries.map(([itemId, qty]) => {
      const item = items.find((i) => i.id === itemId);
      return {
        order_id: order.id,
        menu_item_id: itemId,
        item_name: item.name_en,
        quantity: qty,
        unit_price: item.price,
      };
    });

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);

    setSending(false);

    if (itemsError) {
      setErrorMsg("Order created but items failed to save.");
      return;
    }

    setCartOpen(false);
    setConfirmed(true);
    setCart({});
    setNote("");
    setTimeout(() => setConfirmed(false), 5000);
  };

  const fmt = (p) => {
    const num = Number(p).toLocaleString();
    return lang === "en" ? `${num} IQD` : `${num} دینار`;
  };

  // ── LOADING STATE ──────────────────────────────
  if (loading) {
    return (
      <div style={{ background: "#0f0f0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8973a", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
          <div>{t.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ fontFamily: isRTL ? "'Noto Sans Arabic',sans-serif" : "'Inter',sans-serif", background: "#0f0f0f", minHeight: "100vh", color: "#f5f0e8", maxWidth: 480, margin: "0 auto", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        .cat-scroll{display:flex;gap:10px;overflow-x:auto;padding:0 16px 12px;scrollbar-width:none}
        .cat-scroll::-webkit-scrollbar{display:none}
        .item-card{background:#1a1a1a;border-radius:16px;padding:16px;display:flex;gap:14px;align-items:flex-start;border:1px solid #2a2a2a}
        .add-btn{background:#c8973a;border:none;color:#0f0f0f;border-radius:50px;width:36px;height:36px;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;transition:transform 0.15s}
        .add-btn:active{transform:scale(0.88)}
        .add-btn.pop{animation:pop 0.35s ease}
        @keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.35)}70%{transform:scale(0.9)}100%{transform:scale(1)}}
        .qty-ctrl{display:flex;align-items:center;gap:10px}
        .qty-btn{background:#2a2a2a;border:none;color:#f5f0e8;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .cart-sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#181818;border-radius:24px 24px 0 0;padding:0 0 32px;z-index:100;box-shadow:0 -8px 40px rgba(0,0,0,0.7);max-height:85vh;overflow-y:auto;border-top:1px solid #2e2e2e}
        .cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99;backdrop-filter:blur(3px)}
        .confirm-toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a2e1a;border:1px solid #2d5a2d;border-radius:20px;padding:28px 32px;text-align:center;z-index:200;box-shadow:0 0 60px rgba(0,0,0,0.8);min-width:280px;animation:fadeInUp 0.4s ease}
        .confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:199;backdrop-filter:blur(6px)}
        @keyframes fadeInUp{from{opacity:0;transform:translate(-50%,-42%)}to{opacity:1;transform:translate(-50%,-50%)}}
        .lang-btn{padding:6px 12px;border-radius:20px;border:1px solid #3a3a3a;background:transparent;color:#999;font-size:13px;cursor:pointer;transition:all 0.2s}
        .lang-btn.active{background:#c8973a;color:#0f0f0f;border-color:#c8973a;font-weight:600}
        .cat-btn{padding:10px 18px;border-radius:50px;border:1.5px solid #2a2a2a;background:transparent;color:#888;font-size:14px;cursor:pointer;white-space:nowrap;transition:all 0.2s;display:flex;align-items:center;gap:6px}
        .cat-btn.active{background:#c8973a;color:#0f0f0f;border-color:#c8973a;font-weight:600}
        .popular-badge{background:#c8973a22;color:#c8973a;font-size:11px;padding:2px 8px;border-radius:20px;border:1px solid #c8973a44;font-weight:500}
        .cart-fab{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#c8973a;color:#0f0f0f;border:none;border-radius:50px;padding:14px 28px;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 4px 24px rgba(200,151,58,0.45);z-index:50;white-space:nowrap;width:calc(100% - 48px);max-width:400px;justify-content:space-between}
        .divider{height:1px;background:#222;margin:0 16px}
        .note-input{width:100%;background:#222;border:1px solid #333;border-radius:12px;color:#f5f0e8;padding:12px 14px;font-size:14px;resize:none;outline:none;font-family:inherit}
        .place-btn{background:#c8973a;color:#0f0f0f;border:none;border-radius:14px;padding:16px;font-size:17px;font-weight:700;cursor:pointer;width:100%;font-family:inherit}
        .place-btn:disabled{background:#3a3a3a;color:#666;cursor:not-allowed}
        .tag{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:500}
        .emoji-plate{font-size:44px;flex-shrink:0;width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:#222;border-radius:14px}
        .error-banner{background:#ef444422;border:1px solid #ef444466;color:#ef4444;padding:10px 16px;margin:12px 16px;border-radius:10px;font-size:13px;text-align:center}
      `}</style>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {/* HEADER */}
      <div style={{ background: "linear-gradient(180deg,#1a1200 0%,#0f0f0f 100%)", padding: "24px 16px 0", borderBottom: "1px solid #222" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18, justifyContent: isRTL ? "flex-start" : "flex-end" }}>
          {Object.entries(LANG_CONFIG).map(([code, cfg]) => (
            <button key={code} className={`lang-btn${lang === code ? " active" : ""}`} onClick={() => setLang(code)}>{cfg.label}</button>
          ))}
        </div>
        <div style={{ textAlign: "center", paddingBottom: 20 }}>
          <div style={{ fontSize: 38, marginBottom: 6 }}>☕</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f5f0e8", marginBottom: 4 }}>Zarin Café</h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1e1800", border: "1px solid #c8973a44", borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "#c8973a" }}>
            🪑 {t.tableNo}: {tableInfo?.label || "—"}
          </div>
        </div>
        <div className="cat-scroll">
          {categories.map((cat) => (
            <button key={cat.id} className={`cat-btn${activeCategory === cat.id ? " active" : ""}`} onClick={() => setActiveCategory(cat.id)}>
              <span>{cat.icon}</span>
              <span>{cat[`name_${lang}`]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MENU ITEMS */}
      <div style={{ padding: "16px 16px 120px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredItems.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", padding: "40px 0" }}>No items in this category yet</div>
        )}
        {filteredItems.map((item) => {
          const qty = cart[item.id] || 0;
          return (
            <div key={item.id} className="item-card">
              <div className="emoji-plate">{item.image_emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f5f0e8", lineHeight: 1.3 }}>{item[`name_${lang}`]}</h3>
                  {item.is_popular && <span className="popular-badge">{t.popular}</span>}
                </div>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5, marginBottom: 8 }}>{item[`desc_${lang}`]}</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                  {(item.tags || []).map((tag) => (
                    <span key={tag} className="tag" style={{ background: TAG_COLORS[tag] + "22", color: TAG_COLORS[tag], border: `1px solid ${TAG_COLORS[tag]}44` }}>
                      {TAG_LABELS[lang][tag]}
                    </span>
                  ))}
                  <span style={{ fontSize: 12, color: "#555" }}>⏱ {item.prep_time_min} {lang === "en" ? "min" : "خولەک"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#c8973a" }}>{fmt(item.price)}</span>
                  {qty === 0 ? (
                    <button className={`add-btn${animItem === item.id ? " pop" : ""}`} onClick={() => addToCart(item.id)}>+</button>
                  ) : (
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                      <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button className={`add-btn${animItem === item.id ? " pop" : ""}`} onClick={() => addToCart(item.id)} style={{ width: 32, height: 32, fontSize: 18 }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CART FAB */}
      {cartCount > 0 && !cartOpen && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <span style={{ background: "#0f0f0f33", borderRadius: 20, padding: "2px 10px", fontSize: 14 }}>{cartCount} {t.pieces}</span>
          <span>{t.yourOrder}</span>
          <span style={{ fontSize: 15 }}>{fmt(cartTotal)}</span>
        </button>
      )}

      {/* CART SHEET */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-sheet">
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, background: "#333", borderRadius: 10 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 16px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t.yourOrder}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#c8973a22", border: "1px solid #c8973a44", borderRadius: 20, padding: "4px 12px", color: "#c8973a", fontSize: 13 }}>
                🪑 {tableInfo?.label}
              </div>
            </div>
            <div className="divider" />
            <div style={{ padding: "12px 20px" }}>
              {cartEntries.map(([id, qty]) => {
                const item = items.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #222" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{item.image_emoji}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{item[`name_${lang}`]}</div>
                        <div style={{ fontSize: 13, color: "#c8973a" }}>{fmt(item.price)}</div>
                      </div>
                    </div>
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => removeFromCart(id)}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button className="qty-btn" onClick={() => addToCart(id)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "8px 20px 16px" }}>
              <textarea className="note-input" rows={2} placeholder={t.addNote} value={note} onChange={(e) => setNote(e.target.value)} dir={dir} />
            </div>
            <div className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", fontSize: 18, fontWeight: 700 }}>
              <span>{t.total}</span>
              <span style={{ color: "#c8973a" }}>{fmt(cartTotal)}</span>
            </div>
            <div style={{ padding: "0 20px" }}>
              <button className="place-btn" onClick={placeOrder} disabled={sending}>
                {sending ? t.sending : `${t.sendOrder} →`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* CONFIRMED */}
      {confirmed && (
        <>
          <div className="confirm-overlay" />
          <div className="confirm-toast">
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>{t.confirmTitle}</h2>
            <p style={{ color: "#aaa", fontSize: 15 }}>{t.confirmMsg}</p>
          </div>
        </>
      )}
    </div>
  );
}
