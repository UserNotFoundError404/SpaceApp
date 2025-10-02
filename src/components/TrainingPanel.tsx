import React, { useState } from 'react';
import { Brain, Play, Database, TrendingUp } from 'lucide-react';
import { ExoplanetDetector } from '../lib/mlModel';
import { generateTrainingDataset } from '../lib/nasaAPI';
import { supabase } from '../lib/supabase';

interface TrainingPanelProps {
  onTrainingComplete?: (detector: ExoplanetDetector) => void;
}

export function TrainingPanel({ onTrainingComplete }: TrainingPanelProps) {
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
  }>({});

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleTrain = async () => {
    setTraining(true);
    setProgress(0);
    setLogs([]);

    try {
      addLog('Initializing ML model...');
      const detector = new ExoplanetDetector();
      await detector.buildModel();

      addLog('Generating training dataset (50 exoplanet + 50 non-planet)...');
      setProgress(10);
      const dataset = generateTrainingDataset(50, 50);

      addLog('Storing training data in Supabase...');
      for (let i = 0; i < Math.min(10, dataset.length); i++) {
        const item = dataset[i];
        await supabase.from('training_data').insert({
          source: 'synthetic',
          label: item.label === 1,
          features: {
            length: item.lightCurve.flux.length,
            mean: item.lightCurve.flux.reduce((a, b) => a + b, 0) / item.lightCurve.flux.length
          },
          used_for_training: true
        });
      }

      setProgress(30);
      addLog('Preprocessing light curves...');

      const trainingData = dataset.map(d => d.lightCurve);
      const labels = dataset.map(d => d.label);

      addLog(`Training on ${trainingData.length} samples...`);
      setProgress(40);

      await detector.trainModel(trainingData, labels, 15, 16);

      setProgress(80);
      addLog('Evaluating model performance...');

      const testDataset = generateTrainingDataset(10, 10);
      const testData = testDataset.map(d => d.lightCurve);
      const testLabels = testDataset.map(d => d.label);

      const evaluation = await detector.evaluateModel(testData, testLabels);

      setMetrics({
        accuracy: evaluation.accuracy,
        precision: evaluation.precision,
        recall: evaluation.recall,
        f1Score: evaluation.f1Score
      });

      addLog(`Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
      addLog(`Precision: ${(evaluation.precision * 100).toFixed(2)}%`);
      addLog(`Recall: ${(evaluation.recall * 100).toFixed(2)}%`);
      addLog(`F1 Score: ${(evaluation.f1Score * 100).toFixed(2)}%`);
      addLog(`ROC AUC: ${evaluation.rocAuc.toFixed(4)}`);

      setProgress(90);
      addLog('Saving model...');
      await detector.saveModel();

      setProgress(100);
      addLog('Training complete!');

      if (onTrainingComplete) {
        onTrainingComplete(detector);
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold text-gray-800">Model Training</h3>
            <p className="text-sm text-gray-600">Train CNN-Hybrid model on synthetic Kepler data</p>
          </div>
        </div>
        <button
          onClick={handleTrain}
          disabled={training}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          {training ? 'Training...' : 'Start Training'}
        </button>
      </div>

      {training && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {Object.keys(metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Accuracy</div>
            <div className="text-2xl font-bold text-blue-600">
              {((metrics.accuracy || 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Precision</div>
            <div className="text-2xl font-bold text-green-600">
              {((metrics.precision || 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Recall</div>
            <div className="text-2xl font-bold text-purple-600">
              {((metrics.recall || 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">F1 Score</div>
            <div className="text-2xl font-bold text-orange-600">
              {((metrics.f1Score || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-green-400">Training Log</span>
        </div>
        <div className="space-y-1 font-mono text-xs text-gray-300">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click "Start Training" to begin.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="leading-relaxed">{log}</div>
            ))
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Training Information</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Uses 1D CNN architecture with 3 convolutional layers</li>
              <li>• Trained on synthetic Kepler-like light curves with known labels</li>
              <li>• Includes data augmentation with realistic noise models</li>
              <li>• Model saved to browser localStorage for persistence</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
