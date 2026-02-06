import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FindingsOverTimeEntry } from '../../types'

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#991b1b',
  HIGH: '#dc2626',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
  INFO: '#6b7280',
}

interface Props {
  data: FindingsOverTimeEntry[]
  range: string
  onRangeChange: (range: string) => void
}

export default function FindingsOverTimeChart({ data, range, onRangeChange }: Props) {
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Findings Over Time</h3>
        <div className="flex gap-1">
          {['7d', '30d', '90d', '365d'].map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2 py-1 text-xs rounded ${
                range === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No findings in this time range</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {Object.keys(SEVERITY_COLORS).map((severity) => (
              <Area
                key={severity}
                type="monotone"
                dataKey={severity}
                stackId="1"
                stroke={SEVERITY_COLORS[severity]}
                fill={SEVERITY_COLORS[severity]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
