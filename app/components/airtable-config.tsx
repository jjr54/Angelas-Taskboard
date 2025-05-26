"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface AirtableConfigProps {
  onConfigSaved: (config: { tableName: string }) => void
  initialTableName?: string
}

export function AirtableConfig({ onConfigSaved, initialTableName = "Tasks" }: AirtableConfigProps) {
  const [tableName, setTableName] = useState(initialTableName)
  const [isLoading, setIsLoading] = useState(false)
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const { toast } = useToast()

  // Only fetch tables on initial mount
  useEffect(() => {
    fetchTables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTables = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/airtable/tables")

      if (!response.ok) {
        throw new Error("Failed to fetch tables")
      }

      const data = await response.json()
      setAvailableTables(data.tables || [])
    } catch (error) {
      console.error("Error fetching tables:", error)
      toast({
        title: "Error",
        description: "Failed to fetch available tables from Airtable",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = () => {
    try {
      const config = { tableName }
      localStorage.setItem("airtableConfig", JSON.stringify(config))
      onConfigSaved(config)
      toast({
        title: "Success",
        description: "Airtable configuration saved",
      })
    } catch (e) {
      console.error("Error saving config:", e)
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tableName">Table Name</Label>
        <div className="flex gap-2">
          <Input
            id="tableName"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Enter your Airtable table name"
          />
          <Button variant="outline" size="icon" onClick={fetchTables} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "↻"}
          </Button>
        </div>
        {availableTables.length > 0 && (
          <div className="mt-2">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Available tables:</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {availableTables.map((table) => (
                <Button key={table} variant="outline" size="sm" className="text-xs" onClick={() => setTableName(table)}>
                  {table}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <Button onClick={saveConfig} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
