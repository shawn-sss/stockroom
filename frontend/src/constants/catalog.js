export const predefinedCategories = ["Laptop", "Desktop", "Monitor", "Dock", "Part"];
export const predefinedMakesByCategory = {
  Laptop: ["Dell"],
  Desktop: ["Dell"],
  Monitor: ["Dell"],
  Dock: ["Dell"],
  Part: [],
};
export const predefinedModelsByCategoryMake = {
  Laptop: {
    Dell: ["Latitude 5420", "Latitude 5440", "Precision 3571", "Precision 3591"],
  },
  Desktop: {
    Dell: ["OptiPlex Micro 7010", "OptiPlex Micro 7020", "Precision 3660", "Precision 7910"],
  },
  Monitor: {
    Dell: ["P2422H", "U2720Q"],
  },
  Dock: {
    Dell: ["WD19S", "WD19DCS"],
  },
  Part: {
    Dell: [],
  },
};

export const getPredefinedMakes = (category) => predefinedMakesByCategory[category] || [];
export const getPredefinedModels = (category, make) => {
  const modelsByMake = predefinedModelsByCategoryMake[category] || {};
  return modelsByMake[make] || [];
};
