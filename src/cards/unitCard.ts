import type { UnitProfile } from '../domain/unitProfile';
import type { Measure } from './fitText';
import { buildMechCardSvg } from './mechCard';
import { buildVehicleCardSvg } from './vehicleCard';

/** Builds the card for a Unit Profile of either kind. */
export function buildUnitCardSvg(profile: UnitProfile, measure: Measure): SVGSVGElement {
  return profile.kind === 'Mech'
    ? buildMechCardSvg(profile, measure)
    : buildVehicleCardSvg(profile, measure);
}
