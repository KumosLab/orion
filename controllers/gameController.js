const Challenge = require('../models/Challenge');
const User = require('../models/User.js');
const Leaderboard = require('../models/Leaderboard');
const { verifyCode } = require('../public_html/orion/utils/codeValidator');

// Get a daily challenge for the user
exports.getDailyChallenge = async (req, res) => {
  try {
    // Get user ID from authenticated user
    const userId = req.user.id;
    
    // Get excludeTypes from query parameters
    const excludeTypesParam = req.query.excludeTypes;
    let excludeTypesArray = [];
    
    if (excludeTypesParam) {
      excludeTypesArray = excludeTypesParam.split(',');
      console.log(`Excluding challenge types: ${excludeTypesArray.join(', ')}`);
    }
    
    // Check if unique parameter is set
    const uniqueParam = req.query.unique === 'true';
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Check if user has already played today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastPlayed = user.lastPlayed ? new Date(user.lastPlayed) : null;
    
    // Allow admin user (222ryan) to play again regardless of last played date
    const isAdmin = user.username === '222ryan' || user.isAdmin === true;
    
    if (lastPlayed && lastPlayed >= today && !isAdmin) {
      return res.status(400).json({
        status: 'fail',
        message: 'You have already played today. Come back tomorrow for a new challenge!'
      });
    }
    
    // Calculate appropriate difficulty based on user's XP with increased thresholds
    let targetDifficulty;
    let numericDifficulty;
    
    if (user.xp < 200) {
      targetDifficulty = 'easy';
      numericDifficulty = 1;
    } else if (user.xp < 500) {
      targetDifficulty = 'medium';
      numericDifficulty = 3;
    } else if (user.xp < 1000) {
      targetDifficulty = 'hard';
      numericDifficulty = 5;
    } else if (user.xp < 2000) {
      targetDifficulty = 'expert';
      numericDifficulty = 7;
    } else if (user.xp < 3500) {
      targetDifficulty = 'master';
      numericDifficulty = 9;
    } else {
      targetDifficulty = 'legendary';
      numericDifficulty = 10;
    }
    
    console.log(`User XP: ${user.xp}, Target difficulty: ${targetDifficulty} (${numericDifficulty})`);
    
    // Try to find a challenge from the database first
    // Build query object with excluded types if provided
    const baseQuery = {
      active: true
    };
    
    if (excludeTypesArray.length > 0) {
      baseQuery.type = { $nin: excludeTypesArray };
    }
    
    // If unique parameter is set, exclude challenges the user has already completed
    if (uniqueParam && user.completedChallenges && user.completedChallenges.length > 0) {
      baseQuery._id = { $nin: user.completedChallenges };
      console.log(`Excluding ${user.completedChallenges.length} previously completed challenges`);
    }
    
    // Try to find challenges that match user's preferred languages and target difficulty
    let query = {
      ...baseQuery,
      language: { $in: user.languages },
      difficulty: numericDifficulty
    };
    
    let challenges = await Challenge.find(query);
    
    // If no challenges found, generate a new one with OpenAI
    if (challenges.length === 0) {
      console.log('No challenges found in database, generating with OpenAI...');
      
      // Select a random language from user's preferences
      const randomLangIndex = Math.floor(Math.random() * user.languages.length);
      const language = user.languages[randomLangIndex];
      
      // Select a random challenge type
      const challengeTypes = ['fix_bug', 'complete_code', 'explain_output', 'predict_outcome', 'identify_pattern'];
      const randomTypeIndex = Math.floor(Math.random() * challengeTypes.length);
      const type = challengeTypes[randomTypeIndex];
      
      // Generate a new challenge using OpenAI
      const newChallenge = await generateOpenAIChallenge(language, numericDifficulty, type);
      
      if (newChallenge) {
        challenges = [newChallenge];
      } else {
        // If OpenAI generation fails, try to find any active challenge
        console.log('OpenAI generation failed, falling back to any active challenge...');
        challenges = await Challenge.find(baseQuery);
      }
    }
    
    // If still no challenges available at all
    if (challenges.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No challenges available. Please try again later.'
      });
    }
    
    // Select a random challenge
    const randomIndex = Math.floor(Math.random() * challenges.length);
    const challenge = challenges[randomIndex];
    
    // Map numeric difficulty back to string for the response
    let difficultyString = 'medium';
    const diff = challenge.difficulty;
    
    if (diff <= 2) difficultyString = 'easy';
    else if (diff <= 4) difficultyString = 'medium';
    else if (diff <= 6) difficultyString = 'hard';
    else if (diff <= 8) difficultyString = 'expert';
    else if (diff <= 9) difficultyString = 'master';
    else difficultyString = 'legendary';
    
    console.log(`Selected challenge: ${challenge.title} (${difficultyString}, ${challenge.language}, ${challenge.type})`);
    
    // Return challenge data (excluding correct answer and explanation)
    const challengeData = {
      id: challenge._id,
      title: challenge.title,
      prompt: challenge.prompt,
      codeSnippet: challenge.codeSnippet,
      difficulty: difficultyString,
      language: challenge.language,
      type: challenge.type,
      attemptsRemaining: 5 // Changed from 3 to 5 to match the UI
    };
    
    return res.status(200).json({
      status: 'success',
      data: {
        challenge: challengeData
      }
    });
    
  } catch (err) {
    console.error('Error getting daily challenge:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.'
    });
  }
};

// Function to generate a challenge using OpenAI
async function generateOpenAIChallenge(language, difficulty, type) {
  try {
    const { OpenAI } = require('openai');
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Generate a prompt based on language, difficulty, and type
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
          "title": "A catchy title for the challenge",
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
          "title": "A catchy title for the challenge",
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
          "title": "A catchy title for the challenge",
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
          "title": "A catchy title for the challenge",
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
          "title": "A catchy title for the challenge",
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
          "title": "A catchy title for the challenge",
          "prompt": "A clear instruction for the challenge",
          "codeSnippet": "// The code snippet for the challenge",
          "correctAnswer": "The expected answer",
          "hints": ["Hint 1", "Hint 2", "Hint 3"],
          "explanation": "Detailed explanation of the solution"
        }`;
    }
    
    console.log(`Generating ${type} challenge for ${language} (difficulty: ${difficulty})...`);
    
    // Call OpenAI API
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
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Calculate XP reward based on difficulty
    const xpReward = 50 + (difficulty * 10); // Scale XP with difficulty
    
    // Create a new challenge document
    const newChallenge = new Challenge({
      title: challengeData.title || `${language.charAt(0).toUpperCase() + language.slice(1)} ${type.replace('_', ' ')} Challenge`,
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
    console.error(`Error generating challenge with OpenAI for ${language} (difficulty ${difficulty}):`, error);
    return null;
  }
}

// Submit an answer to a challenge
exports.submitAnswer = async (req, res) => {
  try {
    const { challengeId, answer, attemptNumber } = req.body;
    
    if (!challengeId || !answer) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide challenge ID and answer'
      });
    }
    
    // Validate attempt number
    if (!attemptNumber || typeof attemptNumber !== 'number' || attemptNumber < 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid attempt number'
      });
    }
    
    // Check attempt number
    if (attemptNumber > 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'You have exceeded the maximum number of attempts'
      });
    }
    
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        status: 'fail',
        message: 'Challenge not found'
      });
    }
    
    // Verify the answer
    let isCorrect;
    try {
      isCorrect = await verifyCode(challenge.correctAnswer, answer, challenge.language);
    } catch (error) {
      console.error('Error verifying code:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error verifying your answer. Please try again.'
      });
    }
    
    if (isCorrect) {
      // Update user stats
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          status: 'fail',
          message: 'User not found'
        });
      }
      
      // Calculate XP based on difficulty and attempts
      let xpGained = challenge.xpReward * (1 - (attemptNumber - 1) * 0.15);
      xpGained = Math.max(Math.floor(xpGained), challenge.xpReward * 0.25); // Min 25% of original XP
      
      user.xp += xpGained;
      user.wins += 1;
      user.streak += 1;
      user.lastPlayed = new Date();
      
      // Increment games played
      user.gamesPlayed = (user.gamesPlayed || 0) + 1;
      
      // Add challenge to completed challenges
      user.addCompletedChallenge(challengeId);
      
      try {
        await user.save();
        
        // Update leaderboard with additional stats
        await Leaderboard.updateEntry(user._id, {
          username: user.username,
          xp: user.xp,
          level: user.level,
          wins: user.wins,
          streak: user.streak,
          losses: user.losses || 0,
          gamesPlayed: user.gamesPlayed || 0
        });
        
        // Get user rank
        const rankData = await Leaderboard.getUserRank(user._id);
        
        return res.status(200).json({
          status: 'success',
          data: {
            correct: true,
            xpGained,
            newXpTotal: user.xp,
            newLevel: user.level,
            wins: user.wins,
            streak: user.streak,
            gamesPlayed: user.gamesPlayed,
            losses: user.losses || 0,
            rank: rankData ? rankData.rank : null,
            explanation: challenge.explanation
          }
        });
      } catch (error) {
        console.error('Error updating user stats:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Error updating user stats. Please try again.'
        });
      }
    } else {
      // Wrong answer
      if (attemptNumber === 5) {
        // Last attempt - update streak and count loss
        const user = await User.findById(req.user.id);
        
        if (!user) {
          return res.status(404).json({
            status: 'fail',
            message: 'User not found'
          });
        }
        
        user.streak = 0;
        user.losses = (user.losses || 0) + 1;
        user.lastPlayed = new Date();
        
        // Increment games played
        user.gamesPlayed = (user.gamesPlayed || 0) + 1;
        
        try {
          await user.save();
          
          // Update leaderboard with additional stats
          await Leaderboard.updateEntry(user._id, {
            username: user.username,
            xp: user.xp,
            level: user.level,
            wins: user.wins,
            streak: user.streak,
            losses: user.losses || 0,
            gamesPlayed: user.gamesPlayed || 0
          });
          
          return res.status(200).json({
            status: 'success',
            data: {
              correct: false,
              attemptsRemaining: 0,
              gameOver: true,
              hint: challenge.hints[Math.min(attemptNumber - 1, challenge.hints.length - 1)],
              explanation: challenge.explanation
            }
          });
        } catch (error) {
          console.error('Error updating user stats:', error);
          return res.status(500).json({
            status: 'error',
            message: 'Error updating user stats. Please try again.'
          });
        }
      } else {
        // Still has attempts remaining
        return res.status(200).json({
          status: 'success',
          data: {
            correct: false,
            attemptsRemaining: 5 - attemptNumber,
            hint: challenge.hints[Math.min(attemptNumber - 1, challenge.hints.length - 1)]
          }
        });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Leaderboard.getTop(100);
    
    // Get current user's rank if not in top 100
    let userRank = null;
    const userInTop = leaderboard.some(entry => entry.user.toString() === req.user.id);
    
    if (!userInTop) {
      userRank = await Leaderboard.getUserRank(req.user.id);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        leaderboard,
        userRank: userInTop ? null : userRank
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Get user stats
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('username xp level streak lastPlayed languages losses gamesPlayed isAdmin');
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Check if user is admin - either by username or by isAdmin flag
    const isAdmin = user.username === '222ryan' || user.isAdmin === true;
    
    // Debug logging
    console.log(`User: ${user.username}, Is Admin: ${isAdmin}, isAdmin flag: ${user.isAdmin}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: user,
        isAdmin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};

// Admin: Reset a player's last play time
exports.resetPlayerLastPlay = async (req, res) => {
  try {
    // Check if the requesting user is admin
    const admin = await User.findById(req.user.id);
    
    // Allow both username check and isAdmin flag
    if (!admin || (admin.username !== '222ryan' && !admin.isAdmin)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Unauthorized. Admin access required.'
      });
    }
    
    const { playerId } = req.params;
    
    if (!playerId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a player ID'
      });
    }
    
    // Find the player and reset their last play time
    const player = await User.findById(playerId);
    
    if (!player) {
      return res.status(404).json({
        status: 'fail',
        message: 'Player not found'
      });
    }
    
    // Reset player's game state
    player.clearGameState();
    
    // Log the reset action
    console.log(`Admin ${admin.username} is resetting player ${player.username} (${playerId})`);
    
    await player.save();
    
    // Return more detailed information about the reset
    return res.status(200).json({
      status: 'success',
      message: `Successfully reset last play time for ${player.username}`,
      data: {
        playerId: player._id,
        username: player.username,
        lastPlayed: null,
        resetBy: admin.username,
        resetTime: new Date()
      }
    });
  } catch (err) {
    console.error('Error resetting player last play time:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.'
    });
  }
};

// Check if user has completed today's challenge
exports.getDailyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    
    // Check if user has already played today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let completed = false;
    
    if (user.lastPlayed) {
      const lastPlayedDate = new Date(user.lastPlayed);
      lastPlayedDate.setHours(0, 0, 0, 0);
      
      if (lastPlayedDate.getTime() === today.getTime()) {
        completed = true;
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        completed,
        streak: user.streak || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again.'
    });
  }
};