// Metro configuration for Expo.
// Replaces import.meta.env references in ESM packages (e.g. zustand devtools)
// so the web bundle runs in classic script mode without errors.
const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Replace import.meta.env with a plain object so zustand devtools middleware
// doesn't crash when bundled as a classic (non-module) web script.
config.transformer = config.transformer || {}
config.transformer.minifierConfig = config.transformer.minifierConfig || {}

// Use a custom serializer to post-process the bundle and replace import.meta.env
const originalSerializer = config.serializer?.customSerializer

// Simple approach: configure the resolver to prefer CJS over ESM for zustand
// so we don't get the import.meta from the .mjs file.
config.resolver = config.resolver || {}
config.resolver.sourceExts = config.resolver.sourceExts || ['js', 'jsx', 'ts', 'tsx', 'json']

// Prefer .js over .mjs to avoid ESM files with import.meta
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (originalResolveRequest) {
    try {
      return originalResolveRequest(context, moduleName, platform)
    } catch {}
  }
  return context.resolveRequest(context, moduleName, platform)
}

// Override field preference: prefer 'main' (CJS) over 'module' (ESM) for web
// This prevents Metro from picking up the .mjs with import.meta
config.resolver.unstable_enablePackageExports = false

module.exports = config
