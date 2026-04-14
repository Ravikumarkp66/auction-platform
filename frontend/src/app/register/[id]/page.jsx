"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Trophy, CheckCircle, AlertCircle, 
  ArrowRight, ArrowLeft, Phone, User, MapPin, 
  ShieldCheck, Loader2, ChevronLeft, Rocket,
  Calendar, CreditCard, ClipboardCheck, Navigation2,
  Activity, Users, UserPlus, UploadCloud, X,
  Trash2, Search, ChevronDown, Zap, SearchCode
} from "lucide-react";
import { uploadToS3 } from "../../../lib/uploadToS3";
import { API_URL } from "../../../lib/apiConfig";

export default function PlayerRegistrationPage() {
  const { id: tournamentId } = useParams();
  const router = useRouter();
  
  // State
  const [step, setStep] = useState(1);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  // Status Check State
  const [showStatusCheck, setShowStatusCheck] = useState(false);
  const [checkMobile, setCheckMobile] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  // Location Data States
  const [taluks, setTaluks] = useState([]);
  const [hoblis, setHoblis] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    fatherName: "",
    dob: "",
    mobile: "",
    aadhaarNumber: "",
    taluk: "",
    hobli: "",
    village: "",
    playingStyle: "Right Hand",
    role: "All-Rounder",
    wicketKeeper: null,
    basePrice: 100,
    photo: null,
    aadhaarFile: null,
  });

  const [previews, setPreviews] = useState({ photo: null, aadhaar: null });

  useEffect(() => {
    fetchTournamentDetails();
    fetchTaluks();
  }, [tournamentId]);

  useEffect(() => { if (formData.taluk) fetchHoblis(formData.taluk); }, [formData.taluk]);

  const fetchTournamentDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data.tournament);
        if (data.tournament?.defaultBasePrice) {
            setFormData(prev => ({ ...prev, basePrice: data.tournament.defaultBasePrice }));
        }
      } else { setError("Tournament context closed."); }
    } catch (err) { setError("Network Isolation Error."); }
    finally { setLoading(false); }
  };

  const fetchTaluks = async () => {
    const res = await fetch(`${API_URL}/api/location/taluks`);
    if (res.ok) setTaluks(await res.json());
  };

  const fetchHoblis = async (taluk) => {
    const res = await fetch(`${API_URL}/api/location/hoblis?taluk=${taluk}`);
    if (res.ok) setHoblis(await res.json());
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
        const newData = { ...prev, [name]: type === "checkbox" ? checked : value };
        if (name === "taluk") { newData.hobli = ""; }
        return newData;
    });
  };

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file) {
        setFormData(prev => ({ ...prev, [key]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [key === 'photo' ? 'photo' : 'aadhaar']: reader.result }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleCheckStatus = async () => {
     if (checkMobile.length !== 10) return;
     setChecking(true);
     setCheckResult(null);
     try {
        const res = await fetch(`${API_URL}/api/players/check?mobile=${checkMobile}&tournamentId=${tournamentId}`);
        const data = await res.json();
        setCheckResult(data);
     } catch (err) {
        setCheckResult({ message: "Network error during lookup." });
     }
     setChecking(false);
  };

  const validateStep = (s) => {
    setError("");
    if (s === 1) {
        if (!formData.name || !formData.mobile || formData.mobile.length !== 10) {
            setError("Name and 10-digit Mobile are required.");
            return false;
        }
    }
    if (s === 2) {
        if (!formData.taluk || !formData.hobli || !formData.village) {
            setError("Reginal details (Taluk, Hobli, Village) are mandatory.");
            return false;
        }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setSubmissionPhase("Securing Identity Data...");
    setError("");

    try {
      let photoUrl = "";
      let aadhaarUrl = "";
      
      if (formData.photo) {
          setSubmissionPhase("Syncing Profile Asset...");
          photoUrl = await uploadToS3(formData.photo, "players");
      }
      if (formData.aadhaarFile) {
          setSubmissionPhase("Archiving Document Node...");
          aadhaarUrl = await uploadToS3(formData.aadhaarFile, "documents");
      }

      setSubmissionPhase("Final Verification Protocol...");
      const res = await fetch(`${API_URL}/api/players/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          state: "Karnataka",
          district: "Custom",
          photo: { s3: photoUrl },
          imageUrl: photoUrl,
          aadhaarUrl: aadhaarUrl,
          tournamentId,
          battingStyle: formData.playingStyle,
        }),
      });

      if (res.status === 201) {
          setSuccess(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          const data = await res.json();
          setError(data.message || "Registry rejection. Check your data.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) { 
        setError("System processing failure. S3 Link or Network timeout."); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    finally { setSubmitting(false); setSubmissionPhase(""); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-6">
       <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Processing Protocol...</p>
       </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-6 text-white">
      <div className="max-w-md w-full bg-slate-900/40 border border-emerald-500/20 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
           <ClipboardCheck className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter mb-4 text-emerald-400">APPLICATION RECEIVED!</h1>
        <p className="text-slate-400 font-bold mb-10 leading-relaxed uppercase tracking-widest text-xs">
           Identity protocol complete. your entry has been secured. <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-4">we are waiting for admin approval.</span>
        </p>
        <button onClick={() => router.push(`/tournaments/${tournamentId}`)} className="w-full py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3">
           Global Dashboard <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30 pb-20">
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[50%] h-[40%] bg-violet-600/10 blur-[150px] rounded-full rotate-45"></div>
      </div>

      <header className="sticky top-0 z-[100] bg-[#020617]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-28 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-violet-600/20 rotate-3 shrink-0">
                 <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                 <h2 className="text-xl font-black text-white italic tracking-tighter leading-none">PLAYER <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">PORTAL</span></h2>
                 {tournament?.name && (
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-[0.3em] mt-1.5">{tournament.name}</p>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowStatusCheck(!showStatusCheck)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                 <SearchCode size={14} className="text-violet-500" />
                 Registration Status
              </button>
              <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                 <X size={18} className="text-slate-500" />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 relative z-10">
        
        {/* Registration Status Modal-like section */}
        {showStatusCheck && (
            <div className="mb-12 p-8 bg-violet-600/10 border border-violet-500/20 rounded-[2.5rem] animate-in fade-in slide-in-from-top-6 duration-500 shadow-2xl">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <SearchCode className="text-violet-400" size={20} />
                     <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Status Lookup Engine</h3>
                  </div>
                  <button onClick={() => { setShowStatusCheck(false); setCheckResult(null); }} className="text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
               </div>
               <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-3">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Enter Registered Mobile Number</label>
                     <input 
                       value={checkMobile}
                       onChange={e => setCheckMobile(e.target.value)}
                       placeholder="10 DIGIT NUMBER"
                       className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-xs font-black tracking-widest outline-none focus:border-violet-500 transition-all font-mono"
                     />
                  </div>
                  <button 
                    onClick={handleCheckStatus}
                    disabled={checking || checkMobile.length !== 10}
                    className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:scale-105 transition-all shadow-lg shadow-white/10 shrink-0"
                  >
                     {checking ? "Checking..." : "Verify Registry"}
                  </button>
               </div>

               {checkResult && (
                  <div className={`mt-8 p-6 rounded-2xl border ${checkResult.name ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} animate-in zoom-in-95`}>
                     <div className="flex items-center gap-4">
                        {checkResult.name ? <CheckCircle className="text-emerald-500" size={20} /> : <AlertCircle className="text-red-500" size={20} />}
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white">{checkResult.name ? `Player Verified: ${checkResult.name}` : "Registry Error"}</p>
                           <p className={`text-[11px] font-bold uppercase mt-1 ${checkResult.name ? 'text-emerald-400' : 'text-red-400'}`}>{checkResult.message}</p>
                        </div>
                     </div>
                  </div>
               )}
            </div>
        )}

        <div className="mb-12 text-center">
            <h1 className="text-7xl font-black text-white uppercase italic tracking-tighter leading-none mb-4">
               Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-400">Battle</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] leading-relaxed">
               Registry Gateway for <span className="text-white italic">{tournament?.name}</span>
            </p>
        </div>

        {error && (
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex flex-col md:flex-row items-center gap-6 text-red-500 relative overflow-hidden group shadow-2xl">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 opacity-50"></div>
               <div className="flex items-center gap-4 flex-1">
                  <AlertCircle size={24} className="shrink-0" />
                  <p className="text-[11px] font-black italic tracking-widest leading-relaxed uppercase">{error}</p>
               </div>
               <button 
                 type="button"
                 onClick={() => { setShowStatusCheck(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                 className="px-6 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:scale-105 transition-all shrink-0"
               >
                  Find My Application
               </button>
            </div>
        )}

        <div className="bg-[#0f172a]/40 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
           <form className="space-y-12 relative z-10">
              
              {step === 1 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                   <SectionHeader num="01" title="Personal Identity" sub="Individual record verification" icon={UserPlus} color="violet" />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field icon={User} label="Player Name" name="name" value={formData.name} onChange={handleInputChange} placeholder="FULL LEGAL NAME" required />
                      <Field icon={Users} label="Father Name" name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder="PARENT IDENTITY" />
                      <Field icon={Calendar} label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleInputChange} placeholder="DD-MM-YYYY" />
                      <Field icon={Phone} label="Mobile Number" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} placeholder="10 DIGIT PRIMARY CONTACT" required />
                   </div>
                   <Field icon={CreditCard} label="Aadhaar ID" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} placeholder="12 DIGIT IDENTITY NUMBER" />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                   <SectionHeader num="02" title="Regional Localization" sub="Simplified administrative verification" icon={Navigation2} color="cyan" />
                   <div className="grid grid-cols-1 gap-8">
                      <SearchSelect label="Select Taluk" options={taluks} value={formData.taluk} onChange={(val) => handleInputChange({target: {name: 'taluk', value: val}})} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <SearchSelect label="Select Hobli" options={hoblis} value={formData.hobli} onChange={(val) => handleInputChange({target: {name: 'hobli', value: val}})} disabled={!formData.taluk} />
                         <Field icon={MapPin} label="Village / Ward Name" name="village" value={formData.village} onChange={handleInputChange} placeholder="TYPE YOUR VILLAGE OR WARD NAME" required />
                      </div>
                   </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                   <SectionHeader num="03" title="Professional Profile" sub="Match readiness and skill ledger" icon={Activity} color="emerald" />
                   <div className="space-y-8">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Primary Role</label>
                         <div className="grid grid-cols-3 gap-4">
                            {['Batsman', 'Bowler', 'All-Rounder'].map(r => (
                               <CardSelect key={r} label={r} active={formData.role === r} onClick={() => setFormData(p => ({ ...p, role: r }))} />
                            ))}
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Playing Style</label>
                              <div className="flex gap-3">
                                 {['Right Hand', 'Left Hand'].map(s => (
                                    <button key={s} type="button" onClick={() => setFormData(p=>({...p, playingStyle: s}))} className={`flex-1 py-4 rounded-2xl border transition-all font-black uppercase text-[10px] tracking-widest ${formData.playingStyle === s ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>{s}</button>
                                 ))}
                              </div>
                         </div>
                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">ARE YOU WICKET KEEPER..?</label>
                             <div className="flex gap-4 h-20">
                                {formData.wicketKeeper !== false && (
                                   <button 
                                      type="button" 
                                      onClick={() => setFormData(p=>({...p, wicketKeeper: p.wicketKeeper === true ? null : true}))} 
                                      className={`flex-1 flex items-center justify-center gap-3 rounded-[2rem] border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.wicketKeeper === true ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-600/20' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:border-emerald-500/30 hover:text-emerald-400'}`}
                                   >
                                      {formData.wicketKeeper === true ? <CheckCircle size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
                                      YES <span className="text-[8px] opacity-40 ml-1 italic">(I AM A KEEPER)</span>
                                   </button>
                                )}
                                {formData.wicketKeeper !== true && (
                                   <button 
                                      type="button" 
                                      onClick={() => setFormData(p=>({...p, wicketKeeper: p.wicketKeeper === false ? null : false}))} 
                                      className={`flex-1 flex items-center justify-center gap-3 rounded-[2rem] border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.wicketKeeper === false ? 'bg-red-500/10 border-red-500 text-red-500 shadow-xl shadow-red-500/10' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:border-red-500/30 hover:text-red-400'}`}
                                   >
                                      {formData.wicketKeeper === false ? <X size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
                                      NO <span className="text-[10px] font-black opacity-60 ml-1 italic">(FIELDING ONLY)</span>
                                   </button>
                                )}
                             </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                   <SectionHeader num="04" title="Asset Repository" sub="Encrypted visual and identity proof" icon={UploadCloud} color="slate" />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FileUploadField label="Profile Identity Photo" icon={User} preview={previews.photo} onChange={(e) => handleFileChange(e, 'photo')} onClear={() => { setFormData(p=>({...p, photo: null})); setPreviews(p=>({...p, photo: null})); }} />
                      <FileUploadField label="Aadhaar Resource Node" icon={CreditCard} preview={previews.aadhaar} onChange={(e) => handleFileChange(e, 'aadhaarFile')} onClear={() => { setFormData(p=>({...p, aadhaarFile: null})); setPreviews(p=>({...p, aadhaar: null})); }} />
                   </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-white/5 gap-6">
                 {step > 1 ? (
                    <button type="button" onClick={prevStep} className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg"><ArrowLeft size={16} /> Back</button>
                 ) : <div />}

                 {step < 4 ? (
                    <button type="button" onClick={nextStep} className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] italic text-white shadow-xl shadow-violet-600/30 hover:scale-[1.03] transition-all flex items-center justify-center gap-3">Continue <ArrowRight size={16} /></button>
                 ) : (
                    <button onClick={handleSubmit} disabled={submitting} type="button" className="w-full md:w-auto px-12 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] italic text-white shadow-2xl transition-all flex flex-col items-center gap-1 disabled:opacity-50">
                      <div className="flex items-center gap-3">
                         {submitting ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />} 
                         {submitting ? "PROCESSING TRANSACTION..." : "LAUNCH REGISTRATION"}
                      </div>
                      {submissionPhase && <span className="text-[8px] font-bold opacity-70 tracking-widest">{submissionPhase}</span>}
                    </button>
                 )}
              </div>
           </form>
        </div>
      </main>
    </div>
  );
}

// ── Shared Sub-Components ──
function SectionHeader({ num, title, sub, icon: Icon, color }) {
    const colors = {
        violet: "bg-violet-600/20 text-violet-400 border-violet-500/20",
        cyan: "bg-cyan-600/20 text-cyan-400 border-cyan-500/20",
        emerald: "bg-emerald-600/20 text-emerald-400 border-emerald-500/20",
        slate: "bg-white/10 text-white border-white/10"
    };
    return (
        <div className="flex items-center gap-5 pb-6 border-b border-white/5">
           <div className={`p-4 rounded-[1.5rem] border ${colors[color]}`}><Icon size={24} /></div>
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Phase {num}</p>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">{title}</h3>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-1">{sub}</p>
           </div>
        </div>
    );
}

function Field({ icon: Icon, label, name, value, onChange, placeholder, type = "text", required = false }) {
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between px-2">
         <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{label}</span>
      </label>
      <div className="relative group">
         <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-xl group-focus-within:bg-violet-600/20 transition-all">
            <Icon className="text-slate-600 group-focus-within:text-violet-400 transition-colors" size={16} />
         </div>
         <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-900/60 border border-white/5 rounded-[2rem] py-5 pl-16 pr-8 outline-none focus:border-violet-500/40 transition-all font-bold uppercase text-xs placeholder:text-slate-800" />
      </div>
    </div>
  );
}

function SearchSelect({ label, options, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={`space-y-3 relative ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
       <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">{label}</label>
       <div onClick={() => setOpen(!open)} className={`w-full bg-slate-900 border rounded-[1.5rem] p-5 flex items-center justify-between cursor-pointer transition-all ${open ? 'border-violet-500 ring-4 ring-violet-500/5' : 'border-white/5 hover:border-white/10 shadow-lg'}`}>
          <span className={`text-xs font-black uppercase tracking-widest ${value ? 'text-white' : 'text-slate-700'}`}>{value || `SELECT ${label.split(' ').pop().toUpperCase()}`}</span>
          <ChevronDown size={14} className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
       </div>
       {open && (
         <div className="absolute top-full left-0 w-full mt-3 bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                <Search size={14} className="text-slate-600" />
                <input autoFocus placeholder="SEARCH..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white w-full" />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                {filtered.map(o => (
                  <div key={o} onClick={(e) => { e.stopPropagation(); onChange(o); setOpen(false); setSearch(""); }} className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${value === o ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{o}</div>
                ))}
            </div>
         </div>
       )}
    </div>
  );
}

function CardSelect({ label, active, onClick }) {
  return (
    <div onClick={onClick} className={`cursor-pointer p-6 rounded-[2rem] border-2 text-center transition-all ${active ? 'bg-violet-600/20 border-violet-500 shadow-xl' : 'bg-slate-900 border-white/5 grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${active ? 'bg-violet-600 shadow-lg shadow-violet-600/20' : 'bg-white/5 text-slate-700'}`}>
         {label === 'Batsman' ? <Activity size={20} /> : label === 'Bowler' ? <Users size={20} /> : <Zap size={20} />}
      </div>
      <p className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-600'}`}>{label}</p>
    </div>
  );
}

function FileUploadField({ label, icon: Icon, preview, onChange, onClear }) {
    return (
        <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">{label}</label>
            <div className="relative group">
                {preview ? (
                    <div className="relative w-full h-48 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                        <img src={preview} className="w-full h-full object-cover" />
                        <div onClick={onClear} className="absolute inset-0 bg-red-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"><Trash2 size={24} className="text-white" /></div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 bg-slate-900 border-2 border-dashed border-white/5 rounded-[2.5rem] hover:border-violet-500/30 transition-all cursor-pointer shadow-inner">
                        <div className="p-4 bg-white/5 rounded-2xl mb-4"><UploadCloud className="w-8 h-8 text-slate-700 group-hover:text-violet-500 transition-all" /></div>
                        <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] leading-none">Register Digital Asset</p>
                        <input type="file" className="hidden" accept="image/*" onChange={onChange} />
                    </label>
                )}
            </div>
        </div>
    );
}
