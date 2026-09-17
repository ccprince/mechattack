import { bpOfCopies, hasNameClash, type ArmyList } from '../domain/armyList';
import type { ArmyListAction } from '../domain/armyListReducer';
import { stepInRange } from '../domain/numberRange';
import { quantityRange } from '../domain/profileFields';
import { unitProfileBp, unitProfileIssues, type UnitProfile } from '../domain/unitProfile';
import { useArmyList } from './ArmyListContext';
import { BinIcon, DuplicateIcon, MinusIcon, PlusIcon } from './icons';
import styles from './UnitProfileList.module.css';

interface Section {
  kind: UnitProfile['kind'];
  /** The kind as a group of them, which is what the section holds. */
  heading: string;
  add: Extract<ArmyListAction, { type: `add${string}` }>;
}

/** The three kinds, in the order the list always shows them. */
const sections: Section[] = [
  { kind: 'Mech', heading: 'Mechs', add: { type: 'addMech' } },
  { kind: 'Vehicle', heading: 'Vehicles', add: { type: 'addVehicle' } },
  { kind: 'Troop', heading: 'Troops', add: { type: 'addTroop' } },
];

/**
 * The Unit Profiles, grouped by kind. A row is navigation; what can be done to a Unit Profile is
 * drawn inside the selected row alone, and adding one belongs to its section's header.
 */
export function UnitProfileList({
  onAdd,
}: {
  /** Called after a section's Add dispatches a new Unit Profile. */
  onAdd: () => void;
}) {
  const { state, dispatch } = useArmyList();

  return (
    <nav className={styles.panel} aria-label="Unit Profiles">
      {sections.map(({ kind, heading, add }) => {
        const profiles = state.list.unitProfiles.filter((profile) => profile.kind === kind);
        const headingId = `unit-profiles-${kind}`;
        // The icon says nothing on its own, so the button names the Unit Profile it would add.
        const addLabel = `Add ${kind}`;
        return (
          <section key={kind} className={styles.section} aria-labelledby={headingId}>
            <div className={styles.sectionHeader}>
              {/* The subtotal rides in the heading, so it names the section along with the kind. */}
              <h2 id={headingId} className={styles.sectionHeading}>
                <span className={styles.sectionKind}>{heading}</span>
                <span className={styles.sectionBp}>{bpOfCopies(profiles)} Bp</span>
              </h2>
              <button
                type="button"
                aria-label={addLabel}
                title={addLabel}
                onClick={() => {
                  dispatch(add);
                  onAdd();
                }}
              >
                <PlusIcon />
              </button>
            </div>
            {/* An empty section still shows a header, so its Add stays reachable. */}
            {profiles.length === 0 ? (
              <p className={styles.none}>None</p>
            ) : (
              <ul className={styles.list}>
                {profiles.map((profile) => (
                  <UnitProfileRow key={profile.id} profile={profile} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </nav>
  );
}

function UnitProfileRow({ profile }: { profile: UnitProfile }) {
  const { state, dispatch } = useArmyList();
  const { id, quantity } = profile;
  const name = profile.name || 'Unnamed';
  const selected = id === state.selectedId;
  const flag = describeFlag(state.list, profile);

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.item}
        aria-current={selected ? 'true' : undefined}
        onClick={() => dispatch({ type: 'selectUnitProfile', id })}
      >
        {flag !== undefined && (
          <span className={styles.flag} role="img" aria-label={flag} title={flag} />
        )}
        <span className={styles.itemName}>{name}</span>
        {quantity !== 1 && <span className={styles.itemQuantity}>×{quantity}</span>}
        <span className={styles.itemBp}>{unitProfileBp(profile)} Bp</span>
      </button>
      {selected && <ActionStrip profile={profile} name={name} />}
    </li>
  );
}

/**
 * What the row's one mark stands for, or undefined when there's nothing to say. The editor spells
 * the Issues out in full, so the list only says that this Unit Profile needs looking at.
 */
function describeFlag(list: ArmyList, profile: UnitProfile): string | undefined {
  const marks: string[] = [];
  const issues = unitProfileIssues(profile).length;
  if (issues > 0) marks.push(`${issues} ${issues === 1 ? 'Issue' : 'Issues'}`);
  if (hasNameClash(list, profile)) marks.push('Same name as another Unit Profile');
  return marks.length > 0 ? marks.join(' · ') : undefined;
}

/**
 * What can be done to the selected Unit Profile, on one line: a quantity stepper at the leading edge
 * and, pushed away from it, Duplicate and Delete. Typed quantities are deliberately dropped — they
 * run to about half a dozen and the usual answer is 1 — so the stepper clamps to `quantityRange`
 * rather than letting an out-of-range quantity be dispatched.
 */
function ActionStrip({ profile, name }: { profile: UnitProfile; name: string }) {
  const { dispatch } = useArmyList();
  const { id, quantity } = profile;
  const fewer = stepInRange(quantity, quantityRange, -1);
  const more = stepInRange(quantity, quantityRange, 1);
  const setQuantity = (value: number) => dispatch({ type: 'setQuantity', id, quantity: value });

  return (
    <div className={styles.actions}>
      <button
        type="button"
        aria-label={`One fewer ${name}`}
        title="One fewer"
        disabled={fewer === quantity}
        onClick={() => setQuantity(fewer)}
      >
        <MinusIcon />
      </button>
      <output className={styles.quantity}>{quantity}</output>
      <button
        type="button"
        aria-label={`One more ${name}`}
        title="One more"
        disabled={more === quantity}
        onClick={() => setQuantity(more)}
      >
        <PlusIcon />
      </button>
      {/* Keeps the bin away from a + that gets clicked repeatedly. */}
      <span className={styles.spacer} />
      <button
        type="button"
        aria-label={`Duplicate ${name}`}
        title="Duplicate"
        onClick={() => dispatch({ type: 'duplicateUnitProfile', id })}
      >
        <DuplicateIcon />
      </button>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        title="Delete"
        onClick={() => {
          // An icon-only bin makes this confirmation load-bearing.
          if (window.confirm(`Delete ${name}?`)) dispatch({ type: 'deleteUnitProfile', id });
        }}
      >
        <BinIcon />
      </button>
    </div>
  );
}
