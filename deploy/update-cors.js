const fs = require('fs');
const path = require('path');

// Path to server.js
const serverFilePath = path.join(__dirname, '..', 'server.js');

// Read the server.js file
let serverContent = fs.readFileSync(serverFilePath, 'utf8');

// Update CORS configuration
const corsRegex = /app\.use\(cors\(\{[\s\S]*?\}\)\)\);/;
const newCorsConfig = `app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['https://kumoslab.com', 'http://localhost:3000'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all origins for now
  },
  credentials: true
}));`;

// Replace the CORS configuration
serverContent = serverContent.replace(corsRegex, newCorsConfig);

// Write the updated content back to server.js
fs.writeFileSync(serverFilePath, serverContent);

console.log('CORS configuration updated in server.js'); 