"use client"

// import Image from "next/image"

const images = [
  { img: "/next.svg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams" },
  { img: "/vercel.svg", name: "Jakanachari Cup", location: "Tumkur", year: "2024", teams: "10 Teams" },
  { img: "/next.svg", name: "Chettanahalli Premier League", location: "Chettanahalli", year: "2024", teams: "10 Teams" },
  { img: "/vercel.svg", name: "Koratagere Premier League", location: "Koratagere", year: "2025", teams: "10 Teams" },
  { img: "/next.svg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams" }
]

export default function TournamentScroller() {
  return (
    <div className="w-full overflow-hidden bg-slate-950 py-10 border-b border-slate-900 border-t">
      <div className="flex animate-scroll gap-6 px-6 hover:[animation-play-state:paused]">
        {images.concat(images).map((data, index) => (
          <div
            key={index}
            className="relative h-48 w-80 flex-shrink-0 rounded-2xl overflow-hidden group shadow-lg border border-slate-800"
          >
            <img
              src={data.img}
              alt={data.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
            
            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <div className="flex justify-between items-end mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="bg-emerald-600/90 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                  {data.year}
                </span>
                <span className="bg-slate-800/90 text-emerald-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-slate-700">
                  {data.teams}
                </span>
              </div>
              <h4 className="text-lg font-bold text-white leading-tight drop-shadow-md">{data.name}</h4>
              <div className="flex items-center text-gray-300 text-xs mt-1">
                <svg className="w-3 h-3 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {data.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
