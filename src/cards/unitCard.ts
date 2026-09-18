import type { UnitProfile } from '../domain/unitProfile';
import type { Measure } from './fitText';
import { buildMechCardSvg } from './mechCard';
import { buildTroopCardSvg } from './troopCard';
import { buildVehicleCardSvg } from './vehicleCard';

/**
 * Builds the card for a Unit Profile of any kind. `copyNumber` prints in the name row's corner when
 * other fielded copies share this one's name; the editor's preview has no Army List around it, so it
 * passes none.
 */
export function buildUnitCardSvg(
  profile: UnitProfile,
  measure: Measure,
  copyNumber?: number,
): SVGSVGElement {
  switch (profile.kind) {
    case 'Mech':
      return buildMechCardSvg(profile, measure, copyNumber);
    case 'Vehicle':
      return buildVehicleCardSvg(profile, measure, copyNumber);
    case 'Troop':
      return buildTroopCardSvg(profile, measure, copyNumber);
  }
}
