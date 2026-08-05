// src/constants/cylinderSizes.js
export const CYLINDER_SIZES = [
  { label: "11 KG", weight: 11 },
  { label: "18 KG", weight: 18 },
  { label: "23 KG", weight: 23 },
  { label: "24 KG", weight: 24 },
  { label: "32 KG", weight: 32 },
  { label: "43 KG", weight: 43 },
  { label: "48 KG", weight: 48 },
];

export const getWeightBySize = (label) => {
  const found = CYLINDER_SIZES.find((s) => s.label === label);
  return found ? found.weight : null;
};

export const SIZE_LABELS = CYLINDER_SIZES.map((s) => s.label);