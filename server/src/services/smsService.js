import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logger } from '../config/logger.js';

const AWS_SMS_ENABLED = process.env.AWS_SMS_ENABLED === 'true';
const SMS_SANDBOX = process.env.SMS_SANDBOX === 'true';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'DOCCLINIC';

let snsClient;
if (AWS_SMS_ENABLED && !SMS_SANDBOX) {
  snsClient = new SNSClient({ region: AWS_REGION });
}

export async function sendSms(mobile, message, opts = {}){
  // mobile should be in E.164 format
  if(!mobile || !message) throw new Error('mobile and message required');

  // Sandbox mode: just log and return
  if(!AWS_SMS_ENABLED || SMS_SANDBOX){
    logger.info(`[SMS][MOCK] To: ${mobile} Message: ${message}`);
    return { mock: true };
  }

  try{
    const params = {
      PhoneNumber: mobile,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: SMS_SENDER_ID },
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: opts.type || 'Transactional' }
      }
    };

    const cmd = new PublishCommand(params);
    const res = await snsClient.send(cmd);
    logger.info(`[SMS] Sent to ${mobile} MessageId=${res.MessageId}`);
    return res;
  }catch(err){
    logger.error('Failed to send SMS', err);
    throw err;
  }
}
