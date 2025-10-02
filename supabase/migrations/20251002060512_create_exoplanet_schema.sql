/*
  # Exoplanet Detection System Schema

  1. New Tables
    - `light_curves`
      - `id` (uuid, primary key)
      - `kepler_id` (text, unique identifier from NASA)
      - `raw_data` (jsonb, stores time-series flux data)
      - `processed_data` (jsonb, detrended light curve)
      - `metadata` (jsonb, stellar parameters, mission info)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `predictions`
      - `id` (uuid, primary key)
      - `light_curve_id` (uuid, foreign key)
      - `model_version` (text)
      - `confidence_score` (float)
      - `is_exoplanet` (boolean)
      - `transit_depth` (float)
      - `period` (float)
      - `odd_even_depth` (jsonb, stores odd/even transit comparison)
      - `centroid_shift` (jsonb)
      - `explanation_data` (jsonb, SHAP values, saliency maps)
      - `created_at` (timestamptz)
    
    - `vetting_records`
      - `id` (uuid, primary key)
      - `prediction_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key to auth.users)
      - `status` (text, confirmed/rejected/needs_review)
      - `notes` (text)
      - `checklist` (jsonb, vetting checklist items)
      - `created_at` (timestamptz)
    
    - `training_data`
      - `id` (uuid, primary key)
      - `source` (text, kepler/tess/synthetic)
      - `label` (boolean, true=exoplanet)
      - `features` (jsonb)
      - `used_for_training` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for light_curves and predictions (for demo purposes)
    - Authenticated users can create vetting records
    - Only authenticated users can manage training data
*/

-- Light curves table
CREATE TABLE IF NOT EXISTS light_curves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kepler_id text UNIQUE NOT NULL,
  raw_data jsonb NOT NULL,
  processed_data jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_light_curves_kepler_id ON light_curves(kepler_id);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  light_curve_id uuid REFERENCES light_curves(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  confidence_score float NOT NULL,
  is_exoplanet boolean NOT NULL,
  transit_depth float,
  period float,
  odd_even_depth jsonb DEFAULT '{}'::jsonb,
  centroid_shift jsonb DEFAULT '{}'::jsonb,
  explanation_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_light_curve ON predictions(light_curve_id);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON predictions(confidence_score DESC);

-- Vetting records table
CREATE TABLE IF NOT EXISTS vetting_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid REFERENCES predictions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  status text NOT NULL CHECK (status IN ('confirmed', 'rejected', 'needs_review')),
  notes text DEFAULT '',
  checklist jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vetting_records_prediction ON vetting_records(prediction_id);
CREATE INDEX IF NOT EXISTS idx_vetting_records_status ON vetting_records(status);

-- Training data table
CREATE TABLE IF NOT EXISTS training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  label boolean NOT NULL,
  features jsonb NOT NULL,
  used_for_training boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_data_label ON training_data(label);

-- Enable Row Level Security
ALTER TABLE light_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for light_curves (public read for demo)
CREATE POLICY "Anyone can view light curves"
  ON light_curves FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert light curves"
  ON light_curves FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for predictions (public read for demo)
CREATE POLICY "Anyone can view predictions"
  ON predictions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for vetting_records
CREATE POLICY "Anyone can view vetting records"
  ON vetting_records FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert vetting records"
  ON vetting_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vetting records"
  ON vetting_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for training_data
CREATE POLICY "Anyone can view training data"
  ON training_data FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage training data"
  ON training_data FOR INSERT
  TO authenticated
  WITH CHECK (true);