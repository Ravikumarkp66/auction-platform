"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check, Upload, Maximize, Square, Move, Crop, RefreshCw, Camera } from "lucide-react";

/**
 * ImageEditModal - Ultra-stable direct editing tool
 */
export default function ImageEditModal({ initialImage, onSave, onClose, title = "Edit Image" }) {
  const [image, setImage] = useState(initialImage);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const imgRef = useRef(null);

  // Use a 100% initial crop so no part is hidden at the start
  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    setImgLoaded(true);
    
    // Start with a full-frame crop so nothing is cut off
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 100,
      height: 100
    });
  }, []);

  const setSquareAspect = () => {
    setAspect(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const squareCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
        width,
        height
      );
      setCrop(squareCrop);
    }
  };

  const setFreeAspect = () => {
    setAspect(undefined);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
        setImgLoaded(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (image, crop) => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        resolve(blob);
      }, "image/jpeg", 0.95);
    });
  };

  const handleSave = async () => {
    if (completedCrop && completedCrop.width > 3 && completedCrop.height > 3) {
      setLoading(true);
      try {
        const blob = await getCroppedImg(imgRef.current, completedCrop);
        const file = new File([blob], `edit_${Date.now()}.jpg`, { type: "image/jpeg" });
        await onSave(file);
        onClose();
      } catch (e) {
        console.error("Save error", e);
        alert("Could not process image. Check CORS or source.");
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Subtle fade-in backdrop, no more zoom animations */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-[#080B1F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in slide-in-from-bottom-5 duration-300">
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-md font-black text-white tracking-tight">{title}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Edit photo manually</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace - Fixed scale to prevent "zooming" feel */}
        <div className="flex-1 overflow-auto bg-[#040612] flex items-start justify-center p-6 min-h-[500px]">
          {image ? (
            <div className={`relative max-w-full transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-w-full ring-1 ring-white/5"
              >
                <img
                  ref={imgRef}
                  src={image}
                  alt="Edit"
                  onLoad={onImageLoad}
                  className="max-h-[70vh] object-contain"
                  style={{ display: 'block', maxWidth: '100%', pointerEvents: 'auto' }}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-700 py-40">
              <Camera className="w-16 h-16 mb-4 opacity-5" />
              <p className="font-bold text-sm tracking-widest uppercase">No Image</p>
            </div>
          )}
          
          {!imgLoaded && image && (
             <div className="absolute inset-0 flex items-center justify-center bg-[#040612]">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
             </div>
          )}
        </div>

        {/* Improved Controls Toolbar */}
        <div className="p-5 bg-[#0A0D26] border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] text-[#0B0F2A] bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/10 cursor-pointer transition-all active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              Replacement
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>

            <div className="h-6 w-px bg-white/10 mx-1" />

            <div className="flex items-center bg-black/40 p-1.5 rounded-xl border border-white/10 gap-1">
              <button
                onClick={setFreeAspect}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                  ${aspect === undefined ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                Free Size
              </button>
              <button
                onClick={setSquareAspect}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                  ${aspect === 1 ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                Square
              </button>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading || !image}
            className="flex items-center gap-3 px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] text-white 
              bg-gradient-to-r from-violet-600 to-indigo-500 shadow-2xl shadow-violet-500/20 
              hover:shadow-violet-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <><Check className="w-4 h-4" /> Save Selection</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
