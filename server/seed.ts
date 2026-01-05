import { db } from "./db";
import { militaryBranches, militaryRanks } from "../shared/schema";

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Seed Military Branches
    console.log("📋 Seeding military branches...");
    const branches = await db
      .insert(militaryBranches)
      .values([
        {
          branchCode: "AD",
          branchName: "TNI AD",
          branchFullName: "Tentara Nasional Indonesia Angkatan Darat",
          description: "Indonesian Army",
          isActive: true,
        },
        {
          branchCode: "AU",
          branchName: "TNI AU",
          branchFullName: "Tentara Nasional Indonesia Angkatan Udara",
          description: "Indonesian Air Force",
          isActive: true,
        },
        {
          branchCode: "AL",
          branchName: "TNI AL",
          branchFullName: "Tentara Nasional Indonesia Angkatan Laut",
          description: "Indonesian Navy",
          isActive: true,
        },
        {
          branchCode: "POLRI",
          branchName: "POLRI",
          branchFullName: "Kepolisian Negara Republik Indonesia",
          description: "Indonesian National Police",
          isActive: true,
        },
      ])
      .onConflictDoNothing()
      .returning();
    console.log(`✅ Inserted ${branches.length} military branches`);

    // Seed Military Ranks for TNI AD (Army)
    console.log("🎖️  Seeding TNI AD ranks...");
    const adRanks = await db
      .insert(militaryRanks)
      .values([
        // Enlisted ranks
        { rankCode: "PRADA", rankName: "Prajurit Dua", branch: "TNI AD", level: 1, isOfficer: false },
        { rankCode: "PRATU", rankName: "Prajurit Satu", branch: "TNI AD", level: 2, isOfficer: false },
        { rankCode: "PRAKA", rankName: "Prajurit Kepala", branch: "TNI AD", level: 3, isOfficer: false },
        { rankCode: "KOPDA", rankName: "Kopral Dua", branch: "TNI AD", level: 4, isOfficer: false },
        { rankCode: "KOPTU", rankName: "Kopral Satu", branch: "TNI AD", level: 5, isOfficer: false },
        { rankCode: "KOPKA", rankName: "Kopral Kepala", branch: "TNI AD", level: 6, isOfficer: false },
        { rankCode: "SERDA", rankName: "Sersan Dua", branch: "TNI AD", level: 7, isOfficer: false },
        { rankCode: "SERTU", rankName: "Sersan Satu", branch: "TNI AD", level: 8, isOfficer: false },
        { rankCode: "SERKA", rankName: "Sersan Kepala", branch: "TNI AD", level: 9, isOfficer: false },
        { rankCode: "SERMA", rankName: "Sersan Mayor", branch: "TNI AD", level: 10, isOfficer: false },
        // Officer ranks
        { rankCode: "LETDA", rankName: "Letnan Dua", branch: "TNI AD", level: 11, isOfficer: true },
        { rankCode: "LETTU", rankName: "Letnan Satu", branch: "TNI AD", level: 12, isOfficer: true },
        { rankCode: "KAPTEN", rankName: "Kapten", branch: "TNI AD", level: 13, isOfficer: true },
        { rankCode: "MAYOR", rankName: "Mayor", branch: "TNI AD", level: 14, isOfficer: true },
        { rankCode: "LETKOL", rankName: "Letnan Kolonel", branch: "TNI AD", level: 15, isOfficer: true },
        { rankCode: "KOLONEL", rankName: "Kolonel", branch: "TNI AD", level: 16, isOfficer: true },
        { rankCode: "BRIGJEN", rankName: "Brigadir Jenderal", branch: "TNI AD", level: 17, isOfficer: true },
        { rankCode: "MAYJEN", rankName: "Mayor Jenderal", branch: "TNI AD", level: 18, isOfficer: true },
        { rankCode: "LETJEN", rankName: "Letnan Jenderal", branch: "TNI AD", level: 19, isOfficer: true },
        { rankCode: "JENDERAL", rankName: "Jenderal", branch: "TNI AD", level: 20, isOfficer: true },
      ])
      .onConflictDoNothing()
      .returning();
    console.log(`✅ Inserted ${adRanks.length} TNI AD ranks`);

    // Seed Military Ranks for TNI AU (Air Force)
    console.log("✈️  Seeding TNI AU ranks...");
    const auRanks = await db
      .insert(militaryRanks)
      .values([
        // Enlisted ranks
        { rankCode: "PRADA_AU", rankName: "Prajurit Dua", branch: "TNI AU", level: 1, isOfficer: false },
        { rankCode: "PRATU_AU", rankName: "Prajurit Satu", branch: "TNI AU", level: 2, isOfficer: false },
        { rankCode: "PRAKA_AU", rankName: "Prajurit Kepala", branch: "TNI AU", level: 3, isOfficer: false },
        { rankCode: "KOPDA_AU", rankName: "Kopral Dua", branch: "TNI AU", level: 4, isOfficer: false },
        { rankCode: "KOPTU_AU", rankName: "Kopral Satu", branch: "TNI AU", level: 5, isOfficer: false },
        { rankCode: "KOPKA_AU", rankName: "Kopral Kepala", branch: "TNI AU", level: 6, isOfficer: false },
        { rankCode: "SERDA_AU", rankName: "Sersan Dua", branch: "TNI AU", level: 7, isOfficer: false },
        { rankCode: "SERTU_AU", rankName: "Sersan Satu", branch: "TNI AU", level: 8, isOfficer: false },
        { rankCode: "SERKA_AU", rankName: "Sersan Kepala", branch: "TNI AU", level: 9, isOfficer: false },
        { rankCode: "SERMA_AU", rankName: "Sersan Mayor", branch: "TNI AU", level: 10, isOfficer: false },
        // Officer ranks
        { rankCode: "LETDA_AU", rankName: "Letnan Dua", branch: "TNI AU", level: 11, isOfficer: true },
        { rankCode: "LETTU_AU", rankName: "Letnan Satu", branch: "TNI AU", level: 12, isOfficer: true },
        { rankCode: "KAPTEN_AU", rankName: "Kapten", branch: "TNI AU", level: 13, isOfficer: true },
        { rankCode: "MAYOR_AU", rankName: "Mayor", branch: "TNI AU", level: 14, isOfficer: true },
        { rankCode: "LETKOL_AU", rankName: "Letnan Kolonel", branch: "TNI AU", level: 15, isOfficer: true },
        { rankCode: "KOLONEL_AU", rankName: "Kolonel", branch: "TNI AU", level: 16, isOfficer: true },
        { rankCode: "MARSDA", rankName: "Marsekal Muda", branch: "TNI AU", level: 17, isOfficer: true },
        { rankCode: "MARSMA", rankName: "Marsekal Madya", branch: "TNI AU", level: 18, isOfficer: true },
        { rankCode: "MARSDYA", rankName: "Marsekal", branch: "TNI AU", level: 19, isOfficer: true },
        { rankCode: "MARSBES", rankName: "Marsekal Besar", branch: "TNI AU", level: 20, isOfficer: true },
      ])
      .onConflictDoNothing()
      .returning();
    console.log(`✅ Inserted ${auRanks.length} TNI AU ranks`);

    // Seed Military Ranks for TNI AL (Navy)
    console.log("⚓ Seeding TNI AL ranks...");
    const alRanks = await db
      .insert(militaryRanks)
      .values([
        // Enlisted ranks
        { rankCode: "KELDA", rankName: "Kelasi Dua", branch: "TNI AL", level: 1, isOfficer: false },
        { rankCode: "KELTU", rankName: "Kelasi Satu", branch: "TNI AL", level: 2, isOfficer: false },
        { rankCode: "KELKA", rankName: "Kelasi Kepala", branch: "TNI AL", level: 3, isOfficer: false },
        { rankCode: "KOPDA_AL", rankName: "Kopral Dua", branch: "TNI AL", level: 4, isOfficer: false },
        { rankCode: "KOPTU_AL", rankName: "Kopral Satu", branch: "TNI AL", level: 5, isOfficer: false },
        { rankCode: "KOPKA_AL", rankName: "Kopral Kepala", branch: "TNI AL", level: 6, isOfficer: false },
        { rankCode: "SERDA_AL", rankName: "Sersan Dua", branch: "TNI AL", level: 7, isOfficer: false },
        { rankCode: "SERTU_AL", rankName: "Sersan Satu", branch: "TNI AL", level: 8, isOfficer: false },
        { rankCode: "SERKA_AL", rankName: "Sersan Kepala", branch: "TNI AL", level: 9, isOfficer: false },
        { rankCode: "SERMA_AL", rankName: "Sersan Mayor", branch: "TNI AL", level: 10, isOfficer: false },
        // Officer ranks
        { rankCode: "LETDA_AL", rankName: "Letnan Dua", branch: "TNI AL", level: 11, isOfficer: true },
        { rankCode: "LETTU_AL", rankName: "Letnan Satu", branch: "TNI AL", level: 12, isOfficer: true },
        { rankCode: "KAPTEN_AL", rankName: "Kapten", branch: "TNI AL", level: 13, isOfficer: true },
        { rankCode: "MAYOR_AL", rankName: "Mayor", branch: "TNI AL", level: 14, isOfficer: true },
        { rankCode: "LETKOL_AL", rankName: "Letnan Kolonel", branch: "TNI AL", level: 15, isOfficer: true },
        { rankCode: "KOLONEL_AL", rankName: "Kolonel", branch: "TNI AL", level: 16, isOfficer: true },
        { rankCode: "LAKSDA", rankName: "Laksamana Muda", branch: "TNI AL", level: 17, isOfficer: true },
        { rankCode: "LAKSMA", rankName: "Laksamana Madya", branch: "TNI AL", level: 18, isOfficer: true },
        { rankCode: "LAKSDYA", rankName: "Laksamana", branch: "TNI AL", level: 19, isOfficer: true },
        { rankCode: "LAKSBES", rankName: "Laksamana Besar", branch: "TNI AL", level: 20, isOfficer: true },
      ])
      .onConflictDoNothing()
      .returning();
    console.log(`✅ Inserted ${alRanks.length} TNI AL ranks`);

    // Seed Military Ranks for POLRI (Police)
    console.log("👮 Seeding POLRI ranks...");
    const polriRanks = await db
      .insert(militaryRanks)
      .values([
        // Enlisted ranks
        { rankCode: "BHARADA", rankName: "Bharada", branch: "POLRI", level: 1, isOfficer: false },
        { rankCode: "BHARATU", rankName: "Bharatu", branch: "POLRI", level: 2, isOfficer: false },
        { rankCode: "BRIPKA", rankName: "Bripka", branch: "POLRI", level: 3, isOfficer: false },
        { rankCode: "BRIPDA", rankName: "Bripda", branch: "POLRI", level: 4, isOfficer: false },
        { rankCode: "BRIPTU", rankName: "Briptu", branch: "POLRI", level: 5, isOfficer: false },
        { rankCode: "AIPDA", rankName: "Aipda", branch: "POLRI", level: 6, isOfficer: false },
        { rankCode: "AIPTU", rankName: "Aiptu", branch: "POLRI", level: 7, isOfficer: false },
        { rankCode: "IPDA", rankName: "Ipda", branch: "POLRI", level: 8, isOfficer: false },
        { rankCode: "IPTU", rankName: "Iptu", branch: "POLRI", level: 9, isOfficer: false },
        // Officer ranks
        { rankCode: "AKP", rankName: "AKP", branch: "POLRI", level: 10, isOfficer: true },
        { rankCode: "KOMPOL", rankName: "Kompol", branch: "POLRI", level: 11, isOfficer: true },
        { rankCode: "AKBP", rankName: "AKBP", branch: "POLRI", level: 12, isOfficer: true },
        { rankCode: "KOMBES", rankName: "Kombes", branch: "POLRI", level: 13, isOfficer: true },
        { rankCode: "BRIGJEN", rankName: "Brigadir Jenderal Polisi", branch: "POLRI", level: 14, isOfficer: true },
        { rankCode: "IRJEN", rankName: "Inspektur Jenderal Polisi", branch: "POLRI", level: 15, isOfficer: true },
        { rankCode: "KOMJEN", rankName: "Komisaris Jenderal Polisi", branch: "POLRI", level: 16, isOfficer: true },
        { rankCode: "KAPOLRI", rankName: "Kepala Kepolisian Negara RI", branch: "POLRI", level: 17, isOfficer: true },
      ])
      .onConflictDoNothing()
      .returning();
    console.log(`✅ Inserted ${polriRanks.length} POLRI ranks`);

    console.log("✨ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("🎉 Seeding finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });
