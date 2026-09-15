import type { UnitProfile } from '../domain/unitProfile';
import type { Measure } from './fitText';
import { buildMechCardSvg } from './mechCard';
import { buildTroopCardSvg } from './troopCard';
import { buildVehicleCardSvg } from './vehicleCard';

/** Builds the card for a Unit Profile of any kind. */
export function buildUnitCardSvg(profile: UnitProfile, measure: Measure): SVGSVGElement {
  switch (profile.kind) {
    case 'Mech':
      return buildMechCardSvg(profile, measure);
    case 'Vehicle':
      return buildVehicleCardSvg(profile, measure);
    case 'Troop':
      return buildTroopCardSvg(profile, measure);
  }
}
