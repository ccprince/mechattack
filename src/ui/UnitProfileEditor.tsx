import type { UnitProfileChanges } from '../domain/armyListReducer';
import { mechClasses, mechStatRanges, type MechClass, type MechProfile } from '../domain/mech';
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
  const { dispatch } = useArmyList();
  const update = (changes: UnitProfileChanges) =>
    dispatch({ type: 'updateUnitProfile', id: profile.id, changes });

  return (
    <section className={styles.editor} aria-label={`Edit ${profile.name}`}>
      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <label className={styles.field}>
          <span>Name</span>
          <input value={profile.name} onChange={(event) => update({ name: event.target.value })} />
        </label>
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
        <label className={styles.field}>
          <span>Notes</span>
          <textarea
            rows={4}
            value={profile.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </label>
      </form>
      {card ? <CardPreview svg={card} label={`${profile.name} record card`} /> : <p>Loading…</p>}
    </section>
  );
}
