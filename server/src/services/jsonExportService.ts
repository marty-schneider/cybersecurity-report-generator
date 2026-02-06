import { prisma } from '../utils/db.js'

export const jsonExportService = {
  async exportProject(projectId: string): Promise<string> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        findings: {
          include: {
            remediationNotes: {
              include: {
                author: { select: { name: true, email: true } },
              },
            },
            complianceMappings: {
              include: {
                complianceControl: {
                  include: { framework: { select: { name: true, shortCode: true } } },
                },
              },
            },
          },
        },
        iocs: true,
        ttpMappings: true,
        creator: { select: { name: true, email: true } },
        members: {
          include: { project: false },
        },
      },
    })

    if (!project) throw new Error('Project not found')

    return JSON.stringify(project, null, 2)
  },
}
