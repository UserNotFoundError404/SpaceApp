export interface LightCurveData {
  time: number[];
  flux: number[];
}

export function detrendLightCurve(data: LightCurveData): LightCurveData {
  const { time, flux } = data;
  const windowSize = Math.min(101, Math.floor(time.length / 10));

  const detrendedFlux = flux.map((f, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(flux.length, i + Math.floor(windowSize / 2));
    const window = flux.slice(start, end);
    const median = calculateMedian(window);
    return f / median;
  });

  return { time, flux: detrendedFlux };
}

function calculateMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function normalizeFlux(flux: number[]): number[] {
  const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const std = Math.sqrt(
    flux.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flux.length
  );
  return flux.map(f => (f - mean) / (std || 1));
}

export function detectTransits(data: LightCurveData, threshold: number = -3): number[] {
  const normalizedFlux = normalizeFlux(data.flux);
  const transitIndices: number[] = [];

  for (let i = 0; i < normalizedFlux.length; i++) {
    if (normalizedFlux[i] < threshold) {
      transitIndices.push(i);
    }
  }

  return transitIndices;
}

export function calculateBLS(data: LightCurveData): { period: number; depth: number; score: number } {
  const minPeriod = 0.5;
  const maxPeriod = Math.min(20, (data.time[data.time.length - 1] - data.time[0]) / 3);
  const numPeriods = 100;

  let bestPeriod = 0;
  let bestDepth = 0;
  let bestScore = 0;

  for (let i = 0; i < numPeriods; i++) {
    const period = minPeriod + (maxPeriod - minPeriod) * i / numPeriods;
    const { depth, score } = evaluatePeriod(data, period);

    if (score > bestScore) {
      bestScore = score;
      bestPeriod = period;
      bestDepth = depth;
    }
  }

  return { period: bestPeriod, depth: bestDepth, score: bestScore };
}

function evaluatePeriod(data: LightCurveData, period: number): { depth: number; score: number } {
  const { time, flux } = data;
  const phases = time.map(t => (t % period) / period);

  const inTransit: number[] = [];
  const outTransit: number[] = [];

  phases.forEach((phase, i) => {
    if (phase < 0.1 || phase > 0.9) {
      inTransit.push(flux[i]);
    } else {
      outTransit.push(flux[i]);
    }
  });

  if (inTransit.length === 0 || outTransit.length === 0) {
    return { depth: 0, score: 0 };
  }

  const inMean = inTransit.reduce((a, b) => a + b, 0) / inTransit.length;
  const outMean = outTransit.reduce((a, b) => a + b, 0) / outTransit.length;

  const depth = 1 - inMean / outMean;
  const score = Math.abs(depth) * Math.sqrt(inTransit.length);

  return { depth, score };
}

export function foldLightCurve(data: LightCurveData, period: number, epoch: number = 0): LightCurveData {
  const { time, flux } = data;
  const phases = time.map(t => ((t - epoch) % period) / period);

  const sorted = phases
    .map((phase, i) => ({ phase, flux: flux[i] }))
    .sort((a, b) => a.phase - b.phase);

  return {
    time: sorted.map(s => s.phase),
    flux: sorted.map(s => s.flux)
  };
}

export function generateSyntheticLightCurve(
  hasTransit: boolean = false,
  length: number = 1000
): LightCurveData {
  const time = Array.from({ length }, (_, i) => i * 0.02);
  let flux = time.map(() => 1.0 + (Math.random() - 0.5) * 0.001);

  if (hasTransit) {
    const period = 3 + Math.random() * 7;
    const depth = 0.005 + Math.random() * 0.015;
    const duration = 0.05 + Math.random() * 0.05;

    time.forEach((t, i) => {
      const phase = (t % period) / period;
      if (phase < duration) {
        const transitShape = Math.cos(Math.PI * phase / duration);
        flux[i] *= (1 - depth * (1 - transitShape) / 2);
      }
    });
  }

  return { time, flux };
}
