const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create deployment directory
const deployDir = path.join(__dirname, 'package');
if (!fs.existsSync(deployDir)) {
  fs.mkdirSync(deployDir, { recursive: true });
}

// Copy necessary files
const filesToCopy = [
  'server.js',
  'package.json',
  'package-lock.json',
  '.env',
  'routes',
  'models',
  'controllers',
  'middleware',
  'scripts'
];

// Copy each file/directory
filesToCopy.forEach(file => {
  const sourcePath = path.join(__dirname, '..', file);
  const destPath = path.join(deployDir, file);
  
  if (fs.existsSync(sourcePath)) {
    if (fs.lstatSync(sourcePath).isDirectory()) {
      // Copy directory
      execSync(`cp -r "${sourcePath}" "${destPath}"`);
      console.log(`Copied directory: ${file}`);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied file: ${file}`);
    }
  } else {
    console.log(`Warning: ${file} does not exist and was not copied`);
  }
});

// Copy deployment files
const deploymentFiles = [
  'setup.sh',
  'README.md',
  '.env'
];

deploymentFiles.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  const destPath = path.join(deployDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied deployment file: ${file}`);
  } else {
    console.log(`Warning: ${file} does not exist and was not copied`);
  }
});

// Update CORS in server.js
const serverFilePath = path.join(deployDir, 'server.js');
if (fs.existsSync(serverFilePath)) {
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
  console.log('Updated CORS configuration in server.js');
}

console.log('\nDeployment package prepared successfully!');
console.log(`Files are ready in: ${deployDir}`);
console.log('\nNext steps:');
console.log('1. Upload the contents of the package directory to your VPS');
console.log('2. Connect to your VPS via SSH');
console.log('3. Navigate to the uploaded directory');
console.log('4. Make the setup script executable: chmod +x setup.sh');
console.log('5. Run the setup script: sudo ./setup.sh'); 