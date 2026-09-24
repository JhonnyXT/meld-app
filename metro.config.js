// Config de Metro por defecto de Expo + excluir `landing/` (la web en Next.js,
// proyecto npm aparte con su propio node_modules): sin esto Metro rastrea
// también esos ~400 paquetes al arrancar.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const landingDir = new RegExp(`^${__dirname.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]landing[/\\\\].*`);
config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), landingDir];

module.exports = config;
