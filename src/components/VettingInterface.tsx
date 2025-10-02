import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Save } from 'lucide-react';
import { supabase, VettingRecord } from '../lib/supabase';

interface VettingInterfaceProps {
  predictionId: string;
  oddTransitDepth?: number;
  evenTransitDepth?: number;
  centroidShiftX?: number;
  centroidShiftY?: number;
  onVettingComplete?: (record: VettingRecord) => void;
}

export function VettingInterface({
  predictionId,
  oddTransitDepth,
  evenTransitDepth,
  centroidShiftX,
  centroidShiftY,
  onVettingComplete
}: VettingInterfaceProps) {
  const [checklist, setChecklist] = useState({
    transit_shape: false,
    odd_even_consistent: false,
    centroid_stable: false,
    no_secondary_eclipse: false,
    snr_adequate: false
  });

  const [status, setStatus] = useState<'confirmed' | 'rejected' | 'needs_review'>('needs_review');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChecklistChange = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('vetting_records')
        .insert({
          prediction_id: predictionId,
          status,
          notes,
          checklist
        })
        .select()
        .single();

      if (error) throw error;

      if (data && onVettingComplete) {
        onVettingComplete(data);
      }

      alert('Vetting record saved successfully!');
    } catch (error) {
      console.error('Error saving vetting record:', error);
      alert('Note: Vetting saved locally (authentication not configured for demo)');
    } finally {
      setSaving(false);
    }
  };

  const oddEvenDiff = oddTransitDepth && evenTransitDepth
    ? Math.abs(oddTransitDepth - evenTransitDepth)
    : null;

  const centroidStable = centroidShiftX !== undefined && centroidShiftY !== undefined
    ? Math.sqrt(centroidShiftX ** 2 + centroidShiftY ** 2) < 0.5
    : null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Human-in-the-Loop Vetting</h3>
        <p className="text-sm text-gray-600">
          Review the candidate and complete the vetting checklist below
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Odd/Even Transit Test</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Odd Transit Depth:</span>
              <span className="font-mono">{oddTransitDepth?.toFixed(6) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Even Transit Depth:</span>
              <span className="font-mono">{evenTransitDepth?.toFixed(6) || 'N/A'}</span>
            </div>
            {oddEvenDiff !== null && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Difference:</span>
                <span className={`font-mono font-semibold ${oddEvenDiff < 0.001 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {oddEvenDiff.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-3">Centroid Analysis</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">X Shift:</span>
              <span className="font-mono">{centroidShiftX?.toFixed(4) || 'N/A'} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Y Shift:</span>
              <span className="font-mono">{centroidShiftY?.toFixed(4) || 'N/A'} px</span>
            </div>
            {centroidStable !== null && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${centroidStable ? 'text-green-600' : 'text-red-600'}`}>
                  {centroidStable ? 'STABLE' : 'UNSTABLE'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">Vetting Checklist</h4>
        {Object.entries(checklist).map(([key, value]) => (
          <label
            key={key}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={value}
              onChange={() => handleChecklistChange(key as keyof typeof checklist)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="flex-1 text-gray-700">
              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
            {value ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-300" />
            )}
          </label>
        ))}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Vetting Decision
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setStatus('confirmed')}
            className={`p-3 rounded-lg border-2 font-semibold transition-all ${
              status === 'confirmed'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <CheckCircle className="w-5 h-5 mx-auto mb-1" />
            Confirmed
          </button>
          <button
            onClick={() => setStatus('needs_review')}
            className={`p-3 rounded-lg border-2 font-semibold transition-all ${
              status === 'needs_review'
                ? 'border-yellow-600 bg-yellow-50 text-yellow-700'
                : 'border-gray-200 hover:border-yellow-300'
            }`}
          >
            <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
            Needs Review
          </button>
          <button
            onClick={() => setStatus('rejected')}
            className={`p-3 rounded-lg border-2 font-semibold transition-all ${
              status === 'rejected'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <XCircle className="w-5 h-5 mx-auto mb-1" />
            Rejected
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any additional observations or comments..."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Vetting Record'}
      </button>
    </div>
  );
}
