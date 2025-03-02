# ORION - Daily Coding Challenge Platform

ORION is a web-based platform that offers daily coding challenges for programmers to test and improve their skills across multiple programming languages. The platform features user authentication, daily challenges with varying difficulty levels, a global leaderboard, and support for 14 programming languages.

## Features

- **Daily Coding Challenges**: New challenges are generated daily with varying difficulty levels
- **Multiple Programming Languages**: Support for 14 programming languages
- **User Authentication**: Secure login and signup system
- **Global Leaderboard**: Compete with other programmers worldwide
- **Progress Tracking**: Monitor your improvement over time
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

- `public_html/`: Frontend files (HTML, CSS, JavaScript)
- `controllers/`: Backend controllers for handling requests
- `models/`: Database models
- `routes/`: API routes
- `middleware/`: Custom middleware functions
- `config/`: Configuration files
- `scripts/`: Challenge generation scripts

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/orion.git
   cd orion
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/orion
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the server:
   ```
   npm start
   ```

5. Access the application at `http://localhost:3000`

## Challenge Generation System

ORION features a comprehensive challenge generation system that can create coding challenges using templates or AI.

### Quick Commands

From the root directory:

```bash
# Generate challenges using templates
npm run generate

# Generate challenges using OpenAI
npm run generate-ai
npm run generate-ai -- --count 5  # Generate 5 challenges

# View recent challenges in the database
npm run view-challenges
npm run view-challenges -- --limit 10  # Show 10 challenges

# Activate challenges for today
npm run activate-challenges

# Test the challenge generator
npm run test-generator
```

### Challenge Generation Methods

#### Template-Based Generation

Uses predefined templates to create challenges:

```
node generateChallenges.js
```

#### AI-Powered Generation

Uses OpenAI's API to dynamically generate more varied and creative challenges:

```
node generateChallenges.js --ai
```

To specify the number of challenges to generate:

```
node generateChallenges.js --ai --count 5
```

### Challenge Management

The system includes scripts for:

- **Generating challenges**: Create new challenges using templates or AI
- **Scheduling generation**: Automatically generate challenges on a schedule
- **Activating challenges**: Select and activate challenges for the day
- **Viewing challenges**: Browse and filter challenges in the database
- **Testing generation**: Test the AI challenge generation without saving to the database

For more details on challenge generation, see the [scripts/README.md](scripts/README.md) file.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **AI Integration**: OpenAI API for challenge generation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the API used in challenge generation
- All contributors who have helped build and improve ORION