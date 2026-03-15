"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useEffect } from "react"
// import Image from "next/image"

const images = [
  { img: "/tournaments/t1_v2.jpg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams" },
  { img: "/tournaments/t2_v2.jpg", name: "Jakanachari Cup", location: "Tumkur", year: "2024", teams: "10 Teams" },
  { img: "/tournaments/t3_v2.jpg", name: "Chettanahalli Premier League", location: "Chettanahalli", year: "2024", teams: "10 Teams" },
  { img: "/tournaments/t4_v2.jpg", name: "Koratagere Premier League", location: "Koratagere", year: "2025", teams: "10 Teams" },
  { img: "/tournaments/t5_v2.jpg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams" }
]

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

  useEffect(() => {
    if (!emblaApi) return

    const autoplay = setInterval(() => {
      emblaApi.scrollNext()
    }, 2000)

    return () => clearInterval(autoplay)
  }, [emblaApi])

  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      <div className="overflow-hidden rounded-xl shadow-2xl shadow-emerald-500/20" ref={emblaRef}>
        <div className="flex">
          {images.map((data, index) => (
            <div className="min-w-full p-2" key={index}>
              <div className="relative h-[320px] sm:h-[400px] md:h-[480px] w-full rounded-xl overflow-hidden cursor-pointer group bg-slate-900 border border-slate-800">
                <img
                  src={data.img}
                  alt={data.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-700"
                />
                
                {/* Dark Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex justify-between items-end mb-2">
                    <span className="bg-emerald-600/90 text-white text-xs uppercase font-bold px-2.5 py-1 rounded shadow-sm">
                      {data.year}
                    </span>
                    <span className="bg-slate-800/90 text-emerald-400 text-xs uppercase font-bold px-2.5 py-1 rounded border border-slate-700 shadow-sm">
                      {data.teams}
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-white leading-tight drop-shadow-lg mb-1">{data.name}</h4>
                  <div className="flex items-center text-gray-300 text-sm font-medium drop-shadow-md">
                    <svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {data.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Left Button */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-emerald-500 text-white w-10 h-10 flex items-center justify-center rounded-full transition-colors border border-slate-700/50"
        aria-label="Previous image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Right Button */}
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-emerald-500 text-white w-10 h-10 flex items-center justify-center rounded-full transition-colors border border-slate-700/50"
        aria-label="Next image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
