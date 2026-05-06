"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
   Trophy, CheckCircle, AlertCircle,
   ArrowRight, ArrowLeft, Phone, User, MapPin,
   ShieldCheck, Loader2, ChevronLeft, Rocket,
   Calendar, CreditCard, ClipboardCheck, Navigation2,
   Activity, Users, UserPlus, UploadCloud, X,
   Trash2, Search, ChevronDown, Zap, SearchCode,
   Edit2, Save, Plus, Clock, Settings
} from "lucide-react";
import confetti from "canvas-confetti";
import { useSession } from "next-auth/react";
import { uploadToS3 } from "../../../lib/uploadToS3";
import { API_URL, getMediaUrl } from "../../../lib/apiConfig";
import { getCanonicalApplyRoute, isApplicationRoute } from "@/lib/applicationRoutes";

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
   "No Active Registration Found": "ಯಾವುದೇ ಸಕ್ರಿಯ ನೋಂದಣಿ ಕಂಡುಬಂದಿಲ್ಲ",
   "Start New Registration": "ಹೊಸ ನೋಂದಣಿ ಪ್ರಾರಂಭಿಸಿ",
   "Change Number": "ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ",
   "Resume Previous Application?": "ಹಿಂದಿನ ಅರ್ಜಿಯನ್ನು ಮುಂದುವರಿಸುವುದೇ?",
   "Continue Registration": "ನೋಂದಣಿ ಮುಂದುವರಿಸಿ",
   "Start Fresh": "ಮೊದಲಿನಿಂದ ಪ್ರಾರಂಭಿಸಿ",
   "Exit Safely": "ಸುರಕ್ಷಿತವಾಗಿ ನಿರ್ಗಮಿಸಿ",
   "Back to Home": "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
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
   "Global Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
   "KPL Secure Apply": "ಕೆಪಿಎಲ್ ಸುರಕ್ಷಿತ ಅರ್ಜಿ",
   "Player Registration": "ಆಟಗಾರರ ನೋಂದಣಿ",
   "Saving...": "ಉಳಿಸಲಾಗುತ್ತಿದೆ...",
   "Saved ✓": "ಉಳಿಸಲಾಗಿದೆ ✓",
   "Connection unstable": "ಸಂಪರ್ಕ ಅಸ್ಥಿರವಾಗಿದೆ",
   "Exit": "ನಿರ್ಗಮಿಸಿ",
   "Enter Mobile Number": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
   "Enter your 10-digit number to check status or begin registration": "ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು ಅಥವಾ ನೋಂದಣಿಯನ್ನು ಪ್ರಾರಂಭಿಸಲು ನಿಮ್ಮ 10-ಅಂಕಿಯ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
   "10 DIGIT NUMBER": "10 ಅಂಕಿಯ ಸಂಖ್ಯೆ",
   "Verifying...": "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
   "APPLICATION RECEIVED!": "ಅರ್ಜಿಯನ್ನು ಸ್ವೀಕರಿಸಲಾಗಿದೆ!",
   "Identity protocol complete. your entry has been secured.": "ಗುರುತಿನ ಪ್ರೋಟೋಕಾಲ್ ಪೂರ್ಣಗೊಂಡಿದೆ. ನಿಮ್ಮ ಪ್ರವೇಶವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಲಾಗಿದೆ.",
   "we are waiting for admin approval.": "ನಾವು ಅಡ್ಮಿನ್ ಅನುಮೋದನೆಗಾಗಿ ಕಾಯುತ್ತಿದ್ದೇವೆ.",
   "Register with another number": "ಮತ್ತೊಂದು ಸಂಖ್ಯೆಯೊಂದಿಗೆ ನೋಂದಾಯಿಸಿ",
   "Final Player Draft": "ಅಂತಿಮ ಆಟಗಾರರ ಕರಡು",
   "Auction profile preview before launch": "ಬಿಡುಗಡೆಗೆ ಮೊದಲು ಹರಾಜು ವಿವರ ವೀಕ್ಷಣೆ",
   "Identity": "ಗುರುತು",
   "Location": "ಸ್ಥಳ",
   "Cricket Details": "ಕ್ರಿಕೆಟ್ ವಿವರಗಳು",
   "Uploaded Docs": "ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ದಾಖಲೆಗಳು",
   "Name": "ಹೆಸರು",
   "Mobile": "ಮೊಬೈಲ್",
   "DOB": "ಜನ್ಮ ದಿನಾಂಕ",
   "Aadhaar": "ಆಧಾರ್",
   "Taluk": "ತಾಲ್ಲೂಕು",
   "Hobli": "ಹೋಬಳಿ",
   "Village": "ಗ್ರಾಮ",
   "Role": "ಪಾತ್ರ",
   "Playing Style": "ಆಡುವ ಶೈಲಿ",
   "Wicket Keeper": "ವಿಕೆಟ್ ಕೀಪರ್",
   "Profile Photo": "ಫೋಟೋ",
   "Aadhaar Document": "ಆಧಾರ್ ದಾಖಲೆ",
   "Uploaded": "ಅಪ್‌ಲೋಡ್ ಆಗಿದೆ",
   "Enter Auction Pool": "ಹರಾಜಿಗೆ ಸೇರಿ",
   "Record Not Found": "ದಾಖಲೆ ಕಂಡುಬಂದಿಲ್ಲ",
   "Check the number and try again": "ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
   "Status Lookup": "ಸ್ಥಿತಿ ಪರಿಶೀಲನೆ",
   "Auction Intelligence Engine": "ಹರಾಜು ಬುದ್ಧಿವಂತ ಎಂಜಿನ್",
   "ID": "ಐಡಿ",
   "Awaiting Approval": "ಅನುಮೋದನೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
   "Registration Approved!": "ನೋಂದಣಿ ಅನುಮೋದಿಸಲಾಗಿದೆ!",
   "General": "ಸಾಮಾನ್ಯ",
   "Pending": "ಬಾಕಿ ಉಳಿದಿದೆ",
   "Customize Registration Portal": "ನೋಂದಣಿ ಪೋರ್ಟಲ್ ಅನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಿ",
   "Portal Heading": "ಪೋರ್ಟಲ್ ಹೆಡಿಂಗ್",
   "Registration End Date & Time": "ನೋಂದಣಿ ಮುಕ್ತಾಯ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ",
   "Banner Image URL": "ಬ್ಯಾನರ್ ಇಮೇಜ್ ಯುಆರ್‌ಎಲ್",
   "Custom 'Closed' Message": "ಕಸ್ಟಮ್ 'ಮುಚ್ಚಲಾಗಿದೆ' ಸಂದೇಶ",
   "Tournament Guidelines & Rules": "ಟೂರ್ನಮೆಂಟ್ ಮಾರ್ಗಸೂಚಿಗಳು ಮತ್ತು ನಿಯಮಗಳು",
   "Field Control Engine": "ಫೀಲ್ಡ್ ಕಂಟ್ರೋಲ್ ಎಂಜಿನ್",
   "Save Edits": "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ",
   "Edit Page": "ಪುಟವನ್ನು ಸಂಪಾದಿಸಿ",
   "Cancel": "ರದ್ದುಮಾಡಿ",
   "Apply Changes": "ಬದಲಾವಣೆಗಳನ್ನು ಅನ್ವಯಿಸಿ",
   "Hero": "ವೀರ",
   "Registration Ends": "ನೋಂದಣಿ ಕೊನೆಗೊಳ್ಳುತ್ತದೆ",
   "Time Remaining": "ಉಳಿದ ಸಮಯ",
   "Tournament Intelligence & Rules": "ಟೂರ್ನಮೆಂಟ್ ನಿಯಮಗಳು",
   "Configure Tournament Guidelines": "ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಿ",
   "Start Registration": "ನೋಂದಣಿ ಪ್ರಾರಂಭಿಸಿ",
   "Identity verification required to proceed": "ಮುಂದುವರಿಯಲು ಗುರುತಿನ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ",
   "Registration": "ನೋಂದಣಿ",
   "Registration Status": "ನೋಂದಣಿ ಸ್ಥಿತಿ",
   "Find My Application": "ನನ್ನ ಅರ್ಜಿಯನ್ನು ಹುಡುಕಿ",
   "Closed": "ಮುಚ್ಚಲಾಗಿದೆ",
   "Registration is currently closed. Please contact the tournament organizer for more details.": "ನೋಂದಣಿ ಸದ್ಯಕ್ಕೆ ಮುಚ್ಚಲ್ಪಟ್ಟಿದೆ. ಹೆಚ್ಚಿನ ವಿವರಗಳಿಗಾಗಿ ಟೂರ್ನಮೆಂಟ್ ಆಯೋಜಕರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
   "For further inquiries": "ಹೆಚ್ಚಿನ ವಿಚಾರಣೆಗಾಗಿ",
   "Tournament Official": "ಟೂರ್ನಮೆಂಟ್ ಅಧಿಕಾರಿ",
   "Step": "ಹಂತ",
   "Offline": "ಆಫ್‌ಲೈನ್",
   "Saving": "ಉಳಿಸಲಾಗುತ್ತಿದೆ",
   "Saved": "ಉಳಿಸಲಾಗಿದೆ",
   "Auto Saved": "ಸ್ವಯಂ ಉಳಿಸಲಾಗಿದೆ",
   "Your draft was securely saved. You can continue from the last completed step or start a fresh session.": "ನಿಮ್ಮ ಡ್ರಾಫ್ಟ್ ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಲಾಗಿದೆ. ನೀವು ಕೊನೆಯ ಹಂತದಿಂದ ಮುಂದುವರಿಸಬಹುದು ಅಥವಾ ಹೊಸದಾಗಿ ಪ್ರಾರಂಭಿಸಬಹುದು.",
   "Do you want to exit player registration?": "ನೀವು ಆಟಗಾರರ ನೋಂದಣಿಯಿಂದ ನಿರ್ಗಮಿಸಲು ಬಯಸುವಿರಾ?",
   "Your draft is safely saved.": "ನಿಮ್ಮ ಕರಡು ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಲ್ಪಟ್ಟಿದೆ.",
   "Register Digital Asset": "ಡಿಜಿಟಲ್ ಆಸ್ತಿಯನ್ನು ನೋಂದಾಯಿಸಿ",
   "Upload File": "ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
   "No items found": "ಯಾವುದೇ ಅಂಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ",
   "Initializing Secure Protocol...": "ಸುರಕ್ಷಿತ ಪ್ರೋಟೋಕಾಲ್ ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ...",
   "Scanning Central Registry...": "ಕೇಂದ್ರ ನೋಂದಾವಣೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
   "Accessing Player Database...": "ಆಟಗಾರರ ಡೇಟಾಬೇಸ್ ಪ್ರವೇಶಿಸಲಾಗುತ್ತಿದೆ...",
   "Verifying Identity Nodes...": "ಗುರುತಿನ ನೋಡ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
   "Retrieving Registration State...": "ನೋಂದಣಿ ಸ್ಥಿತಿಯನ್ನು ಹಿಂಪಡೆಯಲಾಗುತ್ತಿದೆ...",
   "Filtering Regional Records...": "ಪ್ರಾದೇಶಿಕ ದಾಖಲೆಗಳನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
   "Compiling Status Report...": "ಸ್ಥಿತಿ ವರದಿಯನ್ನು ಸಂಕಲಿಸಲಾಗುತ್ತಿದೆ...",
   "Searching Identity": "ಗುರುತನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ",
   "Yes": "ಹೌದು",
   "No": "ಇಲ್ಲ",
   "Edit": "ಸಂಪಾದಿಸಿ",
   "hidden": "ಮರೆಮಾಚಲಾಗಿದೆ",
   "optional": "ಐಚ್ಛಿಕ",
   "required": "ಅಗತ್ಯವಿದೆ",
};

const DEFAULT_FIELD_CONFIG = {
   name: "required",
   fatherName: "optional",
   dob: "optional",
   mobile: "required",
   aadhaarNumber: "optional",
   taluk: "optional",
   hobli: "optional",
   village: "optional",
   role: "optional",
   playingStyle: "optional",
   wicketKeeper: "optional",
   photo: "optional",
   aadhaarFile: "optional"
};

const REGISTRATION_STEPS = [
   { id: 1, label: "Identity" },
   { id: 2, label: "Location" },
   { id: 3, label: "Cricket Profile" },
   { id: 4, label: "Uploads" },
   { id: 5, label: "Review" },
   { id: 6, label: "Submit" },
];

const SearchingOverlay = ({ mobile, t }) => {
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
      <div className="fixed inset-0 z-1000 bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
         <div className="relative w-64 h-64 mb-12">
            <div className="absolute inset-0 border border-violet-500/20 rounded-full animate-ping duration-3000"></div>
            <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-ping duration-2000"></div>
            <div className="absolute inset-8 border border-white/5 rounded-full"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-linear-to-r from-transparent via-violet-500 to-transparent animate-scan shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>

            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-32 h-32 rounded-3xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center gap-3 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-linear-to-br from-violet-600/20 to-transparent opacity-50"></div>
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
               <h3 className="text-2xl font-[1000] text-white italic tracking-widest uppercase animate-pulse">{t("Searching Identity")}</h3>
               <p className="text-[10px] font-black text-violet-400 tracking-[0.4em] uppercase">{mobile}</p>
            </div>

            <div className="h-4 flex items-center justify-center">
               <p className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase italic transition-all duration-500">{t(messages[msgIndex])}</p>
            </div>

            <div className="w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden relative">
               <div className="absolute inset-0 bg-linear-to-r from-violet-600 to-cyan-500 animate-progress w-full"></div>
            </div>
         </div>
      </div>
   );
};

export default function PlayerRegistrationPage() {
   const params = useParams();
   const pathname = usePathname();
   const tournamentId = params.id || params.token;
   const immersiveMode = isApplicationRoute(pathname);
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
   const [showExitConfirm, setShowExitConfirm] = useState(false);
   const [showStartFreshConfirm, setShowStartFreshConfirm] = useState(false);
   const [fieldConfig, setFieldConfig] = useState(DEFAULT_FIELD_CONFIG);

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
   const [fieldErrors, setFieldErrors] = useState({});
   const [autoSaveStatus, setAutoSaveStatus] = useState("saved");
   const [lastSavedAt, setLastSavedAt] = useState(null);
   const autoSaveTimerRef = useRef(null);
   const [showResumePrompt, setShowResumePrompt] = useState(false);
   const [pendingRestore, setPendingRestore] = useState(null);
   const [mobileResolved, setMobileResolved] = useState("");

   const getFieldMode = (key) => fieldConfig?.[key] || "optional";
   const isFieldHidden = (key) => getFieldMode(key) === "hidden";
   const isFieldRequired = (key) => getFieldMode(key) === "required";
   const getDraftStorageKey = () => `kpl_registration_draft_${tournamentId || "unknown"}`;
   const getSessionDraftKey = (mobile) => `${getDraftStorageKey()}_${mobile || "unknown"}`;
   const draftApiBase = `/api/tournaments/apply/${tournamentId}`;

   useEffect(() => {
      if (success) {
         const duration = 5 * 1000;
         const animationEnd = Date.now() + duration;
         const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

         const randomInRange = (min, max) => Math.random() * (max - min) + min;

         const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
               return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
         }, 250);

         return () => clearInterval(interval);
      }
   }, [success]);

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
            today.setHours(0, 0, 0, 0);
            endDay.setHours(0, 0, 0, 0);
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

   useEffect(() => {
      if (!tournament?.applyToken) return;
      if (pathname.startsWith("/register/") || pathname.startsWith("/apply/")) {
         router.replace(getCanonicalApplyRoute(tournament.applyToken));
      }
   }, [pathname, router, tournament?.applyToken]);



   useEffect(() => {
      if (!immersiveMode) return;

      const handlePopState = () => {
         window.history.pushState({ immersive: true }, "", window.location.href);
         persistLocalDraft();
         setShowExitConfirm(true);
      };

      const handleBeforeUnload = (e) => {
         persistLocalDraft();
         e.preventDefault();
         e.returnValue = "";
      };

      const handleVisibility = () => {
         if (document.visibilityState === "hidden") {
            persistLocalDraft();
         }
      };

      window.history.pushState({ immersive: true }, "", window.location.href);
      window.addEventListener("popstate", handlePopState);
      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
         window.removeEventListener("popstate", handlePopState);
         window.removeEventListener("beforeunload", handleBeforeUnload);
         document.removeEventListener("visibilitychange", handleVisibility);
      };
   }, [immersiveMode, formData, previews, step, mobileResolved]);

   useEffect(() => {
      const handleOffline = () => setAutoSaveStatus("unstable");
      const handleOnline = () => setAutoSaveStatus("saved");
      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);
      return () => {
         window.removeEventListener("offline", handleOffline);
         window.removeEventListener("online", handleOnline);
      };
   }, []);

   useEffect(() => {
      if (step < 1 || typeof window === "undefined") return;
      if (autoSaveTimerRef.current) {
         clearTimeout(autoSaveTimerRef.current);
      }

      setAutoSaveStatus(navigator.onLine ? "saving" : "unstable");
      autoSaveTimerRef.current = setTimeout(() => {
         try {
            const draft = serializeDraft();
            persistLocalDraft();
            setAutoSaveStatus(navigator.onLine ? "saved" : "unstable");
            setLastSavedAt(new Date());
            if (immersiveMode && mobileResolved) {
               syncDraftToBackend(draft);
            }
         } catch (err) {
            setAutoSaveStatus("unstable");
         }
      }, 1500);

      return () => {
         if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
         }
      };
   }, [formData, previews, step, tournamentId, immersiveMode, mobileResolved]);

   useEffect(() => { if (formData.taluk) fetchHoblis(formData.taluk); }, [formData.taluk]);

   const fetchTournamentDetails = async () => {
      try {
         const endpoint = immersiveMode
            ? `${API_URL}/api/tournaments/apply/${tournamentId}`
            : `${API_URL}/api/tournaments/${tournamentId}`;
         const res = await fetch(endpoint);
         if (res.ok) {
            const data = await res.json();
            setTournament(data.tournament);
            setFieldConfig({ ...DEFAULT_FIELD_CONFIG, ...(data.tournament?.registrationFieldConfig || {}) });
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

   const dataUrlToFile = async (dataUrl, filename) => {
      if (!dataUrl) return null;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || "image/jpeg" });
   };

   const serializeDraft = () => ({
      mobile: mobileResolved || formData.mobile || "",
      formData: {
         ...formData,
         photo: null,
         aadhaarFile: null,
      },
      previews,
      step,
      status: autoSaveStatus,
      savedAt: new Date().toISOString(),
   });

   const persistLocalDraft = () => {
      if (typeof window === "undefined" || !tournamentId) return;
      try {
         window.localStorage.setItem(getDraftStorageKey(), JSON.stringify(serializeDraft()));
         if (mobileResolved) {
            window.localStorage.setItem(getSessionDraftKey(mobileResolved), JSON.stringify(serializeDraft()));
         }
      } catch (err) {
         setAutoSaveStatus("unstable");
      }
   };

   const syncDraftToBackend = async (draftOverride = null) => {
      if (!immersiveMode || !tournamentId || !mobileResolved) return;
      try {
         const payload = draftOverride || serializeDraft();
         await fetch(`${draftApiBase}/draft`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               mobile: mobileResolved,
               step: payload.step,
               formData: payload.formData,
               previews: payload.previews,
               status: autoSaveStatus,
            }),
         });
      } catch (err) {
         setAutoSaveStatus("unstable");
      }
   };

   const hydrateDraft = async (draft) => {
      if (!draft) return;
      const restoredForm = { ...formData, ...(draft.formData || {}) };

      if (draft.previews?.photo && !restoredForm.photo) {
         restoredForm.photo = await dataUrlToFile(draft.previews.photo, "player-photo.jpg");
      }
      if (draft.previews?.aadhaar && !restoredForm.aadhaarFile) {
         restoredForm.aadhaarFile = await dataUrlToFile(draft.previews.aadhaar, "aadhaar-doc.jpg");
      }

      setFormData(restoredForm);
      if (draft.previews) setPreviews({ ...draft.previews });
      if (draft.step) setStep(Math.min(Math.max(draft.step, 1), 5));
      if (draft.mobile) setMobileResolved(draft.mobile);
   };

   const formatDobInput = (rawValue) => {
      const digits = (rawValue || "").replace(/\D/g, "").slice(0, 8);
      const separator = (rawValue || "").includes("-") ? "-" : "/";
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0, 2)}${separator}${digits.slice(2)}`;
      return `${digits.slice(0, 2)}${separator}${digits.slice(2, 4)}${separator}${digits.slice(4)}`;
   };

   const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => {
         let newValue = value;

         // Restrict Aadhaar to 12 digits only
         if (name === "aadhaarNumber") {
            newValue = value.replace(/\D/g, '').slice(0, 12);
         }

         // Restrict mobile to 10 digits only
         if (name === "mobile") {
            newValue = value.replace(/\D/g, '').slice(0, 10);
            if (newValue.length === 10) {
               setMobileResolved(newValue);
            }
         }

         // Handle DOB input validation
         if (name === "dob") {
            const formattedDob = formatDobInput(value);
            const newData = { ...prev, [name]: formattedDob };

            if (formattedDob.length === 10) {
               const dobValidation = validateDateOfBirth(formattedDob);
               if (dobValidation.error) {
                  setFieldErrors(prev => ({ ...prev, dob: dobValidation.error }));
               } else {
                  setFieldErrors(prev => {
                     const updated = { ...prev };
                     delete updated.dob;
                     return updated;
                  });
               }
            } else {
               setFieldErrors(prev => {
                  const updated = { ...prev };
                  delete updated.dob;
                  return updated;
               });
            }
            return newData;
         }

         const newData = { ...prev, [name]: type === "checkbox" ? checked : newValue };
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

         if (res.ok && data.found) {
            setCheckResult(data);
            setShowStatusCheck(true);
         } else {
            if (immersiveMode) {
               try {
                  // 1. Check Backend for Draft
                  const draftRes = await fetch(`${API_URL}/api/tournaments/apply/${tournamentId}/draft?mobile=${checkMobile}`);
                  let foundDraft = null;

                  if (draftRes.ok) {
                     const draftData = await draftRes.json();
                     if (draftData?.draft) {
                        foundDraft = draftData.draft;
                     }
                  }

                  // 2. Check LocalStorage for Draft (session-specific)
                  if (!foundDraft && typeof window !== "undefined") {
                     const localDraftRaw = window.localStorage.getItem(getSessionDraftKey(checkMobile));
                     if (localDraftRaw) {
                        foundDraft = JSON.parse(localDraftRaw);
                     }
                  }

                  if (foundDraft) {
                     await hydrateDraft(foundDraft);
                     setPendingRestore(foundDraft);
                     setMobileResolved(checkMobile);
                     setShowResumePrompt(true);
                     setShowStatusCheck(false);
                     setChecking(false);
                     return;
                  }
               } catch (draftErr) {
                  // fall through to new application flow
               }
            }

            // If they are not registered and no draft found, ask to start fresh
            setFormData(prev => ({ ...prev, mobile: checkMobile }));
            setMobileResolved(checkMobile);
            setShowStartFreshConfirm(true);
            setShowStatusCheck(false);
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
               registrationFieldConfig: fieldConfig,
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
               registrationFieldConfig: fieldConfig,
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
      const errors = {};

      if (s === 1) {
         if (!isFieldHidden("name") && isFieldRequired("name") && !formData.name?.trim()) {
            errors.name = "Player name is required";
         }
         if (!isFieldHidden("mobile")) {
            if (isFieldRequired("mobile") && !formData.mobile?.trim()) {
               errors.mobile = "Mobile number is required";
            } else if (formData.mobile?.trim() && formData.mobile.length !== 10) {
               errors.mobile = "Mobile must be 10 digits";
            }
         }
         if (!isFieldHidden("dob") && formData.dob?.trim()) {
            const dobValidation = validateDateOfBirth(formData.dob);
            if (dobValidation.error) {
               errors.dob = dobValidation.error;
            }
         } else if (!isFieldHidden("dob") && isFieldRequired("dob") && !formData.dob?.trim()) {
            errors.dob = "Date of birth is required";
         }
         if (!isFieldHidden("fatherName") && isFieldRequired("fatherName") && !formData.fatherName?.trim()) {
            errors.fatherName = "Father name is required";
         }
         if (!isFieldHidden("aadhaarNumber") && isFieldRequired("aadhaarNumber") && !formData.aadhaarNumber?.trim()) {
            errors.aadhaarNumber = "Aadhaar ID is required";
         }

         if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            const missingFields = Object.keys(errors).map(key => {
               const labels = {
                  name: "Player Name",
                  fatherName: "Father Name",
                  dob: "Date of Birth",
                  mobile: "Mobile Number",
                  aadhaarNumber: "Aadhaar ID",
               };
               return labels[key];
            }).join(", ");
            setError(`❌ Please complete: ${missingFields}`);
            return false;
         }
         setFieldErrors({});
         return true;
      }

      if (s === 2) {
         if (!isFieldHidden("taluk") && isFieldRequired("taluk") && !formData.taluk?.trim()) errors.taluk = "Taluk is required";
         if (!isFieldHidden("hobli") && isFieldRequired("hobli") && !formData.hobli?.trim()) errors.hobli = "Hobli is required";
         if (!isFieldHidden("village") && isFieldRequired("village") && !formData.village?.trim()) errors.village = "Village is required";
      }

      if (s === 3) {
         if (!isFieldHidden("role") && isFieldRequired("role") && !formData.role) errors.role = "Primary role is required";
         if (!isFieldHidden("playingStyle") && isFieldRequired("playingStyle") && !formData.playingStyle) errors.playingStyle = "Playing style is required";
         if (!isFieldHidden("wicketKeeper") && isFieldRequired("wicketKeeper") && formData.wicketKeeper === null) errors.wicketKeeper = "Please select wicket keeper status";
      }

      if (s === 4) {
         if (!isFieldHidden("photo") && isFieldRequired("photo") && !formData.photo && !previews.photo) errors.photo = "Profile photo is required";
         if (!isFieldHidden("aadhaarFile") && isFieldRequired("aadhaarFile") && !formData.aadhaarFile && !previews.aadhaar) errors.aadhaarFile = "Aadhaar document is required";
      }

      if (Object.keys(errors).length > 0) {
         setFieldErrors(errors);
         setError("❌ Please complete required fields to continue");
         return false;
      }

      setFieldErrors({});
      return true;
   };

   const validateDateOfBirth = (dobString) => {
      try {
         const match = dobString.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
         if (!match) {
            return { error: "Invalid date format. Use DD/MM/YYYY" };
         }

         const day = Number(match[1]);
         const month = Number(match[2]);
         const year = Number(match[3]);

         if (month < 1 || month > 12) {
            return { error: "Invalid month in date of birth" };
         }

         const dobDate = new Date(year, month - 1, day);
         if (
            isNaN(dobDate) ||
            dobDate.getFullYear() !== year ||
            dobDate.getMonth() !== month - 1 ||
            dobDate.getDate() !== day
         ) {
            return { error: "Invalid day in date of birth" };
         }

         const birthYear = dobDate.getFullYear();
         const currentYear = new Date().getFullYear();

         if (birthYear >= currentYear) {
            return { error: "Birth year cannot be 2026 or later" };
         }

         const age = currentYear - birthYear;
         if (age <= 0) {
            return { error: "Age must be greater than 0" };
         }

         return { valid: true };
      } catch (err) {
         return { error: "Invalid date format" };
      }
   };

   const nextStep = () => {
      if (validateStep(step)) setStep(prev => Math.min(prev + 1, 5));
   };

   const prevStep = () => setStep(prev => prev - 1);

   const handleSubmit = async (e) => {
      if (e) e.preventDefault();

      // Validate all form steps before final submit
      if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
         window.scrollTo({ top: 0, behavior: 'smooth' });
         return;
      }

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
               dob: formData.dob ? formData.dob.split(/[/-]/).reverse().join('-') : formData.dob,
               state: "Karnataka",
               district: "Custom",
               photo: { s3: photoUrl, status: "done" },
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
            <h1 className="text-4xl font-black italic tracking-tighter mb-4 text-emerald-400">{t("APPLICATION RECEIVED!")}</h1>
            <p className="text-slate-400 font-bold mb-10 leading-relaxed uppercase tracking-widest text-xs">
               {t("Identity protocol complete. your entry has been secured.")} <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-4">{t("we are waiting for admin approval.")}</span>
            </p>
            <div className="space-y-3">
               <button
                  onClick={() => {
                     setSuccess(false);
                     setStep(0);
                     setFormData({
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
                     setPreviews({ photo: null, aadhaar: null });
                     setCheckMobile("");
                     setMobileResolved("");
                  }}
                  className="w-full py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
               >
                  {t("Register with another number")} <ArrowRight size={14} />
               </button>
               <button onClick={() => router.push("/")} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 hover:bg-white/10 active:scale-95">
                  {t("Exit")} <X size={14} />
               </button>
            </div>
         </div>
      </div>
   );

   const flowStep = submitting ? 6 : step;

   return (
      <div className={`min-h-screen bg-[#020617] text-white selection:bg-violet-500/30 pb-40 ${immersiveMode ? 'lg:pl-64' : ''}`}>

         {immersiveMode && (
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0B1225]/90 backdrop-blur-3xl border-r border-white/5 z-200 hidden lg:flex flex-col p-6">
               {/* Dominant Branding Section */}
               <div className="flex flex-col items-center text-center mb-12">
                  <div className="relative group mb-6">
                     {/* Decorative Glow */}
                     <div className="absolute -inset-4 bg-violet-600/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                     
                     <div className="relative w-28 h-28 rounded-[2rem] bg-[#1a2036]/50 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                        <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent"></div>
                        {tournament?.organizerLogo ? (
                           <img 
                              src={getMediaUrl(tournament.organizerLogo)} 
                              alt="Tournament Logo" 
                              className="w-full h-full object-contain p-3 relative z-10" 
                           />
                        ) : (
                           <Trophy className="w-12 h-12 text-violet-500 relative z-10" />
                        )}
                     </div>
                  </div>
                  
                  <div className="space-y-1">
                     <p className="text-[10px] font-[1000] text-violet-400 uppercase tracking-[0.4em] leading-none mb-1 opacity-80">{t("SECURE APPLY")}</p>
                     <h2 className="text-[13px] font-black text-white uppercase tracking-tighter leading-tight max-w-[180px] mx-auto">
                        {tournament?.name}
                     </h2>
                  </div>
               </div>

               {/* Connected Progress Flow */}
               <div className="flex-1 px-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 opacity-50">{t("Application Steps")}</p>
                  
                  <div className="relative space-y-0">
                     {/* Vertical Line */}
                     <div className="absolute left-4 top-2 bottom-2 w-px bg-white/5"></div>

                     {REGISTRATION_STEPS.map((item, idx) => {
                        const completed = item.id < flowStep;
                        const active = item.id === flowStep;
                        const pending = item.id > flowStep;
                        
                        return (
                           <div key={item.id} className="relative flex items-start gap-4 pb-10 last:pb-0">
                              {/* Step Dot/Icon */}
                              <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 shrink-0
                                 ${completed ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                                   active ? 'bg-violet-600 border-violet-400 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-110' : 
                                   'bg-slate-900 border-white/10 text-slate-600'}
                              `}>
                                 {completed ? <CheckCircle size={14} /> : <span className="text-[10px] font-black">{item.id}</span>}
                              </div>

                              {/* Progress Line Segment (Colored) */}
                              {idx < REGISTRATION_STEPS.length - 1 && completed && (
                                 <div className="absolute left-4 top-8 w-px h-10 bg-emerald-500/50 z-0"></div>
                              )}

                              <div className="flex flex-col pt-1.5">
                                 <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300
                                    ${completed ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600'}
                                 `}>
                                    {item.label}
                                 </span>
                                 {active && (
                                    <div className="mt-1 flex items-center gap-1.5">
                                       <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse"></span>
                                       <span className="text-[8px] font-bold text-violet-400 uppercase tracking-tighter">Current Phase</span>
                                    </div>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               <div className="mt-auto pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${autoSaveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{autoSaveStatus === 'saved' ? t('Synced') : t('Saving')}</span>
                     </div>
                     <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">v4.2.0-SECURE</span>
                  </div>
               </div>
            </aside>
         )}

         <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[50%] h-[40%] bg-violet-600/10 blur-[150px] rounded-full rotate-45"></div>
         </div>

         <header className={`sticky top-0 z-100 bg-[#020617]/80 backdrop-blur-2xl border-b border-white/5 ${immersiveMode ? 'hidden' : ''}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[75px] flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-violet-600/20 rotate-3 shrink-0">
                     <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-[13px] font-black text-white italic tracking-tighter uppercase leading-none truncate max-w-[150px] sm:max-w-none">
                     {tournament?.name || t("Player Portal")}
                  </h2>
               </div>

               <div className="flex items-center gap-2">
                  <button
                     onClick={() => setLang(lang === "EN" ? "KN" : "EN")}
                     className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase text-violet-400 hover:text-white transition-all"
                  >
                     {lang === "EN" ? "ಕನ್ನಡ" : "EN"}
                  </button>
                  <button onClick={() => router.push('/')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                     <X size={14} className="text-slate-500" />
                  </button>
               </div>
            </div>
         </header>

         <main className={`max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 relative z-10 ${immersiveMode ? 'pt-6 sm:pt-24' : ''}`}>

            {immersiveMode && (
               <div className="mb-4 rounded-2xl border border-white/10 bg-[#0B1225]/90 backdrop-blur-3xl px-4 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
                           <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                           <p className="text-[10px] font-black uppercase tracking-widest text-white truncate">{t("KPL Secure Apply")}</p>
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 truncate">{tournament?.name}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => setShowExitConfirm(true)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400">
                           <X size={16} />
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {step > 0 && (
               <div className="mb-6 rounded-2xl border border-white/10 bg-[#0B1225]/70 backdrop-blur-xl p-4 lg:hidden relative overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                     <div className="flex flex-col gap-0.5">
                        <p className="text-[11px] font-black uppercase tracking-wider text-white">{REGISTRATION_STEPS[flowStep - 1]?.label || 'Identity'}</p>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{t("Step")} {flowStep} of 6</p>
                     </div>
                     <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-700 ${autoSaveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${autoSaveStatus === 'saving' ? 'bg-cyan-400 animate-pulse' : autoSaveStatus === 'saved' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></span>
                        {autoSaveStatus === 'saving' ? t('Saving') : autoSaveStatus === 'saved' ? t('Saved') : t('Offline')}
                     </div>
                  </div>
               </div>
            )}

            {showResumePrompt && pendingRestore && (
               <div className="fixed inset-0 z-220 flex items-center justify-center bg-black/70 backdrop-blur-2xl p-4">
                  <div className="w-full max-w-md rounded-4xl border border-white/10 bg-[#0B0F2A]/95 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                     <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                        <ClipboardCheck className="w-8 h-8 text-emerald-400" />
                     </div>
                     <h3 className="text-xl font-black text-white text-center uppercase tracking-wide italic">{t("Resume Previous Application?")}</h3>
                     <p className="mt-3 text-center text-sm text-slate-400 font-medium leading-relaxed">
                        {t("Your draft was securely saved. You can continue from the last completed step or start a fresh session.")}
                     </p>
                     <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                           type="button"
                           onClick={async () => {
                              await hydrateDraft(pendingRestore);
                              setMobileResolved(pendingRestore.mobile || pendingRestore.formData?.mobile || "");
                              setShowResumePrompt(false);
                              setStep(Math.min(Math.max(pendingRestore.step || 1, 1), 5));
                           }}
                           className="flex-1 px-5 py-4 rounded-2xl bg-linear-to-r from-violet-600 to-cyan-500 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-violet-600/20"
                        >
                           {t("Continue Registration")}
                        </button>
                        <button
                           type="button"
                           onClick={() => {
                              setShowResumePrompt(false);
                              setPendingRestore(null);
                              setFormData({
                                 name: "",
                                 fatherName: "",
                                 dob: "",
                                 mobile: pendingRestore?.formData?.mobile || "",
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
                              setPreviews({ photo: null, aadhaar: null });
                              setStep(1);
                              try {
                                 if (typeof window !== "undefined") {
                                    window.localStorage.removeItem(getDraftStorageKey());
                                    if (pendingRestore?.mobile || pendingRestore?.formData?.mobile) {
                                       window.localStorage.removeItem(getSessionDraftKey(pendingRestore.mobile || pendingRestore.formData.mobile));
                                    }
                                 }
                              } catch { }
                           }}
                           className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-[0.2em]"
                        >
                           {t("Start Fresh")}
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {showStartFreshConfirm && (
               <div className="fixed inset-0 z-220 flex items-center justify-center bg-black/70 backdrop-blur-2xl p-4">
                  <div className="w-full max-w-md rounded-4xl border border-white/10 bg-[#0B0F2A]/95 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                     <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                        <UserPlus className="w-8 h-8 text-violet-400" />
                     </div>
                     <h3 className="text-xl font-black text-white text-center uppercase tracking-wide italic">{t("No Active Registration Found")}</h3>
                     <p className="mt-3 text-center text-sm text-slate-400 font-medium leading-relaxed">
                        {t("We couldn't find any existing registration or saved progress for")} <span className="text-white font-bold tracking-widest">{checkMobile}</span>.
                     </p>
                     <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <button
                           type="button"
                           onClick={() => {
                              setShowStartFreshConfirm(false);
                              setStep(1);
                           }}
                           className="flex-1 px-5 py-4 rounded-2xl bg-linear-to-r from-violet-600 to-cyan-500 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-violet-600/20 hover:scale-105 active:scale-95 transition-all"
                        >
                           {t("Start New Registration")}
                        </button>
                        <button
                           type="button"
                           onClick={() => {
                              setShowStartFreshConfirm(false);
                              setCheckMobile("");
                           }}
                           className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all"
                        >
                           {t("Change Number")}
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {showExitConfirm && (
               <div className="fixed inset-0 z-230 flex items-center justify-center bg-black/75 backdrop-blur-2xl p-4">
                  <div className="w-full max-w-md rounded-4xl border border-white/10 bg-[#0B0F2A]/95 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
                     <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
                        <ShieldCheck className="w-8 h-8 text-violet-300" />
                     </div>
                     <h3 className="text-xl font-black text-white text-center uppercase tracking-wide italic">{t("Your draft is safely saved.")}</h3>
                     <p className="mt-3 text-center text-sm text-slate-400 font-medium leading-relaxed">
                        {t("Do you want to exit player registration?")}
                     </p>
                     <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                           type="button"
                           onClick={() => setShowExitConfirm(false)}
                           className="flex-1 px-5 py-4 rounded-2xl bg-linear-to-r from-violet-600 to-cyan-500 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-violet-600/20"
                        >
                           {t("Continue Registration")}
                        </button>
                        <button
                           type="button"
                           onClick={() => {
                              persistLocalDraft();
                              router.push("/");
                           }}
                           className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-[0.2em]"
                        >
                           {t("Exit Safely")}
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {showStatusCheck && (
               <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 backdrop-blur-2xl bg-black/60 animate-in fade-in duration-500">
                  <div className="relative w-full max-w-2xl bg-[#0B0F2A]/90 border border-white/10 rounded-4xl p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out">
                     <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-linear-to-br from-violet-600/10 via-transparent to-cyan-400/10 animate-pulse pointer-events-none" />

                     <div className="relative z-10">
                        <div className="flex items-center justify-between mb-10">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-600/20">
                                 <SearchCode className="text-violet-400" size={24} />
                              </div>
                              <div>
                                 <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white italic">{t("Status Lookup")}</h3>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t("Auction Intelligence Engine")}</p>
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
                                    placeholder={t("10 DIGIT NUMBER")}
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
                           <div className={`mt-10 p-8 rounded-4xl border ${checkResult.name ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]' : 'bg-red-500/5 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.05)]'} animate-in zoom-in-95 slide-in-from-bottom-4 duration-500`}>
                              {checkResult.name ? (
                                 <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-32 h-32 shrink-0 rounded-3xl bg-slate-900 border-2 border-white/10 overflow-hidden shadow-2xl relative group">
                                       <img
                                          src={checkResult.player?.photo?.drive || checkResult.player?.imageUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop"}
                                          alt={checkResult.name}
                                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                       />
                                       <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent"></div>
                                       <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-violet-600 rounded-md text-[8px] font-black text-white">{t("ID")}: {checkResult.player.applicationId || checkResult.player.iconId}</div>
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-4">
                                       <div>
                                          <h2 className="text-3xl font-black text-white uppercase italic tracking-normal drop-shadow-md mb-1">{checkResult.name}</h2>
                                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest mt-1 italic ${checkResult.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse' :
                                                checkResult.status === 'available' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                   checkResult.status === 'sold' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                                                      'bg-red-500/10 border-red-500/20 text-red-400'
                                             }`}>
                                             <Zap size={10} className={checkResult.status === 'pending' ? 'animate-bounce' : ''} />
                                             {checkResult.message || (checkResult.status === 'pending' ? t("Awaiting Approval") : t("Registration Approved!"))}
                                          </div>
                                       </div>

                                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                                          <div className="space-y-1">
                                             <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t("Role")}</p>
                                             <p className="text-[10px] text-white font-bold tracking-wide italic">{checkResult.player.role || t("All-Rounder")}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t("Village")}</p>
                                             <p className="text-[10px] text-white font-bold tracking-wide italic truncate">{checkResult.player.village || "N/A"}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t("Status")}</p>
                                             <p className={`text-[10px] font-bold tracking-wide italic uppercase ${checkResult.status === 'pending' ? 'text-amber-400' :
                                                   checkResult.status === 'available' ? 'text-emerald-400' :
                                                      checkResult.status === 'sold' ? 'text-violet-400' :
                                                         'text-red-400'
                                                }`}>{checkResult.status || t("Pending")}</p>
                                          </div>
                                          <div className="space-y-1">
                                             <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t("Category")}</p>
                                             <p className="text-[10px] text-violet-400 font-bold tracking-wide italic uppercase">{checkResult.player.category || t("General")}</p>
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
                                       <h3 className="text-lg font-black text-white uppercase tracking-widest">{t("Record Not Found")}</h3>
                                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t("Check the number and try again")}</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                     <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-violet-500/50 to-transparent"></div>
                  </div>
               </div>
            )}

            <div className={`mb-16 relative group ${immersiveMode ? 'hidden' : ''}`}>
               {isEditing ? (
                  <div className="max-w-4xl mx-auto space-y-6 animate-in zoom-in-95 duration-300 bg-[#0B0F2A]/90 p-8 rounded-[3rem] border border-violet-500/30 shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                     <div className="flex items-center gap-3 mb-4">
                        <Edit2 className="text-violet-500" size={20} />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white italic">{t("Customize Registration Portal")}</h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("Portal Heading")}</label>
                           <input
                              type="text"
                              value={editValues.title}
                              onChange={e => setEditValues(p => ({ ...p, title: e.target.value }))}
                              placeholder="e.g. JOIN THE BATTLE"
                              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black text-white uppercase italic tracking-normal outline-none focus:border-violet-500 transition-all"
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("Registration End Date & Time")}</label>
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
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("Banner Image URL")}</label>
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
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("Custom 'Closed' Message")}</label>
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
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("Tournament Guidelines & Rules")}</label>
                        <textarea
                           rows={4}
                           value={editValues.details}
                           onChange={e => setEditValues(p => ({ ...p, details: e.target.value }))}
                           placeholder="Enter tournament details, rules, or guidelines..."
                           className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-slate-300 outline-none focus:border-violet-500 transition-all resize-none"
                        />
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <Settings size={16} className="text-cyan-400" />
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Field Control Engine")}</label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FieldModeControl label={t("Player Name")} mode={fieldConfig.name} onChange={(mode) => setFieldConfig(prev => ({ ...prev, name: mode }))} t={t} />
                           <FieldModeControl label={t("Father Name")} mode={fieldConfig.fatherName} onChange={(mode) => setFieldConfig(prev => ({ ...prev, fatherName: mode }))} t={t} />
                           <FieldModeControl label={t("Date of Birth")} mode={fieldConfig.dob} onChange={(mode) => setFieldConfig(prev => ({ ...prev, dob: mode }))} t={t} />
                           <FieldModeControl label={t("Mobile Number")} mode={fieldConfig.mobile} onChange={(mode) => setFieldConfig(prev => ({ ...prev, mobile: mode }))} t={t} />
                           <FieldModeControl label={t("Aadhaar ID")} mode={fieldConfig.aadhaarNumber} onChange={(mode) => setFieldConfig(prev => ({ ...prev, aadhaarNumber: mode }))} t={t} />
                           <FieldModeControl label={t("Taluk")} mode={fieldConfig.taluk} onChange={(mode) => setFieldConfig(prev => ({ ...prev, taluk: mode }))} t={t} />
                           <FieldModeControl label={t("Hobli")} mode={fieldConfig.hobli} onChange={(mode) => setFieldConfig(prev => ({ ...prev, hobli: mode }))} t={t} />
                           <FieldModeControl label={t("Village")} mode={fieldConfig.village} onChange={(mode) => setFieldConfig(prev => ({ ...prev, village: mode }))} t={t} />
                           <FieldModeControl label={t("Primary Role")} mode={fieldConfig.role} onChange={(mode) => setFieldConfig(prev => ({ ...prev, role: mode }))} t={t} />
                           <FieldModeControl label={t("Playing Style")} mode={fieldConfig.playingStyle} onChange={(mode) => setFieldConfig(prev => ({ ...prev, playingStyle: mode }))} t={t} />
                           <FieldModeControl label={t("Wicket Keeper")} mode={fieldConfig.wicketKeeper} onChange={(mode) => setFieldConfig(prev => ({ ...prev, wicketKeeper: mode }))} t={t} />
                           <FieldModeControl label={t("Profile Photo")} mode={fieldConfig.photo} onChange={(mode) => setFieldConfig(prev => ({ ...prev, photo: mode }))} t={t} />
                           <FieldModeControl label={t("Aadhaar Upload")} mode={fieldConfig.aadhaarFile} onChange={(mode) => setFieldConfig(prev => ({ ...prev, aadhaarFile: mode }))} t={t} />
                        </div>
                     </div>

                     <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                        <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">{t("Cancel")}</button>
                        <button onClick={handleSaveSettings} disabled={savingSettings} className="px-8 py-3 bg-linear-to-r from-violet-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                           {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                           {savingSettings ? t("Saving...") : t("Apply Changes")}
                        </button>
                     </div>
                  </div>
               ) : (
                  <div className="relative group overflow-hidden rounded-[3rem] border border-white/5 bg-[#0B0F2A]/40 backdrop-blur-sm">
                     <div className="absolute inset-0 z-0">
                        <img
                           src={getMediaUrl(tournament?.assets?.splashUrl, "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop")}
                           className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-all duration-1000"
                           alt="Banner"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-[#020617] via-[#020617]/60 to-transparent"></div>
                        <div className="absolute inset-0 bg-linear-to-r from-[#020617]/80 via-transparent to-[#020617]/80"></div>
                     </div>

                     <div className="relative z-10 py-16 px-8 text-center">
                        <div className="mb-6 animate-in slide-in-from-top-4 duration-700">
                           <span className="px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                              ✨ {greeting}, {t("Hero")}
                           </span>
                        </div>

                        <div className="flex items-center justify-center gap-4 mb-6">
                           <div className="h-px w-12 bg-linear-to-r from-transparent to-violet-500"></div>
                           <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.5em] drop-shadow-lg">
                              {t("Registry Gateway for")} <span className="text-white italic">{tournament?.name}</span>
                           </p>
                           <div className="h-px w-12 bg-linear-to-l from-transparent to-violet-500"></div>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black text-white uppercase italic tracking-normal leading-[1.1] mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-8 duration-700">
                           {tournament?.registrationTitle ? tournament.registrationTitle : (
                              <>{t("Join the")} <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-500 to-cyan-400">{t("Battle")}</span></>
                           )}
                        </h1>
                        {tournament?.registrationEndDate && (
                           <div className="mb-8 flex flex-col items-center gap-2 animate-in fade-in duration-1000">
                              <div className={`flex items-center gap-3 px-6 py-2 ${isUrgent ? 'bg-red-600/10 border-red-500/20 shadow-red-600/10' : 'bg-emerald-600/10 border-emerald-500/20 shadow-emerald-600/10'} rounded-2xl backdrop-blur-xl shadow-lg transition-colors duration-500`}>
                                 <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                                 <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-start">
                                       <p className={`text-[8px] font-black ${isUrgent ? 'text-red-400/70' : 'text-emerald-400/70'} uppercase tracking-widest`}>{t("Registration Ends")}</p>
                                       <p className="text-[10px] font-black text-white uppercase tracking-wider">{dateLabel}</p>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div className="flex flex-col items-start">
                                       <p className={`text-[8px] font-black ${isUrgent ? 'text-red-400/70' : 'text-emerald-400/70'} uppercase tracking-widest`}>{t("Time Remaining")}</p>
                                       <p className={`text-[11px] font-[1000] ${isUrgent ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-widest tabular-nums`}>{timeLeft}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {tournament?.registrationDetails && (
                           <div className="mt-8 max-w-2xl mx-auto p-6 bg-white/5 border border-white/10 rounded-3xl text-left animate-in fade-in slide-in-from-bottom-4 shadow-2xl backdrop-blur-md group-hover:border-violet-500/20 transition-all">
                              {session && (
                                 <button onClick={() => setIsEditing(true)} className="absolute -top-3 -right-3 w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all shadow-xl shadow-violet-600/30">
                                    <Edit2 size={16} className="text-white" />
                                 </button>
                              )}
                              <div className="flex items-center gap-2 mb-3">
                                 <Zap className="w-4 h-4 text-yellow-400" />
                                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t("Tournament Intelligence & Rules")}</h3>
                              </div>
                              <p className="text-slate-300 text-xs whitespace-pre-wrap leading-loose font-bold italic opacity-80 tracking-wide">
                                 {tournament.registrationDetails}
                              </p>
                           </div>
                        )}

                        {!tournament?.registrationDetails && session && (
                           <button onClick={() => setIsEditing(true)} className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-all">
                              <Plus size={14} /> {t("Configure Tournament Guidelines")}
                           </button>
                        )}

                        <div className="mt-12 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                           <button
                              onClick={() => {
                                 const formElement = document.querySelector('form');
                                 if (formElement) {
                                    formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                 }
                              }}
                              className="px-12 py-5 bg-linear-to-r from-violet-600 to-cyan-500 text-white rounded-[2rem] text-sm font-[1000] uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(124,58,237,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
                           >
                              {t("Start Registration")}
                              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                           </button>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {t("Identity verification required to proceed")}
                           </p>
                        </div>
                     </div>

                     <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-violet-500/50 to-transparent"></div>
                  </div>
               )}
            </div>

            {checking && <SearchingOverlay mobile={checkMobile} t={t} />}

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

            <div className="bg-[#0f172a]/40 border border-white/10 rounded-3xl sm:rounded-[3rem] p-4 sm:p-8 md:p-12 shadow-2xl relative backdrop-blur-3xl">
               {isClosed ?
                  <div className="py-12 md:py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                     <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative">
                        <X className="w-10 h-10 md:w-12 md:h-12 text-red-500" />
                        <div className="absolute inset-0 rounded-[2rem] border-2 border-red-500 animate-ping opacity-20" />
                     </div>
                     <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-normal mb-4 drop-shadow-xl">{t("Registration")} <span className="text-red-500">{t("Closed")}</span></h2>
                     <p className="text-slate-400 text-xs md:text-sm max-w-md mx-auto leading-loose font-bold italic tracking-wide">
                        {tournament?.closedMessage || t("Registration is currently closed. Please contact the tournament organizer for more details.")}
                     </p>
                  </div>
                : 
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-6 md:space-y-12 relative z-10 pb-24">

                     {step === 0 && !showStatusCheck && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 flex flex-col items-center justify-center py-10">
                           <div className="w-20 h-20 rounded-3xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                              <Phone className="w-10 h-10 text-violet-400" />
                           </div>
                           <div className="text-center space-y-4">
                              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase italic tracking-wide drop-shadow-xl">{t("Enter Mobile Number")}</h2>
                              <p className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-widest sm:tracking-[0.2em] uppercase max-w-sm leading-relaxed px-4">{t("Enter your 10-digit number to check status or begin registration")}</p>
                           </div>
                           <div className="w-full max-w-md relative group mt-4 px-4 sm:px-0">
                              <div className="absolute -inset-1 bg-linear-to-r from-violet-600 to-cyan-500 rounded-3xl blur opacity-25 group-focus-within:opacity-50 transition duration-500"></div>
                              <input
                                 type="tel"
                                 value={checkMobile}
                                 onChange={e => setCheckMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                 placeholder={t("10 DIGIT NUMBER")}
                                 className="relative w-full bg-slate-900 border-2 border-white/10 rounded-2xl px-4 sm:px-6 py-5 sm:py-6 text-center text-xl sm:text-2xl font-black text-white tracking-[0.3em] sm:tracking-[0.5em] outline-none focus:border-violet-500 transition-all placeholder:text-slate-700"
                                 onKeyDown={(e) => {
                                    if (e.key === 'Enter' && checkMobile.length === 10 && !checking) {
                                       handleCheckStatus();
                                    }
                                 }}
                              />
                           </div>
                           <div className="w-full max-w-md mt-4 px-4 sm:px-0">
                              <button
                                 type="button"
                                 onClick={handleCheckStatus}
                                 disabled={checking || checkMobile.length !== 10}
                                 className="w-full px-8 py-4 sm:py-5 bg-linear-to-r from-violet-600 to-cyan-500 text-white rounded-2xl font-[1000] text-xs sm:text-sm uppercase tracking-[0.2em] shadow-xl shadow-violet-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 hover:brightness-110"
                              >
                                 {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                 {checking ? t("Verifying...") : t("Continue")}
                              </button>
                           </div>
                        </div>
                     )}

                     {step === 1 && (
                        <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-right-8 relative">
                           <div className="flex justify-between items-center pb-6 border-b border-white/5">
                             <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Phase")} 01</p>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">{t("Personal Identity")}</h3>
                             </div>
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {!isFieldHidden("name") && <Field icon={User} label={t("Player Name")} name="name" value={formData.name} onChange={handleInputChange} placeholder={t("FULL LEGAL NAME")} required={isFieldRequired("name")} error={fieldErrors.name} />}
                              {!isFieldHidden("fatherName") && <Field icon={Users} label={t("Father Name")} name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder={t("PARENT IDENTITY")} required={isFieldRequired("fatherName")} error={fieldErrors.fatherName} />}
                              {!isFieldHidden("dob") && <Field icon={Calendar} label={t("Date of Birth")} name="dob" type="text" value={formData.dob} onChange={handleInputChange} placeholder={t("DD-MM-YYYY")} required={isFieldRequired("dob")} error={fieldErrors.dob} />}
                              {!isFieldHidden("mobile") && <Field icon={Phone} label={t("Mobile Number")} name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} placeholder={t("10 DIGIT PRIMARY CONTACT")} required={isFieldRequired("mobile")} error={fieldErrors.mobile} />}
                           </div>
                           {!isFieldHidden("aadhaarNumber") && <Field icon={CreditCard} label={t("Aadhaar ID")} name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} placeholder={t("12 DIGIT IDENTITY NUMBER")} required={isFieldRequired("aadhaarNumber")} error={fieldErrors.aadhaarNumber} />}
                           <div className="flex justify-end">
                              <button type="button" onClick={() => setStep(0)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-all">
                                 <ArrowLeft size={12} /> {t("Change Number")}
                              </button>
                           </div>
                        </div>
                     )}

                     {step === 2 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                           <SectionHeader num="02" title={t("Regional Localization")} sub={t("Simplified administrative verification")} icon={Navigation2} color="cyan" t={t} />
                           {!isFieldHidden("taluk") || !isFieldHidden("hobli") || !isFieldHidden("village") ? (
                              <div className="grid grid-cols-1 gap-8">
                                 {!isFieldHidden("taluk") && <SearchSelect label={t("Select Taluk")} options={taluks} value={formData.taluk} onChange={(val) => handleInputChange({ target: { name: 'taluk', value: val } })} t={t} error={fieldErrors.taluk} />}
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {!isFieldHidden("hobli") && <SearchSelect label={t("Select Hobli")} options={hoblis} value={formData.hobli} onChange={(val) => handleInputChange({ target: { name: 'hobli', value: val } })} disabled={!formData.taluk} t={t} error={fieldErrors.hobli} />}
                                    {!isFieldHidden("village") && <Field icon={MapPin} label={t("Village / Ward Name")} name="village" value={formData.village} onChange={handleInputChange} placeholder={t("TYPE YOUR VILLAGE OR WARD NAME")} required={isFieldRequired("village")} error={fieldErrors.village} />}
                                 </div>
                              </div>
                           ) : <p className="text-xs font-black uppercase tracking-widest text-slate-500">No fields configured in this section.</p>}
                        </div>
                     )}

                     {step === 3 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                           <SectionHeader num="03" title={t("Professional Profile")} sub={t("Match readiness and skill ledger")} icon={Activity} color="emerald" t={t} />
                           <div className="space-y-8">
                              {!isFieldHidden("role") && <div className="space-y-4">
                                 <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{t("Primary Role")}</label>
                                    {fieldErrors.role && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">● {fieldErrors.role}</span>}
                                 </div>
                                 <div className="grid grid-cols-3 gap-4">
                                    {['Batsman', 'Bowler', 'All-Rounder'].map(r => (
                                       <CardSelect key={r} label={t(r)} active={formData.role === r} onClick={() => setFormData(p => ({ ...p, role: r }))} error={fieldErrors.role && formData.role !== r} />
                                    ))}
                                 </div>
                              </div>}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 {!isFieldHidden("playingStyle") && <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{t("Playing Style")}</label>
                                       {fieldErrors.playingStyle && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">● {fieldErrors.playingStyle}</span>}
                                    </div>
                                    <div className="flex gap-3">
                                       {['Right Hand', 'Left Hand'].map(s => (
                                          <button key={s} type="button" onClick={() => setFormData(p => ({ ...p, playingStyle: s }))} className={`flex-1 py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.playingStyle === s ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : fieldErrors.playingStyle ? 'bg-red-600/5 border-red-500/60 text-slate-500' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10 hover:text-white'}`}>{t(s)}</button>
                                       ))}
                                    </div>
                                 </div>}
                                 {!isFieldHidden("wicketKeeper") && <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                       <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{t("ARE YOU WICKET KEEPER..?")}</label>
                                       {fieldErrors.wicketKeeper && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">● {fieldErrors.wicketKeeper}</span>}
                                    </div>
                                    <div className="flex gap-4 h-20">
                                       {formData.wicketKeeper !== false && (
                                          <button
                                             type="button"
                                             onClick={() => setFormData(p => ({ ...p, wicketKeeper: p.wicketKeeper === true ? null : true }))}
                                             className={`flex-1 flex items-center justify-center gap-3 rounded-4xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.wicketKeeper === true ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-600/20' : fieldErrors.wicketKeeper ? 'bg-red-600/5 border-red-500/60 text-red-400' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:border-emerald-500/30 hover:text-emerald-400'}`}
                                          >
                                             {formData.wicketKeeper === true ? <CheckCircle size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
                                             {t("YES")} <span className="text-[8px] opacity-40 ml-1 italic">{t("(I AM A KEEPER)")}</span>
                                          </button>
                                       )}
                                       {formData.wicketKeeper !== true && (
                                          <button
                                             type="button"
                                             onClick={() => setFormData(p => ({ ...p, wicketKeeper: p.wicketKeeper === false ? null : false }))}
                                             className={`flex-1 flex items-center justify-center gap-3 rounded-4xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${formData.wicketKeeper === false ? 'bg-red-500/10 border-red-500 text-red-500 shadow-xl shadow-red-500/10' : fieldErrors.wicketKeeper ? 'bg-red-600/5 border-red-500/60 text-red-400' : 'bg-slate-900/40 border-white/5 text-slate-600 hover:border-red-500/30 hover:text-red-400'}`}
                                          >
                                             {formData.wicketKeeper === false ? <X size={18} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
                                             {t("NO")} <span className="text-[10px] font-black opacity-60 ml-1 italic">{t("(FIELDING ONLY)")}</span>
                                          </button>
                                       )}
                                    </div>
                                 </div>}
                              </div>
                           </div>
                        </div>
                     )}

                     {step === 4 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                           <SectionHeader num="04" title={t("Asset Repository")} sub={t("Encrypted visual and identity proof")} icon={UploadCloud} color="slate" t={t} />
                           {!isFieldHidden("photo") || !isFieldHidden("aadhaarFile") ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 {!isFieldHidden("photo") && <FileUploadField label={t("Profile Identity Photo")} icon={User} preview={previews.photo} onChange={(e) => handleFileChange(e, 'photo')} onClear={() => { setFormData(p => ({ ...p, photo: null })); setPreviews(p => ({ ...p, photo: null })); }} t={t} error={fieldErrors.photo} />}
                                 {!isFieldHidden("aadhaarFile") && <FileUploadField label={t("Aadhaar Resource Node")} icon={CreditCard} preview={previews.aadhaar} onChange={(e) => handleFileChange(e, 'aadhaarFile')} onClear={() => { setFormData(p => ({ ...p, aadhaarFile: null })); setPreviews(p => ({ ...p, aadhaar: null })); }} t={t} error={fieldErrors.aadhaarFile} />}
                              </div>
                           ) : <p className="text-xs font-black uppercase tracking-widest text-slate-500">No fields configured in this section.</p>}
                        </div>
                     )}

                     {step === 5 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
                           <SectionHeader num="05" title={t("Final Player Draft")} sub={t("Auction profile preview before launch")} icon={ClipboardCheck} color="emerald" t={t} />
                           <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-8">
                              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                                 <div className="w-full h-56 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 mb-5">
                                    <img src={previews.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=700&auto=format&fit=crop"} alt="Player" className="w-full h-full object-cover" />
                                 </div>
                                 {!isFieldHidden("name") && formData.name && <p className="text-xs font-black uppercase tracking-widest text-white">{formData.name}</p>}
                                 {!isFieldHidden("role") && formData.role && <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300 mt-2">{formData.role}</p>}
                                 {(!isFieldHidden("village") || !isFieldHidden("hobli") || !isFieldHidden("taluk")) && [formData.village, formData.hobli, formData.taluk].filter(Boolean).length > 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                                       {[formData.village, formData.hobli, formData.taluk].filter(Boolean).join(", ")}
                                    </p>
                                 )}
                                 {!isFieldHidden("playingStyle") && formData.playingStyle && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">{formData.playingStyle}</p>}
                              </div>
                              <div className="space-y-4">
                                 <ReviewBlock title={t("Identity")} onEdit={() => setStep(1)} t={t} rows={[
                                    [t('Name'), formData.name, 'name'],
                                    [t('Mobile'), formData.mobile, 'mobile'],
                                    [t('DOB'), formData.dob, 'dob'],
                                    [t('Aadhaar'), formData.aadhaarNumber, 'aadhaarNumber'],
                                    [t('Father Name'), formData.fatherName, 'fatherName']
                                 ].filter(([_, val, key]) => val && !isFieldHidden(key))} />
                                 <ReviewBlock title={t("Location")} onEdit={() => setStep(2)} t={t} rows={[
                                    [t('Taluk'), formData.taluk, 'taluk'],
                                    [t('Hobli'), formData.hobli, 'hobli'],
                                    [t('Village'), formData.village, 'village']
                                 ].filter(([_, val, key]) => val && !isFieldHidden(key))} />
                                 <ReviewBlock title={t("Cricket Details")} onEdit={() => setStep(3)} t={t} rows={[
                                    [t('Role'), formData.role, 'role'],
                                    [t('Playing Style'), formData.playingStyle, 'playingStyle'],
                                    [t('Wicket Keeper'), formData.wicketKeeper === null ? '' : formData.wicketKeeper ? t('Yes') : t('No'), 'wicketKeeper']
                                 ].filter(([_, val, key]) => val && !isFieldHidden(key))} />
                                 <ReviewBlock title={t("Uploaded Docs")} onEdit={() => setStep(4)} t={t} rows={[
                                    [t('Profile Photo'), previews.photo ? t('Uploaded') : '', 'photo'],
                                    [t('Aadhaar Document'), previews.aadhaar ? t('Uploaded') : '', 'aadhaarFile']
                                 ].filter(([_, val, key]) => val && !isFieldHidden(key))} />
                              </div>
                           </div>
                        </div>
                     )}

                     {step > 0 && (
                        <div className="hidden md:flex flex-col md:flex-row items-center justify-between pt-10 border-t border-white/5 gap-6">
                           {step > 0 ? (
                              <button type="button" onClick={prevStep} className="w-full md:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg"><ArrowLeft size={16} /> {t("Back")}</button>
                           ) : <div />}

                           {step < 5 ? (
                              <button type="button" onClick={nextStep} className="w-full md:w-auto px-10 py-5 bg-linear-to-r from-violet-600 to-cyan-500 rounded-4xl text-[10px] font-black uppercase tracking-[0.3em] italic text-white shadow-xl shadow-violet-600/30 hover:scale-[1.03] transition-all flex items-center justify-center gap-3">{t("Continue")} <ArrowRight size={16} /></button>
                           ) : (
                              <button onClick={handleSubmit} disabled={submitting} type="button" className="w-full md:w-auto px-12 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-4xl text-[11px] font-black uppercase tracking-[0.4em] italic text-white shadow-2xl transition-all flex flex-col items-center gap-1 disabled:opacity-50">
                                 <div className="flex items-center gap-3">
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
                                    {submitting ? t("PROCESSING TRANSACTION...") : t("Enter Auction Pool")}
                                 </div>
                                 {submissionPhase && <span className="text-[8px] font-bold opacity-70 tracking-widest">{submissionPhase}</span>}
                              </button>
                           )}
                        </div>
                     )}

                     {step > 0 && (
                        <div className="md:hidden fixed bottom-0 left-0 right-0 z-120 bg-[#020617]/90 backdrop-blur-2xl border-t border-white/10 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
                           <div className="max-w-4xl mx-auto flex items-center gap-3">
                              <button type="button" onClick={prevStep} disabled={step === 0} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center disabled:opacity-30">
                                 <ArrowLeft size={18} />
                              </button>
                              {step < 5 ? (
                                 <button type="button" onClick={nextStep} className="flex-1 h-14 bg-linear-to-r from-violet-600 to-cyan-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-violet-600/30">
                                    {t("Continue")} <ArrowRight size={16} />
                                 </button>
                              ) : (
                                 <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-emerald-600/20">
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} {t("Submit Application")}
                                 </button>
                              )}
                           </div>
                        </div>
                     )}
                  </form>
               }
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
      <div className="flex items-center gap-4 md:gap-5 pb-5 md:pb-6 border-b border-white/5">
         <div className={`p-3 md:p-4 rounded-2xl md:rounded-3xl border shrink-0 ${colors[color]}`}><Icon size={20} className="md:w-6 md:h-6" /></div>
         <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">{t ? t("Phase") : "Phase"} {num}</p>
            <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-white truncate">{title}</h3>
            <p className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5 md:mt-1 truncate">{sub}</p>
         </div>
      </div>
   );
}

function ReviewBlock({ title, rows, onEdit, t }) {
   return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
         <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{title}</p>
            <button type="button" onClick={onEdit} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">{t("Edit")}</button>
         </div>
         <div className="space-y-2">
            {rows.map(([key, value]) => (
               <div key={key} className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{key}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white text-right">{value}</span>
               </div>
            ))}
         </div>
      </div>
   );
}

function FieldModeControl({ label, mode, onChange, t }) {
   const options = ["hidden", "optional", "required"];
   const tone = {
      hidden: "text-slate-400 border-white/10",
      optional: "text-cyan-300 border-cyan-500/40",
      required: "text-emerald-300 border-emerald-500/40",
   };

   return (
      <div className="rounded-2xl border border-white/10 p-3 bg-slate-900/60">
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{label}</p>
         <div className="grid grid-cols-3 gap-2">
            {options.map((opt) => (
               <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${mode === opt ? `${tone[opt]} bg-white/10` : "text-slate-600 border-white/5 hover:text-slate-300"}`}
               >
                  {t(opt)}
               </button>
            ))}
         </div>
      </div>
   );
}

function Field({ icon: Icon, label, name, value, onChange, placeholder, type = "text", required = false, error = null, readOnly = false }) {
   return (
      <div className="space-y-3 md:space-y-4">
         <label className="flex items-center justify-between px-1 md:px-2">
            <span className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-wider">{label}{required && <span className="text-emerald-400 ml-1">*</span>}</span>
            {error && <span className="text-[8px] md:text-[9px] font-black text-red-500 uppercase tracking-widest">● {error}</span>}
         </label>
         <div className="relative group">
            <div className={`absolute left-4 md:left-6 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-white/5 rounded-lg md:rounded-xl group-focus-within:bg-violet-600/20 transition-all ${error ? 'bg-red-600/20 group-focus-within:bg-red-600/20' : ''}`}>
               <Icon className={`transition-colors md:w-4 md:h-4 ${error ? 'text-red-400' : 'text-slate-600 group-focus-within:text-violet-400'}`} size={14} />
            </div>
            <input
               name={name}
               type={type}
               value={value}
               onChange={onChange}
               readOnly={readOnly}
               placeholder={placeholder}
               className={`w-full bg-[#05081a]/50 border-2 rounded-2xl md:rounded-4xl py-4 md:py-5 pl-14 md:pl-20 pr-6 md:pr-8 outline-none transition-all font-bold uppercase text-[11px] md:text-xs placeholder:text-slate-800 ${readOnly ? 'cursor-not-allowed opacity-60 border-white/5' : error ? 'border-red-500/60 focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/5 focus:border-violet-500/40 shadow-inner'}`}
            />
         </div>
      </div>
   );
}

function SearchSelect({ label, options, value, onChange, disabled, t, error = null }) {
   const [open, setOpen] = useState(false);
   const [search, setSearch] = useState("");
   const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
   return (
      <div className={`space-y-3 relative ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
         <div className="flex items-center justify-between px-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">{label}</label>
            {error && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">● {error}</span>}
         </div>
         <div onClick={() => setOpen(!open)} className={`w-full bg-slate-900 border-2 rounded-3xl p-5 flex items-center justify-between cursor-pointer transition-all ${error ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : open ? 'border-violet-500 ring-4 ring-violet-500/5' : 'border-white/5 hover:border-white/10 shadow-lg'}`}>
            <span className={`text-xs font-black uppercase tracking-widest ${value ? 'text-white' : 'text-slate-700'}`}>{value || label}</span>
            <ChevronDown size={14} className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
         </div>
         {open && (
            <div className="absolute top-full left-0 w-full mt-3 bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
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

function CardSelect({ label, active, onClick, error = null }) {
   return (
      <div onClick={onClick} className={`cursor-pointer p-6 rounded-4xl border-2 text-center transition-all ${error ? 'border-red-500/60 bg-red-600/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : active ? 'bg-violet-600/20 border-violet-500 shadow-xl' : 'bg-slate-900 border-white/5 grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}>
         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${error ? 'bg-red-600/20 text-red-400' : active ? 'bg-violet-600 shadow-lg shadow-violet-600/20' : 'bg-white/5 text-slate-700'}`}>
            {label === 'Batsman' ? <Activity size={20} /> : label === 'Bowler' ? <Users size={20} /> : <Zap size={20} />}
         </div>
         <p className={`text-[9px] font-black uppercase tracking-widest ${error ? 'text-red-400' : active ? 'text-white' : 'text-slate-600'}`}>{label}</p>
      </div>
   );
}

function FileUploadField({ label, icon: Icon, preview, onChange, onClear, t, error = null }) {
   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between px-2">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{label}</label>
            {error && <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">● {error}</span>}
         </div>
         <div className="relative group">
            {preview ? (
               <div className={`relative w-full h-48 rounded-4xl border-2 overflow-hidden shadow-2xl transition-all ${error ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-white/10'}`}>
                  <img src={preview} className="w-full h-full object-cover" />
                  <div onClick={onClear} className="absolute inset-0 bg-red-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"><Trash2 size={24} className="text-white" /></div>
               </div>
            ) : (
               <div className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-4xl transition-all shadow-inner ${error ? 'bg-red-600/5 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-slate-900 border-white/5 hover:border-violet-500/30'}`}>
                  <div className={`p-4 rounded-2xl mb-4 ${error ? 'bg-red-600/20' : 'bg-white/5'}`}><UploadCloud className={`w-8 h-8 transition-all ${error ? 'text-red-400' : 'text-slate-700 group-hover:text-violet-500'}`} /></div>
                  <p className={`text-[8px] font-black uppercase tracking-[0.4em] leading-none ${error ? 'text-red-400' : 'text-slate-700'}`}>{error ? error.toUpperCase() : t('Register Digital Asset')}</p>
                  <div className="mt-4 flex items-center justify-center w-full">
                     <label className="px-3 py-2 rounded-xl border border-white/20 bg-white/5 text-white text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-all">
                        {t('Upload File')}
                        <input type="file" className="hidden" accept="image/*" onChange={onChange} />
                     </label>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}
