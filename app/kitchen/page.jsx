"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const STATUS = {
  new:       { label: "New Order",  color: "#ef4444", bg: "#ef444418", next: "preparing", nextLabel: "Start Cooking" },
  preparing: { label: "Preparing",  color: "#f59e0b", bg: "#f59e0b18", next: "ready",     nextLabel: "Mark Ready"    },
  ready:     { label: "Ready",      color: "#22c55e", bg: "#22c55e18", next: "served",    nextLabel: "Mark Served"   },
  served:    { label: "Served",     color: "#6366f1", bg: "#6366f118", next: null,        nextLabel: null            },
};

const getUrgency = (elapsedSec, prepMin) => {
  const ratio = elapsedSec / (prepMin * 60);
  if (ratio >= 1.2)  return { level: "fire",    color: "#ef4444", pulse: true  };
  if (ratio >= 0.85) return { level: "warning", color: "#f59e0b", pulse: false };
  return                    { level: "ok",       color: "#22c55e", pulse: false };
};

const elapsedSec = (createdAt) => Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
const fmtTime = (sec) => `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
const DEFAULT_PREP = 15; // fallback prep time in minutes if not available

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{time.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>;
}

function Timer({ createdAt, prepMin, status }) {
  const [sec, setSec] = useState(elapsedSec(createdAt));
  useEffect(() => {
    if (status === "served") return;
    const t = setInterval(() => setSec(elapsedSec(createdAt)), 1000);
    return () => clearInterval(t);
  }, [createdAt, status]);
  const urg = getUrgency(sec, prepMin);
  const over = sec > prepMin * 60;
  return (
    <span style={{ fontVariantNumeric:"tabular-nums", fontSize:13, fontWeight:700, color: status==="served"?"#555":urg.color, display:"inline-flex", alignItems:"center", gap:4, animation: urg.pulse && status!=="served" ? "pulse 1s ease infinite" : "none" }}>
      {status!=="served" && urg.level==="fire" && "🔥 "}
      {over && status!=="served" && status!=="ready" ? "+" : ""}
      {fmtTime(sec)}
    </span>
  );
}

function StatCard({icon,value,label,color}) {
  return (
    <div style={{background:"#141414",border:"1px solid #222",borderRadius:14,padding:"14px 18px",flex:1,minWidth:0}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:26,fontWeight:800,color:color||"#f5f0e8",fontVariantNumeric:"tabular-nums",lineHeight:1}}>{value}</div>
      <div style={{fontSize:12,color:"#555",marginTop:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
    </div>
  );
}

function OrderCard({ order, onStatusChange, onItemToggle, onDismiss }) {
  const st        = STATUS[order.status] || STATUS.new;
  const prepMin   = Math.max(...(order.order_items?.map(i => i.prep_time_min || DEFAULT_PREP) || [DEFAULT_PREP]));
  const urg       = getUrgency(elapsedSec(order.created_at), prepMin);
  const items     = order.order_items || [];
  const doneCount = items.filter(i => i.is_done).length;
  const allDone   = items.length > 0 && doneCount === items.length;
  const isServed  = order.status === "served";

  return (
    <div style={{ background:"#141414", border:`1.5px solid ${isServed?"#222":urg.level==="fire"&&order.status!=="ready"?"#ef444444":"#232323"}`, borderRadius:18, overflow:"hidden", opacity:isServed?0.55:1, transition:"border-color 0.4s,opacity 0.3s", display:"flex", flexDirection:"column" }}>
      <div style={{ background:st.bg, borderBottom:`1px solid ${st.color}33`, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:st.color,color:"#fff",borderRadius:10,padding:"3px 10px",fontSize:13,fontWeight:800}}>
            T{order.tables?.label?.replace(/[^0-9]/g,"") || "?"}
          </div>
          <div style={{fontSize:12,fontWeight:700,color:st.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>{st.label}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Timer createdAt={order.created_at} prepMin={prepMin} status={order.status}/>
          {isServed && <button onClick={()=>onDismiss(order.id)} style={{background:"transparent",border:"1px solid #333",color:"#555",borderRadius:8,padding:"2px 8px",fontSize:12,cursor:"pointer"}}>✕</button>}
        </div>
      </div>

      <div style={{padding:"12px 16px 8px",flex:1}}>
        {items.map(item=>(
          <div key={item.id} onClick={()=>!isServed&&onItemToggle(item.id, !item.is_done)} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1e1e1e",cursor:isServed?"default":"pointer",opacity:item.is_done?0.45:1,transition:"opacity 0.2s" }}>
            <div style={{ width:20,height:20,borderRadius:6,border:`2px solid ${item.is_done?"#22c55e":"#333"}`,background:item.is_done?"#22c55e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0 }}>
              {item.is_done&&"✓"}
            </div>
            <span style={{flex:1,fontSize:14,fontWeight:500,textDecoration:item.is_done?"line-through":"none",color:item.is_done?"#555":"#f5f0e8"}}>{item.item_name}</span>
            <span style={{fontSize:13,fontWeight:800,color:"#c8973a",background:"#c8973a18",borderRadius:8,padding:"2px 8px"}}>×{item.quantity}</span>
          </div>
        ))}
        {!isServed && items.length > 0 && (
          <div style={{marginTop:10}}>
            <div style={{background:"#1e1e1e",borderRadius:4,height:4,overflow:"hidden"}}>
              <div style={{height:"100%",background:allDone?"#22c55e":"#c8973a",width:`${(doneCount/items.length)*100}%`,transition:"width 0.4s ease,background 0.3s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:11,color:"#444",marginTop:4}}>{doneCount}/{items.length} items ready</div>
          </div>
        )}
      </div>

      {order.note&&(
        <div style={{margin:"0 16px 10px",background:"#1e1800",border:"1px solid #c8973a33",borderRadius:10,padding:"8px 12px",fontSize:13,color:"#c8973a",display:"flex",gap:6}}>
          <span>📝</span><span>{order.note}</span>
        </div>
      )}

      {!isServed&&st.next&&(
        <div style={{padding:"0 16px 14px"}}>
          <button onClick={()=>onStatusChange(order.id,st.next)} disabled={st.label==="Preparing"&&!allDone} style={{ width:"100%",background:(st.label==="Preparing"&&!allDone)?"#1e1e1e":st.color,color:(st.label==="Preparing"&&!allDone)?"#444":"#fff",border:"none",borderRadius:12,padding:"11px",fontSize:14,fontWeight:700,cursor:(st.label==="Preparing"&&!allDone)?"not-allowed":"pointer",fontFamily:"inherit" }}>
            {st.nextLabel} →{st.label==="Preparing"&&!allDone&&` (${items.length-doneCount} left)`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function KitchenDashboard() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [toast, setToast]       = useState(null);
  const [soundOn, setSoundOn]   = useState(true);
  const audioCtx                = useRef(null);

  const beep = useCallback(() => {
    if (!soundOn) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext||window.webkitAudioContext)();
      const ctx = audioCtx.current;
      [0,120,240].forEach(delay=>{
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value=880;
        g.gain.setValueAtTime(0,ctx.currentTime+delay/1000);
        g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+delay/1000+0.01);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay/1000+0.18);
        o.start(ctx.currentTime+delay/1000);
        o.stop(ctx.currentTime+delay/1000+0.2);
      });
    } catch(_) {}
  }, [soundOn]);

  // ── FETCH ORDERS FROM SUPABASE ──────────────────────────
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, tables(label), order_items(*)`)
      .order("created_at", { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── REALTIME SUBSCRIPTION ──────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setToast(`New order received!`);
        beep();
        setTimeout(() => setToast(null), 3500);
        fetchOrders();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, beep]);

  // ── ACTIONS THAT WRITE BACK TO SUPABASE ──────────────────────────
  const handleStatusChange = async (orderId, nextStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o)); // optimistic
    await supabase.from("orders").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
  };

  const handleItemToggle = async (itemId, isDone) => {
    setOrders(prev => prev.map(o => ({
      ...o,
      order_items: o.order_items?.map(i => i.id === itemId ? { ...i, is_done: isDone } : i)
    })));
    await supabase.from("order_items").update({ is_done: isDone }).eq("id", itemId);
  };

  const handleDismiss = async (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    // Served orders stay in DB for history — just hide from view by filtering locally.
    // To permanently archive, you could add an `is_archived` column instead of deleting.
  };

  const newCount    = orders.filter(o=>o.status==="new").length;
  const prepCount   = orders.filter(o=>o.status==="preparing").length;
  const readyCount  = orders.filter(o=>o.status==="ready").length;
  const servedCount = orders.filter(o=>o.status==="served").length;
  const active      = orders.filter(o=>o.status!=="served");

  const filtered = filter==="all" ? active
    : filter==="served" ? orders.filter(o=>o.status==="served")
    : orders.filter(o=>o.status===filter);

  const FILTERS = [
    {key:"all",       label:`Active (${active.length})`},
    {key:"new",       label:`New (${newCount})`},
    {key:"preparing", label:`Cooking (${prepCount})`},
    {key:"ready",     label:`Ready (${readyCount})`},
    {key:"served",    label:`Served (${servedCount})`},
  ];

  const hasOverdue = orders.some(o=>{
    if (o.status==="served"||o.status==="ready") return false;
    const prepMin = Math.max(...(o.order_items?.map(i=>i.prep_time_min||DEFAULT_PREP) || [DEFAULT_PREP]));
    return getUrgency(elapsedSec(o.created_at),prepMin).level==="fire";
  });

  if (loading) {
    return (
      <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#c8973a",fontFamily:"sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>🍽️</div>
          <div>Loading kitchen orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:"#0a0a0a",minHeight:"100vh",color:"#f5f0e8",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;background:#111}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:4px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        .filter-btn{padding:8px 16px;border-radius:10px;border:1.5px solid #222;background:transparent;color:#555;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.18s;font-family:inherit}
        .filter-btn:hover{border-color:#333;color:#888}
        .filter-btn.active{background:#c8973a;color:#0a0a0a;border-color:#c8973a}
        .icon-btn{background:#1a1a1a;border:1px solid #2a2a2a;color:#888;border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;gap:6px;font-weight:500}
        .icon-btn:hover{border-color:#3a3a3a;color:#bbb}
        .icon-btn.active{border-color:#c8973a55;color:#c8973a;background:#c8973a11}
        .toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ef4444;color:white;padding:12px 24px;border-radius:50px;font-weight:700;font-size:15px;z-index:999;box-shadow:0 4px 24px #ef444466;animation:slideDown 0.35s ease;white-space:nowrap}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#333;gap:12px}
        .header{background:#0f0f0f;border-bottom:1px solid #1a1a1a;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:50}
      `}</style>

      {toast&&<div className="toast">🔔 {toast}</div>}

      <div className="header">
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:22}}>🍽️</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,letterSpacing:"-0.3px"}}>Kitchen Display</div>
            <div style={{fontSize:11,color:"#444",fontWeight:500}}>Zarin Café — Live Orders (Supabase)</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{display:"flex",gap:14,fontSize:12,color:"#444"}}>
            <span style={{color:"#22c55e"}}>● On time</span>
            <span style={{color:"#f59e0b"}}>● Delayed</span>
            <span style={{color:"#ef4444"}}>🔥 Overdue</span>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#888"}}><LiveClock/></div>
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:1600,margin:"0 auto"}}>
        <div style={{display:"flex",gap:12,marginBottom:20}}>
          <StatCard icon="🆕" value={newCount}    label="New"     color="#ef4444"/>
          <StatCard icon="👨‍🍳" value={prepCount} label="Cooking" color="#f59e0b"/>
          <StatCard icon="✅" value={readyCount}  label="Ready"   color="#22c55e"/>
          <StatCard icon="🍽️" value={servedCount} label="Served"  color="#6366f1"/>
          <StatCard icon="📋" value={orders.length} label="Total" color="#c8973a"/>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {FILTERS.map(f=>(
              <button key={f.key} className={`filter-btn${filter===f.key?" active":""}`} onClick={()=>setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className={`icon-btn${soundOn?" active":""}`} onClick={()=>setSoundOn(p=>!p)}>{soundOn?"🔔":"🔕"} Sound</button>
            <button className="icon-btn" onClick={fetchOrders}>🔄 Refresh</button>
          </div>
        </div>

        {hasOverdue&&(
          <div style={{background:"#ef444411",border:"1px solid #ef444444",borderRadius:12,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,fontSize:14,color:"#ef4444",fontWeight:600,animation:"pulse 1.5s ease infinite"}}>
            🔥 Some orders are overdue — check the highlighted cards below!
          </div>
        )}

        {filtered.length===0?(
          <div className="empty">
            <div style={{fontSize:48}}>{filter==="served"?"🍽️":"🧘"}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#2a2a2a"}}>{filter==="served"?"No served orders yet":"All clear — kitchen is quiet"}</div>
            <div style={{fontSize:13,color:"#2a2a2a"}}>New orders from customers will appear here instantly</div>
          </div>
        ):(
          <div className="grid">
            {filtered.map(order=>(
              <div key={order.id} style={{animation:"fadeIn 0.3s ease"}}>
                <OrderCard order={order} onStatusChange={handleStatusChange} onItemToggle={handleItemToggle} onDismiss={handleDismiss}/>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:32,paddingTop:16,borderTop:"1px solid #1a1a1a",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"#2e2e2e"}}>
          <span>Zarin Café Kitchen v2.0 — Live</span>
          <span>Connected to Supabase Realtime</span>
          <span>© 2025</span>
        </div>
      </div>
    </div>
  );
}