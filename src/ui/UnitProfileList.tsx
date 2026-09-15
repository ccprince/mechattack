import { hasNameClash } from '../domain/armyList';
import { quantityRange } from '../domain/profileFields';
import { unitProfileBp, unitProfileIssues } from '../domain/unitProfile';
import { useArmyList } from './ArmyListContext';
import { NumberField } from './NumberField';
import styles from './UnitProfileList.module.css';

export function UnitProfileList() {
  const { state, dispatch } = useArmyList();

  return (
    <nav className={styles.panel} aria-label="Unit Profiles">
      <ul className={styles.list}>
        {state.list.unitProfiles.map((profile) => {
          const { id } = profile;
          const name = profile.name || 'Unnamed';
          const issueCount = unitProfileIssues(profile).length;
          return (
            <li key={id} className={styles.row}>
              <button
                type="button"
                className={styles.item}
                aria-current={id === state.selectedId ? 'true' : undefined}
                onClick={() => dispatch({ type: 'selectUnitProfile', id })}
              >
                <span className={styles.itemName}>{name}</span>
                {hasNameClash(state.list, profile) && (
                  <span className={styles.itemClash}>Same name</span>
                )}
                {issueCount > 0 && (
                  <span className={styles.itemIssues}>
                    {issueCount} {issueCount === 1 ? 'Issue' : 'Issues'}
                  </span>
                )}
                <span className={styles.itemBp}>{unitProfileBp(profile)} Bp</span>
              </button>
              <div className={styles.actions}>
                <NumberField
                  className={styles.quantity}
                  label="Qty"
                  value={profile.quantity}
                  range={quantityRange}
                  onChange={(quantity) => dispatch({ type: 'setQuantity', id, quantity })}
                />
                <button
                  type="button"
                  aria-label={`Duplicate ${name}`}
                  onClick={() => dispatch({ type: 'duplicateUnitProfile', id })}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${name}`}
                  onClick={() => {
                    if (window.confirm(`Delete ${name}?`)) {
                      dispatch({ type: 'deleteUnitProfile', id });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => dispatch({ type: 'addMech' })}>
        Add Mech
      </button>
    </nav>
  );
}
