import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 12;
const COUNT = 70;

// Prénoms contenant tous la sous-chaîne "al" (garantit displayName ⊇ "al").
const FIRST_NAMES = [
  'Malik', 'Alicia', 'Valentin', 'Salma', 'Talia', 'Kamal', 'Natalia', 'Alan', 'Malo', 'Salim',
  'Aliyah', 'Amalia', 'Salomé', 'Alex', 'Alexia', 'Malak', 'Salah', 'Katalin', 'Baltazar', 'Calvin',
  'Halima', 'Salvador', 'Walid', 'Talal', 'Khalid', 'Malia', 'Alba', 'Salamatou', 'Kalinda', 'Malaïka',
];

const LAST_NAMES = [
  'Martin', 'Dubois', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Leroy', 'Moreau', 'Simon',
  'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fontaine',
  'Chevalier', 'Rousseau', 'Blanc', 'Guerin', 'Boyer', 'Muller', 'Henry', 'Nicolas', 'Perrin', 'Morin',
];

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Test1234!', BCRYPT_SALT_ROUNDS);
  const users = [];
  for (let i = 0; i < COUNT; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const suffix = i + 1;
    users.push({
      email: `${slugify(first)}.${slugify(last)}.${suffix}@example.com`,
      username: `${slugify(first)}${slugify(last)}${suffix}`,
      displayName: `${first} ${last}`,
      passwordHash,
    });
  }

  const result = await prisma.user.createMany({ data: users, skipDuplicates: true });
  console.log(`Créés : ${result.count} utilisateurs (sur ${COUNT} demandés).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
