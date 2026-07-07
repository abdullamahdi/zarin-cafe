"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Reusable image upload button — uploads to Supabase Storage 'menu-images' bucket
// and returns the public URL via onUploaded(url)
export default function ImageUploader({ currentImageUrl, onUploaded, itemId }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError(null);
    setUploading(true);

    // Show instant local preview while uploading
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    // Unique filename: itemId + timestamp + extension
    const ext = file.name.split(".").pop();
    const fileName = `${itemId || "item"}_${Date.now()}.${ext}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    setUploading(false);
    setPreview(urlData.publicUrl);
    onUploaded(urlData.publicUrl);
  };

  const handleRemove = () => {
    setPreview(null);
    onUploaded(null);
  };

  return (
    <div>
      <style>{`
        .img-upload-box {
          width: 100%;
          height: 140px;
          border-radius: 14px;
          border: 2px dashed #333;
          background: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .img-upload-box:hover { border-color: #c8973a66; }
        .img-upload-box.has-image { border-style: solid; border-color: #2a2a2a; }
        .img-upload-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .img-upload-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          gap: 10px;
        }
        .img-upload-box:hover .img-upload-overlay { opacity: 1; }
        .img-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #555;
          font-size: 13px;
        }
        .img-btn {
          background: #c8973a;
          color: #0a0a0a;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .img-btn-remove {
          background: #ef4444;
          color: white;
        }
        .img-upload-spinner {
          width: 28px; height: 28px;
          border: 3px solid #333;
          border-top-color: #c8973a;
          border-radius: 50%;
          animation: img-spin 0.8s linear infinite;
        }
        @keyframes img-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className={`img-upload-box${preview ? " has-image" : ""}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="img-upload-spinner" />
        ) : preview ? (
          <>
            <img src={preview} alt="Preview" className="img-upload-preview" />
            <div className="img-upload-overlay">
              <button className="img-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Change
              </button>
              <button className="img-btn img-btn-remove" onClick={(e) => { e.stopPropagation(); handleRemove(); }}>
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="img-upload-placeholder">
            <span style={{ fontSize: 28 }}>📷</span>
            <span>Click to upload photo</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {error && (
        <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}