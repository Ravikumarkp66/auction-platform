"use client"

import { useState, useRef, useEffect } from "react"
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Check, RotateCcw, ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react"
import { uploadToS3 } from "../lib/uploadToS3"
import { API_URL } from "../lib/apiConfig"

export default function ImageCropperModal({ imageUrl, onSave, onClose, folder = "players", initialAspect = 3 / 4 }) {
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [aspect, setAspect] = useState(initialAspect)
  const [loading, setLoading] = useState(false)
  
  const imgRef = useRef(null)

  // Helper to create a centered crop box
  const centerAspectCrop = (mediaWidth, mediaHeight, aspect) => {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 100,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    )
  }

  // Handle aspect ratio change
  useEffect(() => {
    if (imgRef.current && aspect) {
      const { width, height } = imgRef.current
      const newCrop = centerAspectCrop(width, height, aspect)
      setCrop(newCrop)
    } else if (imgRef.current && !aspect) {
      // Free crop: default to a large centered box
      const { width, height } = imgRef.current
      setCrop({
        unit: '%',
        width: 80,
        height: 80,
        x: 10,
        y: 10
      })
    }
  }, [aspect])

  // Determine the best source URL for CORS-safe loading
  const getSecureUrl = (rawUrl) => {
    if (!rawUrl) return ""
    if (rawUrl.startsWith("/") || rawUrl.startsWith("blob:")) return rawUrl
    
    let API = API_URL || ""
    if (API.endsWith("/")) API = API.slice(0, -1)
    
    return `${API}/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
  }

  const safeUrl = getSecureUrl(imageUrl)

  function onImageLoad(e) {
    const { width, height } = e.currentTarget
    const initialCrop = centerAspectCrop(width, height, aspect)
    setCrop(initialCrop)
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
      
      ctx.save()
      
      // Move to center of canvas for rotation/scale
      ctx.translate(canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio))
      ctx.rotate((rotate * Math.PI) / 180)
      ctx.scale(scale, scale)
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
      
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      })
      
      const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' })
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

  const handleReset = () => {
    setScale(1)
    setRotate(0)
    if (imgRef.current) {
        const { width, height } = imgRef.current
        setCrop(centerAspectCrop(width, height, aspect))
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-5xl bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-[95vh] animate-in zoom-in-95 duration-300">
        
        {/* Header - Compact Layout */}
        <div className="px-10 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-violet-500/20">
                <Move className="w-7 h-7" />
             </div>
             <div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Image Editor</h2>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Precision Crop & Align</p>
               </div>
             </div>
          </div>
          <button 
             onClick={onClose} 
             className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-2xl transition-all border border-white/5"
          >
             <X size={24} />
          </button>
        </div>

        {/* Main Editor Section - Centered and Spacious */}
        <div className="flex-1 min-h-0 p-8 flex flex-col items-center justify-center bg-[#050810] relative group">
          <div className="relative max-w-full max-h-full flex items-center justify-center transition-all duration-500 ease-out">
             <div className="absolute inset-0 bg-violet-500/5 blur-[100px] rounded-full"></div>
             
             <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/40 p-2">
                <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-w-full max-h-full shadow-2xl"
                    ruleOfThirds
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={safeUrl}
                      onLoad={onImageLoad}
                      style={{ 
                        transform: `scale(${scale}) rotate(${rotate}deg)`, 
                        maxWidth: '100%', 
                        maxHeight: 'calc(95vh - 350px)', 
                        width: 'auto', 
                        height: 'auto', 
                        display: 'block',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                      }}
                      className="cursor-move"
                      crossOrigin="anonymous"
                    />
                  </ReactCrop>
             </div>
          </div>
          
          <div className="mt-8 flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/5 rounded-full backdrop-blur-md opacity-60 group-hover:opacity-100 transition-opacity">
            <Move size={12} className="text-violet-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Drag to Adjust Selection • Use Controls to Scale</p>
          </div>
        </div>

        {/* Improved Controls Footer */}
        <div className="px-10 py-6 border-t border-white/5 bg-[#0a0f1d] flex flex-wrap items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-8">
             {/* Zoom Controls */}
             <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Magnification</span>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-violet-400 transition-all"><ZoomOut size={20} /></button>
                    <div className="w-16 flex items-center justify-center border-x border-white/5 mx-1">
                        <span className="text-xs font-black tabular-nums text-white">{(scale * 100).toFixed(0)}%</span>
                    </div>
                    <button onClick={() => setScale(s => Math.min(5, s + 0.1))} className="p-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-indigo-400 transition-all"><ZoomIn size={20} /></button>
                </div>
             </div>
             
             {/* Aspect Ratio Controls */}
             <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Crop Aspect Ratio</span>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner gap-1">
                    {[
                        { label: '16:9', val: 16/9 },
                        { label: '4:3', val: 4/3 },
                        { label: '3:4', val: 3/4 },
                        { label: '1:1', val: 1 },
                        { label: 'Free', val: undefined }
                    ].map((r) => (
                        <button 
                            key={r.label}
                            onClick={() => setAspect(r.val)} 
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${aspect === r.val ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
             </div>

             {/* Utility Buttons */}
             <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block">Tools</span>
                <div className="flex gap-2">
                    <button onClick={() => setRotate(r => r + 90)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl border border-white/5 transition-all"><RotateCcw size={20} className="transform scale-x-[-1]" /></button>
                    <button onClick={handleReset} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl border border-white/5 transition-all"><Maximize2 size={20} /></button>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={onClose} 
                className="px-8 py-4 bg-transparent hover:bg-white/5 text-slate-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
             >
                Discard
             </button>
             <button 
                onClick={handleSave} 
                disabled={loading || !completedCrop}
                className="px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] transition-all flex items-center gap-3 shadow-[0_20px_40px_rgba(124,58,237,0.3)] min-w-[200px] justify-center"
             >
                {loading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <Check size={20} />}
                {loading ? "PROCESSING..." : "SAVE CHANGES"}
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}

