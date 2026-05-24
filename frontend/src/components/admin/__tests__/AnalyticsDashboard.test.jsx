import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsDashboard from '../AnalyticsDashboard';

// Mock the API hook
vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    get: vi.fn().mockResolvedValue({
      data: {
        totalUsers: 100,
        activeUsers: 50,
        dailyActivity: [],
        taskCompletionRate: [],
        topCountries: []
      }
    })
  })
}));

// Mock recharts to avoid rendering complex SVG elements in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart"></div>,
  Line: () => null,
  BarChart: () => <div data-testid="bar-chart"></div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe('AnalyticsDashboard', () => {
  it('should render the dashboard layout', () => {
    render(<AnalyticsDashboard />);
    // Simple check to ensure component mounts without crashing
    expect(document.body).toBeDefined();
  });
});
