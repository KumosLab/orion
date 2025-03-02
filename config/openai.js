const { Configuration, OpenAIApi } = require('openai');

// Create OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize OpenAI API client
const openai = new OpenAIApi(configuration);

// Validate API key on startup
const validateOpenAIKey = async () => {
  try {
    // Attempt a simple request to validate the API key
    await openai.createCompletion({
      model: "text-davinci-003",
      prompt: "Confirm API key is valid.",
      max_tokens: 5,
      temperature: 0.5
    });
    
    console.log('OpenAI API key is valid');
    return true;
  } catch (error) {
    console.error('OpenAI API key validation error:', error.message);
    return false;
  }
};

module.exports = {
  openai,
  validateOpenAIKey
};