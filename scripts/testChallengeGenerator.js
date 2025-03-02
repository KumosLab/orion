/**
 * Test Challenge Generator
 * 
 * This script tests the challenge generation system by generating a single challenge
 * and displaying it in a readable format without saving to the database.
 */

require('dotenv').config({ path: '../.env' });
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Programming languages supported by the platform
const languages = [
  'javascript', 'python', 'java', 'csharp', 'cpp', 
  'php', 'ruby', 'swift', 'go', 'rust',
  'typescript', 'kotlin', 'scala', 'perl'
];

// Challenge types
const challengeTypes = [
  'algorithm', 'data structure', 'string manipulation', 
  'array processing', 'mathematical', 'logical puzzle',
  'pattern matching', 'recursion', 'sorting', 'searching'
];

// Difficulty levels
const difficultyLevels = ['easy', 'medium', 'hard'];

// Function to generate a prompt for OpenAI
function generatePrompt(language, difficulty, type) {
  return `Generate a coding challenge for ${language} programming language with ${difficulty} difficulty level. 
The challenge should be related to ${type}.

Format the response as a JSON object with the following structure:
{
  "title": "Challenge title",
  "prompt": "Detailed description of the challenge",
  "codeSnippet": "Starting code template for the user",
  "correctAnswer": "Expected output or solution",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "explanation": "Detailed explanation of the solution approach",
  "testCases": [
    {"input": "example input 1", "output": "expected output 1"},
    {"input": "example input 2", "output": "expected output 2"}
  ],
  "constraints": ["Constraint 1", "Constraint 2"],
  "timeComplexity": "Expected time complexity",
  "spaceComplexity": "Expected space complexity",
  "difficultyLevel": "${difficulty}",
  "language": "${language}",
  "type": "${type}",
  "xpReward": ${difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30}
}

Make sure the challenge is original, interesting, and appropriate for the specified difficulty level.`;
}

// Function to generate a test challenge
async function generateTestChallenge() {
  try {
    // Randomly select language, difficulty, and type
    const language = languages[Math.floor(Math.random() * languages.length)];
    const difficulty = difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)];
    const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
    
    console.log(`Generating a ${difficulty} ${type} challenge for ${language}...`);
    
    // Generate the prompt
    const prompt = generatePrompt(language, difficulty, type);
    
    // Call OpenAI API
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    // Parse the response
    const responseText = response.data.choices[0].text.trim();
    console.log("\nRaw API Response:");
    console.log("=".repeat(50));
    console.log(responseText);
    console.log("=".repeat(50));
    
    try {
      // Try to parse the JSON response
      const challenge = JSON.parse(responseText);
      
      // Format and display the challenge
      console.log("\nFormatted Challenge:");
      console.log("=".repeat(50));
      console.log(`Title: ${challenge.title}`);
      console.log(`Difficulty: ${challenge.difficultyLevel}`);
      console.log(`Language: ${challenge.language}`);
      console.log(`Type: ${challenge.type}`);
      console.log(`XP Reward: ${challenge.xpReward}`);
      console.log("\nPrompt:");
      console.log(challenge.prompt);
      console.log("\nCode Snippet:");
      console.log(challenge.codeSnippet);
      console.log("\nTest Cases:");
      challenge.testCases.forEach((testCase, index) => {
        console.log(`  ${index + 1}. Input: ${testCase.input}`);
        console.log(`     Output: ${testCase.output}`);
      });
      console.log("\nHints:");
      challenge.hints.forEach((hint, index) => {
        console.log(`  ${index + 1}. ${hint}`);
      });
      console.log("\nConstraints:");
      challenge.constraints.forEach((constraint, index) => {
        console.log(`  ${index + 1}. ${constraint}`);
      });
      console.log("\nTime Complexity: " + challenge.timeComplexity);
      console.log("Space Complexity: " + challenge.spaceComplexity);
      console.log("=".repeat(50));
      
      // Save the challenge to a test file
      const testDir = path.join(__dirname, 'test-challenges');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
      }
      
      const filename = path.join(testDir, `test-challenge-${Date.now()}.json`);
      fs.writeFileSync(filename, JSON.stringify(challenge, null, 2));
      console.log(`\nChallenge saved to: ${filename}`);
      
    } catch (parseError) {
      console.error("Error parsing the API response:", parseError);
      console.log("The response could not be parsed as valid JSON.");
    }
    
  } catch (error) {
    console.error("Error generating challenge:", error);
    if (error.response) {
      console.error("API error:", error.response.data);
    }
  }
}

// Run the test
console.log("Starting challenge generation test...");
generateTestChallenge(); 