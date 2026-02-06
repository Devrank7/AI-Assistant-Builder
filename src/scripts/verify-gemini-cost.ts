import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 Starting Gemini Cost Verification...');

  // 1. Load Environment Variables from .env.local manually BEFORE imports
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('📄 Loading .env.local...');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } else {
    console.warn('⚠️ .env.local not found! Relying on existing process.env');
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY || API_KEY.length < 10) {
    console.error('❌ GEMINI_API_KEY is missing or invalid in .env.local');
    process.exit(1);
  } else {
    console.log('🔑 API Key found (length: ' + API_KEY.length + ')');
  }

  // 1.5 Debug: Fetch available models directly
  console.log('\n🔎 Fetching available models from API...');
  try {
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    if (listResponse.ok) {
      const data = await listResponse.json();
      const models = (data.models || []).map((m: { name: string }) => m.name.replace('models/', ''));
      console.log('📋 Available Models:', models.join(', '));

      // Strategy: Use the first flash model found, or fallback to pro
      const preferredModel =
        models.find((m: string) => m.includes('1.5-flash')) ||
        models.find((m: string) => m.includes('flash')) ||
        models.find((m: string) => m.includes('pro')) ||
        'gemini-1.5-flash'; // fallback

      console.log(`👉 Selected Auto-Model: ${preferredModel}`);
      process.env.TEST_MODEL_ID = preferredModel;
    } else {
      console.error('❌ Failed to list models:', listResponse.status, listResponse.statusText);
      const text = await listResponse.text();
      console.error('Response:', text);
    }
  } catch (err) {
    console.error('❌ Error fetching models:', err);
  }

  // 2. Dynamic Import (now that env is set)
  console.log('\n📦 Importing libraries...');
  const { generateResponse } = await import('../lib/gemini');
  const { calculateCost, getModel } = await import('../lib/models');

  // 3. Define Test Parameters
  const clientId = 'test-verification-client';
  const systemPrompt = 'Ты опытный AI-ассистент. Отвечай кратко и точно.';
  const context = 'Это тестовый запрос для проверки биллинга.';
  const userMessage = 'Сколько будет 2 + 2? Ответь одним словом.';

  const modelId = process.env.TEST_MODEL_ID || 'gemini-1.5-flash';

  console.log(`\n🤖 Testing Model: ${modelId}`);
  console.log(`📝 User Message: "${userMessage}"`);

  try {
    // 4. Call Gemini API
    const start = Date.now();
    const result = await generateResponse(clientId, systemPrompt, context, userMessage, 0.7, 100, modelId);
    const duration = Date.now() - start;

    console.log(`\n✅ Response Received (${duration}ms):`);
    console.log(`> ${result.text}`);

    // 5. Verify Tokens
    const { input, output, total } = result.tokensUsed;
    console.log('\n📊 Token Usage:');
    console.log(`- Input: ${input}`);
    console.log(`- Output: ${output}`);
    console.log(`- Total: ${total}`);

    if (total === 0) {
      console.warn('⚠️ Token usage reported as 0. This suggests usageMetadata is missing from the response.');
      // NOTE: Some older models don't return usage metadata in all cases.
      // But 1.5 Flash usually does.
      // If 0, we can't verify cost logic fully, but we verified connectivity.
    }

    // 6. Calculate Cost
    let modelInfo;
    try {
      modelInfo = getModel(modelId);
    } catch {
      // Fallback to defaults or a known model just for pricing structure display
      modelInfo = getModel('gemini-3-flash');
    }

    // Recalculate cost
    // Note: If modelId is dynamically chosen (e.g. gemini-1.5-flash-001),
    // it won't be in models.ts, so calculateCost might error or default.
    // We should check verify calculateCost behavior in models.ts
    // models.ts uses getModel(id) which falls back to default if not found.
    // So cost will be calculated using DEFAULT model pricing if ID is unknown.
    // This is fine for "checking logic", but we should warn user.

    const cost = calculateCost(modelId, input, output);

    console.log('\n💰 Cost Calculation:');
    if (modelInfo.id !== modelId) {
      console.warn(
        `⚠️ Warning: Model "${modelId}" not found in local registry. Using default pricing (${modelInfo.name}).`
      );
    } else {
      console.log(`ℹ️  Using pricing for: ${modelInfo.name}`);
    }
    console.log(`- Model Pricing (Input): $${modelInfo.pricing.inputPer1M} / 1M tokens`);
    console.log(`- Model Pricing (Output): $${modelInfo.pricing.outputPer1M} / 1M tokens`);
    console.log(`- Calculated Cost: $${cost.toFixed(8)}`);

    if (total > 0 && cost === 0) {
      console.error('\n❌ Logic Error: Tokens > 0 but Cost is 0!');
      process.exit(1);
    }

    console.log('\n✅ Verification Logic Passed');
  } catch (error) {
    console.error('\n❌ Error verifying Gemini:', error);
    process.exit(1);
  }
}

main();
