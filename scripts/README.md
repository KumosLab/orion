# ORION Challenge Generator Scripts

This directory contains scripts for generating coding challenges for the ORION platform.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the parent directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/orion
   OPENAI_API_KEY=your_openai_api_key  # Only needed for AI-powered generation
   ```

## Available Scripts

### Template-Based Challenge Generator

This script generates challenges based on predefined templates:

```
npm run generate
```

### AI-Powered Challenge Generator

This script uses OpenAI's API to generate more varied and creative challenges:

```
npm run generate-ai [count]
```

Where `[count]` is the number of challenges to generate (default: 10).

### Challenge Scheduler

This script schedules the automatic generation of challenges:

```
npm run schedule
```

This will run the challenge generator daily at midnight.

To run the generator immediately and start the scheduler:

```
npm run schedule-now
```

### Test Challenge Generator

This script tests the AI challenge generation without saving to the database:

```
npm run test
```

It generates a single random challenge, displays it in a readable format, and saves it to the `test-challenges` directory for review. This is useful for testing the OpenAI integration and fine-tuning the prompts.

### View Recent Challenges

This script displays the most recent challenges in the database:

```
npm run view
```

Additional options:
```
npm run view -- --limit 10                # Show 10 most recent challenges
npm run view -- --language javascript     # Filter by language
npm run view -- --difficulty hard         # Filter by difficulty
npm run view -- --export                  # Export challenges to JSON file
```

### Activate Daily Challenges

This script selects and activates challenges for the day:

```
npm run activate
```

It selects one challenge for each difficulty level (easy, medium, hard) and marks them as active for today's challenges.

Additional options:
```
npm run activate -- --force               # Force activation even if challenges are already active
npm run activate -- --date 2023-03-01     # Activate challenges for a specific date
```

## Adding New Challenge Templates

To add new challenge templates, edit the `challengeTemplates` object in `generateChallenges.js`. Each template should include:

- `prompt`: The challenge description
- `codeSnippet`: The code snippet for the challenge
- `correctAnswer`: The expected answer
- `hints`: An array of hints
- `explanation`: A detailed explanation of the solution

## Running as a Cron Job

To run the challenge generator as a cron job on a server:

1. Make the script executable:
   ```
   chmod +x scheduleChallenges.js
   ```

2. Add it to crontab:
   ```
   crontab -e
   ```

3. Add the following lines to run the generator and activator daily:
   ```
   # Generate new challenges at midnight
   0 0 * * * /usr/bin/node /path/to/orion/scripts/scheduleChallenges.js
   
   # Activate challenges at 1 AM
   0 1 * * * /usr/bin/node /path/to/orion/scripts/activateDailyChallenges.js
   ```

## Customizing Challenge Generation

You can customize the challenge generation by:

1. Adding more templates to `challengeTemplates` in `generateChallenges.js`
2. Modifying the prompts in `aiChallengeGenerator.js` to generate different types of challenges
3. Adjusting the difficulty levels and XP rewards in both generators
4. Testing different prompt formats using the `testChallengeGenerator.js` script 