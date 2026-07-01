"use client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LogoutButton({ style }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "#ef444418",
        border: "1px solid #ef444433",
        color: "#ef4444",
        borderRadius: 10,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
        ...style,
      }}
    >
      🚪 Sign Out
    </button>
  );
}