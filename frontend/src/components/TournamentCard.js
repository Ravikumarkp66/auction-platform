export default function TournamentCard({ name, location, year, image }) {
  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700 hover:shadow-violet-500/10 hover:shadow-2xl transition-all group">
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80"></div>
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <span className="bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded">{year}</span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
        <div className="flex items-center text-gray-400">
          <svg className="w-4 h-4 mr-2 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span className="text-sm">{location}</span>
        </div>
      </div>
    </div>
  );
}
