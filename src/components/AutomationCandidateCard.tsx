import React from 'react';
import { EnhancedAutomationCandidate } from '../lib/gptAutomationAnalysis';
import { Badge } from './ui/Badge';
import { Tooltip } from './ui/Tooltip';
import { Button } from './ui/Button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface AutomationCandidateCardProps {
  candidate: EnhancedAutomationCandidate;
}

export function AutomationCandidateCard({ candidate }: AutomationCandidateCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  
  // Determine complexity color
  const complexityColor = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  }[candidate.complexity];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{candidate.title}</h3>
            <p className="text-sm text-gray-500">
              Occurs {candidate.frequency.toLowerCase()} • {candidate.timeSpent}h spent
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={complexityColor}>
              {candidate.complexity.charAt(0).toUpperCase() + candidate.complexity.slice(1)} complexity
            </Badge>
            <Badge className="bg-purple-100 text-purple-800">
              {candidate.platform}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Card Summary */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-medium text-gray-500">Estimated savings</div>
            <div className="text-2xl font-semibold text-purple-600">{candidate.savings}h</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Setup time</div>
            <div className="text-2xl font-semibold text-gray-700">{candidate.setupTime}h</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">ROI</div>
            <div className="text-2xl font-semibold text-green-600">
              {Math.round((candidate.savings / candidate.setupTime) * 10) / 10}x
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                <span>Show more</span>
                <ChevronDown size={16} />
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Process Analysis</h4>
            <p className="text-sm text-gray-600">{candidate.processAnalysis}</p>
          </div>
          
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Automation Approach</h4>
            <ul className="space-y-2">
              {candidate.automationApproach.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge 
                    className={
                      step.importance === 'critical' 
                        ? 'bg-red-100 text-red-800' 
                        : step.importance === 'recommended'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {step.importance}
                  </Badge>
                  <span className="text-sm text-gray-600">{step.description}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-end gap-2">
            {candidate.implementationUrl && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
                onClick={() => window.open(candidate.implementationUrl, '_blank')}
              >
                <span>View Tutorial</span>
                <ExternalLink size={14} />
              </Button>
            )}
            <Button variant="primary" size="sm">
              Mark as Implemented
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 