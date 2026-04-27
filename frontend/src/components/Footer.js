"use client";

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const { t } = useLanguage();
  const pathname = usePathname();

  if (pathname === '/auction') {
    return null;
  }

  return (
    <footer className="bg-slate-950 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex flex-col">
               <span className="text-white font-[1000] text-3xl tracking-tighter leading-none uppercase">
                 LAKSHMISH
               </span>
               <span className="text-[10px] font-black tracking-[0.4em] uppercase text-violet-500 mt-2">
                 Cricket Events
               </span>
            </div>
            <p className="mt-6 text-gray-500 text-xs font-bold uppercase tracking-widest leading-loose max-w-xs">
              {t.footer.desc || "The ultimate platform for local cricket auctions. Real-time bidding, professional management, and cinematic experiences."}
            </p>
          </div>
          <div>
            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-6 border-l-4 border-violet-500 pl-4">{t.footer.quickLinks}</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-gray-400 hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-violet-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> {t.navbar.home || "Home"}</Link></li>
              <li><Link href="/auctions" className="text-gray-400 hover:text-red-500 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> Live Auctions</Link></li>
              <li><Link href="/services" className="text-gray-400 hover:text-violet-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-violet-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> {t.navbar.services || "Services"}</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-violet-400 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-violet-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> About Us</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-6 border-l-4 border-cyan-500 pl-4">Registry Support</h3>
            <ul className="space-y-4">
              <li className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Inquiries</span>
                <a href="tel:+918147089330" className="text-white hover:text-violet-400 text-xs font-black transition-colors">
                  +91 81470 89330
                </a>
              </li>
              <li className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Connect</span>
                <a href="https://www.instagram.com/lakshmish_virat/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-violet-400 text-xs font-black transition-colors flex items-center gap-2">
                   @lakshmish_virat
                </a>
              </li>
              <li className="pt-2"><Link href="/booking" className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all inline-block shadow-lg shadow-violet-600/20">{t.navbar.bookMe || "Book Event"}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} LAKSHMISH CRICKET EVENTS. {t.footer.rights}
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            {/* Social Icons Placeholders */}
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <span className="sr-only">Instagram</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
