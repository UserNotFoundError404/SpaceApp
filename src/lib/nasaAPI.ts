import { LightCurveData } from './dataProcessing';

export interface KeplerTarget {
  kepid: string;
  keplerName: string;
  teff: number;
  radius: number;
  mission: string;
}

export async function fetchKeplerLightCurve(keplerId: string): Promise<LightCurveData | null> {
  try {
    console.log(`Fetching light curve for Kepler ${keplerId} from MAST archive`);

    return null;
  } catch (error) {
    console.error('Error fetching from MAST:', error);
    return null;
  }
}

export function generateMockKeplerData(keplerId: string, hasExoplanet: boolean = false): {
  lightCurve: LightCurveData;
  metadata: KeplerTarget;
} {
  const baseLength = 1000 + Math.floor(Math.random() * 500);
  const time = Array.from({ length: baseLength }, (_, i) => i * 0.02);
  let flux = time.map(() => 1.0 + (Math.random() - 0.5) * 0.002);

  if (hasExoplanet) {
    const period = 2 + Math.random() * 15;
    const depth = 0.003 + Math.random() * 0.02;
    const duration = 0.04 + Math.random() * 0.08;
    const phase0 = Math.random();

    time.forEach((t, i) => {
      const phase = ((t / period + phase0) % 1);
      if (phase < duration || phase > (1 - duration * 0.1)) {
        const normalizedPhase = phase < duration ? phase / duration : 1;
        const transitShape = 0.5 * (1 - Math.cos(Math.PI * normalizedPhase));
        flux[i] *= (1 - depth * transitShape);
      }
    });

    for (let i = 0; i < flux.length; i += Math.floor(period / 0.02)) {
      const start = i;
      const end = Math.min(i + Math.floor(duration * period / 0.02), flux.length);
      for (let j = start; j < end; j++) {
        const localPhase = (j - start) / (end - start);
        const transitShape = 0.5 * (1 - Math.cos(Math.PI * localPhase));
        flux[j] *= (1 - depth * transitShape);
      }
    }
  }

  const metadata: KeplerTarget = {
    kepid: keplerId,
    keplerName: `Kepler-${keplerId}`,
    teff: 4500 + Math.random() * 3000,
    radius: 0.5 + Math.random() * 2,
    mission: 'Kepler'
  };

  return { lightCurve: { time, flux }, metadata };
}

export function generateTrainingDataset(
  positiveCount: number = 50,
  negativeCount: number = 50
): Array<{ lightCurve: LightCurveData; label: number; metadata: KeplerTarget }> {
  const dataset = [];

  for (let i = 0; i < positiveCount; i++) {
    const { lightCurve, metadata } = generateMockKeplerData(`${1000 + i}`, true);
    dataset.push({ lightCurve, label: 1, metadata });
  }

  for (let i = 0; i < negativeCount; i++) {
    const { lightCurve, metadata } = generateMockKeplerData(`${2000 + i}`, false);
    dataset.push({ lightCurve, label: 0, metadata });
  }

  for (let i = 0; i < dataset.length; i++) {
    const j = Math.floor(Math.random() * dataset.length);
    [dataset[i], dataset[j]] = [dataset[j], dataset[i]];
  }

  return dataset;
}

export const KNOWN_EXOPLANET_SYSTEMS = [
  { id: 'K-10b', name: 'Kepler-10b', confirmed: true },
  { id: 'K-186f', name: 'Kepler-186f', confirmed: true },
  { id: 'K-452b', name: 'Kepler-452b', confirmed: true },
  { id: 'K-22b', name: 'Kepler-22b', confirmed: true },
  { id: 'K-442b', name: 'Kepler-442b', confirmed: true },
  { id: 'K-62e', name: 'Kepler-62e', confirmed: true },
  { id: 'K-62f', name: 'Kepler-62f', confirmed: true },
  { id: 'K-1649c', name: 'Kepler-1649c', confirmed: true },
  { id: 'T-1b', name: 'TRAPPIST-1b', confirmed: true },
  { id: 'T-1e', name: 'TRAPPIST-1e', confirmed: true },
];

export const NASA_DATA_SOURCES = {
  mast: 'https://archive.stsci.edu/',
  exoplanetArchive: 'https://exoplanetarchive.ipac.caltech.edu/',
  lightkurve: 'https://docs.lightkurve.org/',
  keplerData: 'https://keplerscience.arc.nasa.gov/',
  tessData: 'https://heasarc.gsfc.nasa.gov/docs/tess/'
};
