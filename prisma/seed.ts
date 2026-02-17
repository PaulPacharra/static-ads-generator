import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  { name: "Vitamin D", slug: "Vitamin D Test", shopUrl: null, description: null, kitInfo: null },
  { name: "Schilddrüse", slug: "Schilddrüsen-Test", shopUrl: null, description: null, kitInfo: null },
  { name: "Nahrungsmittelunverträglichkeit", slug: "Nahrungsmittelunverträglichkeit Test", shopUrl: null, description: null, kitInfo: null },
  { name: "Allergie", slug: "Allergie Test", shopUrl: null, description: null, kitInfo: null },
  { name: "Cholesterin", slug: "Cholesterin Test", shopUrl: null, description: null, kitInfo: null },
  { name: "Sonstiger Heimtest", slug: "Heimtest", shopUrl: null, description: null, kitInfo: null },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: p,
      update: { name: p.name },
    });
  }
  console.log("Seed: Products angelegt.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
