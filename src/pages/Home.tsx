import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// Agent ID from orchestrator
const AGENT_ID = "6960bdadc57d451439d49e3f"

// TypeScript interfaces based on response schemas
interface PolicyDocument {
  purpose: string
  scope: string
  definitions: Array<{
    term: string
    definition: string
  }>
  policy_statement: string
  procedures: Array<{
    section_title: string
    content: string
    steps: string[]
  }>
  responsibilities: Array<{
    role: string
    responsibilities: string[]
  }>
  enforcement: {
    violation_reporting: string
    investigation_process: string
    disciplinary_actions: string[]
  }
  effective_date: string
  review_cycle: string
}

interface PolicyResult {
  policy_title: string
  policy_document: PolicyDocument
  formatting_notes: string[]
}

interface ComplianceCheck {
  category: string
  status: string
  findings: string
  relevant_regulations: string[]
}

interface IdentifiedGap {
  gap_description: string
  severity: string
  affected_section: string
  legal_risk: string
}

interface RemediationRecommendation {
  issue: string
  recommendation: string
  priority: string
  implementation_steps: string[]
}

interface ComplianceResult {
  compliance_status: string
  overall_score: number
  compliance_checks: ComplianceCheck[]
  identified_gaps: IdentifiedGap[]
  remediation_recommendations: RemediationRecommendation[]
  best_practices_suggestions: string[]
  final_assessment: string
}

interface SubAgentResult {
  agent_name: string
  status: string
  output: PolicyResult | ComplianceResult | any
}

interface AgentResult {
  final_output: any
  sub_agent_results: SubAgentResult[]
  summary: string
  workflow_completed: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface PolicyHistoryItem {
  id: string
  title: string
  status: 'compliant' | 'needs_review' | 'draft'
  created: Date
  score?: number
}

// Sample policy history
const initialPolicyHistory: PolicyHistoryItem[] = [
  {
    id: '1',
    title: 'Remote Work Policy',
    status: 'compliant',
    created: new Date('2024-12-15'),
    score: 95
  },
  {
    id: '2',
    title: 'Flexible Hours Policy',
    status: 'needs_review',
    created: new Date('2024-12-10'),
    score: 72
  },
  {
    id: '3',
    title: 'PTO Policy',
    status: 'draft',
    created: new Date('2024-12-05')
  }
]

// Component: Chat Message Bubble
function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={cn(
      "flex mb-4",
      message.role === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        "max-w-[70%] rounded-lg px-4 py-3",
        message.role === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-900'
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={cn(
          "text-xs mt-1",
          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
        )}>
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

// Component: Policy History Sidebar
function PolicyHistorySidebar({
  policies,
  onSelectPolicy
}: {
  policies: PolicyHistoryItem[]
  onSelectPolicy: (policy: PolicyHistoryItem) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPolicies = policies.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string, score?: number) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>
      case 'needs_review':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertTriangle className="w-3 h-3 mr-1" />Needs Review</Badge>
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Policy History</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredPolicies.map(policy => (
            <button
              key={policy.id}
              onClick={() => onSelectPolicy(policy)}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 mb-2 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">{policy.title}</h3>
              </div>
              <div className="flex items-center justify-between">
                {getStatusBadge(policy.status, policy.score)}
                <span className="text-xs text-gray-500">
                  {policy.created.toLocaleDateString()}
                </span>
              </div>
              {policy.score && (
                <div className="mt-2 text-xs text-gray-600">
                  Score: {policy.score}%
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create New Policy
        </Button>
      </div>
    </div>
  )
}

// Component: Policy Preview Panel
function PolicyPreviewPanel({
  policyData,
  complianceData
}: {
  policyData: PolicyResult | null
  complianceData: ComplianceResult | null
}) {
  const [showCompliance, setShowCompliance] = useState(true)

  const getComplianceColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
      case 'compliant':
        return 'text-green-600 bg-green-50'
      case 'warning':
      case 'needs_review':
        return 'text-yellow-600 bg-yellow-50'
      case 'fail':
      case 'critical':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!policyData && !complianceData) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="p-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Policy Preview</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Generate a policy to see preview</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Policy Preview</h2>
        <Button variant="outline" size="sm" className="text-gray-700">
          <Download className="w-4 h-4 mr-2" />
          Export Policy
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {policyData && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                {policyData.policy_title}
              </h1>

              {/* Purpose Section */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Purpose</h2>
                <p className="text-gray-700 leading-relaxed">
                  {policyData.policy_document.purpose}
                </p>
              </div>

              {/* Scope Section */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Scope</h2>
                <p className="text-gray-700 leading-relaxed">
                  {policyData.policy_document.scope}
                </p>
              </div>

              {/* Definitions */}
              {policyData.policy_document.definitions?.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Definitions</h2>
                  <div className="space-y-3">
                    {policyData.policy_document.definitions.map((def, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-1">{def.term}</h3>
                        <p className="text-gray-700 text-sm">{def.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policy Statement */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Policy Statement</h2>
                <p className="text-gray-700 leading-relaxed">
                  {policyData.policy_document.policy_statement}
                </p>
              </div>

              {/* Procedures */}
              {policyData.policy_document.procedures?.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Procedures</h2>
                  <div className="space-y-4">
                    {policyData.policy_document.procedures.map((proc, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{proc.section_title}</h3>
                        <p className="text-gray-700 mb-2">{proc.content}</p>
                        {proc.steps?.length > 0 && (
                          <ol className="list-decimal list-inside space-y-1 text-gray-700">
                            {proc.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="text-sm">{step}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              {policyData.policy_document.responsibilities?.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Responsibilities</h2>
                  <div className="space-y-3">
                    {policyData.policy_document.responsibilities.map((resp, idx) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">{resp.role}</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                          {resp.responsibilities.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enforcement */}
              {policyData.policy_document.enforcement && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Enforcement</h2>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Violation Reporting</h3>
                      <p className="text-gray-700 text-sm">
                        {policyData.policy_document.enforcement.violation_reporting}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Investigation Process</h3>
                      <p className="text-gray-700 text-sm">
                        {policyData.policy_document.enforcement.investigation_process}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Disciplinary Actions</h3>
                      <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                        {policyData.policy_document.enforcement.disciplinary_actions?.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Effective Date & Review Cycle */}
              <div className="flex gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Effective Date:</span> {policyData.policy_document.effective_date}
                </div>
                <div>
                  <span className="font-medium">Review Cycle:</span> {policyData.policy_document.review_cycle}
                </div>
              </div>
            </div>
          )}

          {/* Compliance Report */}
          {complianceData && (
            <div className="border-t pt-6">
              <button
                onClick={() => setShowCompliance(!showCompliance)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h2 className="text-lg font-semibold text-gray-900">Compliance Report</h2>
                {showCompliance ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showCompliance && (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Compliance Score</span>
                      <span className={cn(
                        "text-2xl font-bold",
                        complianceData.overall_score >= 80 ? 'text-green-600' :
                        complianceData.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        {complianceData.overall_score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          complianceData.overall_score >= 80 ? 'bg-green-600' :
                          complianceData.overall_score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                        )}
                        style={{ width: `${complianceData.overall_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <Badge className={cn(
                      "text-sm py-1 px-3",
                      complianceData.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' :
                      complianceData.compliance_status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {complianceData.compliance_status === 'compliant' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                       complianceData.compliance_status === 'needs_review' ? <AlertTriangle className="w-3 h-3 mr-1" /> :
                       <AlertCircle className="w-3 h-3 mr-1" />}
                      {complianceData.compliance_status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {/* Compliance Checks */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Compliance Checks</h3>
                    <div className="space-y-3">
                      {complianceData.compliance_checks?.map((check, idx) => (
                        <div key={idx} className={cn("p-3 rounded-lg border", getComplianceColor(check.status))}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{check.category}</h4>
                            <Badge className={cn(
                              "text-xs",
                              check.status === 'pass' ? 'bg-green-100 text-green-800' :
                              check.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            )}>
                              {check.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{check.findings}</p>
                          {check.relevant_regulations?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {check.relevant_regulations.map((reg, regIdx) => (
                                <Badge key={regIdx} variant="outline" className="text-xs">
                                  {reg}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Identified Gaps */}
                  {complianceData.identified_gaps?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Identified Gaps</h3>
                      <div className="space-y-3">
                        {complianceData.identified_gaps.map((gap, idx) => (
                          <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{gap.affected_section}</h4>
                              <Badge className={getSeverityColor(gap.severity)}>
                                {gap.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{gap.gap_description}</p>
                            <p className="text-xs text-red-700">
                              <strong>Legal Risk:</strong> {gap.legal_risk}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remediation Recommendations */}
                  {complianceData.remediation_recommendations?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Remediation Recommendations</h3>
                      <div className="space-y-3">
                        {complianceData.remediation_recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{rec.issue}</h4>
                              <Badge className={cn(
                                rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              )}>
                                {rec.priority.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{rec.recommendation}</p>
                            {rec.implementation_steps?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">Implementation Steps:</p>
                                <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                                  {rec.implementation_steps.map((step, stepIdx) => (
                                    <li key={stepIdx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Best Practices */}
                  {complianceData.best_practices_suggestions?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Best Practices</h3>
                      <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                        {complianceData.best_practices_suggestions.map((practice, idx) => (
                          <li key={idx}>{practice}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Final Assessment */}
                  {complianceData.final_assessment && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Final Assessment</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {complianceData.final_assessment}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Main Component
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [policyData, setPolicyData] = useState<PolicyResult | null>(null)
  const [complianceData, setComplianceData] = useState<ComplianceResult | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const extractPolicyAndCompliance = (result: any) => {
    console.log('Full agent result:', JSON.stringify(result, null, 2))

    // Handle different possible response structures
    let subAgentResults = result.sub_agent_results || result.subAgentResults || []

    console.log('Sub-agent results:', JSON.stringify(subAgentResults, null, 2))

    // Extract policy document from Policy Drafting Agent
    const policyAgent = subAgentResults.find(
      (agent: any) => agent.agent_name?.toLowerCase().includes('policy drafting') ||
               agent.agent_name?.toLowerCase().includes('drafting') ||
               agent.name?.toLowerCase().includes('policy drafting')
    )

    console.log('Policy agent found:', policyAgent)

    if (policyAgent?.output) {
      // The output might be wrapped in a result object
      const policyOutput = policyAgent.output.result || policyAgent.output
      console.log('Setting policy data:', policyOutput)
      setPolicyData(policyOutput as PolicyResult)
    }

    // Extract compliance data from Compliance Checker Agent
    const complianceAgent = subAgentResults.find(
      (agent: any) => agent.agent_name?.toLowerCase().includes('compliance') ||
               agent.agent_name?.toLowerCase().includes('checker') ||
               agent.name?.toLowerCase().includes('compliance')
    )

    console.log('Compliance agent found:', complianceAgent)

    if (complianceAgent?.output) {
      // The output might be wrapped in a result object
      const complianceOutput = complianceAgent.output.result || complianceAgent.output
      console.log('Setting compliance data:', complianceOutput)
      setComplianceData(complianceOutput as ComplianceResult)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await callAIAgent(input, AGENT_ID)

      console.log('callAIAgent result:', JSON.stringify(result, null, 2))

      if (result.success && result.response) {
        console.log('Response structure:', JSON.stringify(result.response, null, 2))

        // Try multiple possible structures for the response
        const agentResult = result.response.result || result.response.data || result.response

        console.log('Agent result to extract:', agentResult)

        // Extract policy and compliance data from sub-agent results
        if (agentResult) {
          extractPolicyAndCompliance(agentResult)
        }

        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: agentResult?.summary ||
                   agentResult?.message ||
                   result.response.message ||
                   'Policy generation completed successfully.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.error || 'An error occurred while processing your request.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error calling agent:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Policy History (20%) */}
      <div className="w-[20%] min-w-[250px]">
        <PolicyHistorySidebar
          policies={initialPolicyHistory}
          onSelectPolicy={(policy) => {
            console.log('Selected policy:', policy)
          }}
        />
      </div>

      {/* Center - Chat Interface (45%) */}
      <div className="w-[45%] flex flex-col bg-white border-r border-gray-200">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">HR Policy Manager</h1>
          <p className="text-sm text-gray-600">AI-Powered Policy Creation Assistant</p>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 max-w-md">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Welcome to HR Policy Manager
                </h2>
                <p className="text-sm mb-4">
                  Describe the policy you need, and I'll help you create a compliant,
                  professional HR policy document.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg text-left">
                  <p className="text-sm font-medium text-blue-900 mb-2">Try asking:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• "Create a remote work policy"</li>
                    <li>• "Draft a social media usage policy"</li>
                    <li>• "Generate a workplace harassment policy"</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {loading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating policy...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe the policy you need..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={loading}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white h-full px-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Generate Policy
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Right - Policy Preview (35%) */}
      <div className="w-[35%] flex flex-col">
        <PolicyPreviewPanel
          policyData={policyData}
          complianceData={complianceData}
        />
      </div>
    </div>
  )
}
