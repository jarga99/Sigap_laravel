const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing with API Key:', apiKey ? 'Found' : 'NOT FOUND');
  if (!apiKey) return;

  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
  
  for (const model of models) {
    console.log(`\n--- Testing Model: ${model} ---`);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello, say 'Test OK'" }] }]
        })
      });
      
      const data = await resp.json();
      if (resp.ok) {
        console.log(`Result:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        console.log(`Status Error ${resp.status}:`, JSON.stringify(data));
      }
    } catch (err) {
      console.error(`Fetch Error:`, err.message);
    }
  }
}

testGemini();
