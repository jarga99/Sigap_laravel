const fetch = require('node-fetch');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const appName = "SIGAP";

async function testGemini() {
  console.log("Testing Gemini API with Key:", apiKey ? "EXISTS" : "MISSING");
  if (!apiKey) return;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Buatkan 1 slogan profesional untuk aplikasi "${appName}".`
          }]
        }]
      })
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response Data:", JSON.stringify(data, null, 2));

    if (data.candidates) {
      console.log("SUCCESS: ", data.candidates[0].content.parts[0].text);
    } else {
      console.log("FAILED: No candidates");
    }
  } catch (err) {
    console.error("EXCEPTION:", err.message);
  }
}

testGemini();
