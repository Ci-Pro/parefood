// ==========================================
// PareFood Backend — Total.js v5 API Server
// ==========================================

require('dotenv').config();
const TOTAL = require('total.js');

// Load environment configuration
const env = process.env.NODE_ENV || 'development';
require('./config/' + env + '.js');

// Start the framework
TOTAL.http('release');

console.log('==========================================');
console.log('  PareFood Backend — Total.js v5');
console.log('  Environment: ' + env.toUpperCase());
console.log('  Port: ' + CONF.port);
console.log('==========================================');