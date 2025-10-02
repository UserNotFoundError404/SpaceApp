import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LightCurve {
  id: string;
  kepler_id: string;
  raw_data: {
    time: number[];
    flux: number[];
  };
  processed_data?: {
    time: number[];
    flux: number[];
  };
  metadata: {
    keplerName?: string;
    teff?: number;
    radius?: number;
    mission?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  light_curve_id: string;
  model_version: string;
  confidence_score: number;
  is_exoplanet: boolean;
  transit_depth?: number;
  period?: number;
  odd_even_depth: {
    odd?: number;
    even?: number;
  };
  centroid_shift: {
    x?: number;
    y?: number;
  };
  explanation_data: {
    saliency?: number[];
    shap_values?: number[];
    feature_importance?: Record<string, number>;
  };
  created_at: string;
}

export interface VettingRecord {
  id: string;
  prediction_id: string;
  user_id?: string;
  status: 'confirmed' | 'rejected' | 'needs_review';
  notes: string;
  checklist: {
    transit_shape: boolean;
    odd_even_consistent: boolean;
    centroid_stable: boolean;
    no_secondary_eclipse: boolean;
    snr_adequate: boolean;
  };
  created_at: string;
}
