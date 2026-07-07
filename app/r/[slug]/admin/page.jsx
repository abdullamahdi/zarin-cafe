"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/app/components/LogoutButton";
import ImageUploader from "@/app/components/ImageUploader";

const TABS = [
  { key: "menu",       label: "Menu Items",  icon: "🍽️" },
  { key: "categories", label: "Categories",  icon: "📂" },
  { key: "tables",     label: "Tables",      icon: "🪑" },
  { key: "orders",     label: "Orders",      icon: "📋" },
];

const EMPTY_ITEM = { name_ku:"", name_ar:"", name_en:"", desc_ku:"", desc_ar:"", desc_en:"", price:"", image_emoji:"🍽️", image_url:"", prep_time_min:10, is_available:true, is_popular:false, tags:[], category_id:"", sort_order:0 };
const EMPTY_CAT  = { name_ku:"", name_ar:"", name_en:"", icon:"🍽️", sort_order:0, is_active:true };
const TAG_OPTIONS = ["halal","vegan","vegetarian","spicy"];
const STATUS_COLORS = { new:"#ef4444", preparing:"#f59e0b", ready:"#22c55e", served:"#6366f1" };

export default function TenantAdmin() {
  const params = useParams();
  const slug = params.slug;

  const [restaurant, setRestaurant] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [tab, setTab]             = useState("menu");
  const [items, setItems]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables]       = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  const [itemModal, setItemModal] = useState(null);
  const [catModal, setCatModal]   = useState(null);
  const [tblModal, setTblModal]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [itemForm, setItemForm]   = useState(EMPTY_ITEM);
  const [catForm, setCatForm]     = useState(EMPTY_CAT);
  const [tblForm, setTblForm]     = useState({ label:"", qr_token:"" });

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchAll = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: rest, error: restErr } = await supabase.from("restaurants").select("*").eq("slug", slug).single();

    if (restErr || !rest) {
      setDebugInfo({ step: "restaurant lookup failed", slug, restErr: restErr?.message, userId: user?.id });
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const { data: superAdmin, error: saErr } = await supabase.from("super_admins").select("user_id").eq("user_id", user?.id).maybeSingle();
    const isOwner = rest.owner_id === user?.id;

    if (!isOwner && !superAdmin) {
      setDebugInfo({ step: "permission check failed", userId: user?.id, restOwnerId: rest.owner_id, superAdmin, saErr: saErr?.message, isOwner });
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setRestaurant(rest);

    const [catRes, itemRes, tblRes, ordRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("restaurant_id", rest.id).order("sort_order"),
      supabase.from("menu_items").select("*, menu_categories(name_en)").eq("restaurant_id", rest.id).order("sort_order"),
      supabase.from("tables").select("*").eq("restaurant_id", rest.id).order("label"),
      supabase.from("orders").select("*, tables(label), order_items(*)").eq("restaurant_id", rest.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setCategories(catRes.data || []);
    setItems(itemRes.data || []);
    setTables(tblRes.data || []);
    setOrders(ordRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (slug) fetchAll(); }, [slug]);

  const openNewItem = () => { setItemForm({ ...EMPTY_ITEM }); setItemModal("new"); };
  const openEditItem = (item) => { setItemForm({ ...item, tags: item.tags || [], price: String(item.price), image_url: item.image_url || "" }); setItemModal(item); };

  const saveItem = async () => {
    setSaving(true);
    const payload = { ...itemForm, price: parseFloat(itemForm.price) || 0, restaurant_id: restaurant.id };
    delete payload.menu_categories;
    let error;
    if (itemModal === "new") ({ error } = await supabase.from("menu_items").insert(payload));
    else ({ error } = await supabase.from("menu_items").update(payload).eq("id", itemModal.id));
    setSaving(false);
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    showToast(itemModal === "new" ? "Item added! ✅" : "Item updated! ✅");
    setItemModal(null);
    fetchAll();
  };

  const toggleAvailable = async (item) => {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
  };

  const deleteItem = async (id) => {
    await supabase.from("menu_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleteConfirm(null);
    showToast("Item deleted");
  };

  const openNewCat = () => { setCatForm({ ...EMPTY_CAT }); setCatModal("new"); };
  const openEditCat = (cat) => { setCatForm({ ...cat }); setCatModal(cat); };

  const saveCat = async () => {
    setSaving(true);
    const payload = { ...catForm, restaurant_id: restaurant.id };
    let error;
    if (catModal === "new") ({ error } = await supabase.from("menu_categories").insert(payload));
    else ({ error } = await supabase.from("menu_categories").update(payload).eq("id", catModal.id));
    setSaving(false);
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    showToast(catModal === "new" ? "Category added! ✅" : "Category updated! ✅");
    setCatModal(null);
    fetchAll();
  };

  const deleteCat = async (id) => {
    await supabase.from("menu_categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
    showToast("Category deleted");
  };

  const openNewTbl = () => { setTblForm({ label:"", qr_token:"" }); setTblModal("new"); };
  const openEditTbl = (tbl) => { setTblForm({ ...tbl }); setTblModal(tbl); };

  const saveTbl = async () => {
    setSaving(true);
    const token = tblForm.qr_token || `tbl_${slug}_${tblForm.label.toLowerCase().replace(/\s+/g,"_")}_${Date.now()}`;
    const payload = { ...tblForm, qr_token: token, restaurant_id: restaurant.id };
    let error;
    if (tblModal === "new") ({ error } = await supabase.from("tables").insert(payload));
    else ({ error } = await supabase.from("tables").update(payload).eq("id", tblModal.id));
    setSaving(false);
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    showToast(tblModal === "new" ? "Table added! ✅" : "Table updated! ✅");
    setTblModal(null);
    fetchAll();
  };

  const deleteTbl = async (id) => {
    await supabase.from("tables").delete().eq("id", id);
    setTables(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
    showToast("Table deleted");
  };

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

  if (accessDenied) {
    return (
      <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#ef4444",fontFamily:"sans-serif",textAlign:"center",padding:20}}>
        <div>
          <div style={{fontSize:48,marginBottom:16}}>🔒</div>
          <div style={{fontSize:18,fontWeight:700,color:"#f5f0e8"}}>Access Denied</div>
          <div style={{fontSize:14,marginTop:8,color:"#555"}}>You don't have permission to manage this restaurant</div>
          <a href="/login" style={{color:"#c8973a",fontSize:13,marginTop:16,display:"inline-block"}}>← Back to login</a>
          <pre style={{fontSize:11,color:"#888",marginTop:20,textAlign:"left",background:"#111",padding:16,borderRadius:8,maxWidth:500,overflow:"auto"}}>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#c8973a",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>⚙️</div><div>Loading admin panel...</div></div>
    </div>
  );

  const accent = restaurant?.primary_color || "#c8973a";

  return (
    <div style={{background:"#0a0a0a",minHeight:"100vh",color:"#f5f0e8",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;background:#111}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:4px}
        .tab-btn{padding:10px 18px;border-radius:10px;border:1.5px solid #222;background:transparent;color:#555;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.18s;font-family:inherit;display:flex;align-items:center;gap:6px}
        .tab-btn.active{background:${accent};color:#0a0a0a;border-color:${accent}}
        .btn{padding:10px 18px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn-primary{background:${accent};color:#0a0a0a}
        .btn-danger{background:#ef444422;color:#ef4444;border:1px solid #ef444444}
        .btn-ghost{background:#1a1a1a;color:#888;border:1px solid #2a2a2a}
        .card{background:#141414;border:1px solid #222;border-radius:14px;padding:16px}
        .input{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#f5f0e8;padding:10px 14px;font-size:14px;outline:none;font-family:inherit;width:100%}
        .label{font-size:12px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:block}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:100;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:#141414;border:1px solid #2a2a2a;border-radius:20px;padding:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto}
        .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:50px;font-weight:700;font-size:14px;z-index:999}
        .toast.success{background:#22c55e;color:#fff}
        .toast.error{background:#ef4444;color:#fff}
        .tag-pill{padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid #2a2a2a;background:transparent;color:#555}
        .tag-pill.active{background:${accent}22;color:${accent};border-color:${accent}66}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;padding:10px 12px;font-size:12px;color:#444;font-weight:600;text-transform:uppercase;border-bottom:1px solid #1e1e1e}
        td{padding:12px;border-bottom:1px solid #1a1a1a;font-size:14px}
        .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .toggle{width:40px;height:22px;background:#2a2a2a;border-radius:20px;cursor:pointer;position:relative;border:none;flex-shrink:0}
        .toggle.on{background:#22c55e}
        .toggle::after{content:"";position:absolute;width:16px;height:16px;background:white;border-radius:50%;top:3px;left:3px;transition:left 0.2s}
        .toggle.on::after{left:21px}
        .qr-url{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px 12px;font-size:11px;color:#555;word-break:break-all;font-family:monospace}
        .thumb{width:40px;height:40px;border-radius:8px;object-fit:cover}
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div style={{background:"#0f0f0f",borderBottom:"1px solid #1a1a1a",padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>{restaurant?.logo_emoji}</span>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>{restaurant?.name} — Admin</div>
            <div style={{fontSize:11,color:"#444"}}>/r/{slug}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <LogoutButton/>
          <a href={`/r/${slug}`} target="_blank" style={{textDecoration:"none"}}><button className="btn btn-ghost" style={{fontSize:13}}>👁️ Menu</button></a>
          <a href={`/r/${slug}/kitchen`} target="_blank" style={{textDecoration:"none"}}><button className="btn btn-ghost" style={{fontSize:13}}>🍽️ Kitchen</button></a>
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:1400,margin:"0 auto"}}>
        <div style={{display:"flex",gap:12,marginBottom:24}}>
          {[
            {icon:"🍽️",value:items.length,label:"Menu Items",color:accent},
            {icon:"📂",value:categories.length,label:"Categories",color:"#6366f1"},
            {icon:"🪑",value:tables.length,label:"Tables",color:"#22c55e"},
            {icon:"📋",value:orders.filter(o=>o.status!=="served").length,label:"Active Orders",color:"#ef4444"},
          ].map(s=>(
            <div key={s.label} className="card" style={{flex:1}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,color:"#444",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.key} className={`tab-btn${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {tab==="menu"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700}}>Menu Items ({items.length})</h2>
              <button className="btn btn-primary" onClick={openNewItem}>+ Add Item</button>
            </div>
            <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:14,overflow:"hidden"}}>
              <table>
                <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Tags</th><th>Available</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map(item=>(
                    <tr key={item.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="thumb" />
                          ) : (
                            <span style={{fontSize:24}}>{item.image_emoji}</span>
                          )}
                          <div><div style={{fontWeight:600}}>{item.name_en}</div><div style={{fontSize:12,color:"#555"}}>{item.name_ku}</div></div>
                        </div>
                      </td>
                      <td><span style={{color:"#666",fontSize:13}}>{item.menu_categories?.name_en||"—"}</span></td>
                      <td><span style={{color:accent,fontWeight:700}}>{Number(item.price).toLocaleString()} {restaurant?.currency}</span></td>
                      <td><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(item.tags||[]).map(t=><span key={t} style={{fontSize:10,padding:"2px 6px",borderRadius:10,background:"#22c55e22",color:"#22c55e"}}>{t}</span>)}</div></td>
                      <td><button className={`toggle${item.is_available?" on":""}`} onClick={()=>toggleAvailable(item)}/></td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>openEditItem(item)}>✏️</button>
                          <button className="btn btn-danger" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setDeleteConfirm({type:"item",id:item.id,name:item.name_en})}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#333"}}>No menu items yet</div>}
            </div>
          </div>
        )}

        {tab==="categories"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700}}>Categories</h2>
              <button className="btn btn-primary" onClick={openNewCat}>+ Add Category</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
              {categories.map(cat=>(
                <div key={cat.id} className="card" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:28}}>{cat.icon}</span>
                    <div><div style={{fontWeight:600}}>{cat.name_en}</div><div style={{fontSize:12,color:"#555"}}>{cat.name_ku}</div></div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12}} onClick={()=>openEditCat(cat)}>✏️</button>
                    <button className="btn btn-danger" style={{padding:"6px 10px",fontSize:12}} onClick={()=>setDeleteConfirm({type:"category",id:cat.id,name:cat.name_en})}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="tables"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700}}>Restaurant Tables</h2>
              <button className="btn btn-primary" onClick={openNewTbl}>+ Add Table</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
              {tables.map(tbl=>(
                <div key={tbl.id} className="card">
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:24}}>🪑</span>
                      <div style={{fontWeight:700,fontSize:16}}>{tbl.label}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12}} onClick={()=>openEditTbl(tbl)}>✏️</button>
                      <button className="btn btn-danger" style={{padding:"6px 10px",fontSize:12}} onClick={()=>setDeleteConfirm({type:"table",id:tbl.id,name:tbl.label})}>🗑️</button>
                    </div>
                  </div>
                  <div className="qr-url">{BASE_URL}/r/{slug}?table={tbl.qr_token}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="orders"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700}}>Recent Orders</h2>
              <button className="btn btn-ghost" onClick={fetchAll}>🔄 Refresh</button>
            </div>
            <div style={{background:"#0f0f0f",border:"1px solid #1a1a1a",borderRadius:14,overflow:"hidden"}}>
              <table>
                <thead><tr><th>Table</th><th>Status</th><th>Items</th><th>Total</th><th>Time</th></tr></thead>
                <tbody>
                  {orders.map(order=>(
                    <tr key={order.id}>
                      <td><span style={{fontWeight:600}}>{order.tables?.label||"?"}</span></td>
                      <td><span className="badge" style={{background:(STATUS_COLORS[order.status]||"#666")+"22",color:STATUS_COLORS[order.status]||"#666"}}>{order.status}</span></td>
                      <td><span style={{color:"#666",fontSize:13}}>{order.order_items?.length||0} items</span></td>
                      <td><span style={{color:accent,fontWeight:700}}>{Number(order.total).toLocaleString()} {restaurant?.currency}</span></td>
                      <td><span style={{color:"#444",fontSize:12}}>{new Date(order.created_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#333"}}>No orders yet</div>}
            </div>
          </div>
        )}
      </div>

      {itemModal!==null&&(
        <div className="modal-overlay" onClick={()=>setItemModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700}}>{itemModal==="new"?"Add Menu Item":"Edit Menu Item"}</h2>
              <button onClick={()=>setItemModal(null)} style={{background:"transparent",border:"none",color:"#555",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{gridColumn:"1/3"}}>
                <label className="label">Photo</label>
                <ImageUploader
                  currentImageUrl={itemForm.image_url}
                  itemId={itemModal !== "new" ? itemModal.id : "new"}
                  onUploaded={(url) => setItemForm(p => ({ ...p, image_url: url }))}
                />
              </div>
              {[["name_en","Name (English)"],["name_ku","Name (Kurdish)"],["name_ar","Name (Arabic)"]].map(([field,label])=>(
                <div key={field} style={{gridColumn:field==="name_en"?"1/3":"auto"}}>
                  <label className="label">{label}</label>
                  <input className="input" value={itemForm[field]} onChange={e=>setItemForm(p=>({...p,[field]:e.target.value}))}/>
                </div>
              ))}
              {[["desc_en","Description (English)"],["desc_ku","Description (Kurdish)"],["desc_ar","Description (Arabic)"]].map(([field,label])=>(
                <div key={field} style={{gridColumn:field==="desc_en"?"1/3":"auto"}}>
                  <label className="label">{label}</label>
                  <input className="input" value={itemForm[field]||""} onChange={e=>setItemForm(p=>({...p,[field]:e.target.value}))}/>
                </div>
              ))}
              <div><label className="label">Price</label><input className="input" type="number" value={itemForm.price} onChange={e=>setItemForm(p=>({...p,price:e.target.value}))}/></div>
              <div><label className="label">Prep Time (min)</label><input className="input" type="number" value={itemForm.prep_time_min} onChange={e=>setItemForm(p=>({...p,prep_time_min:parseInt(e.target.value)||10}))}/></div>
              <div><label className="label">Fallback Emoji</label><input className="input" value={itemForm.image_emoji} onChange={e=>setItemForm(p=>({...p,image_emoji:e.target.value}))}/></div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={itemForm.category_id} onChange={e=>setItemForm(p=>({...p,category_id:e.target.value}))}>
                  <option value="">Select...</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name_en}</option>)}
                </select>
              </div>
              <div style={{gridColumn:"1/3"}}>
                <label className="label">Tags</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {TAG_OPTIONS.map(tag=>(
                    <button key={tag} className={`tag-pill${(itemForm.tags||[]).includes(tag)?" active":""}`} onClick={()=>setItemForm(p=>({...p,tags:(p.tags||[]).includes(tag)?p.tags.filter(t=>t!==tag):[...(p.tags||[]),tag]}))}>{tag}</button>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><button className={`toggle${itemForm.is_available?" on":""}`} onClick={()=>setItemForm(p=>({...p,is_available:!p.is_available}))}/><span style={{fontSize:13,color:"#888"}}>Available</span></div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><button className={`toggle${itemForm.is_popular?" on":""}`} onClick={()=>setItemForm(p=>({...p,is_popular:!p.is_popular}))}/><span style={{fontSize:13,color:"#888"}}>⭐ Popular</span></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setItemModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveItem} disabled={saving}>{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}

      {catModal!==null&&(
        <div className="modal-overlay" onClick={()=>setCatModal(null)}>
          <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700}}>{catModal==="new"?"Add Category":"Edit Category"}</h2>
              <button onClick={()=>setCatModal(null)} style={{background:"transparent",border:"none",color:"#555",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[["name_en","Name (English)"],["name_ku","Name (Kurdish)"],["name_ar","Name (Arabic)"]].map(([field,label])=>(
                <div key={field}><label className="label">{label}</label><input className="input" value={catForm[field]} onChange={e=>setCatForm(p=>({...p,[field]:e.target.value}))}/></div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label className="label">Icon</label><input className="input" value={catForm.icon} onChange={e=>setCatForm(p=>({...p,icon:e.target.value}))}/></div>
                <div><label className="label">Sort Order</label><input className="input" type="number" value={catForm.sort_order} onChange={e=>setCatForm(p=>({...p,sort_order:parseInt(e.target.value)||0}))}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setCatModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCat} disabled={saving}>{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}

      {tblModal!==null&&(
        <div className="modal-overlay" onClick={()=>setTblModal(null)}>
          <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700}}>{tblModal==="new"?"Add Table":"Edit Table"}</h2>
              <button onClick={()=>setTblModal(null)} style={{background:"transparent",border:"none",color:"#555",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label className="label">Table Label</label><input className="input" value={tblForm.label} onChange={e=>setTblForm(p=>({...p,label:e.target.value}))}/></div>
              <div><label className="label">QR Token (optional)</label><input className="input" value={tblForm.qr_token||""} onChange={e=>setTblForm(p=>({...p,qr_token:e.target.value}))}/></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setTblModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveTbl} disabled={saving}>{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm&&(
        <div className="modal-overlay" onClick={()=>setDeleteConfirm(null)}>
          <div className="modal" style={{maxWidth:360,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Delete "{deleteConfirm.name}"?</h2>
            <p style={{color:"#666",fontSize:14,marginBottom:20}}>This cannot be undone.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button className="btn btn-ghost" onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>{
                if(deleteConfirm.type==="item") deleteItem(deleteConfirm.id);
                if(deleteConfirm.type==="category") deleteCat(deleteConfirm.id);
                if(deleteConfirm.type==="table") deleteTbl(deleteConfirm.id);
              }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}