export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="manifest-tab"]',
    title: "Step 1: Build Your Manifest",
    body: "Start here. Enter your truck dimensions and add the furniture items you need to load.",
  },
  {
    target: '[data-tour="truck-spec"]',
    title: "Truck Specification",
    body: "Set the internal width, length, and height of your truck, plus its payload limit.",
  },
  {
    target: '[data-tour="stops-tab"]',
    title: "Delivery Stops",
    body: "Define your delivery route. Each stop represents a destination — items are loaded in reverse delivery order so the first-stop items stay nearest the door.",
  },
  {
    target: '[data-tour="cargo-items"]',
    title: "Cargo Items",
    body: "Add each furniture piece — name, dimensions, weight, stop number, and handling flags like Fragile or Upright-only.",
  },
  {
    target: '[data-tour="solve-button"]',
    title: "Solve Packing Plan",
    body: "When your manifest is ready, click here. The engine runs ILP or FFD and returns up to four loading plans.",
  },
  {
    target: '[data-tour="plan-selector"]',
    title: "Compare Plans",
    body: "Compare the plans side by side — Optimal, Axle Balance, Stability, and Baseline. Click a card to select it.",
  },
  {
    target: '[data-tour="truck-viewer"]',
    title: "3D Viewer",
    body: "Your selected plan renders here in 3D. Rotate, zoom, switch to Animate mode to see items load one by one, or open Explainability to read why the solver chose this layout.",
  },
];
