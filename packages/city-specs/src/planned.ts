/**
 * Cities on the roadmap but not yet built.
 *
 * They carry a globe position and nothing else — they are markers, not specs.
 * A city graduates out of this list the moment it has a real `CitySpec`.
 */
export interface PlannedCity {
  name: string;
  lng: number;
  lat: number;
}

export const plannedCities: PlannedCity[] = [
  { name: 'Rome', lng: 12.49, lat: 41.89 },
  { name: 'Babylon', lng: 44.42, lat: 32.54 },
  { name: 'Tenochtitlan', lng: -99.13, lat: 19.43 },
];
