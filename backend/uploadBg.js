require("dotenv").config();
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3 } = require("./config/s3");
const fs = require("fs");
const path = require("path");

const upload = async () => {
  const filePath = "C:\\Users\\Ravikumar K P\\.gemini\\antigravity\\brain\\1b314919-c987-4703-9f55-80b2cde74f6b\\media__1773931356234.jpg";
  const fileStream = fs.createReadStream(filePath);
  const key = "backgrounds/space-bg.jpg";

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: "image/jpeg",
  };

  try {
    const data = await s3.send(new PutObjectCommand(params));
    console.log("Success! Image uploaded to S3.");
    console.log(`URL: https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`);
  } catch (err) {
    console.log("Error", err);
  }
};

upload();
