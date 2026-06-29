"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS = {
  NEW:        { key: "new",        label: "New Order",   color: "#ef4444", bg: "#ef444418", next: "preparing", nextLabel: "Start Cooking" },
  PREPARING:  { key: "preparing",  label: "Preparing",   color: "#f59e0b", bg: "#f59e0b18", next: "ready",     nextLabel: "Mark Ready"    },
  READY:      { key: "ready",      label: "Ready",       color: "#22c55e", bg: "#22c55e18", next: "served",    nextLabel: "Mark Served"   },
  SERVED:     { key: "served",     label: "Served",      color: "#6366f1", bg: "#6366f118", next: null,        nextLabel: null            },
};

const URGENCY = (elapsed, prep) => {
  const ratio = elapsed / (prep * 60);
  if (ratio >= 1.2)  return { level: "fire",    color: "#ef4444", pulse: true  };
  if (ratio >= 0.85) return { level: "warning", color: "#f59e0b", pulse: false };
  return                     { level: "ok",      color: "#22c55e", pulse: false };
};

// ─── MOCK SEED DATA ───────────────────────────────────────────────────────────
const seed = () => {
  const now = Date.now();
  return [
    {
      id: "ORD-001", table: "3", status: "new", note: "No onions please",
      placedAt: now - 2 * 60000,
      items: [
        { id: "i1", name: "Kurdish Kebab 🍢", qty: 2, prep: 20, done: false },
        { id: "i2", name: "Kurdish Tea 🫖",   qty: 3, prep: 5,  done: false },
      ],
    },
    {
      id: "ORD-002", table: "7", status: "preparing", note: "",
      placedAt: now - 14 * 60000,
      items: [
        { id: "i3", name: "Kurdish Dolma 🫑", qty: 1, prep: 15, done: true  },
        { id: "i4", name: "Lentil Soup 🍜",   qty: 2, prep: 10, done: false },
        { id: "i5", name: "Doogh 🥛",         qty: 2, prep: 3,  done: true  },
      ],
    },
    {
      id: "ORD-003", table: "1", status: "preparing", note: "Extra spicy",
      placedAt: now - 22 * 60000,
      items: [
        { id: "i6", name: "Meat Tikka 🥩",    qty: 3, prep: 18, done: false },
        { id: "i7", name: "Kurdish Rice 🍚",  qty: 3, prep: 20, done: false },
      ],
    },
    {
      id: "ORD-004", table: "5", status: "ready", note: "",
      placedAt: now - 28 * 60000,
      items: [
        { id: "i8",  name: "Grilled Chicken 🍗", qty: 1, prep: 25, done: true },
        { id: "i9",  name: "Baklava 🍯",         qty: 2, prep: 5,  done: true },
        { id: "i10", name: "Fresh Pomegranate 🍹",qty: 1, prep: 5,  done: true },
      ],
    },
    {
      id: "ORD-005", table: "9", status: "served", note: "",
      placedAt: now - 45 * 60000,
      items: [
        { id: "i11", name: "Kurdish Dolma 🫑", qty: 2, prep: 15, done: true },
        { id: "i12", name: "Kurdish Tea 🫖",   qty: 4, prep: 5,  done: true },
      ],
    },
  ];
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const elapsed = (placedAt) => Math.floor((Date.now() - placedAt) / 1000);
const fmtTime = (sec) => {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};
const fmtClock = (date) => date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const maxPrep = (order) => Math.max(...order.items.map(i => i.prep));

let nextId = 6;
const makeOrder = () => {
  const tables = ["2","4","6","8","10","11","12"];
  const menu = [
    { name: "Kurdish Kebab 🍢", prep: 20 },
    { name: "Lentil Soup 🍜",   prep: 10 },
    { name: "Kurdish Tea 🫖",   prep: 5  },
    { name: "Baklava 🍯",       prep: 5  },
    { name: "Grilled Chicken 🍗",prep: 25 },
    { name: "Meat Tikka 🥩",    prep: 18 },
    { name: "Doogh 🥛",         prep: 3  },
  ];
  const count = Math.floor(Math.random() * 3) + 1;
  const items = Array.from({ length: count }, (_, k) => {
    const m = menu[Math.floor(Math.random() * menu.length)];
    return { id: `ni${Date.now()}${k}`, name: m.name, qty: Math.ceil(Math.random()*3), prep: m.prep, done: false };
  });
  return {
    id: `ORD-00${nextId++}`,
    table: tables[Math.floor(Math.random() * tables.length)],
    status: "new",
    note: Math.random() > 0.6 ? "Extra sauce please" : "",
    placedAt: Date.now(),
    items,
  };
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtClock(time)}</span>;
}

function Timer({ placedAt, prepMin, status }) {
  const [sec, setSec] = useState(elapsed(placedAt));
  useEffect(() => {
    if (status === "served") return;
    const t = setInterval(() => setSec(elapsed(placedAt)), 1000);
    return () => clearInterval(t);
  }, [placedAt, status]);

  const urg = URGENCY(sec, prepMin);
  const over = sec > prepMin * 60;

  return (
    <span style={{
      fontVariantNumeric: "tabular-nums",
      fontSize: 13,
      fontWeight: 700,
      color: status === "served" ? "#555" : urg.color,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      animation: urg.pulse && status !== "served" ? "pulse 1s ease infinite" : "none",
    }}>
      {status !== "served" && urg.level === "fire" && "🔥 "}
      {over && status !== "served" && status !== "ready" ? "+" : ""}
      {fmtTime(sec)}
    </span>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 14, padding: "14px 18px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || "#f5f0e8", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#555", marginTop: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

function OrderCard({ order, onStatusChange, onItemToggle, onDismiss }) {
  const st = STATUS[order.status.toUpperCase()];
  const prep = maxPrep(order);
  const urg = URGENCY(elapsed(order.placedAt), prep);
  const doneCount = order.items.filter(i => i.done).length;
  const allDone = doneCount === order.items.length;
  const isServed = order.status === "served";

  return (
    <div style={{
      background: "#141414",
      border: `1.5px solid ${isServed ? "#222" : urg.level === "fire" && order.status !== "ready" ? "#ef444444" : "#232323"}`,
      borderRadius: 18,
      overflow: "hidden",
      opacity: isServed ? 0.55 : 1,
      transition: "border-color 0.4s, opacity 0.3s",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Card header */}
      <div style={{ background: st.bg, borderBottom: `1px solid ${st.color}33`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: st.color, color: "#fff", borderRadius: 10, padding: "3px 10px", fontSize: 13, fontWeight: 800 }}>
            T{order.table}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {st.label}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Timer placedAt={order.placedAt} prepMin={prep} status={order.status} />
          {isServed && (
            <button onClick={() => onDismiss(order.id)} style={{ background: "transparent", border: "1px solid #333", color: "#555", borderRadius: 8, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: "12px 16px 8px", flex: 1 }}>
        {order.items.map(item => (
          <div
            key={item.id}
            onClick={() => !isServed && onItemToggle(order.id, item.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: "1px solid #1e1e1e", cursor: isServed ? "default" : "pointer",
              opacity: item.done ? 0.45 : 1, transition: "opacity 0.2s",
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              border: `2px solid ${item.done ? "#22c55e" : "#333"}`,
              background: item.done ? "#22c55e" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, flexShrink: 0, transition: "all 0.2s",
            }}>
              {item.done && "✓"}
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: item.done ? "line-through" : "none", color: item.done ? "#555" : "#f5f0e8" }}>
              {item.name}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#c8973a", background: "#c8973a18", borderRadius: 8, padding: "2px 8px" }}>
              ×{item.qty}
            </span>
            <span style={{ fontSize: 11, color: "#444" }}>⏱{item.prep}m</span>
          </div>
        ))}

        {/* Progress bar */}
        {!isServed && (
          <div style={{ marginTop: 10 }}>
            <div style={{ background: "#1e1e1e", borderRadius: 4, height: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: allDone ? "#22c55e" : "#c8973a",
                width: `${(doneCount / order.items.length) * 100}%`,
                transition: "width 0.4s ease, background 0.3s",
                borderRadius: 4,
              }} />
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{doneCount}/{order.items.length} items ready</div>
          </div>
        )}
      </div>

      {/* Note */}
      {order.note && (
        <div style={{ margin: "0 16px 10px", background: "#1e1800", border: "1px solid #c8973a33", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#c8973a", display: "flex", gap: 6 }}>
          <span>📝</span><span>{order.note}</span>
        </div>
      )}

      {/* Action button */}
      {!isServed && st.next && (
        <div style={{ padding: "0 16px 14px" }}>
          <button
            onClick={() => onStatusChange(order.id, st.next)}
            disabled={st.key === "preparing" && !allDone}
            style={{
              width: "100%", background: (st.key === "preparing" && !allDone) ? "#1e1e1e" : st.color,
              color: (st.key === "preparing" && !allDone) ? "#444" : "#fff",
              border: "none", borderRadius: 12, padding: "11px", fontSize: 14,
              fontWeight: 700, cursor: (st.key === "preparing" && !allDone) ? "not-allowed" : "pointer",
              transition: "background 0.2s, color 0.2s", fontFamily: "inherit",
            }}
          >
            {st.nextLabel} →
            {st.key === "preparing" && !allDone && ` (${order.items.length - doneCount} left)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function KitchenDashboard() {
  const [orders, setOrders]         = useState(seed());
  const [filter, setFilter]         = useState("all");
  const [newToast, setNewToast]     = useState(null);
  const [soundOn, setSoundOn]       = useState(true);
  const [autoSim, setAutoSim]       = useState(true);
  const audioCtx                    = useRef(null);
  const simTimer                    = useRef(null);

  // Beep via Web Audio API
  const beep = useCallback(() => {
    if (!soundOn) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      [0, 120, 240].forEach(delay => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880;
        g.gain.setValueAtTime(0, ctx.currentTime + delay/1000);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay/1000 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay/1000 + 0.18);
        o.start(ctx.currentTime + delay/1000);
        o.stop(ctx.currentTime + delay/1000 + 0.2);
      });
    } catch(_) {}
  }, [soundOn]);

  // Simulate incoming orders
  useEffect(() => {
    if (!autoSim) { clearInterval(simTimer.current); return; }
    simTimer.current = setInterval(() => {
      const order = makeOrder();
      setOrders(prev => [order, ...prev]);
      setNewToast(`New order — Table ${order.table}`);
      beep();
      setTimeout(() => setNewToast(null), 3500);
    }, 18000);
    return () => clearInterval(simTimer.current);
  }, [autoSim, beep]);

  const handleStatusChange = (id, next) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
  };

  const handleItemToggle = (orderId, itemId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, items: o.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
        : o
    ));
  };

  const handleDismiss = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const addManualOrder = () => {
    const order = makeOrder();
    setOrders(prev => [order, ...prev]);
    setNewToast(`New order — Table ${order.table}`);
    beep();
    setTimeout(() => setNewToast(null), 3500);
  };

  // Stats
  const active   = orders.filter(o => o.status !== "served");
  const newCount = orders.filter(o => o.status === "new").length;
  const prepCount= orders.filter(o => o.status === "preparing").length;
  const readyCount=orders.filter(o => o.status === "ready").length;
  const servedToday=orders.filter(o => o.status === "served").length;

  const filtered = filter === "all"
    ? orders.filter(o => o.status !== "served")
    : filter === "served"
    ? orders.filter(o => o.status === "served")
    : orders.filter(o => o.status === filter);

  const FILTERS = [
    { key: "all",       label: `Active (${active.length})` },
    { key: "new",       label: `New (${newCount})` },
    { key: "preparing", label: `Cooking (${prepCount})` },
    { key: "ready",     label: `Ready (${readyCount})` },
    { key: "served",    label: `Served (${servedToday})` },
  ];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f5f0e8", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: #111; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes slideDown { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }

        .filter-btn { padding: 8px 16px; border-radius: 10px; border: 1.5px solid #222; background: transparent; color: #555; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.18s; font-family: inherit; }
        .filter-btn:hover { border-color: #333; color: #888; }
        .filter-btn.active { background: #c8973a; color: #0a0a0a; border-color: #c8973a; }

        .icon-btn { background: #1a1a1a; border: 1px solid #2a2a2a; color: #888; border-radius: 10px; padding: 8px 14px; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; gap: 6px; font-weight: 500; }
        .icon-btn:hover { border-color: #3a3a3a; color: #bbb; }
        .icon-btn.active { border-color: #c8973a55; color: #c8973a; background: #c8973a11; }

        .new-order-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 12px 24px; border-radius: 50px; font-weight: 700; font-size: 15px; z-index: 999; box-shadow: 0 4px 24px #ef444466; animation: slideDown 0.35s ease; white-space: nowrap; display: flex; align-items: center; gap: 8px; }

        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; color: #333; gap: 12px; }

        .header-bar { background: #0f0f0f; border-bottom: 1px solid #1a1a1a; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 60px; position: sticky; top: 0; z-index: 50; }
      `}</style>

      {/* New Order Toast */}
      {newToast && (
        <div className="new-order-toast">
          🔔 {newToast}
        </div>
      )}

      {/* ── HEADER BAR ── */}
      <div className="header-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 22 }}>🍽️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>Kitchen Display</div>
            <div style={{ fontSize: 11, color: "#444", fontWeight: 500 }}>Zarin Café — Live Orders</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Urgency legend */}
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#444" }}>
            <span style={{ color: "#22c55e" }}>● On time</span>
            <span style={{ color: "#f59e0b" }}>● Delayed</span>
            <span style={{ color: "#ef4444" }}>🔥 Overdue</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#888", fontVariantNumeric: "tabular-nums" }}>
            <LiveClock />
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1600, margin: "0 auto" }}>

        {/* ── STATS ROW ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <StatCard icon="🆕" value={newCount}    label="New"      color="#ef4444" />
          <StatCard icon="👨‍🍳" value={prepCount}  label="Cooking"  color="#f59e0b" />
          <StatCard icon="✅" value={readyCount}  label="Ready"    color="#22c55e" />
          <StatCard icon="🍽️" value={servedToday} label="Served"   color="#6366f1" />
          <StatCard icon="📋" value={orders.length} label="Total"  color="#c8973a" />
        </div>

        {/* ── TOOLBAR ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} className={`filter-btn${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`icon-btn${soundOn ? " active" : ""}`} onClick={() => setSoundOn(p => !p)}>
              {soundOn ? "🔔" : "🔕"} Sound
            </button>
            <button className={`icon-btn${autoSim ? " active" : ""}`} onClick={() => setAutoSim(p => !p)}>
              {autoSim ? "⏸" : "▶"} Auto-sim
            </button>
            <button className="icon-btn" onClick={addManualOrder} style={{ background: "#ef44440f", borderColor: "#ef444433", color: "#ef4444" }}>
              + New Order
            </button>
          </div>
        </div>

        {/* ── FIRE ALERT BANNER ── */}
        {orders.some(o => {
          const urg = URGENCY(elapsed(o.placedAt), maxPrep(o));
          return urg.level === "fire" && o.status !== "served" && o.status !== "ready";
        }) && (
          <div style={{
            background: "#ef444411", border: "1px solid #ef444444", borderRadius: 12,
            padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
            fontSize: 14, color: "#ef4444", fontWeight: 600, animation: "pulse 1.5s ease infinite",
          }}>
            🔥 Some orders are overdue — check the highlighted cards below!
          </div>
        )}

        {/* ── ORDERS GRID ── */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>{filter === "served" ? "🍽️" : "🧘"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#2a2a2a" }}>
              {filter === "served" ? "No served orders yet" : "All clear — kitchen is quiet"}
            </div>
            <div style={{ fontSize: 14, color: "#2a2a2a" }}>
              {filter === "served" ? "Served orders will appear here" : "New orders will appear here instantly"}
            </div>
          </div>
        ) : (
          <div className="orders-grid">
            {filtered.map(order => (
              <div key={order.id} style={{ animation: "fadeIn 0.3s ease" }}>
                <OrderCard
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemToggle={handleItemToggle}
                  onDismiss={handleDismiss}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#2e2e2e" }}>
          <span>Zarin Café Kitchen System v1.0</span>
          <span>Auto-refresh: live WebSocket (simulated)</span>
          <span>© 2025 — All rights reserved</span>
        </div>
      </div>
    </div>
  );
}