require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { s3 } = require('../config/s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

const IMAGE_PATH = 'C:/Users/Ravikumar K P/lakshmish_logo.png'; // Assuming it's copied there or similar
const TOURNAMENT_ID = '67ba3089d7b889344449833f';

async function uploadAndSetLogo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const buffer = fs.readFileSync(IMAGE_PATH);
    const key = `logos/lakshmish_logo_${Date.now()}.png`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png'
    });

    await s3.send(command);
    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log('Uploaded to S3:', s3Url);

    const Tournament = require('../models/Tournament');
    await Tournament.findByIdAndUpdate(TOURNAMENT_ID, { organizerLogo: s3Url });
    console.log('Updated Tournament in MongoDB');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

uploadAndSetLogo();
