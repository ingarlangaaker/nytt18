// core/db/seed.js — seed initial DB (users, features, geo, empty tables)
const now = () => new Date().toISOString();

export async function ensureSeed(db) {
  const existing = await db.get("db");
  if (existing && existing.schemaVersion) return;

  const seed = {
    schemaVersion: 1,
    createdAt: now(),
    updatedAt: now(),

    meta: {
      appName: "FarmApp Core v1.2",
      farmName: "Min gård",
      geo: {
        countyCode: "",
        countyName: "",
        municipalityCode: "",
        municipalityName: ""
      }
    },

    users: [
      { id: "u1", name: "storbonden", role: "owner", active: true, createdAt: now() },
      { id: "u2", name: "avløser1", role: "worker", active: true, createdAt: now() }
    ],
    activeUserId: "u1",

    features: {
      productionModules: { sau: true, plante: true, storfe: false, fjorfe: false }
    },

    animals: {},
    sheepDetails: {},
    fields: {},
    fieldPlans: {},
    fertilizerPlan: {},
    fertilizerLog: [],
    plantProtectionLog: [],
    workLogs: [],
    events: [],
    trash: { animals: [], events: [], fields: [] }
  };

  await db.set("db", seed);
}
