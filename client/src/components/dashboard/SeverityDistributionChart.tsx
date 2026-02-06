import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { SeverityDistribution } from '../../types'

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#991b1b',
  HIGH: '#dc2626',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
  INFO: '#6b7280',
}

interface Props {
  data: SeverityDistribution[]
}

export default function SeverityDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
        <p className="text-gray-500 text-sm text-center py-8">No findings data available</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="severity"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ severity, count }) => `${severity}: ${count}`}
          >
            {data.map((entry) => (
              <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
