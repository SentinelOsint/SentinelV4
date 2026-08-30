const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const isReviewerBuild = appJson?.expo?.extra?.isReviewerBuild;

if (isReviewerBuild === true) {
  console.error('\n🚨 BUILD BLOCKED: isReviewerBuild is set to TRUE in app.json.');
  console.error('This flag grants free Pro access to all users and must NEVER be true in a production build.');
  console.error('Fix: set "isReviewerBuild": false in app.json before building.\n');
  process.exit(1);
}

console.log('✅ Pre-build check passed: isReviewerBuild is false.');
