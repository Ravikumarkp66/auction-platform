require("dotenv").config();
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3 } = require("../config/s3");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Background = require("../models/Background");

const uploadFile = async (filePath, key, name, contentType) => {
  const fileStream = fs.createReadStream(filePath);
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  };

  try {
    await s3.send(new PutObjectCommand(params));
    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log(`Uploaded ${name} to ${url}`);

    let bg = await Background.findOne({ name });
    if (bg) {
      bg.imageUrl = url;
      bg.isActive = true;
      await bg.save();
    } else {
      bg = new Background({ name, imageUrl: url });
      await bg.save();
    }
    console.log(`Saved ${name} to MongoDB`);
  } catch (err) {
    console.log(`Error processing ${name}:`, err);
  }
};

const processFiles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const rootDir = path.resolve(__dirname, "../../frontend/public");

    // 1. Splash screen
    await uploadFile(
      path.join(rootDir, "splash-screen.png"),
      "public/splash-screen.png",
      "splash_screen",
      "image/png"
    );

    // 2. Badge
    await uploadFile(
      path.join(rootDir, "badges/badge.png"),
      "public/badge.png",
      "badge",
      "image/png"
    );

    // 3. Squad Badge
    await uploadFile(
      path.join(rootDir, "badges/squad-badge.png"),
      "public/squad-badge.png",
      "squad_badge",
      "image/png"
    );

    // 4. Space BG
    await uploadFile(
      path.join(rootDir, "space-bg.jpg"),
      "public/space-bg.jpg",
      "space_bg",
      "image/jpeg"
    );

    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

processFiles();
