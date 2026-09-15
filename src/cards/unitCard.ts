import type { MechProfile } from '../domain/mech';
import type { VehicleProfile } from '../domain/vehicle';
import type { Measure } from './fitText';
import { buildMechCardSvg } from './mechCard';
import { buildVehicleCardSvg } from './vehicleCard';

/** Builds the card for a Mech or Vehicle. Troops don't have a card yet. */
export function buildUnitCardSvg(
  profile: MechProfile | VehicleProfile,
  measure: Measure,
): SVGSVGElement {
  return profile.kind === 'Mech'
    ? buildMechCardSvg(profile, measure)
    : buildVehicleCardSvg(profile, measure);
}
