#!/usr/bin/env node
/**
 * Simple script to check recent EmailLog entries for a recipient.
 * Usage: node scripts/check_email_logs.js user@example.com
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(){
  const email = process.argv[2];
  if(!email){
    console.error('Usage: node scripts/check_email_logs.js user@example.com');
    process.exit(1);
  }

  const logs = await prisma.emailLog.findMany({
    where: { recipientEmail: email },
    orderBy: { sentAt: 'desc' },
    take: 20,
  });

  if(!logs || logs.length === 0){
    console.log('No email log entries found for', email);
    process.exit(0);
  }

  console.log(`Found ${logs.length} entries for ${email}:`);
  for(const l of logs){
    console.log(`- [${l.sentAt.toISOString()}] type=${l.type} status=${l.status} messageId=${l.messageId || 'n/a'} error=${l.error || ''}`);
  }
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(2); });
