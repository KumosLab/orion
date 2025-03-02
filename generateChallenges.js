/**
 * Challenge Generator Runner
 * 
 * This script is a simple wrapper to run the challenge generators
 * from the root directory of the project.
 */

const path = require('path');
const { exec } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let generator = 'generate'; // Default to template-based generator
let count = 10; // Default count for AI generator

if (args.includes('--ai')) {
  generator = 'generate-ai';
  const countIndex = args.findIndex(arg => arg === '--count');
  if (countIndex !== -1 && countIndex < args.length - 1) {
    const countArg = parseInt(args[countIndex + 1]);
    if (!isNaN(countArg) && countArg > 0) {
      count = countArg;
    }
  }
}

// Path to the scripts directory
const scriptsDir = path.join(__dirname, 'scripts');

// Command to run
let command = `cd ${scriptsDir} && npm run ${generator}`;
if (generator === 'generate-ai') {
  command += ` ${count}`;
}

console.log(`Running command: ${command}`);

// Execute the command
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(stdout);
});

// Print usage information
console.log(`
Usage:
  node generateChallenges.js [options]

Options:
  --ai         Use AI-powered challenge generator
  --count N    Generate N challenges (default: 10, only with --ai)

Examples:
  node generateChallenges.js              # Run template-based generator
  node generateChallenges.js --ai         # Run AI-powered generator with default count
  node generateChallenges.js --ai --count 5  # Run AI-powered generator with 5 challenges
`); 