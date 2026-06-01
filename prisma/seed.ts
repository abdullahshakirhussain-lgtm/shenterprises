import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Sri Lankan districts and major cities (reference data)
const DISTRICTS: Record<string, string[]> = {
  Colombo: ["Colombo", "Dehiwala", "Mount Lavinia", "Moratuwa", "Maharagama", "Kotte", "Kaduwela", "Homagama", "Kollupitiya", "Bambalapitiya", "Nugegoda", "Rajagiriya", "Battaramulla", "Wellawatte", "Borella"],
  Gampaha: ["Gampaha", "Negombo", "Ja-Ela", "Wattala", "Kelaniya", "Kadawatha", "Ragama", "Minuwangoda", "Veyangoda", "Nittambuwa", "Mirigama", "Divulapitiya", "Kiribathgoda"],
  Kalutara: ["Kalutara", "Panadura", "Horana", "Beruwala", "Aluthgama", "Wadduwa", "Matugama", "Bandaragama", "Ingiriya"],
  Kandy: ["Kandy", "Peradeniya", "Katugastota", "Gampola", "Nawalapitiya", "Wattegama", "Pilimathalawa", "Kadugannawa", "Akurana", "Digana"],
  Matale: ["Matale", "Dambulla", "Sigiriya", "Galewela", "Naula", "Ukuwela", "Rattota"],
  "Nuwara Eliya": ["Nuwara Eliya", "Hatton", "Talawakelle", "Ginigathena", "Maskeliya", "Walapane"],
  Galle: ["Galle", "Hikkaduwa", "Ambalangoda", "Karapitiya", "Unawatuna", "Baddegama", "Elpitiya", "Bentota"],
  Matara: ["Matara", "Weligama", "Mirissa", "Akuressa", "Hakmana", "Devinuwara", "Kamburupitiya"],
  Hambantota: ["Hambantota", "Tangalle", "Tissamaharama", "Beliatta", "Ambalantota", "Weeraketiya"],
  Jaffna: ["Jaffna", "Nallur", "Chavakachcheri", "Point Pedro", "Tellippalai", "Kopay"],
  Kilinochchi: ["Kilinochchi", "Pallai", "Paranthan"],
  Mannar: ["Mannar", "Madhu", "Pesalai"],
  Vavuniya: ["Vavuniya", "Nedunkeni", "Cheddikulam"],
  Mullaitivu: ["Mullaitivu", "Puthukkudiyiruppu", "Oddusuddan"],
  Batticaloa: ["Batticaloa", "Kattankudy", "Eravur", "Valaichchenai", "Kaluwanchikudy"],
  Ampara: ["Ampara", "Kalmunai", "Sainthamaruthu", "Akkaraipattu", "Sammanthurai", "Pottuvil"],
  Trincomalee: ["Trincomalee", "Kinniya", "Kantale", "Mutur", "Nilaveli"],
  Kurunegala: ["Kurunegala", "Kuliyapitiya", "Pannala", "Polgahawela", "Mawathagama", "Narammala", "Wariyapola"],
  Puttalam: ["Puttalam", "Chilaw", "Wennappuwa", "Marawila", "Anamaduwa", "Nattandiya"],
  Anuradhapura: ["Anuradhapura", "Kekirawa", "Medawachchiya", "Tambuttegama", "Galenbindunuwewa"],
  Polonnaruwa: ["Polonnaruwa", "Hingurakgoda", "Medirigiriya", "Kaduruwela"],
  Badulla: ["Badulla", "Bandarawela", "Haputale", "Welimada", "Mahiyanganaya", "Ella", "Passara"],
  Monaragala: ["Monaragala", "Wellawaya", "Buttala", "Bibile", "Kataragama"],
  Ratnapura: ["Ratnapura", "Embilipitiya", "Balangoda", "Pelmadulla", "Eheliyagoda", "Kuruwita"],
  Kegalle: ["Kegalle", "Mawanella", "Warakapola", "Rambukkana", "Ruwanwella", "Yatiyantota"]
};

async function main() {
  // Admin user
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash }
  });
  console.log(`✓ Admin user: ${username}`);

  // Districts + cities
  for (const [districtName, cities] of Object.entries(DISTRICTS)) {
    const fee = districtName === "Colombo" ? 300 : districtName === "Gampaha" || districtName === "Kalutara" ? 350 : 450;
    const district = await prisma.district.upsert({
      where: { name: districtName },
      update: {},
      create: { name: districtName, deliveryFee: fee }
    });
    for (const cityName of cities) {
      await prisma.city.upsert({
        where: { name_districtId: { name: cityName, districtId: district.id } },
        update: {},
        create: { name: cityName, districtId: district.id }
      });
    }
  }
  console.log(`✓ Seeded ${Object.keys(DISTRICTS).length} districts`);

  // Categories specific to SH Enterprises
  const cats = [
    { name: "Threads", slug: "threads" },
    { name: "Zippers", slug: "zippers" },
    { name: "Scissors", slug: "scissors" },
    { name: "Elastics", slug: "elastics" },
    { name: "Ribbons", slug: "ribbons" },
    { name: "Buttons", slug: "buttons" },
    { name: "Needles & Pins", slug: "needles-pins" },
    { name: "Lace & Trims", slug: "lace-trims" },
    { name: "Fabric Markers", slug: "fabric-markers" },
    { name: "Tools & Accessories", slug: "tools-accessories" }
  ];
  for (let i = 0; i < cats.length; i++) {
    await prisma.category.upsert({
      where: { slug: cats[i].slug },
      update: {},
      create: { ...cats[i], sortOrder: i }
    });
  }
  console.log(`✓ Seeded ${cats.length} categories`);

  // Default settings
  const defaults: Record<string, string> = {
    bank_name: "Bank of Ceylon",
    bank_account_name: "SH Enterprises",
    bank_account_number: "0000000000",
    bank_branch: "Colombo",
    site_phone: "+94 77 000 0000",
    site_email: "orders@shenterprises.lk",
    site_address: "Colombo, Sri Lanka",
    deepseek_prompt: "Extract product fields from the row. Return JSON with: name, description (1 short sentence), price (number), sku, stock (default 0), category (one of: Threads, Zippers, Scissors, Elastics, Ribbons, Buttons, Needles & Pins, Lace & Trims, Fabric Markers, Tools & Accessories).",
    free_delivery_threshold: "10000",
    account_discount_percent: "5"
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value }
    });
  }
  console.log("✓ Default settings created");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
