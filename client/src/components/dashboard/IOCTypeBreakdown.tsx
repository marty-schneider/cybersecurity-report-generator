import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { IOCTypeBreakdownEntry } from '../../types'

interface Props {
  data: IOCTypeBreakdownEntry[]
}

export default function IOCTypeBreakdown({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">IOC Type Breakdown</h3>
        <p className="text-gray-500 text-sm text-center py-8">No IOC data available</p>
      </div>
    )
  }

  // Format type names for display
  const formatted = data
    .sort((a, b) => b.count - a.count)
    .map(d => ({
      ...d,
      label: d.type.replace(/_/g, ' '),
    }))

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">IOC Type Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={110} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
