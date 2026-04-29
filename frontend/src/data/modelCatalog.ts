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
      { prefix: "chair",       label: "Chair"       },
      { prefix: "armchair",    label: "Armchair"    },
      { prefix: "office_chair",label: "Office Chair"},
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
  { w: number; l: number; h: number; weight_kg: number; side_up: boolean }
> = {
  bed:           { w: 1600, l: 2000, h: 500,  weight_kg: 60,  side_up: false },
  bunk_bed:      { w: 1000, l: 2000, h: 1700, weight_kg: 80,  side_up: true  },
  bookshelf:     { w: 800,  l: 300,  h: 1800, weight_kg: 30,  side_up: true  },
  bookcase:      { w: 900,  l: 350,  h: 1800, weight_kg: 35,  side_up: true  },
  shelf:         { w: 800,  l: 300,  h: 1800, weight_kg: 25,  side_up: true  },
  shelving:      { w: 1200, l: 400,  h: 1800, weight_kg: 40,  side_up: true  },
  chair:         { w: 550,  l: 550,  h: 900,  weight_kg: 8,   side_up: false },
  armchair:      { w: 800,  l: 850,  h: 900,  weight_kg: 25,  side_up: false },
  office_chair:  { w: 650,  l: 650,  h: 1100, weight_kg: 15,  side_up: false },
  desk:          { w: 1200, l: 600,  h: 750,  weight_kg: 40,  side_up: false },
  writing_desk:  { w: 1000, l: 500,  h: 750,  weight_kg: 30,  side_up: false },
  refrigerator:  { w: 700,  l: 700,  h: 1800, weight_kg: 80,  side_up: true  },
  fridge:        { w: 600,  l: 650,  h: 1700, weight_kg: 70,  side_up: true  },
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

/** Category folder → list of model IDs (filenames without .obj) */
const CATALOG: Record<string, string[]> = {
  Bed: [
    "1101146651cd32a1bd09c0f277d16187",
    "11b722334fe272e2b7802e8eb74a6704",
    "12a73cdd42517d8f65331068961955c9",
    "16b4dfae678239a42d470147ee1bb468",
    "189064a8df83ddc77a89a0a7fbbe0a6f",
  ],
  Bookshelf: [
    "10eb10fe18126d45b97ad864945165a1",
    "144adb2c599ab09698d5fc0473d00a1c",
    "151916d8cacda1691c352d02061b3f7",
    "1741b6cc1f7ee1ec110c9032b6ff923d",
    "1ab8202a944a6ff1de650492e45fb14f",
  ],
  Chair: [
    "1022fe7dd03f6a4d4d5ad9f13ac9f4e7",
    "1028b32dc1873c2afe26a3ac360dbd4",
    "1033ee86cc8bac4390962e4fb7072b86",
    "10d174a00639990492d9da2668ec34c",
    "111720e8cd4c613492d9da2668ec34c",
  ],
  Desk: [
    "1077080c3c8c6c71bf4af39142c10db1",
    "1359d27a3d2dd1e6616b1821375380fe",
    "142f1bd1987ce39e35836c728d324152",
    "1438cbb6c92e0b061c19e7863a1c200b",
    "15290e3d21f429372af07afc7a68d50",
  ],
  Refrigerator: [
    "1452b2edf9ad18b48d481397d30db1b6",
    "15693e248e4950ba1271f7dd4fba29a",
    "17c4dd8191c2c898bf37a318b55c6a3c",
    "225905a8841620d7f6fe1e625c287cfa",
  ],
  Sofa_Couch: [
    "100f39dce7690f59efb94709f30ce0d2",
    "10507ae95f984daccd8f3fe9ca2145e1",
    "107637b6bdf8129d4904d89e9169817b",
    "10de9af4e91682851e5f7bff98fb8d02",
    "11d5e99e8faa10ff3564590844406360",
    "12f4d8c20ef311d988dcbe86402c7c15",
  ],
  Table: [
    "104221f8a5b6676aa1dda33d5a7c8c38",
    "11b54e1530c17829ec4bb690ca24962",
    "12193ca7bef40d40a84aed1cd93567b2",
    "1223b9275d2a2edacd4833986a6efe96",
    "12df0535bb43633abdd9b7a602ec35ec",
  ],
  Wardrobe_Cabinet: [
    "12c3a4561242a6fe840045f49392aafa",
    "12f1e4964078850cc7113d9e058b9db7",
    "13dbeeacdabce3b694658a0201ba0367",
    "13f565d814bd5647adcda92177beb1f7",
    "1447b7ce0e27481efccbc35ad248e812",
  ],
};

/** item_id prefix → category folder. Longest match wins (handled by lookup order). */
const PREFIX_TO_FOLDER: Record<string, string> = {
  // beds
  bed: "Bed",
  bunk_bed: "Bed",
  // bookshelves
  bookshelf: "Bookshelf",
  bookcase: "Bookshelf",
  shelf: "Bookshelf",
  shelving: "Bookshelf",
  // chairs
  chair: "Chair",
  armchair: "Chair",
  office_chair: "Chair",
  // desks
  desk: "Desk",
  writing_desk: "Desk",
  // refrigerators
  refrigerator: "Refrigerator",
  fridge: "Refrigerator",
  // sofas / couches
  sofa: "Sofa_Couch",
  couch: "Sofa_Couch",
  loveseat: "Sofa_Couch",
  sectional: "Sofa_Couch",
  // tables
  table: "Table",
  dining_table: "Table",
  coffee_table: "Table",
  end_table: "Table",
  side_table: "Table",
  // wardrobes / cabinets
  wardrobe: "Wardrobe_Cabinet",
  cabinet: "Wardrobe_Cabinet",
  dresser: "Wardrobe_Cabinet",
  sideboard: "Wardrobe_Cabinet",
  armoire: "Wardrobe_Cabinet",
};

/**
 * Resolves a Placement item_id to a static OBJ URL served from /public/models/.
 *
 * "wardrobe_01" → "/models/Wardrobe_Cabinet/13dbeeacdabce3b694658a0201ba0367.obj"
 * "dining_table_03" → "/models/Table/1223b9275d2a2edacd4833986a6efe96.obj"
 *
 * Returns null if the prefix is unrecognised — caller falls back to BoxGeometry.
 */
export function resolveModelPath(item_id: string): string | null {
  // Greedy match: everything up to the last _<digits> → handles "dining_table_01"
  const match = item_id.toLowerCase().match(/^(.+)_(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const numericIdx = parseInt(match[2], 10) - 1; // "_01" → index 0

  const folder = PREFIX_TO_FOLDER[prefix];
  if (!folder) return null;

  const models = CATALOG[folder];
  if (!models?.length) return null;

  const modelId = models[Math.abs(numericIdx) % models.length];
  return `/models/${folder}/${modelId}.obj`;
}
