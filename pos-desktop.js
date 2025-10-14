#!/usr/bin/env node
const path = require('path');
// Entry wrapper expected by electron-builder. It forwards to the real Electron main
// located in backend/src/electron-main.js so the packager includes the correct code.
const entry = path.join(__dirname, 'backend', 'src', 'electron-main.js');
require(entry);
