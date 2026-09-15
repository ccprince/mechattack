import { useId } from 'react';
import { duplicateNames } from '../domain/armyList';
import type { UnitProfileChanges } from '../domain/armyListReducer';
import {
  hardpointLabels,
  hardpoints,
  mechClasses,
  mechStatRanges,
  type Hardpoint,
  type MechClass,
  type MechProfile,
} from '../domain/mech';
import { findCatalogEntry } from '../domain/catalog';
import { describeIssue, eligibleMounts, unitProfileIssues } from '../domain/mechRules';
import { useArmyList } from './ArmyListContext';
import { CardPreview } from './CardPreview';
import { NumberField } from './NumberField';
import styles from './UnitProfileEditor.module.css';

const statFields = [
  { key: 'bp', label: 'Bp' },
  { key: 'mv', label: 'Mv' },
  { key: 'tp', label: 'Tp' },
  { key: 'hc', label: 'Hc' },
  { key: 'armor', label: 'Armor' },
] as const;

export function UnitProfileEditor({
  profile,
  card,
}: {
  profile: MechProfile;
  /** The profile's card, once the card fonts have loaded. */
  card: SVGSVGElement | undefined;
}) {
  const { state, dispatch } = useArmyList();
  const update = (changes: UnitProfileChanges) =>
    dispatch({ type: 'updateUnitProfile', id: profile.id, changes });

  const issues = unitProfileIssues(profile);
  const nameClashes = duplicateNames(state.list).has(profile.name.trim());
  const clashId = useId();

  return (
    <section className={styles.editor} aria-label={`Edit ${profile.name}`}>
      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <div className={styles.field}>
          <label className={styles.field}>
            <span>Name</span>
            <input
              value={profile.name}
              aria-describedby={nameClashes ? clashId : undefined}
              onChange={(event) => update({ name: event.target.value })}
            />
          </label>
          {nameClashes && (
            <span id={clashId} className={styles.clash}>
              Another Unit Profile is also named {profile.name.trim()}
            </span>
          )}
        </div>
        <label className={styles.field}>
          <span>Class</span>
          <select
            value={profile.class}
            onChange={(event) => update({ class: event.target.value as MechClass })}
          >
            {mechClasses.map((mechClass) => (
              <option key={mechClass}>{mechClass}</option>
            ))}
          </select>
        </label>
        <div className={styles.stats}>
          {statFields.map(({ key, label }) => (
            <NumberField
              key={key}
              className={styles.field}
              label={label}
              value={profile[key]}
              range={mechStatRanges[key]}
              onChange={(value) => update({ [key]: value })}
            />
          ))}
        </div>
        <fieldset className={styles.hardpoints}>
          <legend>Hardpoints</legend>
          {hardpoints.map((hardpoint) => (
            <HardpointPicker
              key={hardpoint}
              mechClass={profile.class}
              hardpoint={hardpoint}
              mounted={profile.hardpoints[hardpoint]}
              onChange={(name) => update({ hardpoints: { [hardpoint]: name } })}
            />
          ))}
        </fieldset>
        <label className={styles.field}>
          <span>Notes</span>
          <textarea
            rows={4}
            value={profile.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </label>
        {issues.length > 0 && (
          <section className={styles.issues} aria-label="Issues">
            <h2>Issues</h2>
            <ul>
              {issues.map((issue) => {
                const text = describeIssue(issue);
                return <li key={text}>{text}</li>;
              })}
            </ul>
          </section>
        )}
      </form>
      {card ? <CardPreview svg={card} label={`${profile.name} record card`} /> : <p>Loading…</p>}
    </section>
  );
}

/**
 * Offers the entries this Mech's Class may mount here. A mount that isn't one of them (too heavy
 * after a Class change, or missing from the Catalog) stays selected and listed until changed.
 */
function HardpointPicker({
  mechClass,
  hardpoint,
  mounted,
  onChange,
}: {
  mechClass: MechClass;
  hardpoint: Hardpoint;
  /** The Catalog name on this Hardpoint, or null when empty. */
  mounted: string | null;
  onChange: (name: string | null) => void;
}) {
  const names = eligibleMounts(mechClass, hardpoint).map(({ name }) => name);
  const ineligibleMount = mounted !== null && !names.includes(mounted) ? mounted : undefined;

  return (
    <label className={styles.field}>
      <span>{hardpointLabels[hardpoint]}</span>
      <select value={mounted ?? ''} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Empty</option>
        {ineligibleMount !== undefined && (
          <option value={ineligibleMount}>
            {ineligibleMount} ({findCatalogEntry(ineligibleMount) ? 'Issue' : 'not in the Catalog'})
          </option>
        )}
        {names.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </label>
  );
}
