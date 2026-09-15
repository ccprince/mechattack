import type { MechProfile } from '../domain/mech';
import type { UnitProfile } from '../domain/unitProfile';
import type { VehicleProfile } from '../domain/vehicle';
import type { Measure } from './fitText';
import { buildMechCardSvg } from './mechCard';
import { buildVehicleCardSvg } from './vehicleCard';

/** A Unit Profile whose kind has a card. Troops don't have one yet. */
export type CardedUnitProfile = MechProfile | VehicleProfile;

/** Whether the Unit Profile's kind has a card, so it can be previewed, edited and printed. */
export function hasCard(profile: UnitProfile): profile is CardedUnitProfile {
  return profile.kind !== 'Troop';
}

/** Builds the card for a Mech or Vehicle. */
export function buildUnitCardSvg(profile: CardedUnitProfile, measure: Measure): SVGSVGElement {
  return profile.kind === 'Mech'
    ? buildMechCardSvg(profile, measure)
    : buildVehicleCardSvg(profile, measure);
}
