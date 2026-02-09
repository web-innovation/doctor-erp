import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { handleMessage } from './handlers/messageHandler.js';
import { logger } from './services/logger.js';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR Code for WhatsApp Web login
client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  logger.info('✅ DocClinic WhatsApp Bot is ready!');
  console.log('\n🤖 DocClinic WhatsApp Bot is ready!');
  console.log('=====================================');
  console.log('Commands:');
  console.log('  /help - Show all commands');
  console.log('  /book - Book appointment');
  console.log('  /status - Check appointment');
  console.log('  /staff - Staff management');
  console.log('=====================================\n');
});

client.on('authenticated', () => {
  logger.info('WhatsApp authenticated');
});

client.on('auth_failure', (msg) => {
  logger.error('WhatsApp auth failure:', msg);
});

client.on('disconnected', (reason) => {
  logger.warn('WhatsApp disconnected:', reason);
});

// Message handler
client.on('message', async (message) => {
  try {
    await handleMessage(client, message);
  } catch (error) {
    logger.error('Error handling message:', error);
    await message.reply('❌ Sorry, something went wrong. Please try again.');
  }
});

// Start the bot
client.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await client.destroy();
  process.exit(0);
});

export { client, MessageMedia };
