import { MitreHeatmap as MitreHeatmapData } from '../../types'

interface Props {
  data: MitreHeatmapData
}

function getHeatColor(count: number, maxCount: number): string {
  if (maxCount === 0) return 'bg-gray-100'
  const ratio = count / maxCount
  if (ratio > 0.75) return 'bg-red-600 text-white'
  if (ratio > 0.5) return 'bg-red-400 text-white'
  if (ratio > 0.25) return 'bg-orange-300 text-gray-900'
  return 'bg-yellow-200 text-gray-900'
}

export default function MitreHeatmap({ data }: Props) {
  const tactics = Object.keys(data)

  if (tactics.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">MITRE ATT&CK Heatmap</h3>
        <p className="text-gray-500 text-sm text-center py-8">No TTP data available</p>
      </div>
    )
  }

  // Find max count for normalization
  let maxCount = 0
  for (const tactic of tactics) {
    for (const t of data[tactic]) {
      if (t.count > maxCount) maxCount = t.count
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">MITRE ATT&CK Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tactics.map((tactic) => (
            <div key={tactic} className="flex-shrink-0 w-44">
              <div className="bg-gray-800 text-white text-xs font-medium px-2 py-1.5 rounded-t text-center truncate" title={tactic}>
                {tactic}
              </div>
              <div className="border border-gray-200 border-t-0 rounded-b p-1 space-y-1">
                {data[tactic].map((technique) => (
                  <div
                    key={technique.mitreId}
                    className={`text-xs px-2 py-1.5 rounded ${getHeatColor(technique.count, maxCount)}`}
                    title={`${technique.mitreId}: ${technique.technique} (${technique.count})`}
                  >
                    <div className="font-medium truncate">{technique.mitreId}</div>
                    <div className="truncate">{technique.technique}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
