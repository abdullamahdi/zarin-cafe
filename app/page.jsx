"use client";

import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA (replace with Supabase fetch later) ────────────────────────────
const MENU_DATA = {
  restaurant: {
    name: { ku: "کافێی زەرین", ar: "كافيه زرين", en: "Zarin Café" },
    tagline: { ku: "چێژی ڕاستەقینەی کوردستان", ar: "الذوق الأصيل لكردستان", en: "The Authentic Taste of Kurdistan" },
    tableLabel: { ku: "مێزی", ar: "طاولة", en: "Table" },
    table: "7",
  },
  categories: [
    { id: "hot", label: { ku: "خواردنی گەرم", ar: "الوجبات الساخنة", en: "Hot Dishes" }, icon: "🍲" },
    { id: "grills", label: { ku: "کەبابەکان", ar: "المشويات", en: "Grills" }, icon: "🔥" },
    { id: "drinks", label: { ku: "خواردنەوەکان", ar: "المشروبات", en: "Drinks" }, icon: "☕" },
    { id: "desserts", label: { ku: "شیرینی", ar: "الحلويات", en: "Desserts" }, icon: "🍮" },
  ],
  items: [
    { id: "1", category: "hot", name: { ku: "دۆلمەی کوردی", ar: "دولمة كردية", en: "Kurdish Dolma" }, desc: { ku: "دۆلمەی گەلاڵە بە گوێزی و بریندار", ar: "دولمة تقليدية بالجوز واللحم", en: "Traditional dolma with walnuts & meat" }, price: 8500, tags: ["halal"], image: "🫑", prep: 15, popular: true },
    { id: "2", category: "hot", name: { ku: "شۆربای مەرگ", ar: "شوربة العدس", en: "Lentil Soup" }, desc: { ku: "شۆربای گەرمی مەرگی سوور", ar: "شوربة العدس الأحمر الدافئة", en: "Warm red lentil soup" }, price: 4000, tags: ["vegan", "halal"], image: "🍜", prep: 10 },
    { id: "3", category: "hot", name: { ku: "برنجی کوردی", ar: "أرز كردي", en: "Kurdish Rice" }, desc: { ku: "برنجی ئامادەکراو بە شێوازی کوردی", ar: "أرز محضر بالطريقة الكردية", en: "Rice prepared Kurdish style with herbs" }, price: 6000, tags: ["halal"], image: "🍚", prep: 20 },
    { id: "4", category: "grills", name: { ku: "کەبابی کوردی", ar: "كباب كردي", en: "Kurdish Kebab" }, desc: { ku: "کەبابی گۆشتی مەڕ لەسەر ئاگر", ar: "كباب لحم الضأن على الفحم", en: "Lamb kebab grilled over charcoal" }, price: 12000, tags: ["halal"], image: "🍢", prep: 20, popular: true },
    { id: "5", category: "grills", name: { ku: "جوجەی کەبابکراو", ar: "دجاج مشوي", en: "Grilled Chicken" }, desc: { ku: "جوجەی تەواو لەسەر ئاگر", ar: "دجاج كامل على الجمر", en: "Whole chicken on charcoal grill" }, price: 14000, tags: ["halal"], image: "🍗", prep: 25 },
    { id: "6", category: "grills", name: { ku: "تیکەی گۆشت", ar: "تيكا لحم", en: "Meat Tikka" }, desc: { ku: "پارچەی گۆشتی مەڕ بە بهارات", ar: "قطع لحم ضأن متبلة", en: "Spiced lamb pieces on skewer" }, price: 11000, tags: ["halal", "spicy"], image: "🥩", prep: 18 },
    { id: "7", category: "drinks", name: { ku: "چای کوردی", ar: "شاي كردي", en: "Kurdish Tea" }, desc: { ku: "چای بە هێلیلەی ڕەش", ar: "شاي بالهيل الأسود", en: "Tea with black cardamom" }, price: 1500, tags: ["vegan", "halal"], image: "🫖", prep: 5, popular: true },
    { id: "8", category: "drinks", name: { ku: "دووغ", ar: "دوغ", en: "Doogh" }, desc: { ku: "نوشتەی ماستی سارد بە نەعنا", ar: "مشروب اللبن البارد بالنعناع", en: "Chilled yogurt drink with mint" }, price: 2500, tags: ["vegetarian", "halal"], image: "🥛", prep: 3 },
    { id: "9", category: "drinks", name: { ku: "ئەنارەی تازە", ar: "عصير رمان طازج", en: "Fresh Pomegranate" }, desc: { ku: "ئەنارەی تازەی سەرزەمینی کوردستان", ar: "عصير رمان طازج من كردستان", en: "Fresh-pressed Kurdistan pomegranate" }, price: 3500, tags: ["vegan", "halal"], image: "🍹", prep: 5 },
    { id: "10", category: "desserts", name: { ku: "بەقلاوە", ar: "بقلاوة", en: "Baklava" }, desc: { ku: "بەقلاوەی ئەسڵی بە پستە و گوێز", ar: "بقلاوة أصلية بالفستق والجوز", en: "Authentic baklava with pistachios" }, price: 3000, tags: ["vegetarian", "halal"], image: "🍯", prep: 5, popular: true },
    { id: "11", category: "desserts", name: { ku: "زەردەی کوردی", ar: "زردة كردية", en: "Kurdish Zarda" }, desc: { ku: "زەردەی بە زەعفەران و گوێز", ar: "زردة بالزعفران والمكسرات", en: "Saffron rice pudding with nuts" }, price: 3500, tags: ["vegetarian", "halal"], image: "🍮", prep: 10 },
  ],
};

const LANG_CONFIG = {
  ku: { dir: "rtl", label: "کوردی", font: "Noto Sans Arabic" },
  ar: { dir: "rtl", label: "عربي", font: "Noto Sans Arabic" },
  en: { dir: "ltr", label: "English", font: "Inter" },
};

const UI = {
  ku: { menu: "مینیو", cart: "سەبەتە", order: "داواکاری بنێرە", empty: "سەبەتەت بەتاڵە", addNote: "تێبینی زیاد بکە...", confirmTitle: "داواکارییەکەت نێردرا! ✓", confirmMsg: "خزمەتگوزار دێتەوە بۆ میزەکەت.", popular: "بەناوبانگ", add: "زیادبکە", remove: "لاببە", total: "کۆی گشتی", currency: "دینار", pieces: "دانە", yourOrder: "داواکاریەکەت", tableNo: "ژمارەی مێز", note: "تێبینی", sendOrder: "داواکاری بنێرە", cancel: "پاشگەزبوونەوە" },
  ar: { menu: "القائمة", cart: "السلة", order: "إرسال الطلب", empty: "سلتك فارغة", addNote: "أضف ملاحظة...", confirmTitle: "تم إرسال طلبك! ✓", confirmMsg: "سيأتي النادل إلى طاولتك.", popular: "الأكثر طلباً", add: "أضف", remove: "احذف", total: "المجموع", currency: "دينار", pieces: "قطعة", yourOrder: "طلبك", tableNo: "رقم الطاولة", note: "ملاحظة", sendOrder: "إرسال الطلب", cancel: "إلغاء" },
  en: { menu: "Menu", cart: "Cart", order: "Place Order", empty: "Your cart is empty", addNote: "Add a note...", confirmTitle: "Order Sent! ✓", confirmMsg: "Your waiter is on the way.", popular: "Popular", add: "Add", remove: "Remove", total: "Total", currency: "IQD", pieces: "pcs", yourOrder: "Your Order", tableNo: "Table", note: "Note", sendOrder: "Place Order", cancel: "Cancel" },
};

const TAG_COLORS = { halal: "#16a34a", vegan: "#059669", vegetarian: "#0891b2", spicy: "#dc2626" };
const TAG_LABELS = {
  ku: { halal: "حەلاڵ", vegan: "ڤیگان", vegetarian: "سەوزە", spicy: "تیژ" },
  ar: { halal: "حلال", vegan: "نباتي", vegetarian: "خضار", spicy: "حار" },
  en: { halal: "Halal", vegan: "Vegan", vegetarian: "Vegetarian", spicy: "Spicy" },
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function QRMenu() {
  const [lang, setLang] = useState("ku");
  const [activeCategory, setActiveCategory] = useState("hot");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [animatingItem, setAnimatingItem] = useState(null);
  const categoryRefs = useRef({});

  const t = UI[lang];
  const dir = LANG_CONFIG[lang].dir;
  const isRTL = dir === "rtl";

  const filteredItems = MENU_DATA.items.filter((i) => i.category === activeCategory);
  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartCount = cartItems.reduce((s, [, q]) => s + q, 0);
  const cartTotal = cartItems.reduce((s, [id, q]) => {
    const item = MENU_DATA.items.find((i) => i.id === id);
    return s + (item ? item.price * q : 0);
  }, 0);

  const addToCart = (id) => {
    setAnimatingItem(id);
    setTimeout(() => setAnimatingItem(null), 400);
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  const placeOrder = () => {
    setCartOpen(false);
    setConfirmed(true);
    setCart({});
    setNote("");
    setTimeout(() => setConfirmed(false), 5000);
  };

  const formatPrice = (p) =>
    lang === "en"
      ? `${p.toLocaleString()} IQD`
      : lang === "ar"
      ? `${p.toLocaleString()} دينار`
      : `${p.toLocaleString()} دینار`;

  return (
    <div dir={dir} style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "'Inter', sans-serif", background: "#0f0f0f", minHeight: "100vh", color: "#f5f0e8", maxWidth: 480, margin: "0 auto", position: "relative", overflowX: "hidden" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        body { background: #0f0f0f; }

        .cat-scroll { display: flex; gap: 10px; overflow-x: auto; padding: 0 16px 12px; scrollbar-width: none; }
        .cat-scroll::-webkit-scrollbar { display: none; }

        .item-card { background: #1a1a1a; border-radius: 16px; padding: 16px; display: flex; gap: 14px; align-items: flex-start; border: 1px solid #2a2a2a; transition: border-color 0.2s; }
        .item-card:active { border-color: #c8973a; }

        .add-btn { background: #c8973a; border: none; color: #0f0f0f; border-radius: 50px; width: 36px; height: 36px; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; transition: transform 0.15s, background 0.15s; }
        .add-btn:active { transform: scale(0.88); background: #a67c2e; }
        .add-btn.pop { animation: pop 0.35s ease; }
        @keyframes pop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }

        .qty-ctrl { display: flex; align-items: center; gap: 10px; }
        .qty-btn { background: #2a2a2a; border: none; color: #f5f0e8; border-radius: 50%; width: 32px; height: 32px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .qty-btn:active { background: #3a3a3a; }

        .cart-sheet { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: #181818; border-radius: 24px 24px 0 0; padding: 0 0 32px; z-index: 100; box-shadow: 0 -8px 40px rgba(0,0,0,0.7); max-height: 85vh; overflow-y: auto; transition: transform 0.3s ease; border-top: 1px solid #2e2e2e; }
        .cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99; backdrop-filter: blur(3px); }

        .confirm-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); background: #1a2e1a; border: 1px solid #2d5a2d; border-radius: 20px; padding: 28px 32px; text-align: center; z-index: 200; box-shadow: 0 0 60px rgba(0,0,0,0.8); min-width: 280px; animation: fadeInUp 0.4s ease; }
        .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 199; backdrop-filter: blur(6px); }
        @keyframes fadeInUp { from{opacity:0;transform:translate(-50%,-42%)} to{opacity:1;transform:translate(-50%,-50%)} }

        .lang-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid #3a3a3a; background: transparent; color: #999; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .lang-btn.active { background: #c8973a; color: #0f0f0f; border-color: #c8973a; font-weight: 600; }

        .cat-btn { padding: 10px 18px; border-radius: 50px; border: 1.5px solid #2a2a2a; background: transparent; color: #888; font-size: 14px; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .cat-btn.active { background: #c8973a; color: #0f0f0f; border-color: #c8973a; font-weight: 600; }

        .popular-badge { background: #c8973a22; color: #c8973a; font-size: 11px; padding: 2px 8px; border-radius: 20px; border: 1px solid #c8973a44; font-weight: 500; }

        .cart-fab { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #c8973a; color: #0f0f0f; border: none; border-radius: 50px; padding: 14px 28px; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 24px rgba(200,151,58,0.45); z-index: 50; white-space: nowrap; transition: transform 0.15s, box-shadow 0.15s; width: calc(100% - 48px); max-width: 400px; justify-content: space-between; }
        .cart-fab:active { transform: translateX(-50%) scale(0.97); }

        .divider { height: 1px; background: #222; margin: 0 16px; }

        .note-input { width: 100%; background: #222; border: 1px solid #333; border-radius: 12px; color: #f5f0e8; padding: 12px 14px; font-size: 14px; resize: none; outline: none; font-family: inherit; }
        .note-input:focus { border-color: #c8973a44; }

        .place-btn { background: #c8973a; color: #0f0f0f; border: none; border-radius: 14px; padding: 16px; font-size: 17px; font-weight: 700; cursor: pointer; width: 100%; transition: background 0.15s; font-family: inherit; }
        .place-btn:active { background: #a67c2e; }
        .place-btn:disabled { background: #3a3a3a; color: #666; cursor: not-allowed; }

        .tag { font-size: 10px; padding: 2px 7px; border-radius: 10px; font-weight: 500; }
        .emoji-plate { font-size: 44px; flex-shrink: 0; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #222; border-radius: 14px; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(180deg, #1a1200 0%, #0f0f0f 100%)", padding: "24px 16px 0", borderBottom: "1px solid #222" }}>
        {/* Language switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, justifyContent: isRTL ? "flex-start" : "flex-end" }}>
          {Object.entries(LANG_CONFIG).map(([code, cfg]) => (
            <button key={code} className={`lang-btn${lang === code ? " active" : ""}`} onClick={() => setLang(code)}>{cfg.label}</button>
          ))}
        </div>

        {/* Restaurant identity */}
        <div style={{ textAlign: "center", paddingBottom: 20 }}>
          <div style={{ fontSize: 38, marginBottom: 6 }}>☕</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f5f0e8", letterSpacing: isRTL ? 0 : "-0.5px", marginBottom: 4 }}>
            {MENU_DATA.restaurant.name[lang]}
          </h1>
          <p style={{ color: "#c8973a", fontSize: 14, marginBottom: 10 }}>
            {MENU_DATA.restaurant.tagline[lang]}
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1e1800", border: "1px solid #c8973a44", borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "#c8973a" }}>
            🪑 {t.tableNo} {MENU_DATA.restaurant.table}
          </div>
        </div>

        {/* Category tabs */}
        <div className="cat-scroll" style={{ paddingBottom: 0 }}>
          {MENU_DATA.categories.map((cat) => (
            <button key={cat.id} className={`cat-btn${activeCategory === cat.id ? " active" : ""}`} onClick={() => setActiveCategory(cat.id)}>
              <span>{cat.icon}</span>
              <span>{cat.label[lang]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MENU ITEMS ── */}
      <div style={{ padding: "16px 16px 120px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredItems.map((item) => {
          const qty = cart[item.id] || 0;
          const isPopping = animatingItem === item.id;

          return (
            <div key={item.id} className="item-card">
              {/* Emoji image */}
              <div className="emoji-plate">{item.image}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f5f0e8", lineHeight: 1.3 }}>{item.name[lang]}</h3>
                  {item.popular && <span className="popular-badge">{t.popular}</span>}
                </div>

                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5, marginBottom: 8 }}>{item.desc[lang]}</p>

                {/* Tags */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                  {item.tags.map((tag) => (
                    <span key={tag} className="tag" style={{ background: TAG_COLORS[tag] + "22", color: TAG_COLORS[tag], border: `1px solid ${TAG_COLORS[tag]}44` }}>
                      {TAG_LABELS[lang][tag]}
                    </span>
                  ))}
                  <span style={{ fontSize: 12, color: "#555" }}>⏱ {item.prep} {lang === "en" ? "min" : "خولەک"}</span>
                </div>

                {/* Price + Add/Remove */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#c8973a" }}>{formatPrice(item.price)}</span>

                  {qty === 0 ? (
                    <button className={`add-btn${isPopping ? " pop" : ""}`} onClick={() => addToCart(item.id)}>+</button>
                  ) : (
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                      <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button className={`add-btn${isPopping ? " pop" : ""}`} onClick={() => addToCart(item.id)} style={{ width: 32, height: 32, fontSize: 18 }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CART FAB ── */}
      {cartCount > 0 && !cartOpen && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <span style={{ background: "#0f0f0f33", borderRadius: 20, padding: "2px 10px", fontSize: 14 }}>{cartCount} {t.pieces}</span>
          <span>{t.yourOrder}</span>
          <span style={{ fontSize: 15 }}>{formatPrice(cartTotal)}</span>
        </button>
      )}

      {/* ── CART SHEET ── */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-sheet">
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, background: "#333", borderRadius: 10 }} />
            </div>

            {/* Cart header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 16px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t.yourOrder}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#c8973a22", border: "1px solid #c8973a44", borderRadius: 20, padding: "4px 12px", color: "#c8973a", fontSize: 13 }}>
                🪑 {t.tableNo} {MENU_DATA.restaurant.table}
              </div>
            </div>
            <div className="divider" />

            {/* Cart items */}
            <div style={{ padding: "12px 20px" }}>
              {cartItems.map(([id, qty]) => {
                const item = MENU_DATA.items.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #222" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{item.image}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{item.name[lang]}</div>
                        <div style={{ fontSize: 13, color: "#c8973a" }}>{formatPrice(item.price)}</div>
                      </div>
                    </div>
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => removeFromCart(id)}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                      <button className="qty-btn" style={{ background: "#2a2a2a" }} onClick={() => addToCart(id)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note */}
            <div style={{ padding: "8px 20px 16px" }}>
              <textarea className="note-input" rows={2} placeholder={t.addNote} value={note} onChange={(e) => setNote(e.target.value)} dir={dir} />
            </div>

            <div className="divider" />

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", fontSize: 18, fontWeight: 700 }}>
              <span>{t.total}</span>
              <span style={{ color: "#c8973a" }}>{formatPrice(cartTotal)}</span>
            </div>

            {/* Place order */}
            <div style={{ padding: "0 20px" }}>
              <button className="place-btn" onClick={placeOrder}>{t.sendOrder} →</button>
            </div>
          </div>
        </>
      )}

      {/* ── ORDER CONFIRMED TOAST ── */}
      {confirmed && (
        <>
          <div className="confirm-overlay" />
          <div className="confirm-toast">
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>{t.confirmTitle}</h2>
            <p style={{ color: "#aaa", fontSize: 15 }}>{t.confirmMsg}</p>
            <div style={{ marginTop: 16, fontSize: 13, color: "#555" }}>
              {t.tableNo} {MENU_DATA.restaurant.table} • {new Date().toLocaleTimeString()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}