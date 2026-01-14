import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { cveService } from '../services/cveService.js'
import { remediationService, IOCType } from '../services/remediationService.js'
import { logger } from '../utils/logger.js'

export const getFindings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.query
    const userId = req.user!.id

    if (!projectId) {
      throw new AppError('Project ID is required', 400)
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId as string,
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
    })

    if (!project) {
      throw new AppError('Project not found or access denied', 404)
    }

    const findings = await prisma.finding.findMany({
      where: { projectId: projectId as string },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { severity: 'asc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
    })

    res.json(findings)
  } catch (error) {
    next(error)
  }
}

export const getFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const finding = await prisma.finding.findFirst({
      where: {
        id,
        project: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId } } },
          ],
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!finding) {
      throw new AppError('Finding not found', 404)
    }

    res.json(finding)
  } catch (error) {
    next(error)
  }
}

export const createFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const {
      projectId,
      title,
      description,
      severity,
      cvssScore,
      affectedSystems,
      evidence,
      remediation,
      assignedTo,
    } = req.body

    if (!projectId || !title || !description || !severity || !remediation) {
      throw new AppError(
        'Project ID, title, description, severity, and remediation are required',
        400
      )
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    })

    if (!project) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

    const finding = await prisma.finding.create({
      data: {
        projectId,
        title,
        description,
        severity,
        cvssScore: cvssScore ? parseFloat(cvssScore) : null,
        affectedSystems: affectedSystems || [],
        evidence,
        remediation,
        assignedTo,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.status(201).json(finding)
  } catch (error) {
    next(error)
  }
}

export const updateFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const {
      title,
      description,
      severity,
      cvssScore,
      affectedSystems,
      evidence,
      remediation,
      status,
      assignedTo,
    } = req.body

    // Verify user has access
    const existing = await prisma.finding.findFirst({
      where: {
        id,
        project: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
          ],
        },
      },
    })

    if (!existing) {
      throw new AppError('Finding not found or insufficient permissions', 404)
    }

    const updateData: any = {}
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (severity) updateData.severity = severity
    if (cvssScore !== undefined) updateData.cvssScore = cvssScore ? parseFloat(cvssScore) : null
    if (affectedSystems) updateData.affectedSystems = affectedSystems
    if (evidence !== undefined) updateData.evidence = evidence
    if (remediation) updateData.remediation = remediation
    if (status) updateData.status = status
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    const finding = await prisma.finding.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json(finding)
  } catch (error) {
    next(error)
  }
}

export const deleteFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Verify user has access
    const existing = await prisma.finding.findFirst({
      where: {
        id,
        project: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
          ],
        },
      },
    })

    if (!existing) {
      throw new AppError('Finding not found or insufficient permissions', 404)
    }

    await prisma.finding.delete({ where: { id } })

    res.json({ message: 'Finding deleted successfully' })
  } catch (error) {
    next(error)
  }
}

/**
 * Create a finding from an IOC with AI-powered content generation
 *
 * This endpoint accepts either an existing IOC ID or new IOC data, enriches it with
 * CVE data if applicable, and uses AI to generate comprehensive finding content including
 * title, description, remediation steps, and severity assessment.
 *
 * @route POST /api/findings/from-ioc
 * @access Protected - Requires authentication and project access
 *
 * @param {Object} req.body
 * @param {string} req.body.projectId - Required. The project ID where the finding will be created
 * @param {string} [req.body.iocId] - Optional. ID of an existing IOC to use
 * @param {Object} [req.body.iocData] - Optional. Data for creating a new IOC
 * @param {IOCType} req.body.iocData.type - Type of IOC (IP_ADDRESS, CVE, FILE_HASH_SHA256, etc.)
 * @param {string} req.body.iocData.value - Value of the IOC
 * @param {string} req.body.iocData.timestamp - Timestamp when the IOC was detected
 * @param {string} [req.body.iocData.context] - Additional context about the IOC
 * @param {string} [req.body.iocData.source] - Source of the IOC
 * @param {Object} [req.body.iocData.enrichmentData] - Additional enrichment data
 * @param {string} [req.body.context] - Additional context (used if iocData.context not provided)
 * @param {string[]} [req.body.affectedSystems] - List of affected systems
 *
 * @returns {Object} 201 - Finding created successfully
 * @returns {Object} response.finding - The created finding object
 * @returns {Object} response.metadata - Metadata about the AI generation
 * @returns {boolean} response.metadata.isAIGenerated - Always true
 * @returns {string} response.metadata.iocId - ID of the associated IOC
 * @returns {string} response.metadata.iocType - Type of the IOC
 * @returns {string} response.metadata.iocValue - Value of the IOC
 * @returns {boolean} response.metadata.cveDataAvailable - Whether CVE data was found
 *
 * @throws {400} Missing required fields or invalid input
 * @throws {404} Project not found or IOC not found
 * @throws {500} AI generation failed or database error
 *
 * @example
 * // Create finding from existing IOC
 * POST /api/findings/from-ioc
 * {
 *   "projectId": "abc123",
 *   "iocId": "ioc-123",
 *   "affectedSystems": ["server-01", "server-02"]
 * }
 *
 * @example
 * // Create finding from new CVE IOC
 * POST /api/findings/from-ioc
 * {
 *   "projectId": "abc123",
 *   "iocData": {
 *     "type": "CVE",
 *     "value": "CVE-2021-44228",
 *     "timestamp": "2024-01-15T10:30:00Z",
 *     "context": "Detected during vulnerability scan"
 *   },
 *   "affectedSystems": ["server-01", "server-02", "server-03"]
 * }
 */
export const createFindingFromIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { iocId, iocData, context, affectedSystems, projectId } = req.body

    // Validate input
    if (!projectId) {
      throw new AppError('Project ID is required', 400)
    }

    if (!iocId && !iocData) {
      throw new AppError('Either iocId or iocData must be provided', 400)
    }

    if (iocData && (!iocData.type || !iocData.value || !iocData.timestamp)) {
      throw new AppError('iocData must include type, value, and timestamp', 400)
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    })

    if (!project) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

    logger.info(`Creating finding from IOC for project: ${projectId}`)

    // Step 1: Get or create IOC
    let ioc: any
    if (iocId) {
      // Fetch existing IOC
      ioc = await prisma.iOC.findFirst({
        where: {
          id: iocId,
          projectId,
        },
      })

      if (!ioc) {
        throw new AppError('IOC not found or does not belong to this project', 404)
      }

      logger.info(`Using existing IOC: ${ioc.id} (${ioc.type}: ${ioc.value})`)
    } else if (iocData) {
      // Create new IOC
      ioc = await prisma.iOC.create({
        data: {
          projectId,
          type: iocData.type,
          value: iocData.value,
          timestamp: new Date(iocData.timestamp),
          context: iocData.context || context,
          source: iocData.source,
          enrichmentData: iocData.enrichmentData,
        },
      })

      logger.info(`Created new IOC: ${ioc.id} (${ioc.type}: ${ioc.value})`)
    }

    // Step 2: For CVE type IOCs, lookup CVE data
    let cveData: any = null
    let cveIdentifier: string | null = null

    if (ioc.type === IOCType.CVE && ioc.value) {
      const cveId = ioc.value as string
      cveIdentifier = cveId
      logger.info(`Looking up CVE data for: ${cveId}`)

      try {
        cveData = await cveService.lookupCVE(cveId)

        if (cveData) {
          logger.info(`CVE data found: ${cveData.cveId}, Score: ${cveData.cvssScore}, Severity: ${cveData.severity}`)

          // Map CVE data to RemediationService format
          cveData = {
            id: cveData.cveId,
            description: cveData.description,
            cvssScore: cveData.cvssScore,
            cvssVector: cveData.cvssVector,
            severity: cveData.severity,
            publishedDate: cveData.published?.toISOString(),
            references: cveData.references,
            affectedProducts: cveData.affectedProducts,
          }
        } else {
          logger.warn(`CVE data not found for: ${cveId}`)
        }
      } catch (error: any) {
        // Log but don't fail - proceed without CVE data
        logger.error(`CVE lookup failed for ${cveId}:`, error.message)
        logger.info('Proceeding without CVE data')
      }
    }

    // Step 3: Generate remediation using AI
    logger.info('Generating AI remediation content')

    let remediationOutput
    try {
      remediationOutput = await remediationService.generateRemediation({
        ioc: {
          type: ioc.type as IOCType,
          value: ioc.value,
          timestamp: new Date(ioc.timestamp),
          context: ioc.context || context,
        },
        cveData,
        affectedSystems: affectedSystems || [],
      })

      logger.info('AI remediation generated successfully')
    } catch (error: any) {
      logger.error('AI remediation generation failed:', error)
      throw new AppError(
        'Failed to generate AI content for finding. Please try manual entry or contact support.',
        500
      )
    }

    // Step 4: Create finding with AI-generated content
    logger.info('Creating finding with AI-generated content')

    const finding = await prisma.finding.create({
      data: {
        projectId,
        title: remediationOutput.title,
        description: remediationOutput.description,
        severity: remediationOutput.suggestedSeverity,
        cvssScore: cveData?.cvssScore || null,
        cveIdentifier,
        affectedSystems: remediationOutput.affectedSystems,
        evidence: remediationOutput.evidence,
        remediation: remediationOutput.remediation,
        aiGenerated: true,
        userModified: false,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    logger.info(`Finding created: ${finding.id}`)

    // Step 5: Create IOCFinding link
    await prisma.iOCFinding.create({
      data: {
        iocId: ioc.id,
        findingId: finding.id,
        relevance: 'AI-generated finding based on IOC analysis',
      },
    })

    logger.info(`IOC-Finding link created: IOC ${ioc.id} -> Finding ${finding.id}`)

    // Step 6: Return finding with metadata
    const response = {
      finding,
      metadata: {
        isAIGenerated: true,
        iocId: ioc.id,
        iocType: ioc.type,
        iocValue: ioc.value,
        cveDataAvailable: !!cveData,
      },
    }

    res.status(201).json(response)
  } catch (error) {
    next(error)
  }
}
