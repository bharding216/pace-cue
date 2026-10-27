'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  geoCentroid,
  geoEqualEarth,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldAtlas from 'world-atlas/countries-110m.json';
import type { CountryCount } from '@/lib/queries';
import { NUMERIC_TO_ALPHA2 } from '@/lib/countryCodes';
import { countryLabel } from '@/lib/countryLabel';

type CountryProps = { name: string };
type LandFeature = Feature<Geometry, CountryProps>;

type Land = {
  key: string;
  code: string | null;
  name: string;
  feature: LandFeature;
};

type Hover = {
  name: string;
  code: string | null;
  count: number;
  x: number;
  y: number;
};

const world = worldAtlas as unknown as Topology<{
  countries: GeometryCollection<CountryProps>;
}>;

const lands: Land[] = (
  feature(world, world.objects.countries) as unknown as FeatureCollection<Geometry, CountryProps>
).features.map((item, index) => {
  const rawId = item.id;
  const code = rawId == null
    ? (item.properties?.name === 'Kosovo' ? 'XK' : null)
    : NUMERIC_TO_ALPHA2[String(rawId).padStart(3, '0')] ?? null;
  return {
    key: code ?? `land-${index}`,
    code,
    name: item.properties?.name ?? code ?? 'Unknown',
    feature: item,
  };
});

function mix(from: string, to: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(from);
  const b = parse(to);
  const clamped = Math.max(0, Math.min(1, t));
  const channels = a.map((value, i) => Math.round(value + (b[i] - value) * clamped));
  return `#${channels.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function rotationFor(code: string | undefined): [number, number] {
  const land = code ? lands.find((item) => item.code === code) : undefined;
  if (!land) return [98, -38];
  const [lon, lat] = geoCentroid(land.feature);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return [98, -38];
  return [-lon, -lat];
}

type Props = { data: CountryCount[] };

export default function CountryMap({ data }: Props) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      if (row.country === 'unknown' || row.country === 'other') continue;
      map.set(row.country, row.user_count);
    }
    return map;
  }, [data]);

  const maxCount = Math.max(0, ...counts.values());
  const knownDevices = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const topCode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'globe' | 'map'>('globe');
  const [rotation, setRotation] = useState<[number, number]>(() => rotationFor(topCode));
  const [hover, setHover] = useState<Hover | null>(null);
  const drag = useRef<{ x: number; y: number; rotation: [number, number] } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scene = useMemo(() => {
    const width = mode === 'globe' ? 640 : 860;
    const height = mode === 'globe' ? 560 : 440;
    const projection = mode === 'globe'
      ? geoOrthographic().rotate([rotation[0], rotation[1]])
      : geoEqualEarth();
    projection.fitExtent(
      [[18, 18], [width - 18, height - 18]],
      { type: 'Sphere' },
    );
    const path = geoPath(projection);
    return {
      width,
      height,
      sphere: path({ type: 'Sphere' }) ?? '',
      graticule: mode === 'globe' ? path(geoGraticule10()) ?? '' : '',
      shapes: lands.map((land) => ({
        land,
        d: path(land.feature) ?? '',
      })),
    };
  }, [mode, rotation]);

  function pointerOffset(event: PointerEvent): { x: number; y: number } {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return { x: event.clientX, y: event.clientY };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function showHover(event: PointerEvent, land: Land) {
    if (drag.current) return;
    const pos = pointerOffset(event);
    setHover({
      name: land.code ? countryLabel(land.code) : land.name,
      code: land.code,
      count: land.code ? counts.get(land.code) ?? 0 : 0,
      x: pos.x,
      y: pos.y,
    });
  }

  return (
    <div ref={cardRef} className="relative rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-gray-400">Device regions</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {knownDevices > 0
              ? `${knownDevices.toLocaleString()} device${knownDevices === 1 ? '' : 's'} placed · last 30 days`
              : 'Regions appear after devices open the updated app'}
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-700 p-0.5 text-xs">
          {(['globe', 'map'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                mode === option
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {mounted ? (
      <svg
        viewBox={`0 0 ${scene.width} ${scene.height}`}
        className={`h-auto w-full touch-none select-none ${
          mode === 'globe' ? 'mx-auto max-w-md cursor-grab active:cursor-grabbing' : ''
        }`}
        role="img"
        aria-label="World map of devices by country"
        onPointerDown={(event) => {
          if (mode !== 'globe') return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, rotation };
          setHover(null);
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (!active || mode !== 'globe') return;
          const dx = event.clientX - active.x;
          const dy = event.clientY - active.y;
          setRotation([
            active.rotation[0] + dx * 0.45,
            Math.max(-80, Math.min(80, active.rotation[1] - dy * 0.45)),
          ]);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
          setHover(null);
        }}
      >
        <path d={scene.sphere} fill="#0b1220" stroke="#334155" strokeWidth={1.25} />
        {scene.graticule && (
          <path d={scene.graticule} fill="none" stroke="#1e293b" strokeWidth={0.6} />
        )}
        {scene.shapes.map(({ land, d }) => {
          if (!d) return null;
          const count = land.code ? counts.get(land.code) ?? 0 : 0;
          const active = hover?.code != null && hover.code === land.code;
          const fill = count === 0
            ? (active ? '#334155' : '#1e293b')
            : mix('#075985', '#e0f2fe', Math.sqrt(count / maxCount));
          return (
            <path
              key={land.key}
              d={d}
              fill={fill}
              stroke={active ? '#f8fafc' : '#0f172a'}
              strokeWidth={active ? 1.2 : 0.4}
              onPointerEnter={(event) => showHover(event, land)}
              onPointerMove={(event) => showHover(event, land)}
              onPointerLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      ) : (
        <div
          className={mode === 'globe'
            ? 'mx-auto aspect-[640/560] w-full max-w-md'
            : 'aspect-[43/22] w-full'}
        />
      )}

      {knownDevices > 0 && (
        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
          <span>Fewer</span>
          <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-sky-800 to-sky-200" />
          <span>More</span>
        </div>
      )}
      {mode === 'globe' && (
        <p className="mt-2 text-center text-[11px] text-gray-600">Drag to rotate</p>
      )}

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-gray-700 bg-gray-950 px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: Math.min(hover.x + 14, (cardRef.current?.clientWidth ?? 320) - 160),
            top: Math.max(8, hover.y - 36),
          }}
        >
          <span className="text-gray-100">{hover.name}</span>
          {hover.code && (
            <span className="ml-1.5 text-gray-500">{hover.code}</span>
          )}
          <span className="ml-2 tabular-nums text-sky-300">
            {hover.count.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
