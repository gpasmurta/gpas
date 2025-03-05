/**
 * Code Cleanup Script
 * 
 * This script identifies and removes unused code from the project.
 * Run with: node cleanup.js
 */

import fs from 'fs';
import path from 'path';

// Files to be completely removed
const filesToRemove = [
  'src/components/TimeBlocking.tsx',
  'src/components/Timeline.tsx'
];

// Remove unused files
console.log('Removing unused files...');
filesToRemove.forEach(file => {
  try {
    fs.unlinkSync(file);
    console.log(`✓ Removed: ${file}`);
  } catch (err) {
    console.error(`✗ Error removing ${file}: ${err.message}`);
  }
});

console.log('\nCleanup complete! The following files were removed:');
filesToRemove.forEach(file => console.log(`- ${file}`));

console.log('\nManual cleanup required:');
console.log('1. Remove unused imports from files (see report)');
console.log('2. Extract timer logic into a custom hook');
console.log('3. Consolidate duplicate utility functions');