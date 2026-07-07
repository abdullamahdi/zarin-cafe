"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function QRGenerator() {
  const [tables, setTables]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [baseUrl, setBaseUrl]     = useState("");
  const [selected, setSelected]   = useState(null); // for big preview
  const [style, setStyle]         = useState("dark"); // dark | light | gold
  const canvasRefs                = useRef({});

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data } = await supabase.from("tables").select("*").order("label");
    setTables(data || []);
    setLoading(false);
  };

  // Generate QR code using the free QR API
  const getQRUrl = (token) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseUrl}/?table=${token}`)}&bgcolor=${style==="light"?"ffffff":"1a1a1a"}&color=${style==="gold"?"c8973a":style==="light"?"1a1a1a":"ffffff"}&margin=10&format=png`;

  const downloadQR = async (table) => {
    const url = getQRUrl(table.qr_token);
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `QR-${table.label.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const downloadAllQRs = async () => {
    for (const table of tables) {
      await downloadQR(table);
      await new Promise(r => setTimeout(r, 500)); // small delay between downloads
    }
  };

  const printQR = (table) => {
    const url = getQRUrl(table.qr_token);
    const menuUrl = `${baseUrl}/?table=${table.qr_token}`;
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${table.label}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { text-align: center; padding: 40px; border: 2px solid #1a1a1a; border-radius: 20px; max-width: 320px; }
          .cafe-name { font-size: 22px; font-weight: 800; color: #1a1a1a; margin-bottom: 4px; }
          .table-name { font-size: 16px; color: #c8973a; font-weight: 700; margin-bottom: 20px; }
          img { width: 220px; height: 220px; margin: 0 auto 20px; display: block; }
          .instruction { font-size: 13px; color: #666; margin-bottom: 12px; line-height: 1.5; }
          .url { font-size: 10px; color: #aaa; word-break: break-all; font-family: monospace; }
          .divider { height: 1px; background: #eee; margin: 16px 0; }
          @media print { body { margin: 0; } .card { border: 2px solid #1a1a1a; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="cafe-name">☕ Zarin Café</div>
          <div class="table-name">${table.label}</div>
          <img src="${url}" alt="QR Code"/>
          <div class="divider"></div>
          <div class="instruction">📱 Scan to view our menu<br/>and place your order</div>
          <div class="url">${menuUrl}</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const printAll = () => {
    const cards = tables.map(table => {
      const url = getQRUrl(table.qr_token);
      const menuUrl = `${baseUrl}/?table=${table.qr_token}`;
      return `
        <div class="card">
          <div class="cafe-name">☕ Zarin Café</div>
          <div class="table-name">${table.label}</div>
          <img src="${url}" alt="QR Code"/>
          <div class="divider"></div>
          <div class="instruction">📱 Scan to view our menu<br/>and place your order</div>
          <div class="url">${menuUrl}</div>
        </div>
      `;
    }).join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>All QR Codes - Zarin Café</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: white; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .card { text-align: center; padding: 24px; border: 1.5px solid #1a1a1a; border-radius: 16px; }
          .cafe-name { font-size: 16px; font-weight: 800; color: #1a1a1a; margin-bottom: 2px; }
          .table-name { font-size: 13px; color: #c8973a; font-weight: 700; margin-bottom: 14px; }
          img { width: 160px; height: 160px; margin: 0 auto 14px; display: block; }
          .instruction { font-size: 11px; color: #666; margin-bottom: 8px; line-height: 1.4; }
          .url { font-size: 8px; color: #aaa; word-break: break-all; font-family: monospace; }
          .divider { height: 1px; background: #eee; margin: 12px 0; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="grid">${cards}</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const STYLES = [
    { key: "dark",  label: "Dark",  bg: "#1a1a1a", fg: "#ffffff" },
    { key: "light", label: "Light", bg: "#ffffff", fg: "#1a1a1a" },
    { key: "gold",  label: "Gold",  bg: "#1a1a1a", fg: "#c8973a" },
  ];

  if (loading) return (
    <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#c8973a",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📱</div><div>Loading tables...</div></div>
    </div>
  );

  return (
    <div style={{background:"#0a0a0a",minHeight:"100vh",color:"#f5f0e8",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .btn{padding:10px 18px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px}
        .btn-primary{background:#c8973a;color:#0a0a0a}
        .btn-primary:hover{background:#a67c2e}
        .btn-ghost{background:#1a1a1a;color:#888;border:1px solid #2a2a2a}
        .btn-ghost:hover{border-color:#3a3a3a;color:#bbb}
        .btn-green{background:#22c55e22;color:#22c55e;border:1px solid #22c55e44}
        .btn-green:hover{background:#22c55e33}
        .card{background:#141414;border:1px solid #222;border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px;transition:border-color 0.2s}
        .card:hover{border-color:#c8973a44}
        .style-btn{padding:8px 16px;border-radius:20px;border:1.5px solid #2a2a2a;background:transparent;color:#555;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s}
        .style-btn.active{background:#c8973a;color:#0a0a0a;border-color:#c8973a}
        .qr-img{border-radius:12px;transition:transform 0.2s}
        .qr-img:hover{transform:scale(1.03)}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:#141414;border:1px solid #2a2a2a;border-radius:24px;padding:32px;text-align:center;max-width:420px;width:100%}
        @keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#0f0f0f",borderBottom:"1px solid #1a1a1a",padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>📱</span>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>QR Code Generator</div>
            <div style={{fontSize:11,color:"#444"}}>Zarin Café — {tables.length} tables</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <a href="/admin" style={{textDecoration:"none"}}>
            <button className="btn btn-ghost" style={{fontSize:13}}>← Admin</button>
          </a>
          <button className="btn btn-ghost" onClick={downloadAllQRs} style={{fontSize:13}}>⬇️ Download All</button>
          <button className="btn btn-primary" onClick={printAll}>🖨️ Print All</button>
        </div>
      </div>

      <div style={{padding:"24px",maxWidth:1400,margin:"0 auto"}}>

        {/* QR STYLE SELECTOR */}
        <div style={{background:"#141414",border:"1px solid #222",borderRadius:16,padding:"20px 24px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>QR Code Style</div>
            <div style={{fontSize:13,color:"#555"}}>Choose the look for your printed QR codes</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {STYLES.map(s=>(
              <button key={s.key} className={`style-btn${style===s.key?" active":""}`} onClick={()=>setStyle(s.key)}>
                <span style={{display:"inline-block",width:12,height:12,borderRadius:3,background:s.bg,border:`1px solid ${s.fg}33`,marginRight:6,verticalAlign:"middle"}}/>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div style={{display:"flex",gap:12,marginBottom:24}}>
          {[
            {icon:"🪑",value:tables.length,label:"Total Tables",color:"#c8973a"},
            {icon:"✅",value:tables.filter(t=>t.is_active).length,label:"Active",color:"#22c55e"},
            {icon:"📱",value:tables.length,label:"QR Codes Ready",color:"#6366f1"},
          ].map(s=>(
            <div key={s.label} style={{background:"#141414",border:"1px solid #222",borderRadius:14,padding:"14px 18px",flex:1}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:26,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,color:"#444",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* QR GRID */}
        {tables.length === 0 ? (
          <div style={{textAlign:"center",padding:"80px 20px",color:"#333"}}>
            <div style={{fontSize:48,marginBottom:12}}>🪑</div>
            <div style={{fontSize:18,fontWeight:700,color:"#2a2a2a"}}>No tables yet</div>
            <div style={{fontSize:14,marginTop:8}}>
              <a href="/admin" style={{color:"#c8973a"}}>Go to Admin Panel</a> and add tables first
            </div>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
            {tables.map(table => (
              <div key={table.id} className="card">
                {/* QR Code Image */}
                <img
                  src={getQRUrl(table.qr_token)}
                  alt={`QR for ${table.label}`}
                  className="qr-img"
                  style={{width:160,height:160,cursor:"pointer"}}
                  onClick={()=>setSelected(table)}
                />

                {/* Table info */}
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>{table.label}</div>
                  <div style={{fontSize:11,color:table.is_active?"#22c55e":"#ef4444",marginBottom:8}}>
                    {table.is_active?"● Active":"● Inactive"}
                  </div>
                  <div style={{fontSize:10,color:"#333",fontFamily:"monospace",background:"#111",borderRadius:6,padding:"4px 8px",wordBreak:"break-all"}}>
                    /?table={table.qr_token}
                  </div>
                </div>

                {/* Actions */}
                <div style={{display:"flex",gap:6,width:"100%"}}>
                  <button className="btn btn-ghost" style={{flex:1,fontSize:12,justifyContent:"center"}} onClick={()=>setSelected(table)}>
                    🔍 Preview
                  </button>
                  <button className="btn btn-ghost" style={{flex:1,fontSize:12,justifyContent:"center"}} onClick={()=>printQR(table)}>
                    🖨️ Print
                  </button>
                  <button className="btn btn-green" style={{flex:1,fontSize:12,justifyContent:"center"}} onClick={()=>downloadQR(table)}>
                    ⬇️
                  </button>
                </div>

                {/* Test link */}
                <a href={`/?table=${table.qr_token}`} target="_blank" style={{textDecoration:"none",width:"100%"}}>
                  <button className="btn btn-ghost" style={{width:"100%",fontSize:12,justifyContent:"center"}}>
                    👁️ Test this table's menu
                  </button>
                </a>
              </div>
            ))}
          </div>
        )}

        {/* HOW TO USE */}
        <div style={{marginTop:32,background:"#141414",border:"1px solid #222",borderRadius:16,padding:24}}>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>📋 How to Use These QR Codes</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
            {[
              {step:"1",icon:"🖨️",title:"Print",desc:"Click 'Print' on each table or 'Print All' for all at once"},
              {step:"2",icon:"✂️",title:"Cut & Laminate",desc:"Cut out each card and laminate it for durability"},
              {step:"3",icon:"🪑",title:"Place on Tables",desc:"Put each QR card on its matching table"},
              {step:"4",icon:"📱",title:"Customers Scan",desc:"Customers scan with phone camera — no app needed!"},
            ].map(s=>(
              <div key={s.step} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{background:"#c8973a22",color:"#c8973a",borderRadius:10,padding:"8px",fontSize:20,flexShrink:0}}>{s.icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{s.title}</div>
                  <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BIG PREVIEW MODAL */}
      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal" style={{animation:"fadeIn 0.25s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>{selected.label}</div>
            <div style={{fontSize:13,color:"#555",marginBottom:20}}>Scan with your phone to test</div>
            <img
              src={getQRUrl(selected.qr_token)}
              alt={selected.label}
              style={{width:240,height:240,borderRadius:16,marginBottom:20}}
            />
            <div style={{background:"#111",borderRadius:10,padding:"10px 14px",fontSize:11,color:"#555",fontFamily:"monospace",marginBottom:20,wordBreak:"break-all"}}>
              {baseUrl}/?table={selected.qr_token}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="btn btn-ghost" onClick={()=>setSelected(null)}>Close</button>
              <button className="btn btn-ghost" onClick={()=>printQR(selected)}>🖨️ Print</button>
              <button className="btn btn-primary" onClick={()=>downloadQR(selected)}>⬇️ Download PNG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}