"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FeedbackButtonProps {
  className?: string
}

export function FeedbackButton({ className = "" }: FeedbackButtonProps) {
  const handleFeedbackClick = () => {
    // TODO: Replace this URL with your actual Google Form URL
    const googleFormUrl = "https://forms.gle/K5a5jBZ8i5sTYZAk7"
    
    // For now, show an alert asking them to create a Google Form
    if (googleFormUrl === "https://forms.google.com/your-form-url") {
      alert("Please create a Google Form and replace the URL in components/feedback-button.tsx")
      return
    }
    
    window.open(googleFormUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleFeedbackClick}
            variant="outline"
            size="sm"
            className={`fixed top-4 right-4 z-50 shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
          >
            <MessageSquare className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Send us your feedback</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}