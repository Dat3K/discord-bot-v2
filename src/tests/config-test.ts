import config from '../config';

// Test configuration loading
console.log('=== Configuration Test ===');
console.log('\nEnvironment Variables:');
console.log('BOT_TOKEN:', config.env.BOT_TOKEN ? '✅ Loaded (hidden for security)' : '❌ Missing');
console.log('CLIENT_ID:', config.env.CLIENT_ID ? '✅ Loaded' : '❌ Missing');
console.log('GUILD_ID:', config.env.GUILD_ID ? '✅ Loaded' : '❌ Missing');
console.log('TZ:', config.env.TZ ? `✅ Loaded (${config.env.TZ})` : '❌ Missing');
console.log('LOG_LEVEL:', config.env.LOG_LEVEL ? `✅ Loaded (${config.env.LOG_LEVEL})` : '❌ Missing');
console.log('TEST_LOG_CHANNEL_ID:', config.env.TEST_LOG_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');
console.log('MEAL_REMINDER_CHANNEL_ID:', config.env.MEAL_REMINDER_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');
console.log('MEAL_REGISTRATION_CHANNEL_ID:', config.env.MEAL_REGISTRATION_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');
console.log('MEAL_REGISTRATION_LOG_CHANNEL_ID:', config.env.MEAL_REGISTRATION_LOG_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');
console.log('LATE_MEAL_REGISTRATION_CHANNEL_ID:', config.env.LATE_MEAL_REGISTRATION_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');
console.log('LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID:', config.env.LATE_MEAL_REGISTRATION_LOG_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');
console.log('TRACKED_ROLE_ID:', config.env.TRACKED_ROLE_ID ? '✅ Loaded' : '❌ Missing');
console.log('NODE_ENV:', config.env.NODE_ENV ? `✅ Loaded (${config.env.NODE_ENV})` : '❌ Missing');
console.log('ERROR_NOTIFICATION_CHANNEL_ID:', config.env.ERROR_NOTIFICATION_CHANNEL_ID ? '✅ Loaded' : '❌ Missing');

console.log('\nJSON Configuration:');
console.log('Bot Name:', config.json.bot.name ? `✅ Loaded (${config.json.bot.name})` : '❌ Missing');
console.log('Bot Version:', config.json.bot.version ? `✅ Loaded (${config.json.bot.version})` : '❌ Missing');
console.log('Messages:', Object.keys(config.json.messages).length ? `✅ Loaded (${Object.keys(config.json.messages).length} message types)` : '❌ Missing');
console.log('Emojis:', Object.keys(config.json.emojis).length ? `✅ Loaded (${Object.keys(config.json.emojis).length} emojis)` : '❌ Missing');
console.log('Database Filename:', config.json.database.filename ? `✅ Loaded (${config.json.database.filename})` : '❌ Missing');
console.log('Timing Configuration:', config.json.timing ? '✅ Loaded' : '❌ Missing');

console.log('\nDevelopment Mode:', config.isDevelopment ? '✅ Enabled' : '❌ Disabled');

console.log('\n=== Configuration Test Complete ===');
