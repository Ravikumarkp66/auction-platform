import { MapPin, Calendar, Trophy, ArrowRight } from "lucide-react";

export default function TournamentCard({ name, location, year, image, status = "Upcoming" }) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#0B0F2A]/60 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:border-violet-500/30 hover:shadow-[0_20px_50px_rgba(124,58,237,0.15)]">
      {/* Image Container with Overlay */}
      <div className="relative h-56 w-full overflow-hidden">
        <img 
          src={image || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000&auto=format&fit=crop"} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F2A] via-[#0B0F2A]/40 to-transparent opacity-90"></div>
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className="bg-violet-600/20 backdrop-blur-md border border-violet-500/30 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {status}
          </span>
        </div>

        {/* Year Badge */}
        <div className="absolute bottom-4 left-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg">
              <Calendar className="w-3 h-3 text-violet-400" />
              <span className="text-white text-[10px] font-black uppercase tracking-normal">{year}</span>
           </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-black text-white italic tracking-normal group-hover:text-violet-400 transition-colors duration-300">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider">{location}</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-1.5 text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Major Event</span>
           </div>
           
           <button className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest group/btn">
              Explore <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-violet-600/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-violet-600/20 transition-all duration-500" />
    </div>
  );
}

