const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Root path might be KP/backend or KP/
// Assuming KP/backend because models are in ../models in routes
const Tournament = require('./models/Tournament');
const Team = require('./models/Team');
const Player = require('./models/Player');
const Background = require('./models/Background');

async function testRoutes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    // Test a simple find
    const b = await Background.findOne({ name: 'space_bg' });
    console.log("Background query success:", b ? "FOUND" : "NOT FOUND");

    const t = await Tournament.findById("69bd60c8942ce0bfe5230020");
    console.log("Tournament query success:", t ? t.name : "NOT FOUND");

    if (t) {
        const teams = await Team.find({ tournamentId: t._id });
        console.log("Teams query success, count:", teams.length);
    }

    console.log("ALL DB QUERIES PASSED IN ISOLATION");
    process.exit(0);
  } catch (err) {
    console.error("ROUTE TEST FAILED:", err);
    process.exit(1);
  }
}

testRoutes();
