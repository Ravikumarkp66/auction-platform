"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import * as faceapi from "face-api.js";
import { X, Check, Upload, Square, Crop, RefreshCw, Camera, AlertCircle, Info, Image as ImageIcon, Sparkles, UserCircle, ZoomIn, ZoomOut, ShieldCheck, ShieldAlert, Scan } from "lucide-react";
import { API_URL } from "../lib/apiConfig";

/**
 * ImageEditModal - Professionally Tuned UI with AI Proxy v2
 */
export default function ImageEditModal({ initialImage, onSave, onClose, title = "Edit Image" }) {
  const [image, setImage] = useState(null);
  const [readyForAI, setReadyForAI] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(3 / 4); 
  const [loading, setLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100); 
  const [proxyStatus, setProxyStatus] = useState("idle"); // idle, pending, success, failed
  
  // Cinematic Animation States
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [imageScale, setImageScale] = useState(1);
  const [showCropBox, setShowCropBox] = useState(true);
  
  const imgRef = useRef(null);

  // ── Advanced Security Cleansing Layer ──
  useEffect(() => {
    if (!initialImage) return;

    if (initialImage.startsWith('data:') || initialImage.startsWith('blob:')) {
      setImage(initialImage);
      setReadyForAI(true);
      setProxyStatus("success");
      return;
    }

    setReadyForAI(false);
    setIsRestricted(false);
    setProxyStatus("pending");

    const prepareImage = async () => {
      try {
        const proxyUrl = `${API_URL}/api/proxy-image?url=${encodeURIComponent(initialImage)}`;
        
        // Fetch with security clearing headers
        const response = await fetch(proxyUrl, {
          method: 'GET',
          cache: 'no-cache'
        });

        if (!response.ok) throw new Error(`Proxy Gate Error: ${response.status}`);
        
        const blob = await response.blob();
        if (blob.size < 100) throw new Error("Invalid image blob received");

        const localUrl = URL.createObjectURL(blob);
        setImage(localUrl);
        setReadyForAI(true);
        setIsRestricted(false);
        setProxyStatus("success");
      } catch (err) {
        console.error("Security Engine Detail:", err);
        // Fallback: direct load (Restrictive Mode)
        setImage(initialImage); 
        setReadyForAI(false);
        setIsRestricted(true);
        setProxyStatus("failed");
      }
    };

    prepareImage();
  }, [initialImage]);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    setImgLoaded(true);
    setError(false);
    
    // Default 80% Passport Frame
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: "%", height: 80 }, 3 / 4, width, height),
      width,
      height
    );
    initialCrop.y = 5;
    setCrop(initialCrop);

    if (readyForAI) handleAutoCrop(e.currentTarget);
  }, [readyForAI]);

  const handleAutoCrop = async (targetImg) => {
    if (!targetImg || !readyForAI) return;
    
    // 🎭 START CINEMATIC SEQUENCE 🎭
    setDetecting(true);
    setIsScanning(true);
    setScanStatus("Analyzing topology...");
    setImageScale(0.96); // Step 1: Prep zoom out
    setShowCropBox(false); // Hide crop temporarily for focus move

    try {
      const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      if (!faceapi.nets.tinyFaceDetector.params) await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      
      const detections = await faceapi.detectAllFaces(targetImg, new faceapi.TinyFaceDetectorOptions());
      
      // Artificial delay for "Thinking" feel (0.8s)
      await new Promise(r => setTimeout(r, 800));

      if (detections.length > 0) {
        setScanStatus("FACE DETECTED ✅");
        
        const face = detections.sort((a, b) => b.box.width - a.box.width)[0].box;
        const { width: imgW, height: imgH } = targetImg;
        const targetAspect = 3 / 4;
        
        let cropHeight = face.height * 2.8; 
        let cropWidth = cropHeight * targetAspect;
        if (cropWidth > imgW) {
          cropWidth = imgW * 0.95;
          cropHeight = cropWidth / targetAspect;
        }

        let centerX = face.x + face.width / 2;
        let centerY = face.y + face.height / 2;
        let cropX = Math.max(0, Math.min(imgW - cropWidth, centerX - cropWidth / 2));
        let cropY = Math.max(0, Math.min(imgH - cropHeight, centerY - cropHeight / 2 - (face.height * 0.45)));
        
        // Step 2: Smooth transition to face
        setImageScale(1.04); // Zoom into face
        setCrop({ 
          unit: '%', 
          x: (cropX / imgW)*100, 
          y: (cropY / imgH)*100, 
          width: (cropWidth / imgW)*100, 
          height: (cropHeight / imgH)*100 
        });

        // Step 3: Soft crop box entry after zoom
        setTimeout(() => {
          setIsScanning(false);
          setShowCropBox(true);
        }, 600);
      } else {
        setScanStatus("No Face Found");
        setTimeout(() => {
           setIsScanning(false);
           setShowCropBox(true);
           setImageScale(1);
        }, 1000);
      }
    } catch (e) {
      console.warn("AI System Busy", e);
      setIsScanning(false);
      setShowCropBox(true);
      setImageScale(1);
    } finally {
      setDetecting(false);
    }
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
        console.error("Finalization error:", e);
        if (isRestricted) {
          alert("Security Lock: This external photo source is strictly protected. \n\nPlease click 'Load Local File' and upload the photo from your device to use the AI Fit or save features.");
        } else {
          alert("Process Error. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
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
    ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      try { canvas.toBlob(b => b ? resolve(b) : reject('Blob error'), "image/jpeg", 0.95); } 
      catch (e) { reject(e); }
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[#020617]/98 backdrop-blur-3xl" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-[#0B0F2A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
              <div className="flex items-center gap-3 mt-1">
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] opacity-60">AI Smart Studio v2</p>
                 {proxyStatus === "pending" && <span className="text-[8px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">Syncing...</span>}
                 {proxyStatus === "success" && <span className="flex items-center gap-1.5 text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-widest"><ShieldCheck className="w-3 h-3" /> AI Secure</span>}
                 {proxyStatus === "failed" && <span className="flex items-center gap-1.5 text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black uppercase tracking-widest"><ShieldAlert className="w-3 h-3" /> System Restricted</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="relative flex-1 overflow-auto bg-[#040612] flex items-start justify-center p-12 custom-scrollbar">
          {image ? (
            <div className="relative">
              {!error ? (
                <div 
                  className={`relative shadow-2xl ring-1 ring-white/10 rounded-xl overflow-hidden bg-black/40 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isScanning ? 'blur-[2px] brightness-50' : 'blur-0 brightness-100'}`}
                  style={{ transform: `scale(${imageScale})` }}
                >
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className={`max-w-none transition-opacity duration-500 ${showCropBox ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <img
                      ref={imgRef}
                      src={image}
                      alt="Edit"
                      onLoad={onImageLoad}
                      onError={() => setError(true)}
                      style={{ width: `${zoomPercent}%`, maxWidth: 'none', display: 'block', transition: 'transform 0.5s ease-out' }}
                    />
                  </ReactCrop>

                  {/* High-Fidelity Scanning Line */}
                  {isScanning && (
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-scan z-[120]" />
                  )}

                  {/* Scanning Status HUD */}
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[130]">
                       <div className="px-6 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-cyan-500/30 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                          <Scan className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span className="text-[10px] font-black text-cyan-100 uppercase tracking-[0.2em]">{scanStatus}</span>
                       </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-10 bg-white/5 rounded-3xl border border-white/10 px-10 max-w-md w-full">
                   <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                   </div>
                   <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">Source Protected or Invalid</h4>
                   <p className="text-[10px] text-slate-500 mb-8 uppercase font-bold tracking-widest">External proxy failed or URL restricted.</p>
                   
                   <div className="w-full space-y-3">
                      <label className="block w-full px-8 py-4 bg-emerald-400 text-[#0B0F2A] font-black text-[10px] uppercase rounded-2xl cursor-pointer hover:bg-emerald-300 active:scale-95 transition-all text-center">
                        Select Local File
                        <input type="file" className="hidden" accept="image/*" onChange={(e)=>{
                          const f=e.target.files[0]; if(f){const r=new FileReader(); r.onload=()=>{setImage(r.result); setReadyForAI(true); setIsRestricted(false); setProxyStatus("success"); setError(false);}; r.readAsDataURL(f);}
                        }}/>
                      </label>

                      <div className="relative">
                         <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <ExternalLink className="w-4 h-4 text-slate-600" />
                         </div>
                         <input 
                           className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-white outline-none focus:border-violet-500 transition-all placeholder:text-slate-700"
                           placeholder="Paste Drive Link..."
                           onKeyDown={async (e) => {
                             if (e.key === 'Enter') {
                               const url = e.target.value.trim();
                               if (!url) return;
                               setScanStatus("Importing from Drive...");
                               setIsScanning(true);
                               try {
                                  // Directly set the initialImage URL, the useEffect in this component will handle proxying
                                  // BUT we want to force it to refresh or handle it here if it failed initially.
                                  // So we call the manual prepare logic
                                  const proxyUrl = `${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
                                  const response = await fetch(proxyUrl);
                                  if (!response.ok) throw new Error("Import failed");
                                  const blob = await response.blob();
                                  setImage(URL.createObjectURL(blob));
                                  setReadyForAI(true);
                                  setIsRestricted(false);
                                  setProxyStatus("success");
                                  setError(false);
                               } catch (err) { alert("Drive import failed. Ensure link is public."); }
                               finally { setIsScanning(false); }
                             }
                           }}
                         />
                      </div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="self-center flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="relative">
                 <div className="absolute inset-0 bg-violet-500/20 blur-[60px] rounded-full animate-pulse" />
                 <Camera className="w-24 h-24 text-white relative z-10" />
              </div>
              
              <div className="space-y-4 text-center">
                <h4 className="text-sm font-black uppercase tracking-[0.4em] text-white">IMAGE SOURCE REQUIRED</h4>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest max-w-[240px]">Select a source to begin the professional AI cropping process.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 w-full max-w-[320px]">
                <label className="flex items-center justify-center gap-4 px-8 py-5 bg-white text-black font-black text-xs uppercase rounded-[1.5rem] cursor-pointer hover:bg-violet-400 hover:text-white transition-all shadow-xl active:scale-95 group">
                  <Upload className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  Local Computer
                  <input type="file" className="hidden" accept="image/*" onChange={(e)=>{
                    const f=e.target.files[0]; if(f){const r=new FileReader(); r.onload=()=>{setImage(r.result); setReadyForAI(true); setIsRestricted(false); setProxyStatus("success"); setError(false);}; r.readAsDataURL(f);}
                  }}/>
                </label>

                <button 
                  onClick={() => {
                    console.log("Drive button clicked in Modal");
                    const event = new CustomEvent("open-drive-picker", { detail: (url) => {
                       console.log("Modal received URL from Picker:", url);
                       setImage(url);
                    }});
                    window.dispatchEvent(event);
                  }}
                  className="flex items-center justify-center gap-4 px-8 py-5 bg-slate-800 text-white font-black text-xs uppercase rounded-[1.5rem] cursor-pointer border border-white/10 hover:bg-slate-700 transition-all shadow-xl active:scale-95 group"
                >
                  <div className="w-5 h-5 rounded-lg bg-white p-0.5"><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="" /></div>
                  Google Drive
                </button>
              </div>
            </div>
          )}
          
          {(detecting || (!imgLoaded && image)) && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#040612]/80 backdrop-blur-md z-[110]">
                <RefreshCw className="w-12 h-12 text-violet-500 animate-spin mb-4" />
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.5em] animate-pulse">
                   {detecting ? "Calculating Geometry..." : "Bypassing Security Lock..."}
                </p>
             </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="relative z-10 px-8 py-6 bg-[#080B1F] border-t border-white/5 flex flex-wrap gap-8 items-center justify-between">
          <div className="flex flex-wrap items-center gap-6">
            
            <div className="flex items-center gap-4 bg-black/40 px-5 py-3 rounded-2xl border border-white/10 shadow-inner group">
               <ZoomOut className={`w-4 h-4 ${zoomPercent <= 40 ? 'text-slate-700' : 'text-slate-500 group-hover:text-violet-400'}`} />
               <input type="range" min="30" max="300" step="1" value={zoomPercent} onChange={(e)=>setZoomPercent(parseInt(e.target.value))} className="w-32 accent-violet-500 bg-white/10 rounded-lg cursor-pointer" />
               <ZoomIn className={`w-4 h-4 ${zoomPercent >= 300 ? 'text-slate-700' : 'text-slate-500 group-hover:text-violet-400'}`} />
               <span className="text-[10px] font-black text-violet-400 w-10 text-right">{zoomPercent}%</span>
            </div>

            <div className="h-10 w-px bg-white/10 mx-1 hidden lg:block" />

            <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/10 gap-2 shadow-inner">
               {[{id:3/4,label:'Passport'},{id:1,label:'Square'}].map(opt=>(
                 <button key={opt.label} onClick={()=>{setAspect(opt.id);if(imgRef.current){const c=centerCrop(makeAspectCrop({unit:"%",height:80},opt.id,imgRef.current.width,imgRef.current.height),imgRef.current.width,imgRef.current.height);setCrop(c);}}}
                   className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspect === opt.id ? 'bg-violet-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{opt.label}</button>
               ))}
               <button onClick={()=>setAspect(undefined)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspect === undefined ? 'bg-violet-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Free</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button
               onClick={() => handleAutoCrop(imgRef.current)}
               disabled={!imgLoaded || detecting || error || !readyForAI}
               className={`flex items-center gap-4 px-8 py-4 rounded-2xl font-black text-[12px] uppercase transition-all active:scale-95 shadow-xl
                ${!readyForAI ? 'bg-white/5 text-slate-700 border border-white/5 cursor-not-allowed' : 'text-white bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/40 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/10'}`}
             >
                <Sparkles className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} /> 
                <span>AI AUTO FIT</span>
             </button>
             
             <button onClick={handleSave} disabled={loading || !image || error}
                className="flex items-center gap-6 px-14 py-4 rounded-2xl font-black text-[14px] uppercase text-white bg-gradient-to-r from-violet-600 to-indigo-700 shadow-2xl shadow-violet-500/20 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all border border-violet-500/40">
                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6" /> COMMIT RING</>}
             </button>
          </div>
        </div>
      </div>
    </div>
    <style jsx>{`
      @keyframes scan {
        0% { top: 0; opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
      .animate-scan {
        animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `}</style>
    </>
  );
}
