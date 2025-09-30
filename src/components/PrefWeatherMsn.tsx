// src/components/PrefWeatherMsn.tsx
import { useEffect, useMemo, useState } from 'react';
import { PREFECTURES } from '../constants/prefectures';
import { MSNWeatherService as Msn } from '../generated/services/MSNWeatherService';

type AnyObj = Record<string, any>;

type CurrentView = {
  temperature?: number;
  condition?: string;
  humidity?: number;         // %
  windSpeed?: number;        // units.speed
  windDir?: number;          // degrees
  observedAt?: string;       // ISO
  location?: string;         // from responses.source.location
  nowcastSummary?: string;   // optional
  alertTitle?: string;       // optional
  uv?: number;               // 現在の UV
  uvDesc?: string;           // 現在の UV 説明
  unitLabels: { temp: string; speed: string };
};

type TodayView = {
  high?: number;
  low?: number;
  precip?: number;           // %
  dayCap?: string;           // 日中の概況
  nightCap?: string;         // 夜の概況
  valid?: string;            // 日付（必要なら表示）
  uv?: number;               // 今日の UV
  uvDesc?: string;           // 今日の UV 説明
  sunrise?: string;          // ISO（UTC）
  sunset?: string;           // ISO（UTC）
  utcOffset?: string;        // "09:00:00" など（場所のタイムゾーン）
};

export default function PrefWeatherMsn() {
  const [pref, setPref] = useState<string>('大阪府');
  const [units, setUnits] = useState<'Metric' | 'Imperial'>('Metric');
  const [loading, setLoading] = useState(false);
  const [cw, setCw] = useState<AnyObj | null>(null);
  const [today, setToday] = useState<AnyObj | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false); // 開発用：生JSON表示

  // --- 共通: ラッパ解除（axios.data / fetch.body など） ---
  function unwrap<T = any>(res: any): T {
    if (!res) return res;
    if (res.data) return res.data;
    if (res.value) return res.value;
    if (res.result) return res.result;
    if (res.body) return res.body;
    return res;
  }

  // --- 現在の天気：Current JSON 形に最適化 ---
  function pickCurrent(root: AnyObj | null): CurrentView {
    const fallbackUnits = { temp: units === 'Imperial' ? '°F' : '°C', speed: units === 'Imperial' ? 'mph' : 'km/h' };
    if (!root) return { unitLabels: fallbackUnits };

    const cur = root?.responses?.weather?.current;
    const src = root?.responses?.source;
    const unit = root?.units ?? {};

    const temperature = typeof cur?.temp === 'number' ? cur.temp : undefined;
    const condition = cur?.cap ?? cur?.capAbbr ?? undefined;
    const humidity = typeof cur?.rh === 'number' ? cur.rh : undefined;
    const windSpeed = typeof cur?.windSpd === 'number' ? cur.windSpd : undefined;
    const windDir = typeof cur?.windDir === 'number' ? cur.windDir : undefined;
    const observedAt = cur?.created ?? undefined;
    const location = src?.location ?? undefined;

    const nowcastSummary =
      root?.responses?.weather?.nowcasting?.shortSummary ??
      root?.responses?.weather?.nowcasting?.summary ??
      undefined;

    const alertTitle = Array.isArray(root?.responses?.weather?.alerts) && root.responses.weather.alerts.length > 0
      ? root.responses.weather.alerts[0]?.title
      : undefined;

    const uv = typeof cur?.uv === 'number' ? cur.uv : undefined;
    const uvDesc = cur?.uvDesc ?? undefined;

    const unitLabels = {
      temp: typeof unit?.temperature === 'string' ? unit.temperature : fallbackUnits.temp,
      speed: typeof unit?.speed === 'string' ? unit.speed : fallbackUnits.speed,
    };

    return { temperature, condition, humidity, windSpeed, windDir, observedAt, location, nowcastSummary, alertTitle, uv, uvDesc, unitLabels };
  }

  // --- 今日の予報：TodaysForecast（responses.daily + responses.almanac）に対応 ---
  function pickToday(root: AnyObj | null): TodayView {
    if (!root) return {};
    const daily = root?.responses?.daily;
    const almanac = root?.responses?.almanac;
    const src = root?.responses?.source;

    if (!daily && !almanac) return {};

    const toNum = (v: any): number | undefined => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
      return undefined;
    };

    const high = toNum(daily?.tempHi);
    const low  = toNum(daily?.tempLo);

    const dayPrecip   = toNum(daily?.day?.precip);
    const nightPrecip = toNum(daily?.night?.precip);
    const overall     = toNum(daily?.precip);
    const precipCandidates = [dayPrecip, nightPrecip, overall].filter((x): x is number => typeof x === 'number');
    const precip = precipCandidates.length ? Math.max(...precipCandidates) : undefined;

    const dayCap = daily?.day?.cap ?? daily?.pvdrCap;
    const nightCap = daily?.night?.cap ?? undefined;
    const valid = daily?.valid ?? undefined;

    const uv = toNum(daily?.uv);
    const uvDesc = daily?.uvDesc ?? undefined;

    const sunrise = almanac?.sunrise ?? undefined; // ISO（UTC）
    const sunset  = almanac?.sunset ?? undefined;  // ISO（UTC）
    const utcOffset = src?.utcOffset ?? undefined; // "09:00:00"

    return { high, low, precip, dayCap, nightCap, valid, uv, uvDesc, sunrise, sunset, utcOffset };
  }

  const c = useMemo(() => pickCurrent(cw), [cw, units]);
  const d = useMemo(() => pickToday(today), [today]);

  // --- 表示補助 ---
  function emojiFromCondition(txt?: string) {
    const s = (txt ?? '').toLowerCase();
    if (s.includes('snow') || s.includes('雪')) return '❄️';
    if (s.includes('storm') || s.includes('雷') || s.includes('雷雨')) return '⛈️';
    if (s.includes('rain') || s.includes('雨')) return '🌧️';
    if (s.includes('cloud') || s.includes('曇')) return '☁️';
    if (s.includes('clear') || s.includes('快晴') || s.includes('晴')) return '☀️';
    return '🌤️';
  }

  function fmtNum(v: number | undefined, suffix: string) {
    if (typeof v !== 'number' || Number.isNaN(v)) return '—';
    const n = Math.round(v);
    return `${n}${suffix}`;
  }

  function fmtTime(raw?: string) {
    if (!raw) return '—';
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return '—';
      const hh = `${d.getHours()}`.padStart(2, '0');
      const mm = `${d.getMinutes()}`.padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return '—';
    }
  }

  // 「場所の UTC オフセット」に合わせて時刻文字列を作る（例: "09:00:00" → +540 分）
  function fmtTimeAtOffset(iso?: string, offset?: string) {
    if (!iso) return '—';
    try {
      const base = new Date(iso); // ISO は +00:00（UTC）
      if (Number.isNaN(base.getTime())) return '—';

      // offset が無ければブラウザのローカルで表示
      if (!offset) return fmtTime(iso);

      const sign = offset.startsWith('-') ? -1 : 1;
      const parts = offset.replace('-', '').split(':').map(n => parseInt(n, 10) || 0);
      const minutes = sign * (Math.abs(parts[0]) * 60 + (parts[1] || 0));
      const shifted = new Date(base.getTime() + minutes * 60_000);

      // ここでは UTC ベースで時分を取り、二重のタイムゾーン変換を避ける
      const hh = `${shifted.getUTCHours()}`.padStart(2, '0');
      const mm = `${shifted.getUTCMinutes()}`.padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return '—';
    }
  }

  function windArrow(deg?: number) {
    if (typeof deg !== 'number') return '—';
    const dirs = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
    const idx = Math.round(((deg % 360) / 45)) % 8;
    return `${dirs[idx]} (${Math.round(deg)}°)`;
  }

  function fmtUv(uv?: number, desc?: string) {
    if (typeof uv !== 'number' || Number.isNaN(uv)) return '—';
    const n = Math.round(uv);
    return desc ? `${n} (${desc})` : `${n}`;
  }

  // --- データ取得 ---
  const fetchWeather = async (p: string, u: 'Metric' | 'Imperial') => {
    setLoading(true);
    setError(null);
    try {
      const [cwRes, tdRes] = await Promise.all([
        // ★ 既に動いている呼び出し形を踏襲
        Msn.CurrentWeather(`${p}, 日本`, u ),
        Msn.TodaysForecast(`${p}, 日本`, u ),
      ]);

      const cwPayload = unwrap(cwRes);
      const tdPayload = unwrap(tdRes);

      (window as any).__MSN__ = { cw: cwPayload, today: tdPayload };

      setCw(cwPayload);
      setToday(tdPayload);
    } catch (e: any) {
      console.error('[MSN] fetch error:', e);
      if (e?.response?.data) console.error('[MSN] error response data:', e.response.data);
      // setError('MSN Weather の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeather(pref, units); }, [pref, units]);

  // --- UI ---
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>都道府県別 天気（MSN）</h2>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>都道府県</span>
            <select
              value={pref}
              onChange={(e) => setPref(e.target.value)}
              style={{ padding: '6px 8px', minWidth: 180 }}
            >
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>単位</span>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value === 'Imperial' ? 'Imperial' : 'Metric')}
              style={{ padding: '6px 8px' }}
            >
              <option value="Metric">Metric（摂氏）</option>
              <option value="Imperial">Imperial（華氏）</option>
            </select>
          </label>

          <button
            onClick={() => fetchWeather(pref, units)}
            disabled={loading}
            style={{
              padding: '8px 12px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            再取得
          </button>
        </div>
      </header>

      {/* アラート（あれば表示） */}
      {!!c.alertTitle && (
        <div style={{
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          color: '#7c2d12',
          borderRadius: 10,
          padding: '8px 12px',
          marginBottom: 10
        }}>
          ⚠️ {c.alertTitle}
        </div>
      )}

      {error && (
        <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>
      )}

      <section style={{
        marginTop: 12,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ height: 96, background: '#f3f4f6', borderRadius: 10 }} />
            <div style={{ height: 96, background: '#f3f4f6', borderRadius: 10 }} />
          </div>
        ) : !cw ? (
          <p style={{ margin: 0, color: '#6b7280' }}>データなし</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
            {/* 左：現在の天気（大きく） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>{emojiFromCondition(c.condition)}</div>
              <div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>
                  {fmtNum(c.temperature, c.unitLabels.temp)}
                </div>
                <div style={{ fontSize: 16, color: '#374151' }}>
                  {c.condition ?? '—'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  {c.location ? `${c.location} / ` : ''}{pref}
                </div>
                {c.nowcastSummary && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#4b5563' }}>
                    {c.nowcastSummary}
                  </div>
                )}
                {(d.dayCap || d.nightCap) && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#4b5563' }}>
                    今日: {d.dayCap ?? '—'}{d.nightCap ? ` ／ 夜: ${d.nightCap}` : ''}
                  </div>
                )}
                {/* ★ 日の出/日の入（小さく表示） */}
                {(d.sunrise || d.sunset) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                    <span style={{ marginRight: 12 }}>
                      🌅 {fmtTimeAtOffset(d.sunrise, d.utcOffset)}
                    </span>
                    <span>
                      🌇 {fmtTimeAtOffset(d.sunset, d.utcOffset)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 右：必要な情報のみの統計 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 }}>
              {/* 今日（TodaysForecast） */}
              {typeof d.high === 'number'   && <Stat label="最高" value={`${Math.round(d.high)}${c.unitLabels.temp}`} />}
              {typeof d.low === 'number'    && <Stat label="最低" value={`${Math.round(d.low)}${c.unitLabels.temp}`} />}
              {typeof d.precip === 'number' && <Stat label="降水確率" value={`${Math.round(d.precip)}%`} />}

              {/* 現在（CurrentWeather） */}
              {typeof c.humidity === 'number' && <Stat label="湿度" value={`${Math.round(c.humidity)}%`} />}
              {typeof c.windSpeed === 'number' && <Stat label="風" value={`${Math.round(c.windSpeed)} ${c.unitLabels.speed}`} />}
              {typeof c.windDir === 'number' && <Stat label="風向" value={windArrow(c.windDir)} />}
              {c.observedAt && <Stat label="更新" value={fmtTime(c.observedAt)} />}

              {/* UV指数（現在優先 → 今日） */}
              {typeof (c.uv ?? d.uv) === 'number' && (
                <Stat
                  label="UV指数"
                  value={fmtUv(
                    (c.uv ?? d.uv) as number,
                    c.uv !== undefined ? c.uvDesc : d.uvDesc
                  )}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {/* 開発用：生JSON 表示トグル */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
          <span>生JSONを表示（開発用）</span>
        </label>
        <small style={{ color: '#6b7280' }}>Console: <code>__MSN__</code> でも参照可</small>
      </div>

      {showRaw && (
        <section style={{ marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 320 }}>
              {JSON.stringify(cw, null, 2)}
            </pre>
            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 320 }}>
              {JSON.stringify(today, null, 2)}
            </pre>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify({ cw, today }, null, 2))}
            style={{ marginTop: 8 }}
          >
            クリップボードにコピー
          </button>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #eef2f7',
      borderRadius: 10,
      padding: '10px 12px'
    }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
