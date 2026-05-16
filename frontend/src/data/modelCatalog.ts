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

/**
 * Furniture types grouped by category — used by ManifestForm dropdown.
 * Sourced from the FEU furniture supplier sheet (Furniture_List.xlsx).
 */
export const FURNITURE_OPTIONS: FurnitureGroup[] = [
  {
    folder: "Sala_Set",
    categoryLabel: "Sala Set",
    items: [
      { prefix: "sala_set_3_2", label: "3-2 Sofa Set (78AY1008 SIS)" },
    ],
  },
  {
    folder: "TV_Stand",
    categoryLabel: "TV Stand / Cabinet",
    items: [
      { prefix: "tv_stand_pctv070",  label: "TV Stand (94PCTV070 SS)" },
      { prefix: "tv_stand_aurum",    label: "TV Stand — Sliding (94DRAURUM ES)" },
      { prefix: "tv_stand_gitv2120", label: "TV Stand (94GITV2120 EE)" },
      { prefix: "tv_stand_drenzo",   label: "TV Cabinet — Up to 70\" (94DRENZO)" },
      { prefix: "tv_stand_turati",   label: "TV Stand — Glass (94DRTURATI DOE)" },
      { prefix: "tv_stand_eldorado", label: "TV Cabinet — Glossy (94DRELDORADO DWY)" },
    ],
  },
  {
    folder: "Buffet_Cabinet",
    categoryLabel: "Buffet Cabinet",
    items: [
      { prefix: "buffet_cabinet_jpskk3", label: "Buffet Cabinet (16JPSKK3 SD)" },
      { prefix: "buffet_cabinet_camila", label: "Buffet Cabinet (16AYCAMILA YY)" },
      { prefix: "buffet_cabinet_clover", label: "Buffet Cabinet (16AYCLOVER YY)" },
    ],
  },
  {
    folder: "Dining_Set",
    categoryLabel: "Dining Set",
    items: [
      { prefix: "dining_set_stone",   label: "Dining Set — Sintered Stone" },
      { prefix: "dining_set_wood_6s", label: "Dining Set — 6-Seater Wood" },
      { prefix: "dining_set_classic", label: "Dining Set — Classic Wood" },
    ],
  },
  {
    folder: "Plastic_Products",
    categoryLabel: "Plastic Products",
    items: [
      { prefix: "kiddie_chair",   label: "Monobloc Kiddie Chair (High Type)" },
      { prefix: "monobloc_chair", label: "Monobloc Chair with Armrest" },
      { prefix: "monobloc_bench", label: "Monobloc Bench (3-Seater)" },
    ],
  },
  {
    folder: "Bar_Stool",
    categoryLabel: "Bar Stool",
    items: [
      { prefix: "bar_stool_swivel", label: "Adjustable Swivel Bar Stool" },
      { prefix: "bar_stool_luxury", label: "Luxury Bar Stool" },
      { prefix: "bar_stool_steel",  label: "Bar Stool — Steel Frame" },
      { prefix: "bar_stool_metal",  label: "Bar Stool — Metal Legs" },
    ],
  },
  {
    folder: "Wardrobe",
    categoryLabel: "Wardrobe",
    items: [
      { prefix: "wardrobe_marble", label: "Sliding Door Wardrobe (Marble Print)" },
      { prefix: "wardrobe_oak",    label: "Sliding Door Wardrobe (Light Wood)" },
      { prefix: "wardrobe_2door",  label: "2-Door Wardrobe (Printed Design)" },
    ],
  },
  {
    folder: "Bed_Frame",
    categoryLabel: "Bed Frame",
    items: [
      { prefix: "bed_frame_post_a",  label: "Bed Frame — Classic Wood Post (A)" },
      { prefix: "bed_frame_post_b",  label: "Bed Frame — Classic Wood Post (B)" },
      { prefix: "bed_frame_pullout", label: "Bed Frame with Pull-Out & Drawers" },
    ],
  },
  {
    folder: "Coffee_Table",
    categoryLabel: "Coffee Table",
    items: [
      { prefix: "coffee_glass",     label: "Glass-Top Coffee Table" },
      { prefix: "coffee_solidwood", label: "Solid Wood Coffee Table" },
      { prefix: "coffee_marble",    label: "Marble-Top Coffee Table" },
      { prefix: "coffee_nested",    label: "Nested Coffee Table Set (2 pcs)" },
    ],
  },
  {
    folder: "Nightstand",
    categoryLabel: "Side / Nightstand",
    items: [
      { prefix: "nightstand_1drawer", label: "1-Drawer Nightstand" },
      { prefix: "nightstand_2drawer", label: "2-Drawer Nightstand" },
      { prefix: "nightstand_open",    label: "Open-Shelf Nightstand" },
    ],
  },
  {
    folder: "Study_Desk",
    categoryLabel: "Study Desk",
    items: [
      { prefix: "desk_lshape",  label: "L-Shaped Study Desk" },
      { prefix: "desk_compact", label: "Compact Writing Desk" },
      { prefix: "desk_hutch",   label: "Desk with Hutch & Shelves" },
    ],
  },
  {
    folder: "Office_Chair",
    categoryLabel: "Office Chair",
    items: [
      { prefix: "office_chair_mesh", label: "Ergonomic Mesh Chair" },
      { prefix: "office_chair_pu",   label: "Executive PU Leather Chair" },
      { prefix: "office_chair_task", label: "Mid-Back Task Chair" },
    ],
  },
  {
    folder: "Bookshelf",
    categoryLabel: "Bookshelf",
    items: [
      { prefix: "bookshelf_5tier", label: "5-Tier Bookcase" },
      { prefix: "bookshelf_3tier", label: "3-Tier Open Bookcase" },
      { prefix: "bookshelf_tall",  label: "Tall Open Bookshelf" },
    ],
  },
  {
    folder: "Dresser",
    categoryLabel: "Dresser",
    items: [
      { prefix: "dresser_6drawer",        label: "6-Drawer Double Dresser" },
      { prefix: "dresser_4drawer_mirror", label: "4-Drawer Dresser with Mirror" },
      { prefix: "dresser_3drawer",        label: "3-Drawer Chest" },
    ],
  },
  {
    folder: "L_Shape_Sofa",
    categoryLabel: "L-Shape Sofa",
    items: [
      { prefix: "lshape_sectional", label: "L-Shape Sectional Sofa" },
      { prefix: "lshape_corner",    label: "L-Shape Corner Sofa" },
    ],
  },
  {
    folder: "Recliner",
    categoryLabel: "Recliner",
    items: [
      { prefix: "recliner_fabric", label: "Single Fabric Recliner" },
      { prefix: "recliner_power",  label: "Power Lift Recliner" },
    ],
  },
  {
    folder: "Dining_Chair",
    categoryLabel: "Dining Chair",
    items: [
      { prefix: "dining_chair_upholstered", label: "Upholstered Dining Chair" },
      { prefix: "dining_chair_metal",       label: "Metal Frame Dining Chair" },
    ],
  },
  {
    folder: "Shoe_Cabinet",
    categoryLabel: "Shoe Cabinet",
    items: [
      { prefix: "shoe_5tier", label: "5-Tier Shoe Rack" },
      { prefix: "shoe_bench", label: "Shoe Cabinet with Bench Seat" },
      { prefix: "shoe_slim",  label: "Slim Shoe Cabinet" },
    ],
  },
  {
    folder: "Display_Cabinet",
    categoryLabel: "Display Cabinet",
    items: [
      { prefix: "display_glass",  label: "Glass-Door Display Cabinet" },
      { prefix: "display_corner", label: "Corner Display Cabinet" },
      { prefix: "display_curio",  label: "Curio Display Cabinet" },
    ],
  },
  {
    folder: "Outdoor",
    categoryLabel: "Outdoor / Garden",
    items: [
      { prefix: "garden_table",      label: "Garden Dining Table" },
      { prefix: "garden_chair",      label: "Monobloc Garden Chair" },
      { prefix: "garden_bench",      label: "Outdoor Bench 3-Seater" },
      { prefix: "garden_foldchair",  label: "Foldable Garden Chair" },
    ],
  },
  {
    folder: "Mattress",
    categoryLabel: "Mattress",
    items: [
      { prefix: "mattress_single", label: "Single Mattress" },
      { prefix: "mattress_double", label: "Double Mattress" },
      { prefix: "mattress_queen",  label: "Queen Mattress" },
    ],
  },
  {
    folder: "Accent_Chair",
    categoryLabel: "Accent Chair",
    items: [
      { prefix: "accent_barrel",   label: "Barrel Accent Chair" },
      { prefix: "accent_wingback", label: "Wingback Accent Chair" },
    ],
  },
  {
    folder: "Kids_Furniture",
    categoryLabel: "Kids Furniture",
    items: [
      { prefix: "kids_desk", label: "Kids Study Table & Chair Set" },
      { prefix: "kids_bunk", label: "Kids Bunk Bed" },
      { prefix: "kids_toy",  label: "Kids Toy Storage Unit" },
    ],
  },
  {
    folder: "Console_Table",
    categoryLabel: "Console Table",
    items: [
      { prefix: "console_narrow",  label: "Narrow Entryway Console Table" },
      { prefix: "console_drawers", label: "Console Table with Drawers" },
    ],
  },
  {
    folder: "Ottoman",
    categoryLabel: "Ottoman",
    items: [
      { prefix: "ottoman_storage",  label: "Storage Ottoman (Square)" },
      { prefix: "ottoman_footrest", label: "Footrest Ottoman (Round)" },
    ],
  },
  {
    folder: "Linen_Cabinet",
    categoryLabel: "Linen / Storage Cabinet",
    items: [
      { prefix: "linen_tall", label: "Tall Linen Cabinet" },
      { prefix: "linen_bath", label: "Bathroom / Hallway Storage Cabinet" },
    ],
  },
  {
    folder: "Folding_Furniture",
    categoryLabel: "Folding Furniture",
    items: [
      { prefix: "folding_table", label: "Folding Dining Table" },
      { prefix: "folding_desk",  label: "Folding Study Table" },
    ],
  },
  {
    folder: "Bean_Bag",
    categoryLabel: "Bean Bag",
    items: [
      { prefix: "beanbag_xl",   label: "XL Bean Bag Chair" },
      { prefix: "beanbag_kids", label: "Kids Bean Bag" },
    ],
  },
  {
    folder: "Vanity_Table",
    categoryLabel: "Vanity Table",
    items: [
      { prefix: "vanity_dressing", label: "Vanity Dressing Table with Mirror" },
      { prefix: "vanity_compact",  label: "Compact Vanity Table" },
    ],
  },
  {
    folder: "Standing_Mirror",
    categoryLabel: "Standing Mirror",
    items: [
      { prefix: "mirror_arched", label: "Full-Length Floor Mirror (Arched)" },
      { prefix: "mirror_rect",   label: "Full-Length Floor Mirror (Rectangular)" },
    ],
  },
  {
    folder: "Dining_Bench",
    categoryLabel: "Dining Bench",
    items: [
      { prefix: "bench_upholstered", label: "Upholstered Dining Bench" },
      { prefix: "bench_wood",        label: "Wooden Dining Bench" },
    ],
  },
];

/**
 * Default dimensions (mm), weight, and orientation per prefix — auto-fills AddItemForm.
 * Dimensions converted from cm → mm (×10). For multi-size rows, the default is the
 * smallest variant; SIZE_VARIANTS below holds the full set selectable in the form.
 * `side_up: true` marks items that must remain upright (cabinets, mirrors, fridges).
 */
export const FURNITURE_DEFAULTS: Record<
  string,
  { w: number; l: number; h: number; weight_kg: number; side_up: boolean; fragile?: boolean }
> = {
  // Sala Set
  sala_set_3_2: { w: 1930, l: 890, h: 690, weight_kg: 95, side_up: false },

  // TV Stand / Cabinet
  tv_stand_pctv070:  { w: 1500, l: 390,  h: 450,  weight_kg: 28, side_up: false },
  tv_stand_aurum:    { w: 1600, l: 390,  h: 660,  weight_kg: 32, side_up: false },
  tv_stand_gitv2120: { w: 1200, l: 400,  h: 450,  weight_kg: 24, side_up: false },
  tv_stand_drenzo:   { w: 2000, l: 387,  h: 1779, weight_kg: 55, side_up: true  },
  tv_stand_turati:   { w: 2100, l: 530,  h: 1850, weight_kg: 70, side_up: true,  fragile: true },
  tv_stand_eldorado: { w: 2000, l: 483,  h: 1809, weight_kg: 65, side_up: true  },

  // Buffet Cabinet
  buffet_cabinet_jpskk3: { w: 800,  l: 450, h: 830, weight_kg: 38, side_up: false },
  buffet_cabinet_camila: { w: 1190, l: 600, h: 830, weight_kg: 45, side_up: false },
  buffet_cabinet_clover: { w: 1200, l: 610, h: 840, weight_kg: 48, side_up: false },

  // Dining Set (default = smallest variant; full sizes in SIZE_VARIANTS)
  dining_set_stone:   { w: 1400, l: 800, h: 750, weight_kg: 85, side_up: true,  fragile: true },
  dining_set_wood_6s: { w: 1600, l: 900, h: 750, weight_kg: 72, side_up: false },
  dining_set_classic: { w: 1100, l: 700, h: 750, weight_kg: 60, side_up: false },

  // Plastic Products
  kiddie_chair:   { w: 480,  l: 430, h: 660, weight_kg: 3, side_up: false },
  monobloc_chair: { w: 430,  l: 540, h: 750, weight_kg: 4, side_up: false },
  monobloc_bench: { w: 1500, l: 570, h: 830, weight_kg: 7, side_up: false },

  // Bar Stool — items with "—" Excel dims use sensible defaults
  bar_stool_swivel: { w: 400, l: 400, h: 1000, weight_kg: 8,  side_up: true  },
  bar_stool_luxury: { w: 400, l: 400, h: 900,  weight_kg: 9,  side_up: true  },
  bar_stool_steel:  { w: 517, l: 497, h: 990,  weight_kg: 10, side_up: true  },
  bar_stool_metal:  { w: 450, l: 450, h: 1080, weight_kg: 9,  side_up: true  },

  // Wardrobe — all fragile (mirror panel) and upright
  wardrobe_marble: { w: 900,  l: 500, h: 1850, weight_kg: 65, side_up: true, fragile: true },
  wardrobe_oak:    { w: 1200, l: 500, h: 1850, weight_kg: 75, side_up: true, fragile: true },
  wardrobe_2door:  { w: 900,  l: 500, h: 1850, weight_kg: 62, side_up: true, fragile: true },

  // Bed Frame — height blank in Excel, defaulted to 400 mm
  bed_frame_post_a:  { w: 1219, l: 1905, h: 400, weight_kg: 48, side_up: false },
  bed_frame_post_b:  { w: 1219, l: 1905, h: 400, weight_kg: 48, side_up: false },
  bed_frame_pullout: { w: 914,  l: 1905, h: 400, weight_kg: 55, side_up: false },

  // Coffee Table
  coffee_glass:     { w: 1200, l: 600, h: 450, weight_kg: 25, side_up: false, fragile: true },
  coffee_solidwood: { w: 1000, l: 550, h: 420, weight_kg: 22, side_up: false },
  coffee_marble:    { w: 1100, l: 600, h: 450, weight_kg: 32, side_up: false, fragile: true },
  coffee_nested:    { w: 900,  l: 500, h: 420, weight_kg: 18, side_up: false },

  // Nightstand
  nightstand_1drawer: { w: 500, l: 400, h: 550, weight_kg: 12, side_up: true },
  nightstand_2drawer: { w: 550, l: 400, h: 600, weight_kg: 15, side_up: true },
  nightstand_open:    { w: 450, l: 350, h: 550, weight_kg: 10, side_up: true },

  // Study Desk
  desk_lshape:  { w: 1500, l: 1000, h: 750,  weight_kg: 45, side_up: false },
  desk_compact: { w: 1200, l: 600,  h: 750,  weight_kg: 22, side_up: false },
  desk_hutch:   { w: 1400, l: 650,  h: 1400, weight_kg: 40, side_up: true  },

  // Office Chair
  office_chair_mesh: { w: 650, l: 650, h: 1200, weight_kg: 18, side_up: true },
  office_chair_pu:   { w: 700, l: 700, h: 1300, weight_kg: 24, side_up: true },
  office_chair_task: { w: 600, l: 600, h: 1050, weight_kg: 13, side_up: true },

  // Bookshelf
  bookshelf_5tier: { w: 800,  l: 300, h: 1800, weight_kg: 30, side_up: true },
  bookshelf_3tier: { w: 900,  l: 350, h: 1200, weight_kg: 20, side_up: true },
  bookshelf_tall:  { w: 1000, l: 300, h: 2000, weight_kg: 35, side_up: true },

  // Dresser
  dresser_6drawer:        { w: 1000, l: 450, h: 1100, weight_kg: 48, side_up: true },
  dresser_4drawer_mirror: { w: 900,  l: 450, h: 1500, weight_kg: 55, side_up: true, fragile: true },
  dresser_3drawer:        { w: 800,  l: 400, h: 900,  weight_kg: 30, side_up: true },

  // L-Shape Sofa
  lshape_sectional: { w: 2800, l: 1600, h: 850, weight_kg: 95,  side_up: false },
  lshape_corner:    { w: 2600, l: 1700, h: 900, weight_kg: 110, side_up: false },

  // Recliner
  recliner_fabric: { w: 900, l: 900, h: 1050, weight_kg: 48, side_up: true },
  recliner_power:  { w: 850, l: 850, h: 1100, weight_kg: 55, side_up: true },

  // Dining Chair
  dining_chair_upholstered: { w: 450, l: 500, h: 950, weight_kg: 8, side_up: true },
  dining_chair_metal:       { w: 420, l: 420, h: 850, weight_kg: 7, side_up: true },

  // Shoe Cabinet
  shoe_5tier: { w: 800, l: 300, h: 1200, weight_kg: 15, side_up: true },
  shoe_bench: { w: 800, l: 400, h: 850,  weight_kg: 22, side_up: true },
  shoe_slim:  { w: 600, l: 250, h: 1000, weight_kg: 14, side_up: true },

  // Display Cabinet — fragile (glass)
  display_glass:  { w: 800, l: 350, h: 1800, weight_kg: 48, side_up: true, fragile: true },
  display_corner: { w: 600, l: 600, h: 1700, weight_kg: 38, side_up: true, fragile: true },
  display_curio:  { w: 700, l: 400, h: 1650, weight_kg: 42, side_up: true, fragile: true },

  // Outdoor / Garden
  garden_table:     { w: 1200, l: 700, h: 720, weight_kg: 15, side_up: false },
  garden_chair:     { w: 550,  l: 550, h: 850, weight_kg: 4,  side_up: true  },
  garden_bench:     { w: 1500, l: 550, h: 850, weight_kg: 9,  side_up: false },
  garden_foldchair: { w: 580,  l: 500, h: 800, weight_kg: 5,  side_up: true  },

  // Mattress — must lay flat (note in Excel: side_up=False)
  mattress_single: { w: 910,  l: 1900, h: 250, weight_kg: 20, side_up: false },
  mattress_double: { w: 1220, l: 1900, h: 250, weight_kg: 28, side_up: false },
  mattress_queen:  { w: 1520, l: 1900, h: 300, weight_kg: 35, side_up: false },

  // Accent Chair
  accent_barrel:   { w: 800, l: 800, h: 850,  weight_kg: 22, side_up: true },
  accent_wingback: { w: 750, l: 750, h: 1050, weight_kg: 26, side_up: true },

  // Kids Furniture
  kids_desk: { w: 1000, l: 600,  h: 750,  weight_kg: 20, side_up: false },
  kids_bunk: { w: 2000, l: 1000, h: 1650, weight_kg: 65, side_up: true  },
  kids_toy:  { w: 800,  l: 400,  h: 1000, weight_kg: 18, side_up: true  },

  // Console Table
  console_narrow:  { w: 1200, l: 350, h: 800, weight_kg: 15, side_up: true },
  console_drawers: { w: 1000, l: 400, h: 780, weight_kg: 18, side_up: true },

  // Ottoman
  ottoman_storage:  { w: 650, l: 650, h: 420, weight_kg: 10, side_up: true },
  ottoman_footrest: { w: 600, l: 600, h: 380, weight_kg: 8,  side_up: true },

  // Linen Cabinet
  linen_tall: { w: 800, l: 400, h: 1850, weight_kg: 45, side_up: true },
  linen_bath: { w: 600, l: 350, h: 1400, weight_kg: 28, side_up: true },

  // Folding Furniture
  folding_table: { w: 1200, l: 750, h: 750, weight_kg: 20, side_up: false },
  folding_desk:  { w: 1000, l: 600, h: 720, weight_kg: 14, side_up: false },

  // Bean Bag
  beanbag_xl:   { w: 1000, l: 900, h: 800, weight_kg: 8, side_up: false },
  beanbag_kids: { w: 700,  l: 700, h: 600, weight_kg: 4, side_up: false },

  // Vanity Table — fragile (mirror)
  vanity_dressing: { w: 900, l: 450, h: 1450, weight_kg: 38, side_up: true, fragile: true },
  vanity_compact:  { w: 750, l: 400, h: 1300, weight_kg: 28, side_up: true, fragile: true },

  // Standing Mirror — fragile, upright
  mirror_arched: { w: 600, l: 40, h: 1600, weight_kg: 12, side_up: true, fragile: true },
  mirror_rect:   { w: 500, l: 40, h: 1500, weight_kg: 10, side_up: true, fragile: true },

  // Dining Bench
  bench_upholstered: { w: 1200, l: 350, h: 470, weight_kg: 15, side_up: false },
  bench_wood:        { w: 1400, l: 380, h: 450, weight_kg: 18, side_up: false },
};

/**
 * Per-prefix size options for items that ship in multiple sizes (e.g. Dining Set
 * 4S/6S/8S, Bed Frame Double/Full/Queen). Each entry overrides the dimensions in
 * FURNITURE_DEFAULTS when the user picks it. Items absent from this map have a
 * single fixed size and the picker is hidden.
 */
export interface SizeOption {
  label: string;
  w: number;
  l: number;
  h: number;
}

export const SIZE_VARIANTS: Record<string, SizeOption[]> = {
  dining_set_stone: [
    { label: "4-Seater (140×80)", w: 1400, l: 800,  h: 750 },
    { label: "6-Seater (160×90)", w: 1600, l: 900,  h: 750 },
    { label: "8-Seater (200×100)", w: 2000, l: 1000, h: 750 },
  ],
  dining_set_classic: [
    { label: "4-Seater (110×70)", w: 1100, l: 700, h: 750 },
    { label: "6-Seater (140×80)", w: 1400, l: 800, h: 750 },
  ],
  bed_frame_post_a: [
    { label: "Double (122×190)",       w: 1219, l: 1905, h: 400 },
    { label: "Full-Double (137×190)",  w: 1372, l: 1905, h: 400 },
    { label: "Queen (152×190)",        w: 1524, l: 1905, h: 400 },
  ],
  bed_frame_post_b: [
    { label: "Double (122×190)",       w: 1219, l: 1905, h: 400 },
    { label: "Full-Double (137×190)",  w: 1372, l: 1905, h: 400 },
    { label: "Queen (152×190)",        w: 1524, l: 1905, h: 400 },
  ],
  coffee_nested: [
    { label: "Large (90×50)", w: 900, l: 500, h: 420 },
    { label: "Small (60×40)", w: 600, l: 400, h: 380 },
  ],
};

/** Returns the size options for a prefix, or empty array if the item has a single fixed size. */
export function getSizeVariants(prefix: string): SizeOption[] {
  return SIZE_VARIANTS[prefix] ?? [];
}

export type AxisUp = "y" | "z" | "-z" | "x" | "auto";

/**
 * Per-prefix catalog — each key maps to an exclusive, non-overlapping subset of
 * model IDs from the physical folder named by the same key (or CATALOG_FOLDER_MAP[key]).
 * Splitting by prefix prevents semantic mismatch (e.g., a "Sofa" picker showing
 * a "Sectional" variant) without requiring any file copies.
 *
 * NOTE: New supplier prefixes (sala_set_*, tv_stand_*, etc.) intentionally do not
 * appear here — they fall through to the colored-box fallback in TruckViewer. The
 * legacy CATALOG below remains so saved manifests using old prefixes (bed, chair,
 * sofa…) still resolve to real meshes.
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
 * item_id prefix → catalog key. Only legacy prefixes (bed, chair, sofa…) are
 * mapped. New supplier prefixes (sala_set_*, tv_stand_*, etc.) are intentionally
 * absent and fall through to the colored-box fallback in TruckViewer.
 */
const PREFIX_TO_FOLDER: Record<string, string> = {
  // ── Legacy synthetic prefixes ─────────────────────────────────────────────
  bed:      "Bed",
  bunk_bed: "Bunk_Bed",
  bookshelf: "Bookshelf",
  bookcase:  "Bookcase",
  shelf:     "Shelf",
  shelving:  "Shelving",
  chair: "Chair",
  desk:        "Desk",
  writing_desk: "Writing_Desk",
  refrigerator: "Refrigerator",
  fridge:       "Fridge",
  sofa:      "Sofa",
  couch:     "Couch",
  loveseat:  "Loveseat",
  sectional: "Sectional",
  table:        "Table",
  dining_table: "Dining_Table",
  coffee_table: "Coffee_Table",
  end_table:    "End_Table",
  side_table:   "Side_Table",
  wardrobe:  "Wardrobe",
  cabinet:   "Cabinet",
  dresser:   "Dresser",
  sideboard: "Sideboard",
  armoire:   "Armoire",

  // ── Supplier prefixes mapped to closest existing OBJ folder ───────────────
  // Distributed across multiple catalog keys per family so sibling supplier
  // items render as different meshes (rather than every Bookshelf showing the
  // same mesh, every Bed Frame the same Bed, etc.). Within a single catalog
  // key, the prefix-hashed default in resolvePreviewMeta picks distinct
  // variants for items that share a key.

  // Bed Frame → spread across Bed (4 meshes) + Bunk_Bed
  bed_frame_post_a:  "Bed",
  bed_frame_post_b:  "Bed",
  bed_frame_pullout: "Bed",
  kids_bunk:         "Bunk_Bed",

  // Bookshelves → spread across Bookshelf / Bookcase / Shelving
  bookshelf_5tier: "Bookshelf",
  bookshelf_3tier: "Bookcase",
  bookshelf_tall:  "Shelving",

  // Chair-shaped items → all map to Chair (3 meshes); hash distributes
  office_chair_mesh:        "Chair",
  office_chair_pu:          "Chair",
  office_chair_task:        "Chair",
  dining_chair_upholstered: "Chair",
  dining_chair_metal:       "Chair",
  accent_barrel:            "Chair",
  accent_wingback:          "Chair",
  kiddie_chair:             "Chair",
  monobloc_chair:           "Chair",
  garden_chair:             "Chair",
  garden_foldchair:         "Chair",
  bar_stool_swivel:         "Chair",
  bar_stool_luxury:         "Chair",
  bar_stool_steel:          "Chair",
  bar_stool_metal:          "Chair",

  // Desks → spread across Desk (3 meshes) + Writing_Desk (2 meshes)
  desk_lshape:  "Desk",
  desk_hutch:   "Desk",
  desk_compact: "Writing_Desk",
  kids_desk:    "Writing_Desk",
  folding_desk: "Writing_Desk",

  // Sofa-shaped items → spread across Sofa / Couch / Loveseat / Sectional
  sala_set_3_2:     "Sofa",
  recliner_fabric:  "Loveseat",
  recliner_power:   "Couch",
  lshape_sectional: "Sectional",
  lshape_corner:    "Sectional",

  // Tables → use Table for generic flat-tops, Dining_Table for dining sets
  garden_table:       "Table",
  folding_table:      "Table",
  dining_set_stone:   "Dining_Table",
  dining_set_wood_6s: "Dining_Table",
  dining_set_classic: "Dining_Table",

  // Coffee Tables → all → Coffee_Table (1 mesh; visually appropriate)
  coffee_glass:     "Coffee_Table",
  coffee_solidwood: "Coffee_Table",
  coffee_marble:    "Coffee_Table",
  coffee_nested:    "Coffee_Table",

  // Side / Nightstand → split End_Table / Side_Table for mesh variety
  nightstand_1drawer: "Side_Table",
  nightstand_2drawer: "End_Table",
  nightstand_open:    "Side_Table",

  // Wardrobes → all → Wardrobe (single mesh, correct shape)
  wardrobe_marble: "Wardrobe",
  wardrobe_oak:    "Wardrobe",
  wardrobe_2door:  "Wardrobe",

  // Dressers + Vanity → spread across Dresser / Cabinet (vanity uses Cabinet)
  dresser_6drawer:        "Dresser",
  dresser_4drawer_mirror: "Dresser",
  dresser_3drawer:        "Dresser",
  vanity_dressing:        "Cabinet",
  vanity_compact:         "Cabinet",

  // Linen/Shoe/Display cabinets → spread Cabinet / Armoire
  linen_tall:     "Armoire",
  linen_bath:     "Cabinet",
  shoe_5tier:     "Cabinet",
  shoe_slim:      "Cabinet",
  shoe_bench:     "Cabinet",
  display_glass:  "Armoire",
  display_corner: "Armoire",
  display_curio:  "Armoire",

  // TV Stands → spread tall units to Wardrobe/Armoire, low units to Sideboard
  tv_stand_pctv070:  "Sideboard",
  tv_stand_aurum:    "Sideboard",
  tv_stand_gitv2120: "Sideboard",
  tv_stand_drenzo:   "Wardrobe",
  tv_stand_turati:   "Armoire",
  tv_stand_eldorado: "Wardrobe",

  // Buffet cabinets → Sideboard (low storage shape)
  buffet_cabinet_jpskk3: "Sideboard",
  buffet_cabinet_camila: "Sideboard",
  buffet_cabinet_clover: "Sideboard",

  // Console tables → Sideboard
  console_narrow:  "Sideboard",
  console_drawers: "Sideboard",
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
  // When no variant is specified, hash the prefix so sibling supplier items
  // sharing one catalog key (e.g. all `office_chair_*` → Chair) default to
  // different meshes in the form preview.
  const idx = variantIdx !== undefined && variantIdx >= 0
    ? variantIdx % models.length
    : hashItemId(prefix) % models.length;
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
