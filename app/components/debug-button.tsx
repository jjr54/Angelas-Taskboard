"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bug } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export function DebugButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const fetchDebugInfo = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/debug")
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error("Error fetching debug info:", error)
      toast({
        title: "Error",
        description: "Failed to fetch debug information",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    fetchDebugInfo()
  }

  return (
    <>
      <Button variant="outline" size="icon" onClick={handleOpen} title="Debug">
        <Bug className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Debug Information</DialogTitle>
            <DialogDescription>Environment and configuration details for troubleshooting</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : debugInfo ? (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4 overflow-auto max-h-[300px]">
                <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  If you're experiencing authentication issues, check that your Airtable token is correctly set and has
                  the necessary permissions.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">Failed to load debug information</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
