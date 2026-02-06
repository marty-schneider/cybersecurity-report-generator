import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { RiskPostureEntry } from '../../types'

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#991b1b',
  HIGH: '#dc2626',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
  INFO: '#6b7280',
}

interface Props {
  data: RiskPostureEntry[]
}

export default function RiskPostureChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Posture by Project</h3>
        <p className="text-gray-500 text-sm text-center py-8">No project data available</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Posture by Project</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="projectName" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
            <Bar key={severity} dataKey={severity} stackId="a" fill={color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
