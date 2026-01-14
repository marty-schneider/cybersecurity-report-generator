import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import Anthropic from '@anthropic-ai/sdk'

export const getIOCs = async (
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

    const iocs = await prisma.iOC.findMany({
      where: { projectId: projectId as string },
      orderBy: {
        timestamp: 'desc',
      },
    })

    res.json(iocs)
  } catch (error) {
    next(error)
  }
}

export const getIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const ioc = await prisma.iOC.findFirst({
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!ioc) {
      throw new AppError('IOC not found', 404)
    }

    res.json(ioc)
  } catch (error) {
    next(error)
  }
}

export const createIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { projectId, type, value, timestamp, context, source } = req.body

    if (!projectId || !type || !value || !timestamp) {
      throw new AppError('Project ID, type, value, and timestamp are required', 400)
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

    const ioc = await prisma.iOC.create({
      data: {
        projectId,
        type,
        value,
        timestamp: new Date(timestamp),
        context,
        source,
      },
    })

    res.status(201).json(ioc)
  } catch (error) {
    next(error)
  }
}

export const bulkCreateIOCs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { projectId, iocs } = req.body

    if (!projectId || !iocs || !Array.isArray(iocs) || iocs.length === 0) {
      throw new AppError('Project ID and array of IOCs are required', 400)
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

    // Validate all IOCs
    for (const ioc of iocs) {
      if (!ioc.type || !ioc.value || !ioc.timestamp) {
        throw new AppError('Each IOC must have type, value, and timestamp', 400)
      }
    }

    // Create all IOCs
    const createdIOCs = await prisma.iOC.createMany({
      data: iocs.map((ioc: any) => ({
        projectId,
        type: ioc.type,
        value: ioc.value,
        timestamp: new Date(ioc.timestamp),
        context: ioc.context,
        source: ioc.source,
      })),
    })

    res.status(201).json({
      message: `Successfully created ${createdIOCs.count} IOCs`,
      count: createdIOCs.count
    })
  } catch (error) {
    next(error)
  }
}

export const updateIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { type, value, timestamp, context, source, enrichmentData } = req.body

    // Verify user has access
    const existing = await prisma.iOC.findFirst({
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
      throw new AppError('IOC not found or insufficient permissions', 404)
    }

    const updateData: any = {}
    if (type) updateData.type = type
    if (value) updateData.value = value
    if (timestamp) updateData.timestamp = new Date(timestamp)
    if (context !== undefined) updateData.context = context
    if (source !== undefined) updateData.source = source
    if (enrichmentData !== undefined) updateData.enrichmentData = enrichmentData

    const ioc = await prisma.iOC.update({
      where: { id },
      data: updateData,
    })

    res.json(ioc)
  } catch (error) {
    next(error)
  }
}

export const deleteIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Verify user has access
    const existing = await prisma.iOC.findFirst({
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
      throw new AppError('IOC not found or insufficient permissions', 404)
    }

    await prisma.iOC.delete({ where: { id } })

    res.json({ message: 'IOC deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const mapIOCColumns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { headers, sampleRows } = req.body

    // Validate inputs
    if (!headers || !Array.isArray(headers)) {
      throw new AppError('Headers must be an array of strings', 400)
    }

    if (!sampleRows || !Array.isArray(sampleRows)) {
      throw new AppError('Sample rows must be an array', 400)
    }

    if (headers.length === 0) {
      throw new AppError('Headers array cannot be empty', 400)
    }

    // Validate headers are strings
    if (!headers.every((h) => typeof h === 'string')) {
      throw new AppError('All headers must be strings', 400)
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Format sample data for the prompt
    const sampleDataText = sampleRows
      .slice(0, 3)
      .map((row, idx) => {
        const rowData = headers
          .map((header, colIdx) => `  ${header}: ${row[colIdx] ?? 'null'}`)
          .join('\n')
        return `Row ${idx + 1}:\n${rowData}`
      })
      .join('\n\n')

    // Build the prompt for Claude
    const prompt = `You are analyzing spreadsheet columns for IOC (Indicator of Compromise) import.

Available columns: ${JSON.stringify(headers)}

Sample data (first ${Math.min(sampleRows.length, 3)} rows):
${sampleDataText}

Map these columns to IOC fields:
- type: IOC type (IP_ADDRESS, DOMAIN, URL, FILE_HASH, etc.)
- value: The actual IOC value/indicator
- timestamp: When the IOC was observed (date/time)
- context: Optional context or description
- source: Optional source information

Return ONLY a JSON object with this structure:
{
  "mapping": {
    "type": "column_name_or_null",
    "value": "column_name_or_null",
    "timestamp": "column_name_or_null",
    "context": "column_name_or_null",
    "source": "column_name_or_null"
  },
  "confidence": {
    "type": 0.0,
    "value": 0.0,
    "timestamp": 0.0,
    "context": 0.0,
    "source": 0.0
  }
}

Rules:
- Set field to null if no appropriate column exists
- Confidence scores should be between 0.0 and 1.0
- Use actual column names from the headers array
- Base your mapping on both column names and sample data content
- Return ONLY the JSON object, no additional text`

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract response text
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response')
    }

    const mappingResult = JSON.parse(jsonMatch[0])

    // Validate the structure
    if (!mappingResult.mapping || !mappingResult.confidence) {
      throw new Error('Invalid mapping structure returned by AI')
    }

    res.json(mappingResult)
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error)
    } else {
      next(new AppError(`Column mapping failed: ${error.message}`, 500))
    }
  }
}
