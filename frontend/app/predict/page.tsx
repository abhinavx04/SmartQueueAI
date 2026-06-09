"use client";

import { useState } from "react";
import PredictionForm from "@/components/prediction-form";
import { predictCongestion } from "@/services/api";
import type { PredictionRequest, PredictionResponse } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { getCongestionLevel, getCongestionColor } from "@/types";

export default function PredictionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async (data: PredictionRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Basic validation
    if (!data.line || !data.station || !data.direction) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await predictCongestion(data);
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching the prediction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Predict Congestion
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Get real-time AI predictions for station congestion and wait times.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prediction Parameters</CardTitle>
          <CardDescription>
            Select the station and time parameters to generate a prediction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PredictionForm
            includeStation={true}
            loading={loading}
            onSubmit={handlePredict}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Predicted Congestion</CardTitle>
              <CardDescription>Estimated crowding level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  {result.predicted_congestion.toFixed(1)}%
                </span>
                <span
                  className={`text-sm font-semibold capitalize ${getCongestionColor(
                    getCongestionLevel(result.predicted_congestion)
                  )}`}
                >
                  {getCongestionLevel(result.predicted_congestion)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estimated Wait Time</CardTitle>
              <CardDescription>Expected delay or queue time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  {result.estimated_wait_time.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-slate-500">
                  minutes
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
