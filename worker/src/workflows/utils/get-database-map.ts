// Unused, I think? To delete.

// import type { Databases } from "@/durable-objects/account-do";

// export const getDatabaseMap = (databaseIds: Databases) => {
//   // Build database IDs mapping for coordinated upsert
//   const databaseIdsMap: Record<string, string | undefined> = {};
//   Object.entries(databaseIds).forEach(([key, value]) => {
//     if (value?.pageId) {
//       databaseIdsMap[key] = value.pageId;
//     }
//   });

//   return databaseIdsMap;
// };
