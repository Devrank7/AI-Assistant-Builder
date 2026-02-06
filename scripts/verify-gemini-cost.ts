import fs from 'fs';
import path from 'path';
import { generateResponse } from '../src/lib/gemini';
import { calculateCost } from '../src/lib/models';

// Manually load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function verifyGemini() {
  console.log('🚀 Starting Gemini Cost Verification...');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }
  console.log('✅ API Key found');

  const clientId = 'test-client-verification';
  const systemPrompt = 'You are a helpful AI assistant. Answer briefly.';
  const context = 'User is testing the API cost calculation.';
  const message = 'What is the capital of France? Explain in one sentence.';

  console.log('\n📝 Sending request...');
  console.log(`Prompt: "${message}"`);

  try {
    const start = Date.now();
    const result = await generateResponse(clientId, systemPrompt, context, message, 0.7, 100, 'gemini-3-flash');
    const duration = Date.now() - start;

    console.log(`\n✅ Response received in ${duration}ms:`);
    console.log(`"${result.text}"`);

    const { input, output, total } = result.tokensUsed;
    console.log('\n📊 Token Usage:');
    console.log(`Input: ${input}`);
    console.log(`Output: ${output}`);
    console.log(`Total: ${total}`);

    const cost = calculateCost('gemini-3-flash', input, output);
    console.log(`\n💰 Calculated Cost (Gemini 3 Flash):`);
    console.log(`$${cost.toFixed(6)}`);

    if (input > 0 && output > 0 && cost > 0) {
      console.log('\n✅ VERIFICATION PASSED: Tokens tracked and cost calculated > 0');
    } else {
      console.error('\n❌ VERIFICATION FAILED: Tokens or cost is 0');
    }
  } catch (error) {
    console.error('❌ Error calling Gemini:', error);
  }
}

verifyGemini();
