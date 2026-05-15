/**
 * Maps item_id prefixes to ShapeNetSem OBJ model paths under /public/models/.
 * Numeric suffix (_01, _02 …) cycles through the available models for that category.
 * Falls back to null if no mapping exists → TruckViewer renders a colored box instead.
 */

export interface FurnitureOption {
  prefix: string;
  label: string;
}

export interface FurnitureGroup {
  folder: string;
  categoryLabel: string;
  items: FurnitureOption[];
}

/** Furniture types grouped by category — used by ManifestForm dropdown. */
export const FURNITURE_OPTIONS: FurnitureGroup[] = [
  {
    folder: "Bed",
    categoryLabel: "Beds",
    items: [
      { prefix: "bed",      label: "Bed"      },
      { prefix: "bunk_bed", label: "Bunk Bed" },
    ],
  },
  {
    folder: "Bookshelf",
    categoryLabel: "Bookshelves",
    items: [
      { prefix: "bookshelf", label: "Bookshelf"     },
      { prefix: "bookcase",  label: "Bookcase"      },
      { prefix: "shelf",     label: "Shelf"         },
      { prefix: "shelving",  label: "Shelving Unit" },
    ],
  },
  {
    folder: "Chair",
    categoryLabel: "Chairs",
    items: [
      { prefix: "chair", label: "Chair" },
    ],
  },
  {
    folder: "Desk",
    categoryLabel: "Desks",
    items: [
      { prefix: "desk",        label: "Desk"         },
      { prefix: "writing_desk",label: "Writing Desk" },
    ],
  },
  {
    folder: "Refrigerator",
    categoryLabel: "Refrigerators",
    items: [
      { prefix: "refrigerator", label: "Refrigerator" },
      { prefix: "fridge",       label: "Fridge"       },
    ],
  },
  {
    folder: "Sofa_Couch",
    categoryLabel: "Sofas & Couches",
    items: [
      { prefix: "sofa",      label: "Sofa"      },
      { prefix: "couch",     label: "Couch"     },
      { prefix: "loveseat",  label: "Loveseat"  },
      { prefix: "sectional", label: "Sectional" },
    ],
  },
  {
    folder: "Table",
    categoryLabel: "Tables",
    items: [
      { prefix: "table",        label: "Table"        },
      { prefix: "dining_table", label: "Dining Table" },
      { prefix: "coffee_table", label: "Coffee Table" },
      { prefix: "end_table",    label: "End Table"    },
      { prefix: "side_table",   label: "Side Table"   },
    ],
  },
  {
    folder: "Wardrobe_Cabinet",
    categoryLabel: "Wardrobes & Cabinets",
    items: [
      { prefix: "wardrobe",  label: "Wardrobe"  },
      { prefix: "cabinet",   label: "Cabinet"   },
      { prefix: "dresser",   label: "Dresser"   },
      { prefix: "sideboard", label: "Sideboard" },
      { prefix: "armoire",   label: "Armoire"   },
    ],
  },
];

/** Default dimensions (mm), weight, and orientation per prefix — auto-fills AddItemForm. */
export const FURNITURE_DEFAULTS: Record<
  string,
  { w: number; l: number; h: number; weight_kg: number; side_up: boolean; fragile?: boolean }
> = {
  bed:           { w: 1600, l: 2000, h: 500,  weight_kg: 60,  side_up: false },
  bunk_bed:      { w: 1000, l: 2000, h: 1700, weight_kg: 80,  side_up: true  },
  bookshelf:     { w: 800,  l: 300,  h: 1800, weight_kg: 30,  side_up: true  },
  bookcase:      { w: 900,  l: 350,  h: 1800, weight_kg: 35,  side_up: true  },
  shelf:         { w: 800,  l: 300,  h: 1800, weight_kg: 25,  side_up: true  },
  shelving:      { w: 1200, l: 400,  h: 1800, weight_kg: 40,  side_up: true  },
  chair:         { w: 550,  l: 550,  h: 900,  weight_kg: 8,   side_up: false },
  desk:          { w: 1200, l: 600,  h: 750,  weight_kg: 40,  side_up: false },
  writing_desk:  { w: 1000, l: 500,  h: 750,  weight_kg: 30,  side_up: false },
  refrigerator:  { w: 700,  l: 700,  h: 1800, weight_kg: 80,  side_up: true,  fragile: true },
  fridge:        { w: 600,  l: 650,  h: 1700, weight_kg: 70,  side_up: true,  fragile: true },
  sofa:          { w: 2000, l: 900,  h: 850,  weight_kg: 80,  side_up: false },
  couch:         { w: 1800, l: 850,  h: 800,  weight_kg: 70,  side_up: false },
  loveseat:      { w: 1400, l: 850,  h: 800,  weight_kg: 60,  side_up: false },
  sectional:     { w: 2500, l: 1000, h: 850,  weight_kg: 120, side_up: false },
  table:         { w: 1200, l: 800,  h: 750,  weight_kg: 35,  side_up: false },
  dining_table:  { w: 1500, l: 900,  h: 750,  weight_kg: 50,  side_up: false },
  coffee_table:  { w: 1200, l: 600,  h: 450,  weight_kg: 20,  side_up: false },
  end_table:     { w: 500,  l: 500,  h: 550,  weight_kg: 10,  side_up: false },
  side_table:    { w: 500,  l: 500,  h: 600,  weight_kg: 12,  side_up: false },
  wardrobe:      { w: 1200, l: 600,  h: 1800, weight_kg: 90,  side_up: true  },
  cabinet:       { w: 900,  l: 450,  h: 1800, weight_kg: 70,  side_up: true  },
  dresser:       { w: 1000, l: 500,  h: 900,  weight_kg: 60,  side_up: true  },
  sideboard:     { w: 1500, l: 450,  h: 800,  weight_kg: 80,  side_up: false },
  armoire:       { w: 1200, l: 650,  h: 1900, weight_kg: 100, side_up: true  },
};

export type AxisUp = "y" | "z" | "-z" | "x" | "auto";

/**
 * Per-prefix catalog — each key maps to an exclusive, non-overlapping subset of
 * model IDs from the physical folder named by the same key (or CATALOG_FOLDER_MAP[key]).
 * Splitting by prefix prevents semantic mismatch (e.g., a "Sofa" picker showing
 * a "Sectional" variant) without requiring any file copies.
 */
const CATALOG: Record<string, string[]> = {
  // ── Beds ──────────────────────────────────────────────────────────────────
  Bed: [
    "11b722334fe272e2b7802e8eb74a6704",
    "189064a8df83ddc77a89a0a7fbbe0a6f",
    "12a73cdd42517d8f65331068961955c9",
    "1101146651cd32a1bd09c0f277d16187",
  ],
  Bunk_Bed: [
    "16b4dfae678239a42d470147ee1bb468",
  ],

  // ── Bookshelves ────────────────────────────────────────────────────────────
  Bookshelf: [
    "10eb10fe18126d45b97ad864945165a1",
  ],
  Bookcase: [
    "1741b6cc1f7ee1ec110c9032b6ff923d",
  ],
  Shelf: [
    "144adb2c599ab09698d5fc0473d00a1c",
    "151916d8cacda1691c352d02061b3f7",
  ],
  Shelving: [
    "1ab8202a944a6ff1de650492e45fb14f",
  ],

  // ── Chairs ────────────────────────────────────────────────────────────────
  Chair: [
    "1022fe7dd03f6a4d4d5ad9f13ac9f4e7",
    "1033ee86cc8bac4390962e4fb7072b86",
    "10d174a00639990492d9da2668ec34c",
  ],

  // ── Desks ─────────────────────────────────────────────────────────────────
  Desk: [
    "1077080c3c8c6c71bf4af39142c10db1",
    "1359d27a3d2dd1e6616b1821375380fe",
    "142f1bd1987ce39e35836c728d324152",
  ],
  Writing_Desk: [
    "1438cbb6c92e0b061c19e7863a1c200b",
    "15290e3d21f429372af07afc7a68d50",
  ],

  // ── Refrigerators ─────────────────────────────────────────────────────────
  Refrigerator: [
    "1452b2edf9ad18b48d481397d30db1b6",
    "15693e248e4950ba1271f7dd4fba29a",
  ],
  Fridge: [
    "17c4dd8191c2c898bf37a318b55c6a3c",
    "225905a8841620d7f6fe1e625c287cfa",
  ],

  // ── Sofas & Couches ────────────────────────────────────────────────────────
  Sofa: [
    "100f39dce7690f59efb94709f30ce0d2",
    "11d5e99e8faa10ff3564590844406360",
  ],
  Couch: [
    "10de9af4e91682851e5f7bff98fb8d02",
  ],
  Loveseat: [
    "107637b6bdf8129d4904d89e9169817b",
  ],
  Sectional: [
    "10507ae95f984daccd8f3fe9ca2145e1",
    "12f4d8c20ef311d988dcbe86402c7c15",
  ],

  // ── Tables ────────────────────────────────────────────────────────────────
  Table: [
    "104221f8a5b6676aa1dda33d5a7c8c38",
  ],
  Dining_Table: [
    "12df0535bb43633abdd9b7a602ec35ec",
  ],
  Coffee_Table: [
    "12193ca7bef40d40a84aed1cd93567b2",
  ],
  End_Table: [
    "1223b9275d2a2edacd4833986a6efe96",
  ],
  Side_Table: [
    "12df0535bb43633abdd9b7a602ec35ec",
  ],

  // ── Wardrobes & Cabinets ───────────────────────────────────────────────────
  Wardrobe: [
    "12c3a4561242a6fe840045f49392aafa",
  ],
  Cabinet: [
    "13f565d814bd5647adcda92177beb1f7",
  ],
  Dresser: [
    "13dbeeacdabce3b694658a0201ba0367",
  ],
  Sideboard: [
    "12f1e4964078850cc7113d9e058b9db7",
  ],
  Armoire: [
    "1447b7ce0e27481efccbc35ad248e812",
  ],
};

/** Model ID → short human-readable label shown in the variant picker. */
const CATALOG_LABELS: Record<string, string> = {
  // Bed
  "11b722334fe272e2b7802e8eb74a6704": "Frame A",
  "189064a8df83ddc77a89a0a7fbbe0a6f": "Bamboo Bed",
  "12a73cdd42517d8f65331068961955c9": "Child's Bed",
  "1101146651cd32a1bd09c0f277d16187": "Poster Bed",
  // Bunk Bed
  "16b4dfae678239a42d470147ee1bb468": "Loft Bunk",
  // Chair
  "1022fe7dd03f6a4d4d5ad9f13ac9f4e7": "Armchair",
  "1033ee86cc8bac4390962e4fb7072b86": "Chair",
  "10d174a00639990492d9da2668ec34c":  "Office Chair",
  // Bookshelf / Bookcase / Shelf / Shelving
  "10eb10fe18126d45b97ad864945165a1": "Tall",
  "1741b6cc1f7ee1ec110c9032b6ff923d": "Display",
  "144adb2c599ab09698d5fc0473d00a1c": "Open",
  "151916d8cacda1691c352d02061b3f7":  "Wide",
  "1ab8202a944a6ff1de650492e45fb14f": "Ladder",
  // Desk / Writing Desk
  "1077080c3c8c6c71bf4af39142c10db1": "Standard",
  "1359d27a3d2dd1e6616b1821375380fe": "Study",
  "142f1bd1987ce39e35836c728d324152": "Computer",
  "1438cbb6c92e0b061c19e7863a1c200b": "Corner",
  "15290e3d21f429372af07afc7a68d50":  "Executive",
  // Refrigerator / Fridge
  "1452b2edf9ad18b48d481397d30db1b6": "Top Freezer",
  "15693e248e4950ba1271f7dd4fba29a":  "French Door",
  "17c4dd8191c2c898bf37a318b55c6a3c": "Side-by-Side",
  "225905a8841620d7f6fe1e625c287cfa": "Bottom Freezer",
  // Sofa / Couch / Loveseat / Sectional
  "100f39dce7690f59efb94709f30ce0d2": "3-Seater",
  "11d5e99e8faa10ff3564590844406360": "Modern",
  "10de9af4e91682851e5f7bff98fb8d02": "Chesterfield",
  "107637b6bdf8129d4904d89e9169817b": "Loveseat",
  "10507ae95f984daccd8f3fe9ca2145e1": "L-Shape",
  "12f4d8c20ef311d988dcbe86402c7c15": "Sectional",
  // Table / Dining Table / Coffee Table / End Table / Side Table
  "104221f8a5b6676aa1dda33d5a7c8c38": "Rectangular",
  "12df0535bb43633abdd9b7a602ec35ec": "Rectangular",
  "12193ca7bef40d40a84aed1cd93567b2": "Standard",
  "1223b9275d2a2edacd4833986a6efe96": "Compact",
  // Wardrobe / Cabinet / Dresser / Sideboard / Armoire
  "12c3a4561242a6fe840045f49392aafa": "Double Door",
  "13f565d814bd5647adcda92177beb1f7": "Classic",
  "13dbeeacdabce3b694658a0201ba0367": "Open Frame",
  "12f1e4964078850cc7113d9e058b9db7": "Sliding Door",
  "1447b7ce0e27481efccbc35ad248e812": "Storage",
};

/** Per-catalog-key axis-up convention. "auto" = runtime size-based heuristic (upright items only). */
const CATALOG_AXIS_UP: Record<string, AxisUp> = {
  // flat-surface items use Z-up ShapeNetSem convention
  Bed: "z", Bunk_Bed: "z",
  Sofa: "z", Couch: "z", Loveseat: "z", Sectional: "z",
  Table: "z", Dining_Table: "z", Coffee_Table: "z", End_Table: "-z", Side_Table: "z",
  Desk: "z", Writing_Desk: "z",
  // upright items — use auto heuristic (fires Z-up only when h >= w and h >= l)
  Bookshelf: "auto", Bookcase: "auto", Shelf: "auto", Shelving: "auto",
  Chair: "auto",
  Refrigerator: "auto", Fridge: "auto",
  Wardrobe: "auto", Cabinet: "auto", Dresser: "auto", Sideboard: "z", Armoire: "auto",
};

/**
 * Maps virtual catalog keys to their physical /public/models/ subfolder when the
 * key name differs from the folder name. Keys absent from this map use the catalog
 * key itself as the physical folder (e.g. CATALOG["Bed"] → /models/Bed/).
 */
const CATALOG_FOLDER_MAP: Record<string, string> = {
  // Bookshelves share the Bookshelf/ folder
  Bookcase: "Bookshelf",
  Shelf:    "Bookshelf",
  Shelving: "Bookshelf",
  // Desks share the Desk/ folder
  Writing_Desk: "Desk",
  // Refrigerators share the Refrigerator/ folder
  Fridge: "Refrigerator",
  // Sofas/Couches share the Sofa_Couch/ folder
  Sofa:      "Sofa_Couch",
  Couch:     "Sofa_Couch",
  Loveseat:  "Sofa_Couch",
  Sectional: "Sofa_Couch",
  // Tables share the Table/ folder
  Dining_Table: "Table",
  Coffee_Table: "Table",
  End_Table:    "Table",
  Side_Table:   "Table",
  // Wardrobes share the Wardrobe_Cabinet/ folder
  Wardrobe:  "Wardrobe_Cabinet",
  Cabinet:   "Wardrobe_Cabinet",
  Dresser:   "Wardrobe_Cabinet",
  Sideboard: "Wardrobe_Cabinet",
  Armoire:   "Wardrobe_Cabinet",
};

/**
 * item_id prefix → catalog key. The catalog key selects a model subset from CATALOG
 * and (via CATALOG_FOLDER_MAP) its physical /public/models/ subfolder.
 * Longest match wins (handled by lookup order).
 */
const PREFIX_TO_FOLDER: Record<string, string> = {
  // beds
  bed:      "Bed",
  bunk_bed: "Bunk_Bed",
  // bookshelves
  bookshelf: "Bookshelf",
  bookcase:  "Bookcase",
  shelf:     "Shelf",
  shelving:  "Shelving",
  // chairs
  chair: "Chair",
  // desks
  desk:        "Desk",
  writing_desk: "Writing_Desk",
  // refrigerators
  refrigerator: "Refrigerator",
  fridge:       "Fridge",
  // sofas / couches
  sofa:      "Sofa",
  couch:     "Couch",
  loveseat:  "Loveseat",
  sectional: "Sectional",
  // tables
  table:        "Table",
  dining_table: "Dining_Table",
  coffee_table: "Coffee_Table",
  end_table:    "End_Table",
  side_table:   "Side_Table",
  // wardrobes / cabinets
  wardrobe:  "Wardrobe",
  cabinet:   "Cabinet",
  dresser:   "Dresser",
  sideboard: "Sideboard",
  armoire:   "Armoire",
};

/** djb2 hash over the full item_id string → stable, varied model selection. */
function hashItemId(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0; // unsigned 32-bit
}

/**
 * Resolves a Placement item_id to a static OBJ URL served from /public/models/.
 * Returns null if the prefix is unrecognised — caller falls back to BoxGeometry.
 */
export function resolveModelPath(item_id: string): string | null {
  const match = item_id.toLowerCase().match(/^(.+)_(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const catalogKey = PREFIX_TO_FOLDER[prefix];
  if (!catalogKey) return null;

  const models = CATALOG[catalogKey];
  if (!models?.length) return null;

  const physicalFolder = CATALOG_FOLDER_MAP[catalogKey] ?? catalogKey;
  const modelId = models[hashItemId(item_id.toLowerCase()) % models.length];
  return `/models/${physicalFolder}/${modelId}.obj`;
}

/**
 * Resolves a `(prefix, variantIdx)` pair directly to an OBJ path + axis-up
 * convention — used by the hover-preview component, which doesn't have a real
 * item_id yet. When variantIdx is omitted, the first model in the catalog is
 * returned so the dropdown hover still produces a thumbnail.
 */
export function resolvePreviewMeta(
  prefix: string,
  variantIdx?: number,
): { path: string; axisUp: AxisUp } | null {
  const catalogKey = PREFIX_TO_FOLDER[prefix];
  if (!catalogKey) return null;
  const models = CATALOG[catalogKey];
  if (!models?.length) return null;
  const idx = variantIdx !== undefined && variantIdx >= 0
    ? variantIdx % models.length
    : 0;
  const physicalFolder = CATALOG_FOLDER_MAP[catalogKey] ?? catalogKey;
  const axisUp: AxisUp = CATALOG_AXIS_UP[catalogKey] ?? "auto";
  return { path: `/models/${physicalFolder}/${models[idx]}.obj`, axisUp };
}

/**
 * Returns the list of available model variants for a given item prefix,
 * used to populate the variant picker in the cargo form.
 */
export function getCatalogVariants(
  prefix: string,
): { index: number; label: string }[] {
  const catalogKey = PREFIX_TO_FOLDER[prefix];
  if (!catalogKey) return [];
  return (CATALOG[catalogKey] ?? []).map((id, i) => ({
    index: i,
    label: CATALOG_LABELS[id] ?? `Model ${i + 1}`,
  }));
}

/**
 * Resolves a Placement item_id to a static OBJ path and its axis-up convention.
 * When modelVariant is provided it is used as a direct catalog index, bypassing
 * the hash so the user's explicit choice is always honoured.
 * Returns null if the prefix is unrecognised.
 */
export function resolveModelMeta(
  item_id: string,
  modelVariant?: number,
): { path: string; axisUp: AxisUp } | null {
  const match = item_id.toLowerCase().match(/^(.+)_(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const catalogKey = PREFIX_TO_FOLDER[prefix];
  if (!catalogKey) return null;

  const models = CATALOG[catalogKey];
  if (!models?.length) return null;

  const idx =
    modelVariant !== undefined && modelVariant >= 0
      ? modelVariant % models.length
      : hashItemId(item_id.toLowerCase()) % models.length;

  const modelId = models[idx];
  const physicalFolder = CATALOG_FOLDER_MAP[catalogKey] ?? catalogKey;
  const axisUp: AxisUp = CATALOG_AXIS_UP[catalogKey] ?? "auto";
  return { path: `/models/${physicalFolder}/${modelId}.obj`, axisUp };
}
