import { unitProfileIssues } from '../domain/mechRules';
import { useArmyList } from './ArmyListContext';
import styles from './UnitProfileList.module.css';

export function UnitProfileList() {
  const { state, dispatch } = useArmyList();

  return (
    <nav className={styles.panel} aria-label="Unit Profiles">
      <ul className={styles.list}>
        {state.list.unitProfiles.map((profile) => {
          const issueCount = unitProfileIssues(profile).length;
          return (
            <li key={profile.id}>
              <button
                type="button"
                className={styles.item}
                aria-current={profile.id === state.selectedId ? 'true' : undefined}
                onClick={() => dispatch({ type: 'selectUnitProfile', id: profile.id })}
              >
                <span className={styles.itemName}>{profile.name || 'Unnamed'}</span>
                {issueCount > 0 && (
                  <span className={styles.itemIssues}>
                    {issueCount} {issueCount === 1 ? 'Issue' : 'Issues'}
                  </span>
                )}
                <span className={styles.itemBp}>{profile.bp} Bp</span>
              </button>
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
