"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useEffect, useState } from "react"
import { API_URL } from "@/lib/apiConfig"

const fallbackImages = [
  { imageUrl: "/tournaments/t1_v2.jpg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams" },
  { imageUrl: "/tournaments/t2_v2.jpg", name: "Jakanachari Cup", location: "Tumkur", year: "2024", teams: "10 Teams" },
  { imageUrl: "/tournaments/t3_v2.jpg", name: "Chettanahalli Premier League", location: "Chettanahalli", year: "2024", teams: "10 Teams" },
  { imageUrl: "/tournaments/t4_v2.jpg", name: "Koratagere Premier League", location: "Koratagere", year: "2025", teams: "10 Teams" },
  { imageUrl: "/tournaments/t5_v2.jpg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams" }
]

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [carouselImages, setCarouselImages] = useState(fallbackImages)

  useEffect(() => {
    async function fetchCarousel() {
      try {
        const res = await fetch(`${API_URL}/api/tournament-images?tournamentId=landing`)
        const json = await res.json()
        if (json.success && json.data && json.data.length > 0) {
          setCarouselImages(json.data)
        }
      } catch (err) {
        console.error("HeroCarousel fetch error:", err)
      }
    }
    fetchCarousel()
  }, [])

  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext()
    }, 2000)

    return () => clearInterval(autoplay)
  }, [emblaApi])

  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      <div className="overflow-hidden rounded-xl shadow-2xl shadow-violet-500/20" ref={emblaRef}>
        <div className="flex">
          {carouselImages.map((data, index) => (
            <div className="min-w-full p-2" key={index}>
              <div className="relative h-[320px] sm:h-[400px] md:h-[480px] w-full rounded-xl overflow-hidden cursor-pointer group bg-slate-900 border border-slate-800">
                <img
                  src={data.imageUrl}
                  alt={data.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-700"
                />
                
                {/* Dark Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex justify-between items-end mb-2">
                      <span className="bg-violet-600/90 text-white text-xs uppercase font-bold px-2.5 py-1 rounded shadow-sm">
                        {data.year}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigator.share?.({ title: data.name, url: window.location.href }); }}
                          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-all"
                        >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z"></path></svg>
                        </button>
                        <button 
                          onClick={() => setLightboxImage(data.imageUrl)}
                          className="bg-violet-600/90 hover:bg-violet-500 text-white p-2 rounded-full shadow-lg transition-all"
                        >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                        </button>
                      </div>
                    </div>
                    <h4 className="text-2xl font-bold text-white leading-tight drop-shadow-lg mb-1">{data.name}</h4>
                    <div className="flex items-center text-gray-300 text-sm font-medium drop-shadow-md">
                      <svg className="w-4 h-4 mr-1 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {data.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Lightbox Modal ── */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setLightboxImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18"></path></svg>
            </button>
            <img 
              src={lightboxImage} 
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

      {/* Left Button */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-violet-500 text-white w-10 h-10 flex items-center justify-center rounded-full transition-colors border border-slate-700/50"
        aria-label="Previous image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Right Button */}
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-violet-500 text-white w-10 h-10 flex items-center justify-center rounded-full transition-colors border border-slate-700/50"
        aria-label="Next image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
