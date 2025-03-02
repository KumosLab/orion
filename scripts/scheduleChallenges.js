/**
 * Challenge Scheduler
 * 
 * This script schedules the automatic generation of daily challenges
 * using node-cron. It can be run as a daemon process or with the
 * --run-now flag to immediately generate challenges.
 */

require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const path = require('path');
const { exec } = require('child_process');

// Check if we should run immediately
const runNow = process.argv.includes('--run-now');

// Path to the AI challenge generator
const generatorPath = path.join(__dirname, 'aiChallengeGenerator.js');

// Function to execute the challenge generator
const generateChallenges = () => {
  console.log(`[${new Date().toISOString()}] Running challenge generation...`);
  
  // Number of challenges to generate
  const count = 3; // Generate 3 challenges by default
  
  // Execute the AI challenge generator
  exec(`node ${generatorPath} ${count}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing challenge generator: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Challenge generator stderr: ${stderr}`);
    }
    
    console.log(`Challenge generator output: ${stdout}`);
    console.log(`[${new Date().toISOString()}] Challenge generation completed.`);
  });
};

// If --run-now flag is provided, generate challenges immediately
if (runNow) {
  console.log('Running challenge generation immediately...');
  generateChallenges();
}

// Schedule challenge generation to run at 00:01 every day
// Cron format: minute hour day-of-month month day-of-week
cron.schedule('1 0 * * *', () => {
  console.log('Running scheduled challenge generation...');
  generateChallenges();
});

console.log(`Challenge scheduler started at ${new Date().toISOString()}`);
console.log('Challenges will be generated at 00:01 every day.');
console.log('Press Ctrl+C to stop the scheduler.');

// Keep the process running
if (!runNow) {
  // Simple heartbeat to show the scheduler is still running
  setInterval(() => {
    console.log(`[${new Date().toISOString()}] Scheduler heartbeat - waiting for next scheduled run.`);
  }, 3600000); // Log every hour
} 