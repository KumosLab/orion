/**
 * AI-Powered Challenge Generator for ORION
 * 
 * This script uses OpenAI's API to generate coding challenges dynamically.
 * It creates more varied and creative challenges than the template-based approach.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { OpenAI } = require('openai');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orion', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

// Import Challenge model
const Challenge = require('../models/Challenge');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Languages to generate challenges for
const languages = [
  'python',
  'javascript',
  'java',
  'csharp',
  'cpp',
  'ruby',
  'go',
  'php',
  'rust',
  'swift',
  'typescript',
  'kotlin',
  'css',
  'html'
];

// Challenge types
const challengeTypes = [
  'fix_bug',
  'complete_code',
  'explain_output',
  'predict_outcome',
  'identify_pattern'
];

// Generate a prompt for OpenAI based on language and difficulty
function generatePrompt(language, difficulty, type) {
  let difficultyText = '';
  
  if (difficulty <= 3) {
    difficultyText = 'beginner';
  } else if (difficulty <= 7) {
    difficultyText = 'intermediate';
  } else {
    difficultyText = 'advanced';
  }
  
  let prompt = '';
  
  switch (type) {
    case 'fix_bug':
      prompt = `Generate a coding challenge for ${difficultyText} ${language} programmers. Create a code snippet with a bug that needs to be fixed. The response should be in JSON format with the following structure:
      {
        "prompt": "What's wrong with this code?",
        "codeSnippet": "// The code with the bug",
        "correctAnswer": "// The fixed code",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
        "explanation": "Detailed explanation of the bug and how to fix it"
      }`;
      break;
    case 'complete_code':
      prompt = `Generate a coding challenge for ${difficultyText} ${language} programmers. Create a code snippet with a missing part that needs to be completed. The response should be in JSON format with the following structure:
      {
        "prompt": "Complete the following code to achieve the described functionality.",
        "codeSnippet": "// The incomplete code",
        "correctAnswer": "// The complete code or just the missing part",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
        "explanation": "Detailed explanation of the solution"
      }`;
      break;
    case 'explain_output':
      prompt = `Generate a coding challenge for ${difficultyText} ${language} programmers. Create a code snippet and ask what the output will be. The response should be in JSON format with the following structure:
      {
        "prompt": "What will be the output of this code?",
        "codeSnippet": "// The code",
        "correctAnswer": "The expected output",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
        "explanation": "Detailed explanation of how the code executes and produces the output"
      }`;
      break;
    case 'predict_outcome':
      prompt = `Generate a coding challenge for ${difficultyText} ${language} programmers. Create a code snippet and ask what will happen when it runs (e.g., error, specific behavior). The response should be in JSON format with the following structure:
      {
        "prompt": "What happens when this code runs?",
        "codeSnippet": "// The code",
        "correctAnswer": "The outcome (error message, behavior description, etc.)",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
        "explanation": "Detailed explanation of why this outcome occurs"
      }`;
      break;
    case 'identify_pattern':
      prompt = `Generate a coding challenge for ${difficultyText} ${language} programmers. Create a code snippet that implements a specific pattern or algorithm and ask to identify it. The response should be in JSON format with the following structure:
      {
        "prompt": "What pattern or algorithm does this code implement?",
        "codeSnippet": "// The code",
        "correctAnswer": "The name of the pattern or algorithm",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
        "explanation": "Detailed explanation of the pattern or algorithm and how the code implements it"
      }`;
      break;
    default:
      prompt = `Generate a coding challenge for ${difficultyText} ${language} programmers. The response should be in JSON format with the following structure:
      {
        "prompt": "A clear instruction for the challenge",
        "codeSnippet": "// The code snippet for the challenge",
        "correctAnswer": "The expected answer",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
        "explanation": "Detailed explanation of the solution"
      }`;
  }
  
  return prompt;
}

// Generate a challenge for a specific language and difficulty
async function generateChallenge(language, difficulty) {
  // Select a random challenge type
  const randomTypeIndex = Math.floor(Math.random() * challengeTypes.length);
  const type = challengeTypes[randomTypeIndex];
  
  try {
    const prompt = generatePrompt(language, difficulty, type);
    
    console.log(`Generating ${type} challenge for ${language} (difficulty: ${difficulty})...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a coding challenge generator. Create challenging but solvable programming problems."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });
    
    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const responseText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    let challengeData;
    try {
      // Find the JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        challengeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse challenge data from OpenAI response');
    }
    
    // Validate required fields
    if (!challengeData.prompt || !challengeData.codeSnippet || 
        !challengeData.correctAnswer || !challengeData.explanation) {
      throw new Error('Missing required fields in challenge data');
    }
    
    // Ensure hints is an array
    if (!Array.isArray(challengeData.hints)) {
      challengeData.hints = [];
    }
    
    // Calculate expiration date (random future date within 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.floor(Math.random() * 30) + 1);
    
    // Calculate XP reward based on difficulty
    const xpReward = 50 + (difficulty * 10); // Scale XP with difficulty
    
    // Create a new challenge document
    const newChallenge = new Challenge({
      language,
      difficulty,
      type,
      prompt: challengeData.prompt,
      codeSnippet: challengeData.codeSnippet,
      correctAnswer: challengeData.correctAnswer,
      hints: challengeData.hints,
      explanation: challengeData.explanation,
      xpReward,
      expiresAt,
      active: true
    });
    
    await newChallenge.save();
    console.log(`Successfully generated ${type} challenge for ${language} (difficulty: ${difficulty})`);
    return newChallenge;
  } catch (error) {
    console.error(`Error generating challenge for ${language} (difficulty ${difficulty}):`, error);
    return null;
  }
}

// Main function to generate challenges
async function generateAIChallenges(count = 10) {
  try {
    console.log(`Starting AI challenge generation for ${count} challenges...`);
    
    const challengePromises = [];
    
    // Generate a specified number of challenges
    for (let i = 0; i < count; i++) {
      // Select a random language
      const randomLangIndex = Math.floor(Math.random() * languages.length);
      const language = languages[randomLangIndex];
      
      // Generate a random difficulty (1-10)
      const difficulty = Math.floor(Math.random() * 10) + 1;
      
      challengePromises.push(generateChallenge(language, difficulty));
    }
    
    const results = await Promise.all(challengePromises);
    const successCount = results.filter(result => result !== null).length;
    
    console.log(`AI challenge generation completed. Generated ${successCount}/${count} challenges successfully.`);
  } catch (error) {
    console.error('Error in challenge generation process:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
let count = 10; // Default count

if (args.length > 0) {
  const countArg = parseInt(args[0]);
  if (!isNaN(countArg) && countArg > 0) {
    count = countArg;
  }
}

// Run the generator
generateAIChallenges(count);

module.exports = generateAIChallenges; 