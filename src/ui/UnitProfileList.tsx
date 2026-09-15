import { useArmyList } from './ArmyListContext';
import styles from './UnitProfileList.module.css';

export function UnitProfileList() {
  const { state, dispatch } = useArmyList();

  return (
    <nav className={styles.panel} aria-label="Unit Profiles">
      <ul className={styles.list}>
        {state.list.unitProfiles.map((profile) => (
          <li key={profile.id}>
            <button
              type="button"
              className={styles.item}
              aria-current={profile.id === state.selectedId ? 'true' : undefined}
              onClick={() => dispatch({ type: 'selectUnitProfile', id: profile.id })}
            >
              <span className={styles.itemName}>{profile.name || 'Unnamed'}</span>
              <span className={styles.itemBp}>{profile.bp} Bp</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => dispatch({ type: 'addMech' })}>
        Add Mech
      </button>
    </nav>
  );
}
