import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LightCurveData } from '../lib/dataProcessing';

interface LightCurveChartProps {
  data: LightCurveData;
  title?: string;
  showProcessed?: boolean;
  processedData?: LightCurveData;
  saliency?: number[];
}

export function LightCurveChart({
  data,
  title = 'Light Curve',
  showProcessed = false,
  processedData,
  saliency
}: LightCurveChartProps) {
  const chartData = data.time.map((time, i) => ({
    time: time.toFixed(2),
    flux: data.flux[i],
    processed: processedData ? processedData.flux[i] : undefined,
    saliency: saliency ? saliency[i] * 100 : undefined
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            label={{ value: 'Time (days)', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: 'Normalized Flux', angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="flux"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
            name="Raw Flux"
          />
          {showProcessed && processedData && (
            <Line
              type="monotone"
              dataKey="processed"
              stroke="#10b981"
              dot={false}
              strokeWidth={1.5}
              name="Detrended Flux"
            />
          )}
          {saliency && (
            <Line
              type="monotone"
              dataKey="saliency"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
              name="Saliency (×100)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
