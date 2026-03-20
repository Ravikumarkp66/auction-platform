"use client"

import { useState, useRef, useEffect } from "react"
import ReactCrop, { centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { uploadToS3 } from "../lib/uploadToS3"

export default function ImageCropperModal({ imageUrl, onSave, onClose, folder = "players" }) {
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [aspect, setAspect] = useState(3 / 4) // Default aspect ratio for players
  const [loading, setLoading] = useState(false)
  
  const imgRef = useRef(null)

  // Determine the best source URL for CORS-safe loading
  const getSecureUrl = (rawUrl) => {
    if (!rawUrl) return ""
    
    // Route almost everything through the proxy to guarantee CORS-headers
    // Only local relative paths or blob: URLs (for local previews) stay bypass
    if (rawUrl.startsWith("/") || rawUrl.startsWith("blob:")) {
      return rawUrl
    }
    
    // Otherwise, route through the backend proxy to guarantee CORS headers
    let API = process.env.NEXT_PUBLIC_API_URL || ""
    if (API.endsWith("/")) API = API.slice(0, -1)
    
    const proxiedUrl = `${API}/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
    console.log("📸 Cropper loading proxied URL:", proxiedUrl)
    return proxiedUrl
  }

  const safeUrl = getSecureUrl(imageUrl)

  function onImageLoad(e) {
    // We intentionally don't set an initial crop box here
    // This allows the admin to see the complete, unobstructed photo first
  }

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return
    
    setLoading(true)
    try {
      const image = imgRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
      canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)
      
      ctx.scale(pixelRatio, pixelRatio)
      ctx.imageSmoothingQuality = 'high'
      
      const centerX = image.naturalWidth / 2
      const centerY = image.naturalHeight / 2
      
      ctx.save()
      
      // Move to center of canvas
      ctx.translate(canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio))
      // Rotate
      ctx.rotate((rotate * Math.PI) / 180)
      // Scale
      ctx.scale(scale, scale)
      // Move back
      ctx.translate(-canvas.width / (2 * pixelRatio), -canvas.height / (2 * pixelRatio))

      ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        -completedCrop.x * scaleX,
        -completedCrop.y * scaleY,
        image.naturalWidth,
        image.naturalHeight
      )
      
      ctx.restore()
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      })
      
      // Create a File object from blob for S3 upload
      const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      // Upload to S3
      const newUrl = await uploadToS3(file, folder)
      
      await onSave(newUrl)
      onClose()
    } catch (err) {
      console.error("Save failed:", err)
      alert("Failed to save cropped image: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-violet-600/20 rounded-2xl flex items-center justify-center border border-violet-500/30 text-violet-400 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
             </div>
             <div>
               <h2 className="text-xl font-black text-white uppercase tracking-tight">Image Editor</h2>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                 Live Crop & Preview
               </p>
             </div>
          </div>
          <button 
             onClick={onClose} 
             className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-all text-lg font-black"
          >
             ✕
          </button>
        </div>

        {/* main area */}
        <div className="flex-1 overflow-auto p-2 flex flex-col items-center justify-center bg-[#020617] relative scrollbar-hide">
          <div className="max-w-full relative rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-slate-900/10 p-1 flex items-center justify-center">
             <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[75vh] w-auto h-auto overflow-hidden"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={safeUrl}
                  onLoad={onImageLoad}
                  style={{ transform: `scale(${scale})`, maxWidth: '100%', maxHeight: '75vh', width: 'auto', height: 'auto', transition: 'transform 0.2s ease' }}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
          </div>
          <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-40">Drag corners to resize • Click and drag to reposition</p>
        </div>

        {/* footer controls */}
        <div className="p-8 border-t border-white/5 bg-slate-950 flex flex-wrap items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Zoom</span>
                <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-violet-400 transition-all"><ZoomOut size={18} /></button>
                    <span className="px-3 flex items-center text-[11px] font-bold tabular-nums text-slate-400">{(scale * 100).toFixed(0)}%</span>
                    <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-violet-400 transition-all"><ZoomIn size={18} /></button>
                </div>
             </div>
             
             <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Framing</span>
                <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner gap-1">
                    <button onClick={() => setAspect(3/4)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aspect === 3/4 ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>3:4</button>
                    <button onClick={() => setAspect(3.5/4.5)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${Math.abs(aspect - 3.5/4.5) < 0.01 ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>Passport</button>
                    <button onClick={() => setAspect(1)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aspect === 1 ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>1:1</button>
                    <button onClick={() => setAspect(undefined)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aspect === undefined ? 'bg-violet-600/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>Free</button>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={onClose} 
                className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all border border-white/5"
             >
                Discard
             </button>
             <button 
                onClick={handleSave} 
                disabled={loading || !completedCrop}
                className="px-10 py-4 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center gap-3 shadow-[0_15px_30px_rgba(124,58,237,0.4)]"
             >
                {loading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <Check size={20} />}
                {loading ? "Processing..." : "Save Changes"}
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
