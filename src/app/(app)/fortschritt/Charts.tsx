"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

/* Competence levels are ordinal → one-hue ramp (light → dark), validated default blue ramp. */
export const LEVEL_COLORS = ["#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#104281"];
const LEVEL_NAMES: Record<string, string> = { recognize: "Wiedererkennen", recall: "Abrufen", understand: "Verstehen", apply: "Anwenden", formulate: "Formulieren" };
const fmtWeek = (w: string) => w.slice(8, 10) + "." + w.slice(5, 7) + ".";

function TableToggle({ children, table }: { children: React.ReactNode; table: React.ReactNode }) {
  const [t, setT] = useState(false);
  return (
    <div>
      <div className="mb-2 flex justify-end"><button onClick={() => setT(!t)} className="text-xs text-brand-600">{t ? "Diagramm" : "Tabelle"}</button></div>
      {t ? <div className="overflow-x-auto">{table}</div> : children}
    </div>
  );
}

const axis = { stroke: "#8a8ba0", fontSize: 12, tickLine: false, axisLine: false };

export function AttemptsChart({ data }: { data: Record<string, number | string>[] }) {
  if (!data.length) return <p className="text-sm text-ink-soft">Noch keine Aufgaben bearbeitet.</p>;
  const levels = Object.keys(LEVEL_NAMES);
  return (
    <TableToggle table={
      <table className="w-full text-sm"><thead><tr><th className="text-left">Woche ab</th>{levels.map((l) => <th key={l} className="text-right">{LEVEL_NAMES[l]}</th>)}</tr></thead>
        <tbody>{data.map((d) => <tr key={String(d.week)}><td>{fmtWeek(String(d.week))}</td>{levels.map((l) => <td key={l} className="text-right tabular-nums">{d[l]}</td>)}</tr>)}</tbody></table>
    }>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#ececf3" />
            <XAxis dataKey="week" tickFormatter={fmtWeek} {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip labelFormatter={(w) => `Woche ab ${fmtWeek(String(w))}`} formatter={(v, n) => [v as number, LEVEL_NAMES[String(n)]]} cursor={{ fill: "#f1f1fe" }} />
            <Legend formatter={(n) => <span className="text-xs text-ink-soft">{LEVEL_NAMES[String(n)]}</span>} />
            {levels.map((l, i) => <Bar key={l} dataKey={l} stackId="a" fill={LEVEL_COLORS[i]} stroke="#fff" strokeWidth={2} maxBarSize={36} radius={i === levels.length - 1 ? [4, 4, 0, 0] : 0} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TableToggle>
  );
}

export function SimpleBars({ data, keys, names, colors, unit }: { data: Record<string, number | string>[]; keys: string[]; names: string[]; colors: string[]; unit?: string }) {
  if (!data.length) return <p className="text-sm text-ink-soft">Noch keine Daten.</p>;
  return (
    <TableToggle table={
      <table className="w-full text-sm"><thead><tr><th className="text-left">Woche ab</th>{names.map((n) => <th key={n} className="text-right">{n}</th>)}</tr></thead>
        <tbody>{data.map((d) => <tr key={String(d.week)}><td>{fmtWeek(String(d.week))}</td>{keys.map((k) => <td key={k} className="text-right tabular-nums">{d[k]}{unit ? ` ${unit}` : ""}</td>)}</tr>)}</tbody></table>
    }>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#ececf3" />
            <XAxis dataKey="week" tickFormatter={fmtWeek} {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip labelFormatter={(w) => `Woche ab ${fmtWeek(String(w))}`} formatter={(v, n) => [`${v}${unit ? " " + unit : ""}`, names[keys.indexOf(String(n))]]} cursor={{ fill: "#f1f1fe" }} />
            {keys.length > 1 && <Legend formatter={(n) => <span className="text-xs text-ink-soft">{names[keys.indexOf(String(n))]}</span>} />}
            {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={colors[i]} stroke="#fff" strokeWidth={2} maxBarSize={36} radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TableToggle>
  );
}
