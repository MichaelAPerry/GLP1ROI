import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  OBESITY_CLASSES,
  SCENARIOS,
  classForBmi,
  compareClasses,
  defaultInputs,
  excessAtBmi,
  projectCohort,
} from './model.js';
import { CONTRACT_POINTS, SOURCES } from './sources.js';

// ---------- formatting ----------

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function money(v, { compact = true, signed = false } = {}) {
  const sign = v < 0 ? '−' : signed && v > 0 ? '+' : '';
  const a = Math.abs(v);
  let body;
  if (!compact || a < 10000) body = usd0.format(a);
  else if (a < 1e6) body = `$${(a / 1e3).toFixed(a < 1e5 ? 1 : 0)}K`;
  else body = `$${(a / 1e6).toFixed(2)}M`;
  return sign + body;
}

const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const pct = (v, digits = 0) => `${(v * 100).toFixed(digits)}%`;

// ---------- theme-aware chart colors ----------

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (n) => `rgb(${cs.getPropertyValue(`--${n}`).trim().split(/\s+/).join(',')})`;
  return {
    drug: get('drug'),
    med: get('med'),
    total: get('total'),
    grid: get('line'),
    muted: get('muted'),
    ink: get('ink'),
    surface: get('surface'),
  };
}

function useChartColors() {
  const [colors, setColors] = useState(readColors);
  useEffect(() => {
    const update = () => setColors(readColors());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      mo.disconnect();
    };
  }, []);
  return colors;
}

// ---------- inputs ----------

const SCENARIO_KEYS = Object.keys(SCENARIOS.base).filter((k) => k !== 'label');
const CLASS_KEYS = ['bmi', 'excessCost', 'eventProb', 'eventCost', 'sickDays'];

function Field({ id, label, hint, children }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink2">
          {label}
        </label>
        {hint && <span className="text-[11px] text-muted text-right">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumberInput({ id, value, onChange, prefix, suffix, step = 1, min = 0, max }) {
  return (
    <div className="flex items-center rounded-md border border-line bg-surface focus-within:border-accent">
      {prefix && <span className="pl-2.5 text-sm text-muted">{prefix}</span>}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className="num w-full min-w-0 bg-transparent px-2.5 py-1.5 text-sm text-ink outline-none"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
      />
      {suffix && <span className="pr-2.5 text-sm text-muted whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

function SliderInput({ id, value, onChange, min, max, step = 1, format }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="num w-16 shrink-0 text-right text-sm font-medium text-ink">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

function Group({ title, note, children }) {
  return (
    <fieldset className="grid gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {title}
        </span>
        {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function BmiField({ bmi, onChange }) {
  const [lb, setLb] = useState('');
  const [inches, setInches] = useState('');
  const fromBody = (w, h) => {
    const W = parseFloat(w);
    const H = parseFloat(h);
    if (W > 0 && H > 0) onChange(Math.round(((703 * W) / (H * H)) * 10) / 10);
  };
  return (
    <Field id="bmi" label="Starting BMI (before treatment)">
      <NumberInput id="bmi" value={bmi} onChange={(v) => onChange(Math.max(25, v))} step={0.5} min={25} max={70} />
      <div className="flex items-center gap-2 text-[11.5px] text-muted">
        <span>or</span>
        <input
          id="bmiWeight"
          aria-label="Weight in pounds"
          inputMode="decimal"
          placeholder="lb"
          value={lb}
          onChange={(e) => {
            setLb(e.target.value);
            fromBody(e.target.value, inches);
          }}
          className="num w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-ink"
        />
        <span>at</span>
        <input
          id="bmiHeight"
          aria-label="Height in inches"
          inputMode="decimal"
          placeholder="inches"
          value={inches}
          onChange={(e) => {
            setInches(e.target.value);
            fromBody(lb, e.target.value);
          }}
          className="num w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-ink"
        />
        <span>(5′6″ = 66)</span>
      </div>
    </Field>
  );
}

// ---------- page pieces ----------

function Kpi({ label, value, sub, tone }) {
  const toneClass = tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">{label}</div>
      <div className={`num mt-2 font-serif text-[28px] leading-none sm:text-[32px] ${toneClass}`}>
        {value}
      </div>
      {sub && <div className="mt-2 text-[12.5px] leading-snug text-ink2">{sub}</div>}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="num mt-0.5 text-[17px] font-semibold text-ink">{value}</div>
      {sub && <div className="text-[11.5px] leading-snug text-muted">{sub}</div>}
    </div>
  );
}

function StatusPill({ good, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        good ? 'border-good/40 bg-good/10 text-good' : 'border-bad/40 bg-bad/10 text-bad'
      }`}
    >
      <span aria-hidden="true">{good ? '▲' : '▼'}</span>
      {children}
    </span>
  );
}

const SERIES = [
  { key: 'cumDrug', label: 'Cumulative GLP-1 cost', color: 'drug', dash: '7 4', endLabel: true },
  { key: 'cumMedical', label: 'Averted excess medical cost', color: 'med' },
  { key: 'cumTotal', label: 'Total averted (medical + substitutes)', color: 'total', endLabel: true },
];

function ChartTooltip({ active, payload, label, colors }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2.5 text-xs shadow-lg">
      <div className="mb-1.5 font-semibold text-ink">
        Year {label}
        {row.active === false && <span className="font-normal text-muted"> · retiree</span>}
      </div>
      <table className="num">
        <tbody>
          {SERIES.map((s) => (
            <tr key={s.key}>
              <td className="pr-2">
                <svg width="16" height="4" aria-hidden="true">
                  <line
                    x1="0"
                    y1="2"
                    x2="16"
                    y2="2"
                    stroke={colors[s.color]}
                    strokeWidth="2"
                    strokeDasharray={s.dash}
                  />
                </svg>
              </td>
              <td className="pr-4 text-ink2">{s.label}</td>
              <td className="text-right font-medium text-ink">{money(row[s.key])}</td>
            </tr>
          ))}
          <tr>
            <td />
            <td className="pr-4 pt-1 text-ink2">Cumulative net</td>
            <td className={`pt-1 text-right font-semibold ${row.cumNet >= 0 ? 'text-good' : 'text-bad'}`}>
              {money(row.cumNet, { signed: true })}
            </td>
          </tr>
          <tr>
            <td />
            <td className="pr-4 text-ink2">Still on therapy</td>
            <td className="text-right text-ink">{pct(row.onTherapy)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EndLabel({ x, y, index, count, value, color }) {
  if (index !== count - 1) return null;
  return (
    <text x={x + 6} y={y} dy={4} fontSize={11} fill={color} fontWeight={600}>
      {money(value)}
    </text>
  );
}

function RoiChart({ rows, tenure, breakEvenTotal, breakEvenMedical, colors }) {
  const n = rows.length;
  const data = [{ year: 0, cumDrug: 0, cumMedical: 0, cumTotal: 0, cumNet: 0, onTherapy: 1 }, ...rows];
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 24, right: 64, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={colors.grid} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: colors.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
          interval="preserveStartEnd"
          label={{ value: 'Years of coverage', position: 'insideBottom', offset: -4, fill: colors.muted, fontSize: 11 }}
          height={40}
        />
        <YAxis
          tickFormatter={(v) => money(v)}
          tick={{ fill: colors.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        {n > tenure && (
          <ReferenceArea
            x1={tenure}
            x2={n}
            fill={colors.muted}
            fillOpacity={0.08}
            label={{ value: 'Retiree coverage', position: 'insideTopRight', fill: colors.muted, fontSize: 11 }}
          />
        )}
        <Tooltip
          content={<ChartTooltip colors={colors} />}
          cursor={{ stroke: colors.muted, strokeWidth: 1 }}
        />
        {breakEvenMedical && breakEvenMedical !== breakEvenTotal && (
          <ReferenceLine
            x={breakEvenMedical}
            stroke={colors.med}
            strokeDasharray="2 3"
            label={{ value: `Medical-only break-even · Yr ${breakEvenMedical}`, position: 'insideTopLeft', fill: colors.ink, fontSize: 11, dy: 16 }}
          />
        )}
        {breakEvenTotal && (
          <ReferenceLine
            x={breakEvenTotal}
            stroke={colors.total}
            strokeWidth={1.5}
            label={{ value: `Break-even · Year ${breakEvenTotal}`, position: 'top', fill: colors.ink, fontSize: 12, fontWeight: 600 }}
          />
        )}
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colors[s.color]}
            strokeWidth={2}
            strokeDasharray={s.dash}
            dot={false}
            activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
            label={s.endLabel ? <EndLabel count={n + 1} color={colors[s.color]} /> : false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Legend({ colors }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink2">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <svg width="22" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="22" y2="3" stroke={colors[s.color]} strokeWidth="2.5" strokeDasharray={s.dash} />
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function YearTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[640px] text-right text-[12.5px]">
        <thead className="text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 text-left font-medium">Year</th>
            <th className="py-2 pr-3 font-medium">On therapy</th>
            <th className="py-2 pr-3 font-medium">Drug + monitoring</th>
            <th className="py-2 pr-3 font-medium">Averted medical</th>
            <th className="py-2 pr-3 font-medium">Substitute savings</th>
            <th className="py-2 pr-3 font-medium">Annual net</th>
            <th className="py-2 font-medium">Cumulative net</th>
          </tr>
        </thead>
        <tbody className="text-ink">
          {rows.map((r) => (
            <tr key={r.year} className="border-b border-line/60">
              <td className="py-1.5 pr-3 text-left">
                {r.year}
                {!r.active && <span className="text-muted"> · retiree</span>}
              </td>
              <td className="py-1.5 pr-3">{pct(r.onTherapy)}</td>
              <td className="py-1.5 pr-3">{money(r.drug)}</td>
              <td className="py-1.5 pr-3">{money(r.medical)}</td>
              <td className="py-1.5 pr-3">{money(r.subs)}</td>
              <td className={`py-1.5 pr-3 ${r.net >= 0 ? 'text-good' : 'text-bad'}`}>{money(r.net, { signed: true })}</td>
              <td className={`py-1.5 ${r.cumNet >= 0 ? 'text-good' : 'text-bad'}`}>{money(r.cumNet, { signed: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClassComparison({ inputs, scale }) {
  const results = useMemo(() => compareClasses(inputs), [inputs]);
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[620px] text-right text-[13px]">
        <thead className="text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 text-left font-medium">Obesity class</th>
            <th className="py-2 pr-3 font-medium">Excess cost / yr</th>
            <th className="py-2 pr-3 font-medium">Net impact</th>
            <th className="py-2 pr-3 font-medium">Return per $1</th>
            <th className="py-2 pr-3 font-medium">Break-even year</th>
            <th className="py-2 font-medium">Break-even net price</th>
          </tr>
        </thead>
        <tbody className="text-ink">
          {results.map((r) => (
            <tr
              key={r.key}
              className={`border-b border-line/60 ${r.key === inputs.obesityClass ? 'bg-accent/[0.06]' : ''}`}
            >
              <td className="py-2 pr-3 text-left">
                <span className="font-medium">{r.short}</span>
                <span className="text-muted"> · BMI {r.key === 'I' ? '30–34.9' : r.key === 'II' ? '35–39.9' : '40+'}</span>
              </td>
              <td className="py-2 pr-3">{money(r.excessCost, { compact: false })}</td>
              <td className={`py-2 pr-3 font-medium ${r.totals.net >= 0 ? 'text-good' : 'text-bad'}`}>
                {money(r.totals.net / scale, { signed: true })}
              </td>
              <td className="py-2 pr-3">${r.totals.roi.toFixed(2)}</td>
              <td className="py-2 pr-3">{r.breakEvenTotal ? `Year ${r.breakEvenTotal}` : 'Not reached'}</td>
              <td className="py-2">{money(r.breakEvenPrice, { compact: false })}/yr</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const horizonText = (inp) =>
  inp.retireeYears > 0
    ? `${inp.tenure} working years plus ${inp.retireeYears} years of retiree coverage`
    : `${inp.tenure} years`;

function buildSummary(inp, res) {
  const c = OBESITY_CLASSES[inp.obesityClass];
  const t = res.totals;
  const horizon = res.rows.length;
  const pmpm = usd2.format(Math.abs(t.netCostPmpm));
  const verdict =
    t.net >= 0
      ? `coverage pays for itself, saving ${money(t.net)} net (break-even in year ${res.breakEvenTotal})`
      : `coverage costs ${money(-t.net)} more than it saves — about ${pmpm} per member per month spread across all ${inp.coveredLives.toLocaleString()} covered lives`;
  return (
    `Covering GLP-1 treatment for ${inp.members} members with ${c.short} obesity over ${horizonText(inp)} ` +
    `costs ${money(t.drug)} in drugs and monitoring. It averts ${money(t.medical)} in excess medical costs ` +
    `and ${money(t.subs)} in substitute-teacher costs, so ${verdict}. ` +
    `At these assumptions, coverage breaks even when the plan's net drug price is at or below ` +
    `${usd0.format(Math.round(res.breakEvenPrice / 10) * 10)} per year (today's modeled price: ${usd0.format(inp.drugCost)}).`
  );
}

function CopyButton({ text }) {
  const [state, setState] = useState('idle');
  return (
    <button
      type="button"
      className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent hover:text-accent"
      onClick={() => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => setState('done'))
          .catch(() => setState('failed'));
      }}
    >
      {state === 'done' ? 'Copied' : state === 'failed' ? 'Select the text to copy' : 'Copy summary'}
    </button>
  );
}

// ---------- app ----------

export default function App() {
  const [inputs, setInputs] = useState(() => defaultInputs('II', 'base'));
  const [view, setView] = useState('plan');
  const [showTable, setShowTable] = useState(false);
  const colors = useChartColors();

  const res = useMemo(() => projectCohort(inputs), [inputs]);
  const scale = view === 'plan' ? 1 : Math.max(1, inputs.members);
  const perView = (v) => v / scale;
  const t = res.totals;
  const horizon = res.rows.length;

  const scaledRows = useMemo(
    () =>
      res.rows.map((r) => {
        const o = { ...r };
        for (const k of ['drug', 'medical', 'subs', 'net', 'cumDrug', 'cumMedical', 'cumTotal', 'cumSubs', 'cumNet', 'cumNetPlan'])
          o[k] = r[k] / scale;
        return o;
      }),
    [res, scale],
  );

  const set = (key) => (value) =>
    setInputs((prev) => ({
      ...prev,
      [key]: value,
      scenario: SCENARIO_KEYS.includes(key) ? 'custom' : prev.scenario,
    }));

  const setClass = (key) => {
    const c = OBESITY_CLASSES[key];
    setInputs((prev) => ({
      ...prev,
      obesityClass: key,
      bmi: c.bmi,
      excessCost: c.excessCost,
      eventProb: c.eventProb * 100,
      eventCost: c.eventCost,
      sickDays: c.sickDays,
    }));
  };

  // Editing the starting BMI re-derives the class and the excess cost from the curve.
  const setBmi = (bmi) => {
    const key = classForBmi(bmi);
    const c = OBESITY_CLASSES[key];
    setInputs((prev) => ({
      ...prev,
      bmi,
      obesityClass: key,
      excessCost: Math.round(excessAtBmi(bmi) / 100) * 100,
      eventProb: c.eventProb * 100,
      eventCost: c.eventCost,
      sickDays: c.sickDays,
    }));
  };

  const setScenario = (key) =>
    setInputs((prev) => {
      const { label, ...values } = SCENARIOS[key];
      return { ...prev, ...values, scenario: key };
    });

  const classDefaults = OBESITY_CLASSES[inputs.obesityClass];
  const classEdited = CLASS_KEYS.some((k) =>
    k === 'eventProb' ? inputs[k] !== classDefaults[k] * 100 : inputs[k] !== classDefaults[k],
  );

  const summary = buildSummary(inputs, res);
  const netGood = t.net >= 0;
  const unit = view === 'plan' ? `${inputs.members} members` : 'per member';

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-accent">
            Lenape Technical School · LVTEA · Anti-obesity medication coverage
          </div>
          <h1 className="mt-2 font-serif text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            The long-term cost of keeping — or cutting — GLP-1 coverage
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink2">
            Drug spend today against the excess medical costs and substitute-teacher days that untreated obesity
            generates over a teacher&apos;s career. All figures in 2026 dollars; every assumption below is adjustable.
          </p>
        </div>
        <div className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Show totals</span>
          <div role="radiogroup" aria-label="Show totals" className="inline-flex rounded-md border border-line bg-surface p-0.5">
            {[
              ['plan', `Plan (${inputs.members} members)`],
              ['member', 'Per member'],
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={view === k}
                onClick={() => setView(k)}
                className={`rounded px-3 py-1.5 text-[13px] font-medium ${
                  view === k ? 'bg-accent text-surface' : 'text-ink2 hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section aria-label="Summary metrics" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total drug cost"
          value={money(perView(t.drug))}
          sub={`Plan share after $${inputs.copayMonthly}/mo copay, plus monitoring · ${horizon} yrs, ${unit}`}
        />
        <Kpi
          label="Averted medical cost"
          value={money(perView(t.medical))}
          sub={`${pct(res.avertedShare)} of excess cost avoided while on therapy · ${res.eventsAverted.toFixed(2)} major events avoided`}
        />
        <Kpi
          label="Substitute teacher savings"
          value={money(perView(t.subs))}
          sub={`${inputs.sickDays} sick days/yr avoided at $${inputs.subRate}/day (district budget)`}
        />
        <Kpi
          label="Net impact"
          value={money(perView(t.net), { signed: true })}
          tone={netGood ? 'good' : 'bad'}
          sub={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill good={netGood}>{netGood ? 'Net savings' : 'Net cost'}</StatusPill>
              <span>Health plan alone: {money(perView(t.netPlan), { signed: true })}</span>
            </span>
          }
        />
      </section>

      <section
        aria-label="Decision metrics"
        className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-line bg-sunken px-5 py-4 md:grid-cols-5"
      >
        <Stat
          label="Break-even year"
          value={res.breakEvenTotal ? `Year ${res.breakEvenTotal}` : 'Not reached'}
          sub={res.breakEvenMedical ? `Plan only: year ${res.breakEvenMedical}` : `within ${horizon} years`}
        />
        <Stat label="Return per $1 of drug spend" value={`$${t.roi.toFixed(2)}`} sub={`Plan only: $${t.roiPlan.toFixed(2)}`} />
        <Stat
          label="Break-even net drug price"
          value={`${usd0.format(Math.round(res.breakEvenPrice / 10) * 10)}/yr`}
          sub={`vs. ${usd0.format(inputs.drugCost)} modeled`}
        />
        <Stat
          label={netGood ? 'Net savings per covered life' : 'Net cost per covered life'}
          value={`${usd2.format(Math.abs(t.netCostPmpm))} PMPM`}
          sub={`across ${inputs.coveredLives.toLocaleString()} covered lives`}
        />
        <Stat label={`Net present value (${inputs.discountRate}%)`} value={money(perView(t.npv), { signed: true })} sub={unit} />
      </section>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Controls */}
        <aside className="h-fit rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-4">
          <h2 className="font-serif text-lg font-semibold text-ink">Assumptions</h2>

          <div className="mt-3 grid gap-1.5">
            <span className="text-[13px] font-medium text-ink2">Scenario</span>
            <div role="radiogroup" aria-label="Scenario" className="grid grid-cols-3 gap-1 rounded-md border border-line bg-sunken p-0.5">
              {Object.entries(SCENARIOS).map(([k, s]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={inputs.scenario === k}
                  onClick={() => setScenario(k)}
                  className={`rounded px-1.5 py-1.5 text-[12px] font-medium leading-tight ${
                    inputs.scenario === k ? 'bg-surface text-accent shadow-sm' : 'text-ink2 hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {inputs.scenario === 'custom' && <span className="text-[11.5px] text-muted">Custom — you&apos;ve edited a scenario assumption.</span>}
          </div>

          <div className="mt-6 grid gap-6">
            <Group title="Who is covered">
              <Field id="obesityClass" label="Obesity severity">
                <select
                  id="obesityClass"
                  value={inputs.obesityClass}
                  onChange={(e) => setClass(e.target.value)}
                  className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
                >
                  {Object.entries(OBESITY_CLASSES).map(([k, c]) => (
                    <option key={k} value={k}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <BmiField bmi={inputs.bmi} onChange={setBmi} />
              <Field id="tenure" label="Years of active service remaining">
                <SliderInput id="tenure" value={inputs.tenure} onChange={set('tenure')} min={1} max={30} format={(v) => `${v} yr${v > 1 ? 's' : ''}`} />
              </Field>
              <Field id="retireeYears" label="Years on plan as a retiree" hint="Early Retirement Incentive: up to 10">
                <SliderInput id="retireeYears" value={inputs.retireeYears} onChange={set('retireeYears')} min={0} max={10} format={(v) => `${v} yr${v === 1 ? '' : 's'}`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="members" label="Members treated">
                  <NumberInput id="members" value={inputs.members} onChange={set('members')} min={1} />
                </Field>
                <Field id="coveredLives" label="Total covered lives">
                  <NumberInput id="coveredLives" value={inputs.coveredLives} onChange={set('coveredLives')} step={100} min={1} />
                </Field>
              </div>
            </Group>

            <Group title="Drug cost">
              <Field id="drugCost" label="Annual GLP-1 net cost" hint="after rebates">
                <NumberInput id="drugCost" value={inputs.drugCost} onChange={set('drugCost')} prefix="$" step={100} />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    [4188, 'DTC cash $349/mo'],
                    [6800, 'Employer net 2026'],
                    [16200, 'List price'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set('drugCost')(v)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                        inputs.drugCost === v ? 'border-accent text-accent' : 'border-line text-muted hover:text-ink'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="copayMonthly" label="Member copay / mo" hint="$50 non-formulary">
                  <NumberInput id="copayMonthly" value={inputs.copayMonthly} onChange={set('copayMonthly')} prefix="$" step={5} />
                </Field>
                <Field id="monitoringCost" label="Visits &amp; labs / yr">
                  <NumberInput id="monitoringCost" value={inputs.monitoringCost} onChange={set('monitoringCost')} prefix="$" step={50} />
                </Field>
                <Field id="drugTrend" label="Price trend">
                  <NumberInput id="drugTrend" value={inputs.drugTrend} onChange={set('drugTrend')} suffix="%/yr" step={0.5} min={-20} />
                </Field>
              </div>
              <Field id="genericYear" label="Generics arrive in year" hint="semaglutide patent ends Dec 2031">
                <SliderInput
                  id="genericYear"
                  value={inputs.genericYear}
                  onChange={set('genericYear')}
                  min={0}
                  max={15}
                  format={(v) => (v === 0 ? 'Never' : `Yr ${v} · ${2026 + v - 1}`)}
                />
              </Field>
              <Field id="genericPricePct" label="Price after generics" hint="% of brand price">
                <SliderInput id="genericPricePct" value={inputs.genericPricePct} onChange={set('genericPricePct')} min={10} max={100} step={5} format={(v) => `${v}%`} />
              </Field>
            </Group>

            <Group title="Treatment effect">
              <Field id="weightLoss" label="Sustained weight loss" hint="STEP ≈15% · SURMOUNT ≈20%">
                <SliderInput id="weightLoss" value={inputs.weightLoss} onChange={set('weightLoss')} min={5} max={25} format={(v) => `${v}%`} />
              </Field>
              <Field id="realization" label="Excess cost that reverses" hint="causal share">
                <SliderInput id="realization" value={inputs.realization} onChange={set('realization')} min={30} max={100} step={5} format={(v) => `${v}%`} />
              </Field>
              <Field id="bmiDrift" label="Weight gain if untreated" hint="BMI points per year">
                <SliderInput id="bmiDrift" value={inputs.bmiDrift} onChange={set('bmiDrift')} min={0} max={1} step={0.05} format={(v) => `+${v.toFixed(2)}`} />
              </Field>
              <Field id="eventReduction" label="Major-event risk reduction" hint="SELECT: 20% MACE">
                <SliderInput id="eventReduction" value={inputs.eventReduction} onChange={set('eventReduction')} min={0} max={50} format={(v) => `${v}%`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="persistY1" label="On therapy at 1 yr">
                  <NumberInput id="persistY1" value={inputs.persistY1} onChange={set('persistY1')} suffix="%" max={100} />
                </Field>
                <Field id="persistAnnual" label="Stay on each yr after">
                  <NumberInput id="persistAnnual" value={inputs.persistAnnual} onChange={set('persistAnnual')} suffix="%" max={100} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => setInputs((prev) => ({ ...prev, persistY1: 100, persistAnnual: 100, scenario: 'custom' }))}
                className={`justify-self-start rounded-full border px-2.5 py-0.5 text-[11.5px] ${
                  inputs.persistY1 === 100 && inputs.persistAnnual === 100
                    ? 'border-accent text-accent'
                    : 'border-line text-muted hover:text-ink'
                }`}
              >
                Model a member who stays on therapy
              </button>
            </Group>

            <Group
              title="Cost of untreated obesity"
              note={`Pre-filled for ${classDefaults.short} from published claims data.`}
            >
              <Field id="excessCost" label="Excess medical cost / yr">
                <NumberInput id="excessCost" value={inputs.excessCost} onChange={set('excessCost')} prefix="$" step={100} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="eventProb" label="Major-event risk / yr">
                  <NumberInput id="eventProb" value={inputs.eventProb} onChange={set('eventProb')} suffix="%" step={0.1} />
                </Field>
                <Field id="eventCost" label="Cost per event">
                  <NumberInput id="eventCost" value={inputs.eventCost} onChange={set('eventCost')} prefix="$" step={1000} />
                </Field>
              </div>
              <p className="text-[11.5px] leading-snug text-muted">
                Untreated, a member has a {pct(res.eventRiskOverTenure)} chance of a major event (joint replacement,
                cardiac hospitalization, bariatric surgery) over {horizon} years. Event costs are carved out of the
                excess cost above, never added twice.
              </p>
              {classEdited && (
                <button type="button" onClick={() => setClass(inputs.obesityClass)} className="justify-self-start text-xs font-medium text-accent hover:underline">
                  Reset to research defaults
                </button>
              )}
            </Group>

            <Group title="Classroom coverage">
              <div className="grid grid-cols-2 gap-3">
                <Field id="subRate" label="Substitute daily rate">
                  <NumberInput id="subRate" value={inputs.subRate} onChange={set('subRate')} prefix="$" step={5} />
                </Field>
                <Field id="sickDays" label="Sick days avoided / yr">
                  <NumberInput id="sickDays" value={inputs.sickDays} onChange={set('sickDays')} step={0.25} />
                </Field>
                <Field id="sickDayPayout" label="Retirement payout / banked day">
                  <NumberInput id="sickDayPayout" value={inputs.sickDayPayout} onChange={set('sickDayPayout')} prefix="$" step={5} />
                </Field>
                <Field id="payoutEligible" label="Share who retire eligible">
                  <NumberInput id="payoutEligible" value={inputs.payoutEligible} onChange={set('payoutEligible')} suffix="%" max={100} />
                </Field>
              </div>
              <p className="text-[11.5px] leading-snug text-muted">
                A sick day not taken is banked and paid out at {usd0.format(inputs.sickDayPayout)} on retirement for staff with 20+ years, so each avoided
                day saves {usd0.format(inputs.subRate - (inputs.sickDayPayout * inputs.payoutEligible) / 100)} net. The
                substitute rate is not in the contract; confirm it with the business office.
              </p>
            </Group>

            <Group title="Economics">
              <div className="grid grid-cols-3 gap-3">
                <Field id="medicalTrend" label="Medical trend">
                  <NumberInput id="medicalTrend" value={inputs.medicalTrend} onChange={set('medicalTrend')} suffix="%" step={0.5} />
                </Field>
                <Field id="wageTrend" label="Wage trend">
                  <NumberInput id="wageTrend" value={inputs.wageTrend} onChange={set('wageTrend')} suffix="%" step={0.5} />
                </Field>
                <Field id="discountRate" label="Discount">
                  <NumberInput id="discountRate" value={inputs.discountRate} onChange={set('discountRate')} suffix="%" step={0.5} />
                </Field>
              </div>
            </Group>

            <button
              type="button"
              onClick={() => setInputs(defaultInputs(inputs.obesityClass, 'base'))}
              className="justify-self-start rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent hover:text-accent"
            >
              Reset all assumptions
            </button>
          </div>
        </aside>

        {/* Results */}
        <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">Cumulative cost vs. averted cost</h2>
                <p className="mt-0.5 text-[13px] text-ink2">
                  {classDefaults.short} obesity · {horizonText(inputs)} · {view === 'plan' ? `${inputs.members} members starting therapy` : 'per member starting therapy'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTable((s) => !s)}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink2 hover:border-accent hover:text-accent"
                aria-pressed={showTable}
              >
                {showTable ? 'Show chart' : 'Show year-by-year table'}
              </button>
            </div>
            <div className="mt-4">
              {showTable ? (
                <YearTable rows={scaledRows} />
              ) : (
                <>
                  <Legend colors={colors} />
                  <div className="mt-2">
                    <RoiChart rows={scaledRows} tenure={inputs.tenure} breakEvenTotal={res.breakEvenTotal} breakEvenMedical={res.breakEvenMedical} colors={colors} />
                  </div>
                  {!res.breakEvenTotal && (
                    <p className="mt-2 text-[13px] text-ink2">
                      <span className="font-medium text-bad">No break-even within {horizon} years.</span> Savings cover
                      drug spend once the plan&apos;s net price falls to about {usd0.format(Math.round(res.breakEvenPrice / 10) * 10)}/yr,
                      or for more severe obesity — see the comparison below.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">Presenter summary</h2>
                <p className="mt-0.5 text-[13px] text-ink2">Updates with every assumption — paste into slides or a memo.</p>
              </div>
              <CopyButton text={summary} />
            </div>
            <p className="mt-3 max-w-[75ch] select-all text-[14.5px] leading-relaxed text-ink">{summary}</p>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold text-ink">Does coverage have to pay for itself?</h2>
            <div className="mt-2 grid max-w-[75ch] gap-2.5 text-[13.5px] leading-relaxed text-ink2">
              <p>
                This calculator asks the strictest question: do averted dollars exceed drug dollars inside this plan? Almost
                no covered treatment meets that bar. Insulin, chemotherapy, cardiac stents and joint replacements are covered
                because they buy health, not because they pay for themselves.
              </p>
              <p>
                By the standard health plans usually apply — health gained per dollar — GLP-1s qualify. ICER&apos;s December 2025
                review found semaglutide and tirzepatide cost about $53,000–$69,000 per quality-adjusted life year, and the
                current net price (≈$6,830) is <b className="font-medium text-ink">below</b> ICER&apos;s fair-value
                benchmark of $9,100–$12,500 a year for injectable semaglutide.
              </p>
              <p>
                The cash case is weakest in the first years, when members who stop early and full brand prices dominate.
                It strengthens for members who stay on therapy, for higher starting BMI, for longer time on the plan, and
                once generics arrive after the semaglutide patent ends in December 2031.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold text-ink">Where coverage pays back</h2>
            <p className="mt-0.5 max-w-[75ch] text-[13px] text-ink2">
              Same price, persistence and horizon, applied to each obesity class with its research defaults. Excess cost
              rises steeply with BMI, so savings concentrate in Class II and III — the basis for a targeted coverage policy
              rather than an all-or-nothing decision.
            </p>
            <div className="mt-4">
              <ClassComparison inputs={inputs} scale={scale} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold text-ink">What the LVTEA contract changes</h2>
            <p className="mt-0.5 max-w-[75ch] text-[13px] text-ink2">
              Defaults reflect the 2022–2027 agreement between Lenape Technical School and the LVTEA. Page numbers refer
              to the contract.
            </p>
            <dl className="mt-4 grid gap-x-8 gap-y-4 text-[13px] leading-relaxed md:grid-cols-2">
              {CONTRACT_POINTS.map((c) => (
                <div key={c.title}>
                  <dt className="font-medium text-ink">
                    {c.title} <span className="font-normal text-muted">· {c.ref}</span>
                  </dt>
                  <dd className="mt-0.5 text-ink2">{c.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-serif text-lg font-semibold text-ink">How the model works</h2>
              <ul className="mt-3 grid gap-2.5 text-[13px] leading-relaxed text-ink2">
                <li>
                  <b className="font-medium text-ink">One cohort</b> of members starts therapy in year 1. Drug spend
                  follows the share still filling prescriptions; members who stop are credited no lasting benefit, since
                  most weight returns within a year.
                </li>
                <li>
                  <b className="font-medium text-ink">Benefits ramp in</b>: 15% of full effect in year 1, 50% in year 2,
                  80% in year 3, full from year 4 — matching claims studies where medical savings appear after 18–30 months.
                </li>
                <li>
                  <b className="font-medium text-ink">Averted medical cost</b> comes from moving down the BMI cost curve:
                  a {inputs.weightLoss}% loss from BMI {inputs.bmi} removes {pct(res.avertedShare)} of the excess cost
                  after the {inputs.realization}% causal-share discount. Without treatment, weight keeps climbing
                  {` ${inputs.bmiDrift}`} BMI points a year, so the gap widens over time.
                </li>
                <li>
                  <b className="font-medium text-ink">Drug price</b> trends {inputs.drugTrend}%/yr
                  {inputs.genericYear > 0
                    ? `, then drops to ${inputs.genericPricePct}% of brand in year ${inputs.genericYear} as generics arrive.`
                    : ' and never faces generic competition.'}
                </li>
                <li>
                  <b className="font-medium text-ink">Substitute savings</b> accrue to the district&apos;s operating
                  budget, not the health plan; both are shown separately.
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-serif text-lg font-semibold text-ink">Not counted (upside)</h2>
              <ul className="mt-3 grid gap-2.5 text-[13px] leading-relaxed text-ink2">
                <li>The $1,000 perfect-attendance bonus (a small cost if fewer sick days are used).</li>
                <li>Long-term disability (employee-paid under the contract), workers&apos; compensation, and early retirement due to joint or cardiac disease.</li>
                <li>Partial benefit retained by members who stop therapy.</li>
                <li>
                  Type 2 diabetes prevention beyond the average in the cost curve: tirzepatide cut progression from
                  prediabetes by 94% over three years, and diabetes adds about $12,000 a year in medical cost for life.
                </li>
                <li>Presenteeism, instructional continuity, recruitment and retention.</li>
                <li>Quality of life and mortality — the basis of cost-effectiveness (cost per QALY) reviews.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold text-ink">Sources for default values</h2>
            <ol className="mt-3 grid list-decimal gap-2 pl-5 text-[12.5px] leading-relaxed text-ink2">
              {SOURCES.map((s) => (
                <li key={s.url}>
                  <span className="text-ink">{s.use}:</span> {s.finding}{' '}
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
                    {s.name}
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Planning estimates, not a certified actuarial opinion. Before a final decision, replace defaults with the
              plan&apos;s own claims experience, contracted net price and district absence data.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
