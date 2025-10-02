import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Activity, AlertCircle } from 'lucide-react';

interface ExplanationDashboardProps {
  featureImportance: Record<string, number>;
  shapValues?: Record<string, number>;
  confidence: number;
  isExoplanet: boolean;
}

export function ExplanationDashboard({
  featureImportance,
  shapValues,
  confidence,
  isExoplanet
}: ExplanationDashboardProps) {
  const featureData = Object.entries(featureImportance)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      importance: Math.abs(value) * 100,
      shap: shapValues ? (shapValues[name] || 0) * 100 : 0
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8);

  const getConfidenceColor = (conf: number) => {
    if (conf > 0.8) return 'text-green-600';
    if (conf > 0.6) return 'text-blue-600';
    if (conf > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Model Prediction
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">Classification</div>
            <div className={`text-2xl font-bold ${isExoplanet ? 'text-green-600' : 'text-gray-600'}`}>
              {isExoplanet ? 'EXOPLANET' : 'NON-PLANET'}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">Confidence Score</div>
            <div className={`text-2xl font-bold ${getConfidenceColor(confidence)}`}>
              {(confidence * 100).toFixed(2)}%
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-sm text-gray-600 mb-1">Model Version</div>
            <div className="text-lg font-semibold text-gray-800">
              CNN-Hybrid v1.0
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Feature Importance</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={featureData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" />
            <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
              {featureData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index < 3 ? '#3b82f6' : '#93c5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {shapValues && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">SHAP Values (Explainability)</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            SHAP values show how each feature contributes to the prediction relative to baseline.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={featureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                formatter={(value: number) => value.toFixed(4)}
              />
              <Bar dataKey="shap" name="SHAP Value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Interpretation Guide
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Feature Importance:</strong> Shows which light curve characteristics most influenced the prediction</li>
          <li><strong>SHAP Values:</strong> Quantifies each feature's contribution (positive = supports exoplanet, negative = opposes)</li>
          <li><strong>High variance/depth:</strong> Strong indicators of periodic transits</li>
          <li><strong>Skewness/kurtosis:</strong> Describe the shape of the flux distribution</li>
        </ul>
      </div>
    </div>
  );
}
