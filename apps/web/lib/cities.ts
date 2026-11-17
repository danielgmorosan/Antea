import type { NameByYear, Phase } from "@antea/chrono";

export interface City {
  slug: string;
  ll: [number, number];
  from: number;
  to: number;
  flagship?: boolean;
  names?: NameByYear;
  phases?: Phase[];
  overview?: string;
  timeline?: readonly (readonly [number, string])[];
  sources?: string[];
  desc?: string;
}

export const CITIES: City[] = [
  {
    slug: "constantinople", ll: [28.98, 41.01], from: -657, to: 2100, flagship: true,
    names: [[-657, "Byzantion"], [330, "Constantinople"], [1453, "Kostantiniyye"], [1930, "Istanbul"]],
    phases: [
      [-657, 330, "Greek city-state, then Rome", "Founded by colonists from Megara at the mouth of the Bosporus; sacked and rebuilt by Septimius Severus."],
      [330, 395, "Roman Empire", "Refounded by Constantine as the New Rome and dedicated in 330."],
      [395, 1204, "Eastern Roman (Byzantine) Empire", "Capital of the Eastern Empire; the largest and richest city in Christendom."],
      [1204, 1261, "Latin Empire", "Sacked and held by the Fourth Crusade."],
      [1261, 1453, "Byzantine Empire (restored)", "Recovered by Michael VIII Palaiologos; splendid but shrinking."],
      [1453, 1923, "Ottoman Empire", "Conquered by Mehmed II; imperial capital facing Mecca."],
      [1923, 2100, "Republic of Turkey", "Renamed Istanbul in common and official use."],
    ],
    overview:
      "No city has been capital of two world empires for longer. A Greek colony chosen for the one strait every Black Sea grain ship must pass, refounded by Constantine as the New Rome, it spent eleven centuries as the Byzantine capital and nearly five as the Ottoman one. Its walls turned back every siege but two — and both of those changed the world.",
    timeline: [
      [-657, "Megarian colonists found Byzantion on the acropolis point"],
      [196, "Sacked by Septimius Severus, then rebuilt grander"],
      [330, "Constantine dedicates the city as his new capital"],
      [537, "Justinian consecrates the Hagia Sophia"],
      [717, "Great Arab siege broken by Greek fire and winter"],
      [1054, "The Great Schism is sealed in the Hagia Sophia"],
      [1204, "The Fourth Crusade sacks the city"],
      [1261, "Palaiologos restoration"],
      [1453, "Mehmed II takes the city; end of the Roman Empire"],
      [1930, "The city is officially Istanbul"],
    ],
    sources: ["historical-basemaps (border geometry)", "Wikidata Q16869 · Pleiades 520985", "C. Mango, Byzantium: The Empire of New Rome"],
  },
  {
    slug: "rome", ll: [12.48, 41.89], from: -753, to: 2100, flagship: true,
    names: [[-753, "Rome"]],
    phases: [
      [-753, -509, "Roman Kingdom", "The city of the seven kings, by tradition founded in 753 BC."],
      [-509, -27, "Roman Republic", "Senate and people; conquest of the Mediterranean."],
      [-27, 395, "Roman Empire", "Caput mundi — a million inhabitants at its height."],
      [395, 476, "Western Roman Empire", "Sacked in 410 and 455 as the West unravels."],
      [476, 553, "Ostrogothic Kingdom", "Theoderic rules from Ravenna; Rome fades."],
      [553, 756, "Eastern Roman (Byzantine) rule", "Reconquered under Justinian; sieges cut the aqueducts."],
      [756, 1870, "Papal States", "The popes' city — perhaps 25,000 people among the ruins of a million."],
      [1870, 2100, "Kingdom, then Republic of Italy", "Captured in 1870 and made the capital of united Italy."],
    ],
    overview:
      "Rome is the reference case for glory and desolation in one place. The million-person capital of the ancient world shrank to a town grazing sheep in the Forum, then reinvented itself twice — as the seat of the papacy and as the capital of modern Italy. Scrub the timeline and watch the same dot change meaning entirely.",
    timeline: [
      [-753, "Traditional founding by Romulus"],
      [-509, "The Republic is proclaimed"],
      [-27, "Augustus becomes the first emperor"],
      [410, "Alaric's Visigoths sack the city"],
      [537, "Ostrogothic siege; the aqueducts are cut"],
      [800, "Charlemagne crowned emperor in St Peter's"],
      [1527, "Sack of Rome by imperial troops"],
      [1870, "Italian troops enter; Rome becomes Italy's capital"],
    ],
    sources: ["historical-basemaps (border geometry)", "Wikidata Q220 · Pleiades 423025", "R. Krautheimer, Rome: Profile of a City"],
  },
  {
    slug: "mystras", ll: [22.37, 37.07], from: 1249, to: 2100, flagship: true,
    names: [[1249, "Mystras"]],
    phases: [
      [1249, 1262, "Principality of Achaea", "A Frankish castle built by William II of Villehardouin above the Spartan plain."],
      [1262, 1460, "Byzantine Empire — Despotate of the Morea", "Ceded to Byzantium; capital of the Despotate and the empire's last intellectual flowering."],
      [1460, 1821, "Ottoman Empire", "Taken seven years after Constantinople; a silk town in slow decline."],
      [1821, 1834, "Greece", "Burned in the war of independence; abandoned when modern Sparti is founded."],
      [1834, 2100, "Abandoned", "A ghost city of churches on a hillside — now a UNESCO site."],
    ],
    overview:
      "Mystras is the product's thesis in one small place: a city that rose, mattered, and vanished. For two centuries it was Byzantium's second city, where Plethon taught Plato to the men who would carry Greek learning to Renaissance Italy, and where the last emperor was crowned. Today nobody lives there at all.",
    timeline: [
      [1249, "William II of Villehardouin builds the castle"],
      [1262, "Ceded to the Byzantines after Pelagonia"],
      [1348, "Seat of the Despotate of the Morea"],
      [1449, "Constantine XI crowned here before taking the throne in Constantinople"],
      [1460, "Surrendered to Mehmed II"],
      [1770, "Destroyed in the Orlov revolt"],
      [1834, "Abandoned for the new town of Sparti"],
      [1989, "Inscribed as a UNESCO World Heritage site"],
    ],
    sources: ["historical-basemaps (border geometry)", "Wikidata Q313972", "S. Runciman, Mistra: Byzantine Capital of the Peloponnese"],
  },
  { slug: "babylon", ll: [44.42, 32.54], from: -1894, to: 300, desc: "Amorite, then Neo-Babylonian capital on the Euphrates; the ancient world's greatest city, faded under the Seleucids." },
  { slug: "carthage", ll: [10.32, 36.85], from: -814, to: 698, desc: "Phoenician maritime empire; razed by Rome in 146 BC, refounded Roman, destroyed again by the Arab conquest." },
  { slug: "alexandria", ll: [29.92, 31.2], from: -331, to: 2100, desc: "Alexander's Mediterranean capital of the Ptolemies; library, lighthouse, and two millennia of continuous life." },
  { slug: "samarkand", ll: [66.97, 39.65], from: -700, to: 2100, desc: "Sogdian crossroads of the Silk Road; Timur's imperial capital." },
  { slug: "baghdad", ll: [44.4, 33.34], from: 762, to: 2100, desc: "Round City of the Abbasid caliphs; sacked by the Mongols in 1258." },
  { slug: "kyoto", ll: [135.77, 35.01], from: 794, to: 2100, desc: "Heian-kyō, imperial capital of Japan for a thousand years." },
  { slug: "angkor", ll: [103.86, 13.43], from: 802, to: 1431, desc: "Khmer capital and the largest pre-industrial city on Earth; abandoned to the forest." },
  { slug: "cahokia", ll: [-90.06, 38.66], from: 1050, to: 1350, desc: "Mississippian mound city larger than contemporary London; emptied within three centuries." },
  { slug: "timbuktu", ll: [-3.0, 16.77], from: 1100, to: 2100, desc: "Saharan terminus of the gold and salt trade; manuscripts and mosques of the Mali and Songhai empires." },
  { slug: "great-zimbabwe", ll: [30.93, -20.27], from: 1100, to: 1550, desc: "Stone capital of the Zimbabwe kingdom; hub of the Indian Ocean gold trade." },
  { slug: "tenochtitlan", ll: [-99.13, 19.43], from: 1325, to: 1521, desc: "Aztec island capital of 200,000; destroyed in the Spanish conquest, Mexico City built on its ruins." },
  { slug: "vijayanagara", ll: [76.47, 15.32], from: 1336, to: 1565, desc: "Capital of south India's last great Hindu empire; abandoned after the battle of Talikota." },
  { slug: "cusco", ll: [-71.97, -13.53], from: 1200, to: 2100, desc: "Navel of the Inca world, laid out in the shape of a puma." },
];

export const titleCase = (s: string): string =>
  s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
