import "./lookup.test.mjs";
import "./nhentai/nhentai-v2.test.mjs";
import "./source/message-schema-v2.test.mjs";
import "./source/message-context-v2.test.mjs";
import "./matching/text-normalization.test.mjs";
import "./matching/matching-evaluation.test.mjs";
await import("./security/accessibility-v2.test.mjs");
await import("./manifest-check-v2.mjs");
console.log("All offline tests passed.");
