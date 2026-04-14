const mongoose = require('mongoose');
const Location = require('./models/Location');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/auction";

const sampleData = [
  // Karnataka -> Udupi
  { state: "Karnataka", district: "Udupi", taluk: "Udupi", hobli: "Brahmavar", village: "Kota" },
  { state: "Karnataka", district: "Udupi", taluk: "Udupi", hobli: "Brahmavar", village: "Saligrama" },
  { state: "Karnataka", district: "Udupi", taluk: "Udupi", hobli: "Brahmavar", village: "Varanashi" },
  { state: "Karnataka", district: "Udupi", taluk: "Kundapura", hobli: "Byndoor", village: "Shiroor" },
  { state: "Karnataka", district: "Udupi", taluk: "Kundapura", hobli: "Byndoor", village: "Uppunda" },
  { state: "Karnataka", district: "Udupi", taluk: "Kundapura", hobli: "Kundapura", village: "Basrur" },
  
  // Karnataka -> Shimoga
  { state: "Karnataka", district: "Shimoga", taluk: "Sagar", hobli: "Sagar Kasaba", village: "Avinahalli" },
  { state: "Karnataka", district: "Shimoga", taluk: "Sagar", hobli: "Sagar Kasaba", village: "Keladi" },
  { state: "Karnataka", district: "Shimoga", taluk: "Thirthahalli", hobli: "Agumbe", village: "Agumbe" },
  
  // Maharashtra -> Mumbai
  { state: "Maharashtra", district: "Mumbai City", taluk: "MumbaiCity", hobli: "Colaba", village: "Cuffe Parade" },
  { state: "Maharashtra", district: "Mumbai City", taluk: "MumbaiCity", hobli: "Malabar Hill", village: "Grant Road" },
  
  // Goa -> North Goa
  { state: "Goa", district: "North Goa", taluk: "Bardez", hobli: "Mapusa", village: "Anjuna" },
  { state: "Goa", district: "North Goa", taluk: "Bardez", hobli: "Mapusa", village: "Calangute" }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB for seeding...");
  
  await Location.deleteMany({});
  await Location.insertMany(sampleData);
  
  console.log("Location data seeded successfully!");
  process.exit();
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
