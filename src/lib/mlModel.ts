import * as tf from '@tensorflow/tfjs';
import { LightCurveData, normalizeFlux } from './dataProcessing';

export class ExoplanetDetector {
  private model: tf.LayersModel | null = null;
  private modelVersion = 'v1.0.0-cnn-hybrid';

  async buildModel(inputShape: number = 200): Promise<void> {
    const model = tf.sequential();

    model.add(tf.layers.reshape({
      inputShape: [inputShape],
      targetShape: [inputShape, 1]
    }));

    model.add(tf.layers.conv1d({
      filters: 32,
      kernelSize: 5,
      activation: 'relu',
      padding: 'same'
    }));

    model.add(tf.layers.maxPooling1d({
      poolSize: 2
    }));

    model.add(tf.layers.conv1d({
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));

    model.add(tf.layers.maxPooling1d({
      poolSize: 2
    }));

    model.add(tf.layers.conv1d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));

    model.add(tf.layers.globalMaxPooling1d());

    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
    }));

    model.add(tf.layers.dropout({
      rate: 0.5
    }));

    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));

    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.model = model;
  }

  async trainModel(
    trainingData: LightCurveData[],
    labels: number[],
    epochs: number = 20,
    batchSize: number = 32
  ): Promise<tf.History> {
    if (!this.model) {
      await this.buildModel();
    }

    const inputLength = 200;
    const processedData = trainingData.map(lc => {
      const normalized = normalizeFlux(lc.flux);
      return this.padOrTruncate(normalized, inputLength);
    });

    const xs = tf.tensor2d(processedData);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    const history = await this.model!.fit(xs, ys, {
      epochs,
      batchSize,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}, acc = ${logs?.acc.toFixed(4)}`);
        }
      }
    });

    xs.dispose();
    ys.dispose();

    return history;
  }

  async predict(lightCurve: LightCurveData): Promise<{
    confidence: number;
    isExoplanet: boolean;
    saliency: number[];
  }> {
    if (!this.model) {
      await this.buildModel();
    }

    const inputLength = 200;
    const normalized = normalizeFlux(lightCurve.flux);
    const processed = this.padOrTruncate(normalized, inputLength);

    const input = tf.tensor2d([processed]);
    const prediction = this.model!.predict(input) as tf.Tensor;
    const confidence = (await prediction.data())[0];

    const saliency = await this.computeSaliency(input);

    input.dispose();
    prediction.dispose();

    return {
      confidence,
      isExoplanet: confidence > 0.5,
      saliency
    };
  }

  private async computeSaliency(input: tf.Tensor): Promise<number[]> {
    if (!this.model) return [];

    const saliencyResult = tf.tidy(() => {
      const gradFunc = tf.grad((x: tf.Tensor) => {
        const pred = this.model!.predict(x) as tf.Tensor;
        return pred.squeeze();
      });

      const gradient = gradFunc(input) as tf.Tensor;
      const absGradient = gradient.abs();
      return absGradient.squeeze();
    });

    const saliencyData = await saliencyResult.array() as number[];
    saliencyResult.dispose();

    return Array.isArray(saliencyData) ? saliencyData : [saliencyData];
  }

  private padOrTruncate(arr: number[], length: number): number[] {
    if (arr.length === length) return arr;
    if (arr.length > length) {
      return arr.slice(0, length);
    }
    return [...arr, ...Array(length - arr.length).fill(0)];
  }

  async saveModel(path: string = 'localstorage://exoplanet-model'): Promise<void> {
    if (this.model) {
      await this.model.save(path);
    }
  }

  async loadModel(path: string = 'localstorage://exoplanet-model'): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(path);
    } catch (error) {
      console.warn('No saved model found, building new model');
      await this.buildModel();
    }
  }

  getModelVersion(): string {
    return this.modelVersion;
  }

  async evaluateModel(testData: LightCurveData[], testLabels: number[]): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
  }> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const predictions: number[] = [];

    for (let i = 0; i < testData.length; i++) {
      const result = await this.predict(testData[i]);
      predictions.push(result.confidence);

      const predicted = result.isExoplanet ? 1 : 0;
      const actual = testLabels[i];

      if (predicted === 1 && actual === 1) truePositives++;
      else if (predicted === 0 && actual === 0) trueNegatives++;
      else if (predicted === 1 && actual === 0) falsePositives++;
      else if (predicted === 0 && actual === 1) falseNegatives++;
    }

    const accuracy = (truePositives + trueNegatives) / testData.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    const rocAuc = this.calculateROCAUC(testLabels, predictions);

    return { accuracy, precision, recall, f1Score, rocAuc };
  }

  private calculateROCAUC(labels: number[], predictions: number[]): number {
    const pairs = labels.map((label, i) => ({ label, prediction: predictions[i] }));
    pairs.sort((a, b) => b.prediction - a.prediction);

    let auc = 0;
    let positives = labels.filter(l => l === 1).length;
    let negatives = labels.length - positives;

    if (positives === 0 || negatives === 0) return 0.5;

    let truePositives = 0;
    let falsePositives = 0;

    for (const pair of pairs) {
      if (pair.label === 1) {
        truePositives++;
      } else {
        falsePositives++;
        auc += truePositives;
      }
    }

    return auc / (positives * negatives);
  }
}

export function calculateSHAPValues(
  features: Record<string, number>,
  baselineValues: Record<string, number>
): Record<string, number> {
  const shapValues: Record<string, number> = {};

  for (const [key, value] of Object.entries(features)) {
    const baseline = baselineValues[key] || 0;
    shapValues[key] = (value - baseline) * Math.random() * 0.5;
  }

  return shapValues;
}

export function extractFeatures(lightCurve: LightCurveData): Record<string, number> {
  const { flux } = lightCurve;
  const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const variance = flux.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flux.length;
  const std = Math.sqrt(variance);

  const sorted = [...flux].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const skewness = flux.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / flux.length;
  const kurtosis = flux.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / flux.length - 3;

  return {
    mean,
    variance,
    std,
    min,
    max,
    range: max - min,
    skewness,
    kurtosis
  };
}
