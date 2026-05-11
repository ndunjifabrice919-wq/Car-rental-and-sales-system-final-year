/**
 * Major cities and towns in Cameroon, grouped by region.
 * Used for vehicle location tagging and filtering.
 */

export interface CamCity {
  name: string;
  region: string;
}

export const CAMEROON_REGIONS = [
  "Centre",
  "Littoral",
  "South West",
  "North West",
  "West",
  "South",
  "East",
  "Adamawa",
  "North",
  "Far North",
] as const;

export const CAMEROON_CITIES: CamCity[] = [
  // Centre
  { name: "Yaoundé",       region: "Centre" },
  { name: "Mbalmayo",      region: "Centre" },
  { name: "Obala",         region: "Centre" },
  { name: "Bafia",         region: "Centre" },
  { name: "Nanga-Eboko",   region: "Centre" },
  { name: "Eseka",         region: "Centre" },

  // Littoral
  { name: "Douala",        region: "Littoral" },
  { name: "Nkongsamba",    region: "Littoral" },
  { name: "Loum",          region: "Littoral" },
  { name: "Edéa",          region: "Littoral" },
  { name: "Manjo",         region: "Littoral" },
  { name: "Melong",        region: "Littoral" },

  // South West
  { name: "Buea",          region: "South West" },
  { name: "Limbe",         region: "South West" },
  { name: "Kumba",         region: "South West" },
  { name: "Mamfe",         region: "South West" },
  { name: "Tiko",          region: "South West" },
  { name: "Muyuka",        region: "South West" },
  { name: "Mundemba",      region: "South West" },

  // North West
  { name: "Bamenda",       region: "North West" },
  { name: "Kumbo",         region: "North West" },
  { name: "Wum",           region: "North West" },
  { name: "Ndop",          region: "North West" },
  { name: "Nkambe",        region: "North West" },
  { name: "Fundong",       region: "North West" },
  { name: "Mbengwi",       region: "North West" },

  // West
  { name: "Bafoussam",     region: "West" },
  { name: "Dschang",       region: "West" },
  { name: "Foumban",       region: "West" },
  { name: "Mbouda",        region: "West" },
  { name: "Bafang",        region: "West" },
  { name: "Baham",         region: "West" },
  { name: "Bangangté",     region: "West" },

  // South
  { name: "Ebolowa",       region: "South" },
  { name: "Kribi",         region: "South" },
  { name: "Sangmélima",    region: "South" },
  { name: "Ambam",         region: "South" },
  { name: "Mvangué",       region: "South" },

  // East
  { name: "Bertoua",       region: "East" },
  { name: "Batouri",       region: "East" },
  { name: "Abong-Mbang",   region: "East" },
  { name: "Yokadouma",     region: "East" },
  { name: "Belabo",        region: "East" },

  // Adamawa
  { name: "Ngaoundéré",    region: "Adamawa" },
  { name: "Meiganga",      region: "Adamawa" },
  { name: "Tibati",        region: "Adamawa" },
  { name: "Banyo",         region: "Adamawa" },

  // North
  { name: "Garoua",        region: "North" },
  { name: "Guider",        region: "North" },
  { name: "Poli",          region: "North" },
  { name: "Figuil",        region: "North" },
  { name: "Lagdo",         region: "North" },

  // Far North
  { name: "Maroua",        region: "Far North" },
  { name: "Kousseri",      region: "Far North" },
  { name: "Mokolo",        region: "Far North" },
  { name: "Yagoua",        region: "Far North" },
  { name: "Mora",          region: "Far North" },
  { name: "Kousséri",      region: "Far North" },
];

/** Sorted and grouped for use in <select> dropdowns */
export const CITIES_BY_REGION = CAMEROON_REGIONS.map((region) => ({
  region,
  cities: CAMEROON_CITIES.filter((c) => c.region === region).map((c) => c.name),
}));

/** Flat sorted list of city names */
export const ALL_CITY_NAMES = CAMEROON_CITIES.map((c) => c.name).sort();
