"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Trophy, CheckCircle, AlertCircle, 
  ArrowRight, ArrowLeft, Phone, User, MapPin, 
  ShieldCheck, Loader2, ChevronLeft, Rocket,
  Calendar, CreditCard, ClipboardCheck, Navigation2,
  Activity, Users, UserPlus, UploadCloud, X,
  Trash2, Search, ChevronDown, Zap, SearchCode,
  Edit2, Save, Plus, Clock
} from "lucide-react";
import { useSession } from "next-auth/react";
import { uploadToS3 } from "../../../lib/uploadToS3";
import { API_URL, getMediaUrl } from "../../../lib/apiConfig";

const DICT = {
  "PLAYER PORTAL": "ಆಟಗಾರರ ಪೋರ್ಟಲ್",
  "Registration Status": "ನೋಂದಣಿ ಸ್ಥಿತಿ",
  "Join the": "ಸೇರಿ",
  "Battle": "ಯುದ್ಧವನ್ನು",
  "Registry Gateway for": "ನೋಂದಣಿ ಗೇಟ್‌ವೇ",
  "Personal Identity": "ವೈಯಕ್ತಿಕ ಗುರುತು",
  "Individual record verification": "ವೈಯಕ್ತಿಕ ದಾಖಲೆ ಪರಿಶೀಲನೆ",
  "Player Name": "ಆಟಗಾರನ ಹೆಸರು",
  "FULL LEGAL NAME": "ಪೂರ್ಣ ಹೆಸರು",
  "Father Name": "ತಂದೆಯ ಹೆಸರು",
  "PARENT IDENTITY": "ಪೋಷಕರ ಹೆಸರು",
  "Date of Birth": "ಜನ್ಮ ದಿನಾಂಕ",
  "DD-MM-YYYY": "ದಿನಾಂಕ-ತಿಂಗಳು-ವರ್ಷ",
  "Mobile Number": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
  "10 DIGIT PRIMARY CONTACT": "10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
  "Aadhaar ID": "ಆಧಾರ್ ಐಡಿ",
  "12 DIGIT IDENTITY NUMBER": "12 ಅಂಕಿಯ ಗುರುತಿನ ಸಂಖ್ಯೆ",
  "Regional Localization": "ಪ್ರಾದೇಶಿಕ ಸ್ಥಳೀಕರಣ",
  "Simplified administrative verification": "ಸರಳೀಕೃತ ಆಡಳಿತಾತ್ಮಕ ಪರಿಶೀಲನೆ",
  "Select Taluk": "ತಾಲ್ಲೂಕು ಆಯ್ಕೆಮಾಡಿ",
  "Select Hobli": "ಹೋಬಳಿ ಆಯ್ಕೆಮಾಡಿ",
  "Village / Ward Name": "ಗ್ರಾಮ / ವಾರ್ಡ್ ಹೆಸರು",
  "TYPE YOUR VILLAGE OR WARD NAME": "ನಿಮ್ಮ ಗ್ರಾಮದ ಹೆಸರನ್ನು ಟೈಪ್ ಮಾಡಿ",
  "Professional Profile": "ವೃತ್ತಿಪರ ವಿವರ",
  "Match readiness and skill ledger": "ಪಂದ್ಯದ ಸಿದ್ಧತೆ ಮತ್ತು ಕೌಶಲ್ಯ ವಿವರ",
  "Primary Role": "ಪಾತ್ರ",
  "Batsman": "ಬ್ಯಾಟ್ಸ್‌ಮನ್",
  "Bowler": "ಬೌಲರ್",
  "All-Rounder": "ಆಲ್‌ರೌಂಡರ್",
  "Playing Style": "ಆಡುವ ಶೈಲಿ",
  "Right Hand": "ಬಲಗೈ",
  "Left Hand": "ಎಡಗೈ",
  "ARE YOU WICKET KEEPER..?": "ನೀವು ವಿಕೆಟ್ ಕೀಪರ್..?",
  "YES": "ಹೌದು",
  "NO": "ಇಲ್ಲ",
  "(I AM A KEEPER)": "(ನಾನು ಕೀಪರ್)",
  "(FIELDING ONLY)": "(ಕ್ಷೇತ್ರರಕ್ಷಣೆ ಮಾತ್ರ)",
  "Asset Repository": "ದಾಖಲೆಗಳ ಸಂಗ್ರಹ",
  "Encrypted visual and identity proof": "ಗುರುತಿನ ಪುರಾವೆ",
  "Profile Identity Photo": "ಆಟಗಾರನ ಫೋಟೋ",
  "Aadhaar Resource Node": "ಆಧಾರ್ ದಾಖಲೆ",
  "Back": "ಹಿಂದೆ",
  "Continue": "ಮುಂದುವರಿಸಿ",
  "LAUNCH REGISTRATION": "ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
  "PROCESSING TRANSACTION...": "ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ...",
  "Status Lookup Engine": "ಸ್ಥಿತಿ ಪರಿಶೀಲನಾ ಎಂಜಿನ್",
  "Enter Registered Mobile Number": "ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ",
  "Verify Registry": "ಪರಿಶೀಲಿಸಿ",
  "Checking...": "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
  "Find My Application": "ನನ್ನ ಅರ್ಜಿಯನ್ನು ಹುಡುಕಿ",
  "Phase": "ಹಂತ",
  "SEARCH...": "ಹುಡುಕಿ...",
  "Global Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್"
};

const SearchingOverlay = ({ mobile }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    "Initializing Secure Protocol...",
    "Scanning Central Registry...",
    "Accessing Player Database...",
    "Verifying Identity Nodes...",
    "Retrieving Registration State...",
    "Filtering Regional Records...",
    "Compiling Status Report..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(p => (p + 1) % messages.length);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
       <div className="relative w-64 h-64 mb-12">
          <div className="absolute inset-0 border border-violet-500/20 rounded-full animate-ping duration-[3000ms]"></div>
          <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-ping duration-[2000ms]"></div>
          <div className="absolute inset-8 border border-white/5 rounded-full"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-scan shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
          
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-32 h-32 rounded-3xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center gap-3 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent opacity-50"></div>
                <Search className="w-10 h-10 text-white animate-pulse" />
                <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-0"></div>
                   <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
                   <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-300"></div>
                </div>
             </div>
          </div>
       </div>

       <div className="text-center space-y-6">
          <div className="space-y-2">
             <h3 className="text-2xl font-[1000] text-white italic tracking-widest uppercase animate-pulse">Searching Identity</h3>
             <p className="text-[10px] font-black text-violet-400 tracking-[0.4em] uppercase">{mobile}</p>
          </div>
          
          <div className="h-4 flex items-center justify-center">
             <p className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase italic transition-all duration-500">{messages[msgIndex]}</p>
          </div>

          <div className="w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-500 animate-progress w-full"></div>
          </div>
       </div>
    </div>
  );
};

export default function PlayerRegistrationPage() {
  const { id: tournamentId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  // State
  const [lang, setLang] = useState("EN");
  const t = (text) => lang === "KN" ? (DICT[text] || text) : text;

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ 
    title: "", 
    details: "", 
    splashUrl: "",
    registrationEndDate: "",
    registrationEndTime: "23:59",
    closedMessage: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [step, setStep] = useState(0);
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
  const [isUrgent, setIsUrgent] = useState(false);
  const [dateLabel, setDateLabel] = useState("");

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
  const [greeting, setGreeting] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good Morning");
      else if (hour < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };
    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tournament?.registrationEndDate) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const dateStr = tournament.registrationEndDate.includes('T') 
        ? tournament.registrationEndDate.split('T')[0] 
        : tournament.registrationEndDate;
      const timeStr = tournament.registrationEndTime || "23:59";
      const end = new Date(`${dateStr}T${timeStr}`).getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setIsClosed(true);
        setTimeLeft("00d 00h 00m 00s");
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        setIsClosed(false);
        setIsUrgent(d < 1);

        const endDay = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        endDay.setHours(0,0,0,0);
        const diffDays = Math.round((endDay - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) setDateLabel("Today");
        else if (diffDays === 1) setDateLabel("Tomorrow");
        else setDateLabel(new Date(tournament.registrationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [tournament]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("edit") === "true") {
        setIsEditing(true);
      }
    }
  }, []);

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
         setEditValues({
            title: data.tournament?.registrationTitle || "",
            details: data.tournament?.registrationDetails || "",
            splashUrl: data.tournament?.assets?.splashUrl || "",
            registrationEndDate: data.tournament?.registrationEndDate?.split('T')[0] || "",
            registrationEndTime: data.tournament?.registrationEndTime || "23:59",
            closedMessage: data.tournament?.closedMessage || ""
         });
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
         // Cinematic delay
         await new Promise(r => setTimeout(r, 2200));
         const res = await fetch(`${API_URL}/api/players/check?mobile=${checkMobile}&tournamentId=${tournamentId}`);
        const data = await res.json();
        
        if (res.ok && data.name) {
            setCheckResult(data);
            setShowStatusCheck(true);
        } else {
            // If they are not registered, route them to step 1 automatically
            setFormData(prev => ({ ...prev, mobile: checkMobile }));
            setStep(1);
            setShowStatusCheck(false); // Hide status view if it was open
        }
     } catch (err) {
        setCheckResult({ message: "Network error during lookup." });
        setShowStatusCheck(true);
     }
     setChecking(false);
  };

  const handleSaveSettings = async () => {
     setSavingSettings(true);
     try {
       const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           registrationTitle: editValues.title,
           registrationDetails: editValues.details,
           registrationEndDate: editValues.registrationEndDate,
           registrationEndTime: editValues.registrationEndTime,
           closedMessage: editValues.closedMessage,
           assets: {
             ...tournament.assets,
             splashUrl: editValues.splashUrl
           }
         }),
       });
       if (res.ok) {
           setTournament(prev => ({ 
             ...prev, 
             registrationTitle: editValues.title, 
             registrationDetails: editValues.details,
             registrationEndDate: editValues.registrationEndDate,
             registrationEndTime: editValues.registrationEndTime,
             closedMessage: editValues.closedMessage,
             assets: { ...prev.assets, splashUrl: editValues.splashUrl }
           }));
          setIsEditing(false);
          alert("✨ Portal Customization Applied Successfully!");
        } else {
         alert("Failed to save settings.");
       }
     } catch (err) {
       alert("Error saving settings.");
     }
     setSavingSettings(false);
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
                 <h2 className="text-xl font-black text-white italic tracking-tighter leading-none">{lang === "KN" ? "ಆಟಗಾರರ " : "PLAYER "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">{lang === "KN" ? "ಪೋರ್ಟಲ್" : "PORTAL"}</span></h2>
                 {tournament?.name && (
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-[0.3em] mt-1.5">{tournament.name}</p>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              {session && (
                 <button
                   onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
                   disabled={savingSettings}
                   className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'}`}
                 >
                    {savingSettings ? <Loader2 size={14} className="animate-spin" /> : isEditing ? <Save size={14} /> : <Edit2 size={14} />}
                    {isEditing ? "Save Edits" : "Edit Page"}
                 </button>
              )}
              <button
                onClick={() => setLang(lang === "EN" ? "KN" : "EN")}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase text-violet-400 hover:text-white hover:bg-white/10 transition-all mr-2"
              >
                {lang === "EN" ? "ಕನ್ನಡ" : "EN"}
              </button>
              <button 
                onClick={() => setShowStatusCheck(!showStatusCheck)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                 <SearchCode size={14} className="text-violet-500" />
                 {t("Registration Status")}
              </button>
              <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                 <X size={18} className="text-slate-500" />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12 relative z-10">
        
        {/* Cinematic Registration Status Modal Overlay */}
        {showStatusCheck && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-2xl bg-black/60 animate-in fade-in duration-500">
               <div className="relative w-full max-w-2xl bg-[#0B0F2A]/90 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out">
                  
                  {/* Moving Glow Background Decor */}
                  <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-400/10 animate-pulse pointer-events-none" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-600/20">
                             <SearchCode className="text-violet-400" size={24} />
                          </div>
                          <div>
                             <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white italic">Status Lookup</h3>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Auction Intelligence Engine</p>
                          </div>
                       </div>
                       <button onClick={() => { setShowStatusCheck(false); setCheckResult(null); }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:rotate-90">
                          <X size={18} className="text-slate-400 hover:text-white" />
                       </button>
                    </div>

                    <div className="flex flex-col gap-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">{t("Enter Registered Mobile Number")}</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                             <input 
                               value={checkMobile}
                               onChange={e => setCheckMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                               placeholder="10 DIGIT NUMBER"
                               className="flex-1 bg-slate-900/50 border-2 border-white/5 rounded-2xl px-6 py-4 text-xl font-black tracking-[0.4em] text-white outline-none focus:border-violet-500 transition-all text-center sm:text-left"
                             />
                             <button 
                               onClick={handleCheckStatus}
                               disabled={checking || checkMobile.length !== 10}
                               className="px-8 py-4 bg-white text-black rounded-2xl text-[11px] font-[1000] uppercase tracking-widest disabled:opacity-30 hover:scale-105 transition-all shadow-xl shadow-white/5 shrink-0"
                             >
                                {checking ? t("Processing...") : t("Verify Registry")}
                             </button>
                          </div>
                       </div>
                    </div>

                    {checkResult && (
                       <div className={`mt-10 p-8 rounded-[2rem] border ${checkResult.name ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]' : 'bg-red-500/5 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.05)]'} animate-in zoom-in-95 slide-in-from-bottom-4 duration-500`}>
                         {checkResult.name ? (
                            <div className="flex flex-col md:flex-row items-center gap-8">
                               {/* Player Photo */}
                               <div className="w-32 h-32 shrink-0 rounded-3xl bg-slate-900 border-2 border-white/10 overflow-hidden shadow-2xl relative group">
                                  <img 
                                    src={checkResult.player?.photo?.drive || checkResult.player?.imageUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"} 
                                    alt={checkResult.name}
                                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-violet-600 rounded-md text-[8px] font-black text-white">ID: {checkResult.player.applicationId || checkResult.player.iconId}</div>
                               </div>

                               <div className="flex-1 text-center md:text-left space-y-4">
                                  <div>
                                     <h2 className="text-3xl font-black text-white uppercase italic tracking-normal drop-shadow-md mb-1">{checkResult.name}</h2>
                                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-1 italic animate-pulse">Registration Approved!</p>
                                  </div>

                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                                     <div className="space-y-1">
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Role</p>
                                        <p className="text-[10px] text-white font-bold tracking-wide italic">{checkResult.player.role || "All-Rounder"}</p>
                                     </div>
                                     <div className="space-y-1">
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Village</p>
                                        <p className="text-[10px] text-white font-bold tracking-wide italic truncate">{checkResult.player.village || "N/A"}</p>
                                     </div>
                                     <div className="space-y-1">
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Status</p>
                                        <p className="text-[10px] text-emerald-400 font-bold tracking-wide italic uppercase">{checkResult.player.status || "Sold"}</p>
                                     </div>
                                     <div className="space-y-1">
                                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Category</p>
                                        <p className="text-[10px] text-violet-400 font-bold tracking-wide italic uppercase">{checkResult.player.category || "General"}</p>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         ) : (
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                               <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                  <X className="text-red-500" size={32} />
                               </div>
                               <div>
                                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Record Not Found</h3>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Check the number and try again</p>
                               </div>
                            </div>
                         )}
                       </div>
                    )}
                  </div>

                  {/* Footer Decoration */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
               </div>
            </div>
        )}

        <div className="mb-16 relative group">
            {isEditing ? (
              <div className="max-w-4xl mx-auto space-y-6 animate-in zoom-in-95 duration-300 bg-[#0B0F2A]/90 p-8 rounded-[3rem] border border-violet-500/30 shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                 <div className="flex items-center gap-3 mb-4">
                    <Edit2 className="text-violet-500" size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Customize Registration Portal</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Portal Heading</label>
                       <input 
                         type="text"
                         value={editValues.title}
                         onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                         placeholder="e.g. JOIN THE BATTLE"
                         className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-white uppercase italic tracking-normal outline-none focus:border-violet-500 transition-all"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registration End Date & Time</label>
                       <div className="flex gap-2">
                          <input 
                            type="date"
                            value={editValues.registrationEndDate}
                            onChange={e => setEditValues(p => ({ ...p, registrationEndDate: e.target.value }))}
                            className="flex-1 bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:border-violet-500 transition-all"
                          />
                          <input 
                            type="time"
                            value={editValues.registrationEndTime}
                            onChange={e => setEditValues(p => ({ ...p, registrationEndTime: e.target.value }))}
                            className="w-32 bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-4 text-sm font-black text-white outline-none focus:border-violet-500 transition-all"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Banner Image URL</label>
                       <div className="flex gap-2">
                          <input 
                            type="text"
                            value={editValues.splashUrl}
                            onChange={e => setEditValues(p => ({ ...p, splashUrl: e.target.value }))}
                            placeholder="https://image-url.com/banner.png"
                            className="flex-1 bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-xs font-medium text-slate-300 outline-none focus:border-violet-500 transition-all"
                          />
                          <label className="shrink-0 w-14 h-14 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-violet-600/30 transition-all">
                             {uploadingBanner ? <Loader2 className="animate-spin text-violet-400" size={20} /> : <UploadCloud className="text-violet-400" size={20} />}
                             <input 
                               type="file" 
                               className="hidden" 
                               onChange={async (e) => {
                                 const file = e.target.files[0];
                                 if (!file) return;
                                 setUploadingBanner(true);
                                 try {
                                   const url = await uploadToS3(file, "banners");
                                   setEditValues(p => ({ ...p, splashUrl: url }));
                                 } catch (err) { alert("Upload failed"); }
                                 setUploadingBanner(false);
                               }} 
                             />
                          </label>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custom 'Closed' Message</label>
                       <textarea
                         rows={2}
                         value={editValues.closedMessage}
                         onChange={e => setEditValues(p => ({ ...p, closedMessage: e.target.value }))}
                         placeholder="e.g. Registration is closed. Contact us for details..."
                         className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-slate-300 outline-none focus:border-violet-500 transition-all resize-none"
                       />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tournament Guidelines & Rules</label>
                    <textarea
                      rows={4}
                      value={editValues.details}
                      onChange={e => setEditValues(p => ({ ...p, details: e.target.value }))}
                      placeholder="Enter tournament details, rules, or guidelines..."
                      className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-slate-300 outline-none focus:border-violet-500 transition-all resize-none"
                    />
                 </div>

                 <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">Cancel</button>
                    <button onClick={handleSaveSettings} disabled={savingSettings} className="px-8 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                       {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14}/>}
                       {savingSettings ? "Saving..." : "Apply Changes"}
                    </button>
                 </div>
              </div>
            ) : (
              <div className="relative group overflow-hidden rounded-[3rem] border border-white/5 bg-[#0B0F2A]/40 backdrop-blur-sm">
                {/* Cinematic Banner Background */}
                <div className="absolute inset-0 z-0">
                   <img 
                      src={getMediaUrl(tournament?.assets?.splashUrl, "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop")} 
                      className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-all duration-1000"
                      alt="Banner"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent"></div>
                   <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/80 via-transparent to-[#020617]/80"></div>
                </div>

                <div className="relative z-10 py-16 px-8 text-center">
                   <div className="mb-6 animate-in slide-in-from-top-4 duration-700">
                      <span className="px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                         ✨ {greeting}, Hero
                      </span>
                   </div>

                   <div className="flex items-center justify-center gap-4 mb-6">
                      <div className="h-px w-12 bg-gradient-to-r from-transparent to-violet-500"></div>
                      <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.5em] drop-shadow-lg">
                         {t("Registry Gateway for")} <span className="text-white italic">{tournament?.name}</span>
                      </p>
                      <div className="h-px w-12 bg-gradient-to-l from-transparent to-violet-500"></div>
                   </div>

                   <h1 className="text-6xl md:text-8xl font-black text-white uppercase italic tracking-normal leading-[1.1] mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-8 duration-700">
                      {tournament?.registrationTitle ? tournament.registrationTitle : (
                        <>{t("Join the")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-400">{t("Battle")}</span></>
                      )}
                   </h1>
                   {tournament?.registrationEndDate && (
                     <div className="mb-8 flex flex-col items-center gap-2 animate-in fade-in duration-1000">
                        <div className={`flex items-center gap-3 px-6 py-2 ${isUrgent ? 'bg-red-600/10 border-red-500/20 shadow-red-600/10' : 'bg-emerald-600/10 border-emerald-500/20 shadow-emerald-600/10'} rounded-2xl backdrop-blur-xl shadow-lg transition-colors duration-500`}>
                           <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                           <div className="flex items-center gap-4">
                              <div className="flex flex-col items-start">
                                 <p className={`text-[8px] font-black ${isUrgent ? 'text-red-400/70' : 'text-emerald-400/70'} uppercase tracking-widest`}>Registration Ends</p>
                                 <p className="text-[10px] font-black text-white uppercase tracking-wider">{dateLabel}</p>
                              </div>
                              <div className="w-px h-6 bg-white/10" />
                              <div className="flex flex-col items-start">
                                 <p className={`text-[8px] font-black ${isUrgent ? 'text-red-400/70' : 'text-emerald-400/70'} uppercase tracking-widest`}>Time Remaining</p>
                                 <p className={`text-[11px] font-[1000] ${isUrgent ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-widest tabular-nums`}>{timeLeft}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   {/* Custom Guidelines Block */}
                   {tournament?.registrationDetails && (
                     <div className="mt-8 max-w-2xl mx-auto p-6 bg-white/5 border border-white/10 rounded-3xl text-left animate-in fade-in slide-in-from-bottom-4 shadow-2xl backdrop-blur-md group-hover:border-violet-500/20 transition-all">
                       {session && (
                         <button onClick={() => setIsEditing(true)} className="absolute -top-3 -right-3 w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-xl shadow-violet-600/30">
                            <Edit2 size={16} className="text-white" />
                         </button>
                       )}
                       <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tournament Intelligence & Rules</h3>
                       </div>
                       <p className="text-slate-300 text-xs whitespace-pre-wrap leading-loose font-bold italic opacity-80 tracking-wide">
                         {tournament.registrationDetails}
                       </p>
                     </div>
                   )}

                   {!tournament?.registrationDetails && session && (
                     <button onClick={() => setIsEditing(true)} className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-all">
                       <Plus size={14} /> Configure Tournament Guidelines
                     </button>
                   )}
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
              </div>
            )}
        </div>

        {checking && <SearchingOverlay mobile={checkMobile} />}

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
                  {t("Find My Application")}
               </button>
            </div>
        )}

        <div className="bg-[#0f172a]/40 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
           {isClosed ? (
             <div className="py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                <div className="w-24 h-24 rounded-[2.5rem] bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
                   <X className="w-12 h-12 text-red-500" />
                   <div className="absolute inset-0 rounded-[2.5rem] border-2 border-red-500 animate-ping opacity-20" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-normal mb-4 drop-shadow-xl">Registration <span className="text-red-500">Closed</span></h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto leading-loose font-bold italic tracking-wide">
                   {tournament?.closedMessage || "Registration is currently closed. Please contact the tournament organizer for more details."}
                </p>
                <div className="mt-12 pt-8 border-t border-white/5 w-full max-w-xs mx-auto">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">For further inquiries</p>
                   <p className="text-xs font-black text-white uppercase tracking-widest mt-2">{tournament?.organizerName || "Tournament Official"}</p>
                </div>
             </div>
           ) : (
             <form onSubmit={(e) => e.preventDefault()} className="space-y-12 relative z-10">
              
              {step === 0 && !showStatusCheck && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 flex flex-col items-center justify-center py-10">
                   <div className="w-20 h-20 rounded-3xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                      <Phone className="w-10 h-10 text-violet-400" />
                   </div>
                   <div className="text-center space-y-4">
                     <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-wide drop-shadow-xl">Enter Mobile Number</h2>
                     <p className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase max-w-sm leading-relaxed">Enter your 10-digit number to check status or begin registration</p>
                   </div>
                   <div className="w-full max-w-md relative group mt-4">
                     <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
                     <input 
                       type="tel"
                       value={checkMobile}
                       onChange={e => setCheckMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                       placeholder="10 DIGIT NUMBER"
                       className="relative w-full bg-slate-900 border-2 border-white/10 rounded-2xl px-6 py-6 text-center text-2xl font-black text-white tracking-[0.5em] outline-none focus:border-violet-500 transition-all placeholder:text-slate-700"
                       onKeyDown={(e) => {
                          if (e.key === 'Enter' && checkMobile.length === 10 && !checking) {
                            handleCheckStatus();
                          }
                        }}
                     />
                   </div>
                   <button 
                     type="button"
                     onClick={handleCheckStatus}
                     disabled={checking || checkMobile.length !== 10}
                     className="w-full max-w-md px-8 py-5 mt-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-2xl font-[1000] text-sm uppercase tracking-[0.2em] shadow-xl shadow-violet-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 hover:brightness-110"
                   >
                     {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                     {checking ? "Verifying..." : "Continue"}
                   </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 relative">
                   <div className="flex justify-end mb-[-2rem] relative z-20">
                     <button type="button" onClick={() => setStep(0)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-white/5">
                        <ArrowLeft size={12} /> Change Number
                     </button>
                   </div>
                   <SectionHeader num="01" title={t("Personal Identity")} sub={t("Individual record verification")} icon={UserPlus} color="violet" t={t} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field icon={User} label={t("Player Name")} name="name" value={formData.name} onChange={handleInputChange} placeholder={t("FULL LEGAL NAME")} required />
                      <Field icon={Users} label={t("Father Name")} name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder={t("PARENT IDENTITY")} />
                      <Field icon={Calendar} label={t("Date of Birth")} name="dob" type="date" value={formData.dob} onChange={handleInputChange} placeholder={t("DD-MM-YYYY")} />
                      <Field icon={Phone} label={t("Mobile Number")} name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} placeholder={t("10 DIGIT PRIMARY CONTACT")} required />
                   </div>
                   <Field icon={CreditCard} label={t("Aadhaar ID")} name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} placeholder={t("12 DIGIT IDENTITY NUMBER")} />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                   <SectionHeader num="02" title={t("Regional Localization")} sub={t("Simplified administrative verification")} icon={Navigation2} color="cyan" t={t} />
                   <div className="grid grid-cols-1 gap-8">
                      <SearchSelect label={t("Select Taluk")} options={taluks} value={formData.taluk} onChange={(val) => handleInputChange({target: {name: 'taluk', value: val}})} t={t} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <SearchSelect label={t("Select Hobli")} options={hoblis} value={formData.hobli} onChange={(val) => handleInputChange({target: {name: 'hobli', value: val}})} disabled={!formData.taluk} t={t} />
                         <Field icon={MapPin} label={t("Village / Ward Name")} name="village" value={formData.village} onChange={handleInputChange} placeholder={t("TYPE YOUR VILLAGE OR WARD NAME")} required />
                      </div>
                   </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                   <SectionHeader num="03" title={t("Professional Profile")} sub={t("Match readiness and skill ledger")} icon={Activity} color="emerald" t={t} />
                   <div className="space-y-8">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">{t("Primary Role")}</label>
                         <div className="grid grid-cols-3 gap-4">
                            {['Batsman', 'Bowler', 'All-Rounder'].map(r => (
                               <CardSelect key={r} label={t(r)} active={formData.role === r} onClick={() => setFormData(p => ({ ...p, role: r }))} />
                            ))}
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">{t("Playing Style")}</label>
                              <div className="flex gap-3">
                                 {['Right Hand', 'Left Hand'].map(s => (
                                    <button key={s} type="button" onClick={() => setFormData(p=>({...p, playingStyle: s}))} className={`flex-1 py-4 rounded-2xl border transition-all font-black uppercase text-[10px] tracking-widest ${formData.playingStyle === s ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>{t(s)}</button>
                                 ))}
                              </div>
                         </div>
                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">{t("ARE YOU WICKET KEEPER..?")}</label>
                             <div className="flex gap-4 h-20">
                                {formData.wicketKeeper !== false && (
                                   <button 
                                      type="button" 
                                      onClick={() => setFormData(p=>({...p, wicketKeeper: p.wicketKeeper === true ? null : true}))} 
                                      className={`flex-1 flex items-center justify-center gap-3 rounded-[2rem] border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.wicketKeeper === true ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-600/20' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:border-emerald-500/30 hover:text-emerald-400'}`}
                                   >
                                      {formData.wicketKeeper === true ? <CheckCircle size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
                                      {t("YES")} <span className="text-[8px] opacity-40 ml-1 italic">{t("(I AM A KEEPER)")}</span>
                                   </button>
                                )}
                                {formData.wicketKeeper !== true && (
                                   <button 
                                      type="button" 
                                      onClick={() => setFormData(p=>({...p, wicketKeeper: p.wicketKeeper === false ? null : false}))} 
                                      className={`flex-1 flex items-center justify-center gap-3 rounded-[2rem] border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.wicketKeeper === false ? 'bg-red-500/10 border-red-500 text-red-500 shadow-xl shadow-red-500/10' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:border-red-500/30 hover:text-red-400'}`}
                                   >
                                      {formData.wicketKeeper === false ? <X size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
                                      {t("NO")} <span className="text-[10px] font-black opacity-60 ml-1 italic">{t("(FIELDING ONLY)")}</span>
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
                   <SectionHeader num="04" title={t("Asset Repository")} sub={t("Encrypted visual and identity proof")} icon={UploadCloud} color="slate" t={t} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FileUploadField label={t("Profile Identity Photo")} icon={User} preview={previews.photo} onChange={(e) => handleFileChange(e, 'photo')} onClear={() => { setFormData(p=>({...p, photo: null})); setPreviews(p=>({...p, photo: null})); }} />
                      <FileUploadField label={t("Aadhaar Resource Node")} icon={CreditCard} preview={previews.aadhaar} onChange={(e) => handleFileChange(e, 'aadhaarFile')} onClear={() => { setFormData(p=>({...p, aadhaarFile: null})); setPreviews(p=>({...p, aadhaar: null})); }} />
                   </div>
                </div>
              )}

              {step > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-white/5 gap-6">
                   {step > 0 ? (
                      <button type="button" onClick={prevStep} className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg"><ArrowLeft size={16} /> {t("Back")}</button>
                   ) : <div />}

                   {step < 4 ? (
                      <button type="button" onClick={nextStep} className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] italic text-white shadow-xl shadow-violet-600/30 hover:scale-[1.03] transition-all flex items-center justify-center gap-3">{t("Continue")} <ArrowRight size={16} /></button>
                   ) : (
                      <button onClick={handleSubmit} disabled={submitting} type="button" className="w-full md:w-auto px-12 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] italic text-white shadow-2xl transition-all flex flex-col items-center gap-1 disabled:opacity-50">
                        <div className="flex items-center gap-3">
                           {submitting ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />} 
                           {submitting ? t("PROCESSING TRANSACTION...") : t("LAUNCH REGISTRATION")}
                        </div>
                        {submissionPhase && <span className="text-[8px] font-bold opacity-70 tracking-widest">{submissionPhase}</span>}
                      </button>
                   )}
                </div>
              )}
           </form>
           )}
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ num, title, sub, icon: Icon, color, t }) {
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">{t ? t("Phase") : "Phase"} {num}</p>
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

function SearchSelect({ label, options, value, onChange, disabled, t }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={`space-y-3 relative ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
       <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">{label}</label>
       <div onClick={() => setOpen(!open)} className={`w-full bg-slate-900 border rounded-[1.5rem] p-5 flex items-center justify-between cursor-pointer transition-all ${open ? 'border-violet-500 ring-4 ring-violet-500/5' : 'border-white/5 hover:border-white/10 shadow-lg'}`}>
          <span className={`text-xs font-black uppercase tracking-widest ${value ? 'text-white' : 'text-slate-700'}`}>{value || label}</span>
          <ChevronDown size={14} className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
       </div>
       {open && (
         <div className="absolute top-full left-0 w-full mt-3 bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                <Search size={14} className="text-slate-600" />
                <input autoFocus placeholder={t ? t("SEARCH...") : "SEARCH..."} value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white w-full" />
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
