"use client";

import Hero from "@/components/Hero";
import ServicesCard from "@/components/ServicesCard";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { API_URL } from "@/lib/apiConfig";

export default function Home() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    // Add timestamp to bypass any browser cache
    fetch(`${API_URL}/api/services?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setServices(data);
        }
      })
      .catch(err => console.error("Failed to fetch services:", err));
  }, []);

  return (
    <>
      <Hero />
      
      {/* Services Section */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               Reasonable Pricing Guaranteed
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white">Professional Services</h2>
            <p className="mt-4 text-base text-gray-400 max-w-2xl mx-auto font-medium">
              High-fidelity auction hosting and expert live commentary at competitive rates. 
              Get the premium IPL-style experience for your local tournament without breaking the bank.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12 max-w-5xl mx-auto">
            {services.map(service => (
              <ServicesCard 
                key={service._id}
                title={service.title}
                description={service.description}
                price={service.price}
                icon={service.icon}
              />
            ))}
            {services.length === 0 && (
              <>
                <ServicesCard 
                  title="Auction Management" 
                  description="Complete tournament auction setup and management"
                  price="₹5,000 per day"
                  icon="⚖️"
                />
                <ServicesCard 
                  title="Live Commentary" 
                  description="Professional commentary for your matches"
                  price="₹2,000 per match"
                  icon="🎙️"
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-violet-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            <span className="block">Ready to host your</span>
            <span className="block text-violet-900 mt-2">next tournament?</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link 
                href="/contact" 
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-bold rounded-md text-violet-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
