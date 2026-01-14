// Example usage of IOCBasedFindingModal in ProjectDetail page

import { useState } from 'react'
import IOCBasedFindingModal from './IOCBasedFindingModal'
import Button from '../common/Button'
import { Finding } from '../../types'

export default function ProjectDetailExample() {
  const [isIOCModalOpen, setIsIOCModalOpen] = useState(false)
  const [findings, setFindings] = useState<Finding[]>([])
  const projectId = 'your-project-id'

  const handleFindingCreated = (newFinding: Finding) => {
    setFindings([newFinding, ...findings])
    console.log('New finding created:', newFinding)
  }

  return (
    <div>
      {/* Trigger Button */}
      <Button onClick={() => setIsIOCModalOpen(true)}>
        Create Finding from IOC
      </Button>

      {/* Modal Component */}
      <IOCBasedFindingModal
        isOpen={isIOCModalOpen}
        onClose={() => setIsIOCModalOpen(false)}
        projectId={projectId}
        onFindingCreated={handleFindingCreated}
      />

      {/* Your existing findings list */}
      <div className="mt-6">
        {findings.map(finding => (
          <div key={finding.id} className="card mb-4">
            <h3>{finding.title}</h3>
            <p>{finding.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
