/**
 * Test script to verify Anthropic API connectivity and available models
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

async function testAPI() {
  console.log('\n=== Testing Anthropic API ===\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in .env');
    return;
  }

  console.log(`✓ API Key found: ${apiKey.substring(0, 20)}...`);

  const client = new Anthropic({
    apiKey: apiKey
  });

  // Test different model names
  const modelsToTest = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307'
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`\nTesting model: ${model}`);

      const message = await client.messages.create({
        model: model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Hello, respond with just "OK"'
        }]
      });

      console.log(`✅ SUCCESS - Response: ${message.content[0].text}`);
      console.log(`   Model: ${model}`);
      console.log(`   This model works!`);
      break; // Found a working model, stop testing

    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
    }
  }
}

testAPI()
  .then(() => {
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
