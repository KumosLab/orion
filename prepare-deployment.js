const fs = require('fs');
const path = require('path');

// Function to copy directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // Copy each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy directory
      copyDir(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create deployment directory
const deployDir = path.join(__dirname, 'package');
if (!fs.existsSync(deployDir)) {
  fs.mkdirSync(deployDir, { recursive: true });
}

// Copy server.js
try {
  const serverSrc = path.join(__dirname, '..', 'server.js');
  const serverDest = path.join(deployDir, 'server.js');
  if (fs.existsSync(serverSrc)) {
    fs.copyFileSync(serverSrc, serverDest);
    console.log('Copied server.js');
  }
} catch (err) {
  console.error('Error copying server.js:', err);
}

// Copy package.json
try {
  const pkgSrc = path.join(__dirname, '..', 'package.json');
  const pkgDest = path.join(deployDir, 'package.json');
  if (fs.existsSync(pkgSrc)) {
    fs.copyFileSync(pkgSrc, pkgDest);
    console.log('Copied package.json');
  }
} catch (err) {
  console.error('Error copying package.json:', err);
}

// Copy setup.sh
try {
  const setupSrc = path.join(__dirname, 'setup.sh');
  const setupDest = path.join(deployDir, 'setup.sh');
  if (fs.existsSync(setupSrc)) {
    fs.copyFileSync(setupSrc, setupDest);
    console.log('Copied setup.sh');
  }
} catch (err) {
  console.error('Error copying setup.sh:', err);
}

// Copy .env
try {
  const envSrc = path.join(__dirname, '.env');
  const envDest = path.join(deployDir, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, envDest);
    console.log('Copied .env');
  }
} catch (err) {
  console.error('Error copying .env:', err);
}

// Copy README.md
try {
  const readmeSrc = path.join(__dirname, 'README.md');
  const readmeDest = path.join(deployDir, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, readmeDest);
    console.log('Copied README.md');
  }
} catch (err) {
  console.error('Error copying README.md:', err);
}

// Copy directories
const dirsToCopy = ['routes', 'models', 'controllers', 'middleware', 'scripts'];

dirsToCopy.forEach(dir => {
  try {
    const dirSrc = path.join(__dirname, '..', dir);
    const dirDest = path.join(deployDir, dir);
    if (fs.existsSync(dirSrc)) {
      copyDir(dirSrc, dirDest);
      console.log(`Copied directory: ${dir}`);
    } else {
      console.log(`Warning: ${dir} does not exist and was not copied`);
    }
  } catch (err) {
    console.error(`Error copying ${dir}:`, err);
  }
});

// Update CORS in server.js
try {
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
} catch (err) {
  console.error('Error updating CORS configuration:', err);
}

console.log('\nDeployment package prepared successfully!');
console.log(`Files are ready in: ${deployDir}`);
console.log('\nNext steps:');
console.log('1. Upload the contents of the package directory to your VPS');
console.log('2. Connect to your VPS via SSH');
console.log('3. Navigate to the uploaded directory');
console.log('4. Make the setup script executable: chmod +x setup.sh');
console.log('5. Run the setup script: sudo ./setup.sh'); 