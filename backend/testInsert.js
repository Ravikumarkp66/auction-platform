require("dotenv").config()
const mongoose = require("mongoose")

mongoose.connect(process.env.MONGO_URI)

const playerSchema = new mongoose.Schema({
  name: String,
  role: String,
  village: String,
  age: Number,
  basePrice: Number
})

const Player = mongoose.model("Player", playerSchema)

async function insertPlayer() {
  try {
    const player = new Player({
      name: "Test Player",
      role: "Batsman",
      village: "Koratagere",
      age: 22,
      basePrice: 2000
    })

    await player.save()
    console.log("✅ Player inserted successfully")
  } catch (error) {
    console.error("❌ Error inserting player:", error)
  } finally {
    mongoose.connection.close()
  }
}

insertPlayer()
