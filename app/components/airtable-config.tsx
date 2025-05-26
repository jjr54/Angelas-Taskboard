"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Database } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AirtableConfigProps {
  onConfigSaved: (config: { tableName: string }) => void
  initialTableName?: string
}

export function AirtableConfig({ onConfigSaved, initialTableName = "Tasks" }: AirtableConfigProps) {
  const [tableName, setTableName] = useState(initialTableName)
  const [newTableName, setNewTableName] = useState("Music Tasks")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("existing")
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

  const createNewTable = async () => {
    if (!newTableName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the new table",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingTable(true)
      const response = await fetch("/api/airtable/create-table", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableName: newTableName }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create table")
      }

      const data = await response.json()

      // Update available tables and select the new one
      setAvailableTables([...availableTables, data.tableName])
      setTableName(data.tableName)

      toast({
        title: "Success",
        description: `Table "${data.tableName}" created successfully`,
      })

      // Save the config with the new table
      saveConfig(data.tableName)
    } catch (error) {
      console.error("Error creating table:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create table",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTable(false)
    }
  }

  const saveConfig = (tableNameToSave = tableName) => {
    try {
      const config = { tableName: tableNameToSave }
      localStorage.setItem("airtableConfig", JSON.stringify(config))
      onConfigSaved(config)
      toast({
        title: "Success",
        description: "Airtable link established",
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
    <div className="space-y-6">
      <Tabs defaultValue="existing" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="existing">Use Existing Table</TabsTrigger>
          <TabsTrigger value="new">Create New Table</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="tableName">Select Table</Label>
              <Button variant="ghost" size="sm" onClick={fetchTables} disabled={isLoading} className="h-8 px-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableTables.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 mt-2">
                {availableTables.map((table) => (
                  <Card
                    key={table}
                    className={`cursor-pointer transition-all ${tableName === table ? "ring-2 ring-primary" : "hover:bg-accent"}`}
                    onClick={() => setTableName(table)}
                  >
                    <CardContent className="p-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        <span>{table}</span>
                      </div>
                      {tableName === table && (
                        <Badge variant="default" className="ml-auto">
                          Selected
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No tables found in your Airtable base</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("new")} className="mt-2">
                  Create a new table
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Table</CardTitle>
              <CardDescription>
                This will create a new table in your Airtable base with the necessary fields for task management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="newTableName">Table Name</Label>
                <Input
                  id="newTableName"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., Music Tasks"
                  disabled={isCreatingTable}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={createNewTable} disabled={isCreatingTable || !newTableName.trim()} className="w-full">
                {isCreatingTable ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Table
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={() => saveConfig()} className="w-full" disabled={!tableName || isLoading || isCreatingTable}>
        Link to {tableName || "Selected Table"}
      </Button>
    </div>
  )
}
