require("dotenv").config()
const mongoose = require("mongoose")
const Background = require("./models/Background")

async function insertBackground() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const data = {
      name: "squad-bg",
      imageUrl: "/backgrounds/squad-bg.jpg",
      isActive: true
    };

    // Use updateOne with upsert to avoid duplicates and ensure it's saved/updated
    const result = await Background.updateOne(
      { name: data.name },
      { $set: data },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log("✅ Background 'squad-bg' inserted successfully");
    } else {
      console.log("✅ Background 'squad-bg' updated successfully");
    }
  } catch (error) {
    console.error("❌ Error saving background:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

insertBackground()
