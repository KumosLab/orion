/**
 * Challenge Generator Script for ORION
 * 
 * This script generates coding challenges for the ORION platform.
 * It creates challenges for different languages, difficulty levels, and types.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Check if this script is being run directly or imported
const isRunningDirectly = require.main === module;

// Connect to MongoDB only if running directly
let shouldDisconnect = false;
if (isRunningDirectly) {
  shouldDisconnect = true;
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orion', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('Connected to MongoDB');
  }).catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
}

// Import Challenge model
const Challenge = require('../models/Challenge');

// Challenge templates by language and type
const challengeTemplates = {
  javascript: {
    fix_bug: [
      {
        prompt: "Fix the bug in this function that should calculate the sum of all numbers in an array.",
        codeSnippet: `function sumArray(arr) {
  let sum = 0;
  for (let i = 1; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`,
        correctAnswer: `function sumArray(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}`,
        hints: [
          "Check the loop initialization carefully.",
          "Make sure the loop processes all elements in the array.",
          "The loop should start from the first element (index 0)."
        ],
        explanation: "The bug was in the for loop initialization. It started from i = 1 instead of i = 0, which meant the first element of the array was being skipped. In JavaScript, array indices start at 0, so to process all elements, the loop should start from index 0."
      },
      {
        prompt: "Fix the bug in this function that should return whether a number is prime.",
        codeSnippet: `function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 2) {
    if (num % i === 0) return false;
  }
  
  return true;
}`,
        correctAnswer: `function isPrime(num) {
  if (num <= 1) return false;
  if (num <= 3) return true;
  
  if (num % 2 === 0 || num % 3 === 0) return false;
  
  for (let i = 5; i * i <= num; i += 2) {
    if (num % i === 0) return false;
  }
  
  return true;
}`,
        hints: [
          "The function seems to be working correctly for most cases.",
          "Test the function with different inputs to find edge cases.",
          "Check if there are any logical errors in the prime number algorithm."
        ],
        explanation: "This is a trick question! The function is actually correct. It efficiently checks if a number is prime by: 1) Handling base cases (numbers ≤ 1 are not prime, 2 and 3 are prime), 2) Quickly eliminating even numbers and multiples of 3, and 3) Only checking odd divisors up to the square root of the number."
      }
    ],
    complete_code: [
      {
        prompt: "Complete the function to find the maximum value in an array of numbers.",
        codeSnippet: `function findMax(arr) {
  // Your code here
}`,
        correctAnswer: `function findMax(arr) {
  if (arr.length === 0) return null;
  
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}`,
        hints: [
          "Initialize a variable to track the maximum value.",
          "Loop through the array and compare each element with the current maximum.",
          "Don't forget to handle the case of an empty array."
        ],
        explanation: "This solution finds the maximum value by initializing a 'max' variable with the first element, then iterating through the rest of the array. For each element, if it's greater than the current max, we update max. We also handle the edge case of an empty array by returning null."
      }
    ],
    explain_output: [
      {
        prompt: "What will be the output of the following code? Explain why.",
        codeSnippet: `let x = 10;
function foo() {
  console.log(x);
  let x = 20;
}
foo();`,
        correctAnswer: "ReferenceError: Cannot access 'x' before initialization",
        hints: [
          "Think about variable hoisting in JavaScript.",
          "Consider the scope of the variable x inside the function.",
          "What happens when you try to access a variable before it's declared with let?"
        ],
        explanation: "This code will throw a ReferenceError. Even though there's a global variable x = 10, inside the function foo(), there's another variable x declared with let. Variables declared with let are hoisted but not initialized, creating a 'temporal dead zone' where accessing them before declaration results in a ReferenceError. The console.log(x) tries to access the local x before it's initialized."
      }
    ]
  },
  python: {
    fix_bug: [
      {
        prompt: "Fix the bug in this function that should return the factorial of a number.",
        codeSnippet: `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n)`,
        correctAnswer: `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)`,
        hints: [
          "Look at the recursive call carefully.",
          "What should change in each recursive call to reach the base case?",
          "The function needs to eventually reach n = 0."
        ],
        explanation: "The bug was in the recursive call. It was calling factorial(n) instead of factorial(n - 1), which would cause an infinite recursion. In a recursive factorial function, each call should reduce n by 1 until it reaches the base case (n = 0)."
      }
    ],
    complete_code: [
      {
        prompt: "Complete the function to check if a string is a palindrome (reads the same forwards and backwards).",
        codeSnippet: `def is_palindrome(s):
    # Your code here`,
        correctAnswer: `def is_palindrome(s):
    # Remove spaces and convert to lowercase
    s = s.lower().replace(" ", "")
    # Check if the string equals its reverse
    return s == s[::-1]`,
        hints: [
          "You might want to normalize the string (remove spaces, convert to lowercase).",
          "Think about how to check if a string reads the same forwards and backwards.",
          "Python has a concise way to reverse strings using slicing."
        ],
        explanation: "This solution first normalizes the string by converting it to lowercase and removing spaces. Then it checks if the string equals its reverse (s[::-1] is a Python slicing trick to reverse a string). If they're equal, the string is a palindrome."
      }
    ]
  }
};

// Function to generate a random date in the future (1-30 days)
function generateFutureDate() {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
  return futureDate;
}

// Function to generate challenges
async function generateChallenges() {
  try {
    const languages = ['javascript', 'python', 'java', 'csharp', 'cpp', 'ruby', 'go', 'php', 'rust', 'swift', 'typescript', 'kotlin', 'css', 'html'];
    const challengeTypes = ['fix_bug', 'complete_code', 'explain_output', 'predict_outcome', 'identify_pattern'];
    
    let generatedCount = 0;
    
    // Generate challenges for each language and type
    for (const language of languages) {
      for (const type of challengeTypes) {
        // Skip if no templates available
        if (!challengeTemplates[language] || !challengeTemplates[language][type]) {
          continue;
        }
        
        const templates = challengeTemplates[language][type];
        
        for (const template of templates) {
          // Generate random difficulty (1-10)
          const difficulty = Math.floor(Math.random() * 10) + 1;
          
          // Calculate XP reward based on difficulty
          const xpReward = difficulty * 10;
          
          const challenge = new Challenge({
      language,
      difficulty,
      type,
            prompt: template.prompt,
            codeSnippet: template.codeSnippet,
            correctAnswer: template.correctAnswer,
            hints: template.hints || [],
            explanation: template.explanation,
            xpReward,
            expiresAt: generateFutureDate(),
            active: true
          });
          
          await challenge.save();
          generatedCount++;
          console.log(`Generated ${language} ${type} challenge (difficulty: ${difficulty})`);
        }
      }
    }
    
    console.log(`Successfully generated ${generatedCount} challenges`);
  } catch (error) {
    console.error('Error generating challenges:', error);
  } finally {
    // Only disconnect if running directly as a script
    if (shouldDisconnect) {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the generator if this script is being run directly
if (isRunningDirectly) {
  generateChallenges();
}

// Export templates and function for potential reuse
module.exports = {
  challengeTemplates,
  generateChallenges
};