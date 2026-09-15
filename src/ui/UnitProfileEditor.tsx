import { useId, useMemo, type ReactNode } from 'react';
import type { Measure } from '../cards/fitText';
import { buildUnitCardSvg } from '../cards/unitCard';
import { hasNameClash } from '../domain/armyList';
import type { UnitProfileChanges } from '../domain/armyListReducer';
import {
  hardpointLabels,
  hardpoints,
  mechClasses,
  mechUpgradeRanges,
  type MechClass,
  type MechProfile,
} from '../domain/mech';
import { findCatalogEntry } from '../domain/catalog';
import {
  hullOptionsUsed,
  mechFrames,
  mechStats,
  vehicleFrames,
  vehicleStats,
} from '../domain/frame';
import { eligibleMounts } from '../domain/mechRules';
import type { NumberRange } from '../domain/numberRange';
import { describeUnitProfileIssues, type UnitProfile } from '../domain/unitProfile';
import {
  vehicleClasses,
  vehicleMountLabels,
  vehicleUpgradeRanges,
  type VehicleClass,
  type VehicleMount,
  type VehicleProfile,
} from '../domain/vehicle';
import { eligibleVehicleMounts } from '../domain/vehicleRules';
import { useArmyList } from './ArmyListContext';
import { CardPreview } from './CardPreview';
import { NumberField } from './NumberField';
import styles from './UnitProfileEditor.module.css';

type UpdateUnitProfile = (changes: UnitProfileChanges) => void;

const mechUpgradeLabels = {
  armor: 'Armor',
  heatSinks: 'Heat Sinks',
  engineUpgrades: 'Engine Upgrades',
} as const;

const vehicleUpgradeLabels = {
  armor: 'Armor',
  engineUpgrades: 'Engine Upgrades',
} as const;

export function UnitProfileEditor({
  profile,
  measure,
}: {
  profile: UnitProfile;
  /** Measures card text; undefined until the card fonts load. */
  measure: Measure | undefined;
}) {
  const { state, dispatch } = useArmyList();
  const update: UpdateUnitProfile = (changes) =>
    dispatch({ type: 'updateUnitProfile', id: profile.id, changes });

  const issueTexts = describeUnitProfileIssues(profile);
  const nameClashes = hasNameClash(state.list, profile);
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
        {profile.kind === 'Mech' ? (
          <MechFields profile={profile} update={update} />
        ) : (
          <VehicleFields profile={profile} update={update} />
        )}
        <label className={styles.field}>
          <span>Notes</span>
          <textarea
            rows={4}
            value={profile.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </label>
        {issueTexts.length > 0 && (
          <section className={styles.issues} aria-label="Issues">
            <h2>Issues</h2>
            <ul>
              {issueTexts.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </section>
        )}
      </form>
      <UnitCardPreview profile={profile} measure={measure} />
    </section>
  );
}

function UnitCardPreview({
  profile,
  measure,
}: {
  profile: UnitProfile;
  measure: Measure | undefined;
}) {
  // Rebuilt on every edit: the card is never patched in place (ADR 0002).
  const card = useMemo(
    () => (measure ? buildUnitCardSvg(profile, measure) : undefined),
    [measure, profile],
  );
  return card ? <CardPreview svg={card} label={`${profile.name} record card`} /> : <p>Loading…</p>;
}

function MechFields({ profile, update }: { profile: MechProfile; update: UpdateUnitProfile }) {
  const stats = mechStats(profile);
  return (
    <>
      <StatOutputs
        stats={[
          { label: 'Bp', value: `${stats.bp} / ${mechFrames[profile.class].maxBp}` },
          { label: 'Mv', value: stats.mv },
          { label: 'Tp', value: stats.tp },
          { label: 'Hc', value: stats.hc },
        ]}
      />
      <ClassPicker
        classes={mechClasses}
        value={profile.class}
        onChange={(mechClass: MechClass) => update({ class: mechClass })}
      />
      <UpgradeFields
        labels={mechUpgradeLabels}
        values={profile}
        ranges={mechUpgradeRanges}
        onChange={(key, value) => update({ [key]: value })}
      />
      <fieldset className={styles.hardpoints}>
        <legend>Hardpoints</legend>
        {hardpoints.map((hardpoint) => (
          <MountPicker
            key={hardpoint}
            label={hardpointLabels[hardpoint]}
            eligible={eligibleMounts(profile.class, hardpoint)}
            mounted={profile.hardpoints[hardpoint]}
            onChange={(name) => update({ hardpoints: { [hardpoint]: name } })}
          />
        ))}
      </fieldset>
    </>
  );
}

function VehicleFields({
  profile,
  update,
}: {
  profile: VehicleProfile;
  update: UpdateUnitProfile;
}) {
  const stats = vehicleStats(profile);
  const frame = vehicleFrames[profile.class];
  const usedHullOptions = hullOptionsUsed(profile);
  const eligible = eligibleVehicleMounts(profile.class);
  const mountPicker = (mount: VehicleMount) => (
    <MountPicker
      label={vehicleMountLabels[mount]}
      eligible={eligible}
      mounted={profile.mounts[mount]}
      onChange={(name) => update({ mounts: { [mount]: name } })}
    />
  );

  return (
    <>
      <StatOutputs
        stats={[
          { label: 'Bp', value: `${stats.bp} / ${frame.maxBp}` },
          { label: 'Mv', value: stats.mv },
          { label: 'Tp', value: stats.tp },
        ]}
      />
      <ClassPicker
        classes={vehicleClasses}
        value={profile.class}
        onChange={(vehicleClass: VehicleClass) => update({ class: vehicleClass })}
      />
      <UpgradeFields
        labels={vehicleUpgradeLabels}
        values={profile}
        ranges={vehicleUpgradeRanges}
        onChange={(key, value) => update({ [key]: value })}
      />
      {/* Unticking a Turret or Static Mount empties its mounts (see the reducer). */}
      <fieldset className={styles.hullOptions}>
        <legend>
          Hull Options{' '}
          <output
            aria-label="Hull Options"
            className={usedHullOptions > frame.hullOptions ? styles.over : undefined}
          >
            {usedHullOptions} / {frame.hullOptions}
          </output>
        </legend>
        <HullOptionCheck
          label="Turret"
          checked={profile.turret}
          onChange={(turret) => update({ turret })}
        >
          {mountPicker('turret')}
        </HullOptionCheck>
        <HullOptionCheck
          label="Static Mount"
          checked={profile.staticMount}
          onChange={(staticMount) => update({ staticMount })}
        >
          {mountPicker('staticMount1')}
          {mountPicker('staticMount2')}
        </HullOptionCheck>
        <NumberField
          className={styles.field}
          label="Cargo Bays"
          value={profile.cargoBays}
          range={vehicleUpgradeRanges.cargoBays}
          onChange={(cargoBays) => update({ cargoBays })}
        />
      </fieldset>
    </>
  );
}

/** Worked out from the Class's Frame, the upgrades and the mounts; never typed in. */
function StatOutputs({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <div className={styles.stats}>
      {stats.map(({ label, value }) => (
        <div key={label} className={styles.stat}>
          <span aria-hidden="true">{label}</span>
          <output aria-label={label}>{value}</output>
        </div>
      ))}
    </div>
  );
}

function ClassPicker<C extends string>({
  classes,
  value,
  onChange,
}: {
  classes: readonly C[];
  value: C;
  onChange: (value: C) => void;
}) {
  return (
    <label className={styles.field}>
      <span>Class</span>
      <select value={value} onChange={(event) => onChange(event.target.value as C)}>
        {classes.map((unitClass) => (
          <option key={unitClass}>{unitClass}</option>
        ))}
      </select>
    </label>
  );
}

/** A number field for each chosen upgrade, in the order `labels` lists them. */
function UpgradeFields<K extends string>({
  labels,
  values,
  ranges,
  onChange,
}: {
  labels: Record<K, string>;
  values: NoInfer<Record<K, number>>;
  ranges: NoInfer<Record<K, NumberRange>>;
  onChange: (key: K, value: number) => void;
}) {
  const keys = Object.keys(labels) as K[];
  return (
    <div className={styles.upgrades}>
      {keys.map((key) => (
        <NumberField
          key={key}
          className={styles.field}
          label={labels[key]}
          value={values[key]}
          range={ranges[key]}
          onChange={(value) => onChange(key, value)}
        />
      ))}
    </div>
  );
}

/** A Turret or Static Mount checkbox, revealing its mount pickers while ticked. */
function HullOptionCheck({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.hullOption}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
      {checked && children}
    </div>
  );
}

/**
 * Offers the eligible Catalog entries for one mount. A mount that isn't one of them (too heavy
 * after a Class change, or missing from the Catalog) stays selected and listed until changed.
 */
function MountPicker({
  label,
  eligible,
  mounted,
  onChange,
}: {
  label: string;
  eligible: readonly { name: string }[];
  /** The Catalog name on this mount, or null when empty. */
  mounted: string | null;
  onChange: (name: string | null) => void;
}) {
  const names = eligible.map(({ name }) => name);
  const ineligibleMount = mounted !== null && !names.includes(mounted) ? mounted : undefined;

  return (
    <label className={styles.field}>
      <span>{label}</span>
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
