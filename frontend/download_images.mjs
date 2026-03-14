import fs from 'fs';

const urls = [
  "https://images.unsplash.com/photo-1540747913346-19e32fc3e676?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1587280501635-a19d71c4ac44?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1624526267942-ab068a4192b0?w=600&q=80&auto=format&fit=crop"
];

fs.mkdirSync('public/tournaments', { recursive: true });

async function download() {
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i], {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(`public/tournaments/t${i+1}.jpg`, Buffer.from(arrayBuffer));
    console.log(`Downloaded t${i+1}.jpg`);
  }
}
download();
