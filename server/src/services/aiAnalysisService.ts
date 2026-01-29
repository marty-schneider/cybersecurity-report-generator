import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface IOCData {
  id: string
  type: string
  value: string
  timestamp: Date
  context?: string | null
  source?: string | null
}

interface TTPResult {
  mitreId: string
  tacticName: string
  techniqueName: string
  description: string
  confidence: number
  reasoning: string
}

interface AnalysisResult {
  narrative: string
  ttps: TTPResult[]
  timeline: string
  threatActorProfile?: string
  recommendations: string[]
}

export class AIAnalysisService {
  async analyzeIOCs(iocs: IOCData[], projectContext?: string): Promise<AnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(iocs, projectContext)

      logger.info(`Analyzing ${iocs.length} IOCs with Claude API`)

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Parse the structured response
      const result = this.parseAnalysisResponse(responseText)

      logger.info('AI analysis completed successfully')

      return result
    } catch (error: any) {
      logger.error('AI analysis failed:', error)
      throw new Error(`AI analysis failed: ${error.message}`)
    }
  }

  private buildAnalysisPrompt(iocs: IOCData[], projectContext?: string): string {
    const iocList = iocs
      .map((ioc, idx) => {
        return `${idx + 1}. [${new Date(ioc.timestamp).toISOString()}] ${ioc.type}: ${ioc.value}${ioc.context ? `\n   Context: ${ioc.context}` : ''
          }${ioc.source ? `\n   Source: ${ioc.source}` : ''}`
      })
      .join('\n\n')

    return `You are a cybersecurity threat intelligence analyst specializing in malware analysis and incident response.

I need you to analyze the following Indicators of Compromise (IOCs) from a security incident and provide a comprehensive threat assessment.

${projectContext ? `PROJECT CONTEXT:\n${projectContext}\n\n` : ''}INDICATORS OF COMPROMISE (${iocs.length} total):
${iocList}

Please provide your analysis in the following JSON format:

{
  "narrative": "A detailed narrative (2-4 paragraphs) describing the attack campaign, attacker's objectives, and progression of the attack based on the IOCs and their timestamps.",
  "ttps": [
    {
      "mitreId": "T####.###",
      "tacticName": "MITRE ATT&CK Tactic name",
      "techniqueName": "MITRE ATT&CK Technique name",
      "description": "How this technique was used in this specific attack",
      "confidence": 0.85,
      "reasoning": "Why you believe this technique was used (reference specific IOCs)"
    }
  ],
  "timeline": "A chronological timeline of the attack progression based on IOC timestamps",
  "threatActorProfile": "If patterns suggest a known threat actor or APT group, describe them. Otherwise, describe the attacker's characteristics and sophistication level.",
  "recommendations": [
    "Specific actionable recommendations for detection and remediation"
  ]
}

IMPORTANT:
- Map IOCs to specific MITRE ATT&CK techniques (use valid technique IDs like T1566.001, T1059.001, etc.)
- Provide confidence scores between 0.0 and 1.0 for each TTP mapping
- Be specific about which IOCs support each conclusion
- Focus on techniques actually evidenced by the IOCs provided
- Consider the temporal sequence of IOCs when analyzing the attack progression
- Return ONLY valid JSON, no additional text before or after
- Use **Markdown** formatting for the 'narrative', 'timeline', 'threatActorProfile', and 'recommendations' fields (e.g., **bold** for emphasis, *italics*, lists).

Analyze these IOCs now:`
  }

  private parseAnalysisResponse(responseText: string): AnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate and return
      return {
        narrative: parsed.narrative || 'Analysis completed',
        ttps: Array.isArray(parsed.ttps) ? parsed.ttps : [],
        timeline: parsed.timeline || 'Timeline analysis unavailable',
        threatActorProfile: parsed.threatActorProfile,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      }
    } catch (error: any) {
      logger.error('Failed to parse AI response:', error)

      // Fallback: return the raw response as narrative
      return {
        narrative: responseText,
        ttps: [],
        timeline: 'Unable to generate timeline',
        recommendations: ['Review IOCs manually for additional context'],
      }
    }
  }

  async enrichIOC(ioc: IOCData): Promise<any> {
    try {
      const prompt = `You are a cybersecurity threat intelligence analyst.

Analyze this Indicator of Compromise and provide context:

Type: ${ioc.type}
Value: ${ioc.value}
${ioc.context ? `Context: ${ioc.context}` : ''}

Provide a brief analysis including:
1. What this IOC might indicate
2. Common attack techniques associated with this type of IOC
3. Recommended detection/mitigation strategies

Keep your response concise (2-3 paragraphs).`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-20240307',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })

      const analysis = message.content[0].type === 'text' ? message.content[0].text : ''

      return {
        aiAnalysis: analysis,
        enrichedAt: new Date(),
      }
    } catch (error: any) {
      logger.error('IOC enrichment failed:', error)
      return null
    }
  }

  async mapColumns(headers: string[], sampleData: any[]): Promise<Record<string, string>> {
    try {
      const prompt = `You are a data mapping assistant. I have a dataset of Indicators of Compromise (IOCs) with the following headers:
${JSON.stringify(headers)}

Here is a sample of the data (first few rows):
${JSON.stringify(sampleData)}

I need to map these columns to my internal schema fields:
- type (e.g., "IP", "Domain", "Hash", "URL")
- value (the actual IP address, domain name, hash, etc.)
- timestamp (date/time of the event)
- context (description, notes, or activity associated with the IOC)
- source (where this IOC came from, e.g., "Firewall", "EDR", "ThreatFeed")

Please identify which header from the provided list best maps to each of my schema fields.
If a field has no clear equivalent in the headers, map it to null.
Use the sample data to infer the content of the columns if headers are ambiguous.

Return a JSON object with the following structure:
{
  "type": "HeaderName" or null,
  "value": "HeaderName" or null,
  "timestamp": "HeaderName" or null,
  "context": "HeaderName" or null,
  "source": "HeaderName" or null
}

IMPORTANT:
- Return ONLY valid JSON.
- Do not include any explanations.
- The values must be exact strings from the provided headers list.`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      return JSON.parse(jsonMatch[0])
    } catch (error: any) {
      logger.error('Column mapping failed:', error)
      throw new Error(`Column mapping failed: ${error.message}`)
    }
  }
}

export const aiAnalysisService = new AIAnalysisService()
