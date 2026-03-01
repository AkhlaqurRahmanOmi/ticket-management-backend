import { Injectable } from '@nestjs/common';

type LabelSet = Record<string, string | number | boolean>;

type HistogramState = {
  name: string;
  help: string;
  buckets: number[];
  valuesBySeries: Map<
    string,
    {
      labels: LabelSet;
      bucketCounts: number[];
      count: number;
      sum: number;
    }
  >;
};

@Injectable()
export class MetricsProvider {
  private readonly counters = new Map<
    string,
    {
      name: string;
      help: string;
      labels: LabelSet;
      value: number;
    }
  >();
  private readonly histograms = new Map<string, HistogramState>();

  incrementCounter(
    name: string,
    help: string,
    value = 1,
    labels: LabelSet = {},
  ): void {
    const key = this.buildSeriesKey(name, labels);
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += value;
      return;
    }

    this.counters.set(key, {
      name,
      help,
      labels,
      value,
    });
  }

  observeHistogram(
    name: string,
    help: string,
    observedValue: number,
    labels: LabelSet = {},
    buckets: number[] = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  ): void {
    const normalizedBuckets = [...new Set(buckets)].sort((a, b) => a - b);
    const histogram = this.getOrCreateHistogram(
      name,
      help,
      normalizedBuckets,
    );
    const seriesKey = this.buildSeriesKey(name, labels);

    const existingSeries = histogram.valuesBySeries.get(seriesKey) ?? {
      labels,
      bucketCounts: normalizedBuckets.map(() => 0),
      count: 0,
      sum: 0,
    };

    for (let i = 0; i < normalizedBuckets.length; i += 1) {
      if (observedValue <= normalizedBuckets[i]) {
        existingSeries.bucketCounts[i] += 1;
      }
    }

    existingSeries.count += 1;
    existingSeries.sum += observedValue;
    histogram.valuesBySeries.set(seriesKey, existingSeries);
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    const emittedCounters = new Set<string>();
    const emittedHistograms = new Set<string>();

    for (const counter of this.counters.values()) {
      if (!emittedCounters.has(counter.name)) {
        lines.push(`# HELP ${counter.name} ${counter.help}`);
        lines.push(`# TYPE ${counter.name} counter`);
        emittedCounters.add(counter.name);
      }

      lines.push(
        `${counter.name}${this.formatLabels(counter.labels)} ${counter.value}`,
      );
    }

    for (const histogram of this.histograms.values()) {
      if (!emittedHistograms.has(histogram.name)) {
        lines.push(`# HELP ${histogram.name} ${histogram.help}`);
        lines.push(`# TYPE ${histogram.name} histogram`);
        emittedHistograms.add(histogram.name);
      }

      for (const series of histogram.valuesBySeries.values()) {
        for (let i = 0; i < histogram.buckets.length; i += 1) {
          lines.push(
            `${histogram.name}_bucket${this.formatLabels({
              ...series.labels,
              le: histogram.buckets[i],
            })} ${series.bucketCounts[i]}`,
          );
        }

        lines.push(
          `${histogram.name}_bucket${this.formatLabels({
            ...series.labels,
            le: '+Inf',
          })} ${series.count}`,
        );
        lines.push(
          `${histogram.name}_sum${this.formatLabels(series.labels)} ${series.sum}`,
        );
        lines.push(
          `${histogram.name}_count${this.formatLabels(series.labels)} ${series.count}`,
        );
      }
    }

    return `${lines.join('\n')}\n`;
  }

  getCounterTotal(
    name: string,
    labelsFilter?: Partial<Record<string, string>>,
  ): number {
    let total = 0;

    for (const counter of this.counters.values()) {
      if (counter.name !== name) continue;
      if (!this.matchesLabels(counter.labels, labelsFilter)) continue;
      total += counter.value;
    }

    return total;
  }

  private getOrCreateHistogram(
    name: string,
    help: string,
    buckets: number[],
  ): HistogramState {
    const existing = this.histograms.get(name);
    if (existing) {
      return existing;
    }

    const state: HistogramState = {
      name,
      help,
      buckets,
      valuesBySeries: new Map(),
    };
    this.histograms.set(name, state);
    return state;
  }

  private buildSeriesKey(name: string, labels: LabelSet): string {
    const sortedEntries = Object.entries(labels)
      .map(([k, v]) => [k, String(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return `${name}|${sortedEntries.map(([k, v]) => `${k}=${v}`).join(',')}`;
  }

  private formatLabels(labels: LabelSet): string {
    const entries = Object.entries(labels)
      .map(([k, v]) => [k, String(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) {
      return '';
    }

    const serialized = entries
      .map(([key, value]) => `${key}="${this.escapeLabelValue(value)}"`)
      .join(',');
    return `{${serialized}}`;
  }

  private escapeLabelValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/"/g, '\\"');
  }

  private matchesLabels(
    labels: LabelSet,
    labelsFilter?: Partial<Record<string, string>>,
  ): boolean {
    if (!labelsFilter) {
      return true;
    }

    for (const [key, expected] of Object.entries(labelsFilter)) {
      if (expected === undefined) continue;
      if (String(labels[key]) !== expected) {
        return false;
      }
    }

    return true;
  }
}
