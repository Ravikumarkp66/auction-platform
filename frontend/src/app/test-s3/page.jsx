"use client";

import { useState, useRef } from "react";
import { uploadToS3 } from "../../lib/uploadToS3";

export default function S3TestPage() {
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [folder, setFolder] = useState("players");
  const fileRef = useRef(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("Please select a file first");

    setStatus("uploading");
    setUploadedUrl("");
    setErrorMsg("");

    try {
      const url = await uploadToS3(file, folder);
      setUploadedUrl(url);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f18",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      color: "white",
      padding: "24px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "520px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "36px"
      }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#a78bfa", marginBottom: "6px" }}>
            🪣 S3 Upload Test
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Verify that direct browser→S3 upload is working correctly.
          </p>
        </div>

        {/* Folder selector */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "8px" }}>
            S3 Folder
          </label>
          <select
            value={folder}
            onChange={e => setFolder(e.target.value)}
            style={{
              width: "100%",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "white",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "600",
              outline: "none"
            }}
          >
            <option value="players">players/</option>
            <option value="teams">teams/</option>
            <option value="backgrounds">backgrounds/</option>
          </select>
        </div>

        {/* File picker */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "8px" }}>
            Select Image
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{
              width: "100%",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "12px",
              color: "#94a3b8",
              padding: "12px 16px",
              fontSize: "13px",
              cursor: "pointer",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={status === "uploading"}
          style={{
            width: "100%",
            padding: "14px",
            background: status === "uploading" ? "#4c1d95" : "linear-gradient(135deg, #7c3aed, #0ea5e9)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontWeight: "800",
            fontSize: "14px",
            cursor: status === "uploading" ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}
        >
          {status === "uploading" ? (
            <>
              <span style={{
                width: "16px", height: "16px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTop: "2px solid white",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite"
              }} />
              Uploading to S3...
            </>
          ) : "⬆ Upload to S3"}
        </button>

        {/* Result */}
        {status === "success" && (
          <div style={{
            marginTop: "20px",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "12px",
            padding: "16px"
          }}>
            <p style={{ fontSize: "12px", fontWeight: "700", color: "#10b981", marginBottom: "8px" }}>
              ✅ UPLOAD SUCCESSFUL
            </p>
            <p style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", wordBreak: "break-all" }}>
              {uploadedUrl}
            </p>
            <img
              src={uploadedUrl}
              alt="Uploaded"
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid rgba(16,185,129,0.2)"
              }}
            />
            <button
              onClick={() => navigator.clipboard.writeText(uploadedUrl)}
              style={{
                marginTop: "10px",
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                width: "100%"
              }}
            >
              📋 Copy URL
            </button>
          </div>
        )}

        {status === "error" && (
          <div style={{
            marginTop: "20px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "16px"
          }}>
            <p style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444", marginBottom: "6px" }}>
              ❌ UPLOAD FAILED
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              {errorMsg}
            </p>
            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
              💡 Check S3 CORS settings and AWS credentials in backend/.env
            </p>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
