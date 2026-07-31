const { getDefaultConfig } = require('expo/metro-config'); // or '@react-native/metro-config'

const config = getDefaultConfig(__dirname);

// Configure Metro to transpile problematic node_modules
config.resolver.unstable_enablePackageExports = false; // Optional: toggles package exports if applicable

module.exports = config;