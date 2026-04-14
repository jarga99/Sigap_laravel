const fetch = require('node-fetch');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

async function probeModel(modelName) {
  process.stdout.write(`Testing ${modelName}: `);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hi" }] }]
      })
    });
    const data = await response.json();
    if (response.ok && data.candidates) {
      console.log("✅ SUCCESS");
      return true;
    } else {
      console.log(`❌ FAILED (${response.status}) - ${data.error?.message || 'No candidates'}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ EXCEPTION - ${err.message}`);
    return false;
  }
}

async function runProbes() {
  if (!apiKey) {
    console.error("API Key is missing!");
    return;
  }
  await probeModel("gemini-1.5-flash");
  await probeModel("gemini-2.0-flash-exp");
  await probeModel("gemini-2.5-flash");
}

runProbes();
