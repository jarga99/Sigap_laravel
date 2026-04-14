require('dotenv').config({ path: '/home/jr/sigap/backend-api/.env' });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API Key found");
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Buatkan 1 slogan/tagline profesional, singkat, dan menarik untuk aplikasi portal layanan bernama "TestApp". Jangan gunakan tanda kutip, jangan beri penjelasan apapun, hanya slogan tersebut dalam Bahasa Indonesia.`
        }]
      }]
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

testGemini();
