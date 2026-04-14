import { callAI } from './lib/ai-service';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  console.log("=== TESTING AI GATEWAY ===");
  const result = await callAI("Say 'Hello from Sigap Gateway'");
  if (result) {
    console.log("SUCCESS!");
    console.log("Provider:", result.provider);
    console.log("Model:", result.model);
    console.log("Response:", result.text);
  } else {
    console.log("FAILED TOTAL.");
  }
}

test();
