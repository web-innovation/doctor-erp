const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Usage: node server/scripts/set-role.js <userId> <ROLE>
// Example: node server/scripts/set-role.js c5ae92f8-b04f-47d8-9eee-e01a4ddfdd68 ADMIN

async function main() {
  const userId = process.argv[2];
  const role = (process.argv[3] || 'ADMIN').toString().toUpperCase();
  if (!userId) {
    console.error('Usage: node server/scripts/set-role.js <userId> <ROLE>');
    process.exit(1);
  }

  console.log(`Setting role for user ${userId} -> ${role}`);
  const u = await prisma.user.update({ where: { id: userId }, data: { role } });
  console.log('Updated user:', { id: u.id, role: u.role });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
