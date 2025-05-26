"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, RefreshCw, Settings, Youtube, ExternalLink, Menu, Bug } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ThemeToggle } from "./components/theme-toggle"
import { DebugButton } from "./components/debug-button"
import { TaskForm } from "./components/task-form"
import { TaskCard } from "./components/task-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AirtableConfig } from "./components/airtable-config"
import { EditTaskForm } from "./components/edit-task-form"

interface Task {
  id: string
  title: string
  description: string
  assignee: {
    name: string
  }
  dueDate: string
  priority: "low" | "medium" | "high"
  type: "composition" | "arrangement" | "recording" | "mixing" | "review"
  duration?: string
  instruments?: string[]
  status?: string
  completed: boolean
  youtubeUrl?: string
  timestamp?: string
  screenshotUrl?: string
}

interface Column {
  id: string
  title: string
  tasks: Task[]
}

const initialData: Column[] = [
  { id: "todo", title: "To Do", tasks: [] },
  { id: "inprogress", title: "In Progress", tasks: [] },
  { id: "review", title: "Review", tasks: [] },
  { id: "complete", title: "Complete", tasks: [] },
]

export default function MusicCompositionBoard() {
  const [columns, setColumns] = useState<Column[]>(initialData)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState("")
  const [airtableConfig, setAirtableConfig] = useState({
    tableName: "Tasks",
  })
  const [globalYoutubeUrl, setGlobalYoutubeUrl] = useState("https://www.youtube.com/watch?v=nA8KmHC2Z-g")
  const [youtubePreviewUrl, setYoutubePreviewUrl] = useState("")
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [isCreatingTestTask, setIsCreatingTestTask] = useState(false)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<any>(null)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)

  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [shouldFetchTasks, setShouldFetchTasks] = useState(false)

  // Load saved config and YouTube URL on initial mount
  useEffect(() => {
    // Load Airtable config
    const savedConfig = localStorage.getItem("airtableConfig")
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setAirtableConfig(config)
        setIsConfigured(true)
        setShouldFetchTasks(true)
      } catch (e) {
        console.error("Error parsing saved config:", e)
        setIsConfigSheetOpen(true)
      }
    } else {
      // No saved config, show config sheet
      setIsConfigSheetOpen(true)
    }

    // Load saved YouTube URL
    const savedYoutubeUrl = localStorage.getItem("globalYoutubeUrl")
    if (savedYoutubeUrl) {
      setGlobalYoutubeUrl(savedYoutubeUrl)
      updateYoutubePreview(savedYoutubeUrl)
    } else {
      updateYoutubePreview(globalYoutubeUrl)
    }
  }, [])

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : null
  }

  // Update YouTube preview thumbnail
  const updateYoutubePreview = (url: string) => {
    const videoId = extractVideoId(url)
    if (videoId) {
      setYoutubePreviewUrl(`https://img.youtube.com/vi/${videoId}/0.jpg`)
    } else {
      setYoutubePreviewUrl("")
    }
  }

  // Save YouTube URL to localStorage and update preview
  const handleYoutubeUrlChange = (url: string) => {
    setGlobalYoutubeUrl(url)
    localStorage.setItem("globalYoutubeUrl", url)
    updateYoutubePreview(url)
  }

  // Fetch tasks when shouldFetchTasks is true
  useEffect(() => {
    if (shouldFetchTasks && isConfigured) {
      fetchTasks()
      setShouldFetchTasks(false)
    }
  }, [shouldFetchTasks, isConfigured])

  const fetchTasks = useCallback(async () => {
    if (!isConfigured) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`)

      // Get the raw response text first
      const responseText = await response.text()
      console.log("Raw API response:", responseText)

      // Check if the response is empty
      if (!responseText.trim()) {
        throw new Error("Empty response received from API")
      }

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        throw new Error(
          `Failed to parse API response: ${parseError.message}. Raw response: ${responseText.substring(0, 100)}...`,
        )
      }

      if (!response.ok) {
        console.error("API error response:", data)
        throw new Error(data.error || `API error: ${response.status} ${response.statusText}`)
      }

      if (data.error) {
        throw new Error(data.error)
      }

      // Check if tasks array exists
      if (!Array.isArray(data.tasks)) {
        console.error("Invalid response format - tasks is not an array:", data)
        throw new Error("Invalid response format: tasks array is missing")
      }

      // Group tasks by status
      const groupedTasks = data.tasks.reduce((acc: any, task: any) => {
        const status = task.status || "todo"
        if (!acc[status]) acc[status] = []
        acc[status].push(task)
        return acc
      }, {})

      // Update columns with fetched tasks
      const newColumns = initialData.map((col) => ({
        ...col,
        tasks: groupedTasks[col.id] || [],
      }))

      setColumns(newColumns)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setError(error instanceof Error ? error.message : String(error))
      toast({
        title: "Error",
        description: "Failed to load tasks from Airtable. See console for details.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [airtableConfig.tableName, isConfigured, toast])

  const handleConfigSaved = useCallback((config: { tableName: string }) => {
    setAirtableConfig(config)
    setIsConfigured(true)
    setIsConfigSheetOpen(false)
    setShouldFetchTasks(true)
  }, [])

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    const sourceTask = sourceColumn.tasks.find((task) => task.id === draggableId)
    if (!sourceTask) return

    // Remove task from source column
    const newSourceTasks = sourceColumn.tasks.filter((task) => task.id !== draggableId)

    // Add task to destination column
    const updatedTask = {
      ...sourceTask,
      status: destination.droppableId,
      completed: destination.droppableId === "complete",
    }
    const newDestTasks = [...destColumn.tasks]
    newDestTasks.splice(destination.index, 0, updatedTask)

    const newColumns = columns.map((col) => {
      if (col.id === source.droppableId) {
        return { ...col, tasks: newSourceTasks }
      }
      if (col.id === destination.droppableId) {
        return { ...col, tasks: newDestTasks }
      }
      return col
    })

    setColumns(newColumns)

    // Update task in Airtable
    try {
      const response = await fetch(`/api/airtable/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: updatedTask.id,
          fields: {
            status: updatedTask.status
              ?.split("")
              .map((char: string, i: number) =>
                i === 0 || updatedTask.status![i - 1] === " " ? char.toUpperCase() : char,
              )
              .join(""),
            completed: updatedTask.completed,
          },
          tableName: airtableConfig.tableName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task in Airtable. Changes may not be saved.",
        variant: "destructive",
      })
      // Revert changes on error
      setShouldFetchTasks(true)
    }
  }

  const deleteTask = async (taskId: string, columnId: string) => {
    // Find the task to delete
    const column = columns.find((col) => col.id === columnId)
    if (!column) return

    // Update UI optimistically
    const newColumns = columns.map((col) => {
      if (col.id === columnId) {
        return {
          ...col,
          tasks: col.tasks.filter((task) => task.id !== taskId),
        }
      }
      return col
    })

    setColumns(newColumns)

    // Delete from Airtable
    try {
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}&id=${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
      }

      toast({
        title: "Task Deleted",
        description: "The task has been removed from the board",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task from Airtable",
        variant: "destructive",
      })
      // Revert changes on error
      setShouldFetchTasks(true)
    }
  }

  const duplicateTask = async (taskId: string, columnId: string) => {
    // Find the task to duplicate
    const column = columns.find((col) => col.id === columnId)
    if (!column) return

    const taskToDuplicate = column.tasks.find((task) => task.id === taskId)
    if (!taskToDuplicate) return

    // Create a duplicate without the ID
    const { id, ...taskWithoutId } = taskToDuplicate
    const duplicatedTask = {
      ...taskWithoutId,
      title: `${taskToDuplicate.title} (Copy)`,
      status: columnId,
    }

    try {
      // Create the duplicated task in Airtable
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatedTask),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
      }

      const createdTask = await response.json()

      // Add the new task to the UI
      const newColumns = columns.map((col) => {
        if (col.id === columnId) {
          return {
            ...col,
            tasks: [...col.tasks, createdTask],
          }
        }
        return col
      })

      setColumns(newColumns)

      toast({
        title: "Success",
        description: "Task duplicated successfully",
      })
    } catch (error) {
      console.error("Error duplicating task:", error)
      toast({
        title: "Error",
        description: "Failed to duplicate task in Airtable",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (task: any) => {
    setTaskToEdit(task)
    setIsEditTaskOpen(true)
  }

  const updateTask = async (updatedTask: any) => {
    if (!updatedTask.id) {
      console.error("No task ID provided for update")
      return
    }

    setIsUpdatingTask(true)

    try {
      // Extract the base64 screenshot if present
      const { tempScreenshotBase64, ...taskData } = updatedTask

      // Update task in Airtable
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      const responseData = await response.json()
      console.log("Update API Response:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || `API error: ${response.status} ${response.statusText}`)
      }

      // If we have a new screenshot, upload it to Cloudinary
      if (tempScreenshotBase64) {
        try {
          console.log("Uploading new screenshot to Cloudinary...")
          const uploadResponse = await fetch("/api/uploadScreenshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Image: tempScreenshotBase64,
              airtableRecordId: updatedTask.id,
            }),
          })

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            updatedTask.screenshotUrl = uploadData.imageUrl
            console.log("Screenshot uploaded successfully:", uploadData.imageUrl)
          } else {
            console.error("Failed to upload screenshot to Cloudinary")
          }
        } catch (uploadError) {
          console.error("Error uploading screenshot:", uploadError)
        }
      }

      // Update the UI
      const newColumns = columns.map((col) => {
        return {
          ...col,
          tasks: col.tasks.map((task) => {
            if (task.id === updatedTask.id) {
              return {
                ...task,
                ...updatedTask,
                assignee: updatedTask.assignee?.name
                  ? {
                      name: updatedTask.assignee.name,
                    }
                  : task.assignee,
              }
            }
            return task
          }),
        }
      })

      setColumns(newColumns)

      toast({
        title: "Success",
        description: "Task updated successfully",
      })

      // Close the dialog
      setIsEditTaskOpen(false)
      setTaskToEdit(null)
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task in Airtable",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingTask(false)
    }
  }

  const addTask = async (task: any) => {
    if (!task.title || !selectedColumn) {
      console.log("Missing task title or selected column", { title: task.title, column: selectedColumn })
      return
    }

    // Set submitting state to prevent multiple submissions
    setIsSubmittingTask(true)

    // Extract the base64 screenshot if present
    const { tempScreenshotBase64, ...taskData } = task

    // Use the global YouTube URL if the task doesn't have one
    if (!taskData.youtubeUrl && globalYoutubeUrl) {
      taskData.youtubeUrl = globalYoutubeUrl
    }

    // Ensure status is set to the selected column
    taskData.status = selectedColumn

    console.log("Creating task:", { taskData, column: selectedColumn })

    try {
      // First, create the task in Airtable
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      const responseData = await response.json()
      console.log("API Response:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || `API error: ${response.status} ${response.statusText}`)
      }

      const createdTask = responseData
      console.log("Task created successfully:", createdTask)

      // If we have a screenshot, upload it to Cloudinary and update Airtable
      if (tempScreenshotBase64) {
        try {
          console.log("Uploading screenshot to Cloudinary...")
          const uploadResponse = await fetch("/api/uploadScreenshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Image: tempScreenshotBase64,
              airtableRecordId: createdTask.id,
            }),
          })

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            // Update the task with the Cloudinary URL
            createdTask.screenshotUrl = uploadData.imageUrl
            console.log("Screenshot uploaded successfully:", uploadData.imageUrl)
          } else {
            console.error("Failed to upload screenshot to Cloudinary")
          }
        } catch (uploadError) {
          console.error("Error uploading screenshot:", uploadError)
          // Continue even if screenshot upload fails
        }
      }

      // Add the created task to the UI
      const newColumns = columns.map((col) => {
        if (col.id === selectedColumn) {
          return {
            ...col,
            tasks: [...col.tasks, createdTask],
          }
        }
        return col
      })

      setColumns(newColumns)

      toast({
        title: "Success",
        description: "Task created successfully",
      })

      // Close the dialog after successful creation
      setIsAddTaskOpen(false)
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task in Airtable",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // Function to create a simple test task
  const createTestTask = async () => {
    setIsCreatingTestTask(true)
    setApiResponse(null)

    try {
      // Create a simple test task with minimal fields
      const testTask = {
        title: `Test Task ${new Date().toLocaleTimeString()}`,
        description: "This is a test task to check Airtable connectivity",
        status: "todo",
        priority: "medium",
        type: "composition",
        // Removed complex fields that might not exist in Airtable
      }

      console.log("Creating test task:", testTask)

      // Send the request directly to the API
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testTask),
      })

      // Get the full response text for debugging
      const responseText = await response.text()
      console.log("Raw API Response:", responseText)

      // Try to parse as JSON
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = { error: "Invalid JSON response", rawText: responseText }
      }

      // Store the response for display
      setApiResponse(responseData)

      if (!response.ok) {
        throw new Error(
          responseData.error || responseData.details || `API error: ${response.status} ${response.statusText}`,
        )
      }

      // Add the created task to the UI
      const createdTask = responseData
      const newColumns = columns.map((col) => {
        if (col.id === "todo") {
          return {
            ...col,
            tasks: [...col.tasks, createdTask],
          }
        }
        return col
      })

      setColumns(newColumns)

      toast({
        title: "Test Task Created",
        description: "Test task was successfully created in Airtable",
      })

      // Refresh the task list
      setShouldFetchTasks(true)
    } catch (error) {
      console.error("Error creating test task:", error)
      toast({
        title: "Error",
        description: `Failed to create test task: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingTestTask(false)
    }
  }

  const handleRetry = useCallback(() => {
    setShouldFetchTasks(true)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-background to-background -z-10"></div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-300 mb-2">
              Film Score Composition
            </h1>
            <p className="text-gray-400">Track and manage music composition tasks for your film project</p>
          </div>
          <div className="flex items-center gap-2">
            <DebugButton />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem onClick={() => setIsConfigSheetOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Airtable Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={createTestTask} disabled={isCreatingTestTask || !isConfigured}>
                  <Bug className="mr-2 h-4 w-4" />
                  {isCreatingTestTask ? "Creating Test Task..." : "Create Test Task"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Tasks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* API Response Display (for debugging) */}
        {apiResponse && (
          <div className="mb-8 glass-card rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3 text-foreground">API Response</h2>
            <div className="bg-secondary/50 p-4 rounded-xl overflow-auto max-h-[300px]">
              <pre className="text-xs">{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>
            <div className="mt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setApiResponse(null)} className="rounded-full">
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* YouTube Preview Section */}
        <div className="mb-8 glass-card rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Default YouTube Reference</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              {youtubePreviewUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-primary/20">
                  <img
                    src={youtubePreviewUrl || "/placeholder.svg"}
                    alt="YouTube thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={globalYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <Button variant="secondary" size="sm" className="rounded-full">
                      <Youtube className="h-4 w-4 mr-2" />
                      Watch Video
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-secondary/50 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">No video preview</p>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="globalYoutubeUrl" className="text-sm text-gray-400">
                    YouTube URL
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="globalYoutubeUrl"
                      value={globalYoutubeUrl}
                      onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                      placeholder="e.g., https://www.youtube.com/watch?v=nA8KmHC2Z-g"
                      className="rounded-full bg-secondary/50 border-primary/20 focus:border-primary"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(globalYoutubeUrl, "_blank")}
                      title="Open in new tab"
                      className="rounded-full"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This URL will be used as the default for all new tasks</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Airtable Config Sheet */}
        <Sheet open={isConfigSheetOpen} onOpenChange={setIsConfigSheetOpen}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Airtable Link</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <AirtableConfig onConfigSaved={handleConfigSaved} initialTableName={airtableConfig.tableName} />
            </div>
          </SheetContent>
        </Sheet>

        {!isConfigured && !isConfigSheetOpen && (
          <Alert className="mb-6 rounded-xl border-primary/20 bg-secondary/50">
            <AlertTitle>Airtable not linked</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>Please link your Airtable to continue.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-fit rounded-full"
                onClick={() => setIsConfigSheetOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Link Airtable
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 rounded-xl">
            <AlertTitle>Error loading tasks</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <div className="text-sm overflow-auto max-h-[200px] whitespace-pre-wrap">{error}</div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="w-fit rounded-full" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-full"
                  onClick={() => {
                    console.log("Checking environment variables and configuration...")
                    toast({
                      title: "Debug Info",
                      description: "Check the browser console for detailed debug information",
                    })
                  }}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Debug
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading tasks from Airtable...</p>
            </div>
          </div>
        )}

        {!isLoading && !error && isConfigured && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {columns.map((column) => (
                <div key={column.id} className="glass-card rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-primary/10 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-foreground">{column.title}</h2>
                      <Badge variant="secondary" className="rounded-full bg-primary/20 text-primary-foreground">
                        {column.tasks.length}
                      </Badge>
                    </div>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn("p-4 min-h-[200px] space-y-4", snapshot.isDraggingOver && "bg-secondary/20")}
                      >
                        {column.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <TaskCard
                                task={task}
                                provided={provided}
                                snapshot={snapshot}
                                onDelete={(taskId) => deleteTask(taskId, column.id)}
                                onDuplicate={(taskId) => duplicateTask(taskId, column.id)}
                                onEdit={handleEdit}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        <Dialog
                          open={isAddTaskOpen && selectedColumn === column.id}
                          onOpenChange={(open) => {
                            if (!open && !isSubmittingTask) {
                              setIsAddTaskOpen(false)
                              setSelectedColumn("")
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full border-2 border-dashed border-primary/20 hover:border-primary/40 h-20 rounded-xl"
                              onClick={() => {
                                setSelectedColumn(column.id)
                                setIsAddTaskOpen(true)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Task
                            </Button>
                          </DialogTrigger>
                          <TaskForm
                            columnId={column.id}
                            onAddTask={addTask}
                            onCancel={() => {
                              setIsAddTaskOpen(false)
                              setSelectedColumn("")
                            }}
                            isSubmitting={isSubmittingTask}
                            onSubmit={async () => {}}
                            tempScreenshotBase64={null}
                          />
                        </Dialog>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Edit Task Dialog - Outside of the column loop */}
        <Dialog
          open={isEditTaskOpen}
          onOpenChange={(open) => {
            if (!open && !isUpdatingTask) {
              setIsEditTaskOpen(false)
              setTaskToEdit(null)
            }
          }}
        >
          {taskToEdit && (
            <EditTaskForm
              task={taskToEdit}
              onCancel={() => {
                setIsEditTaskOpen(false)
                setTaskToEdit(null)
              }}
              onSave={updateTask}
            />
          )}
        </Dialog>

        {!isLoading && !error && isConfigured && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-primary/10 rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Team Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {Math.round(
                    ((columns.find((col) => col.id === "complete")?.tasks.length || 0) /
                      Math.max(
                        1,
                        columns.reduce((acc, col) => acc + col.tasks.length, 0),
                      )) *
                      100,
                  ) + "%"}
                </div>
                <p className="text-xs text-gray-500">Overall completion</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/10 rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Active Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {columns.reduce((acc, col) => acc + (col.id !== "complete" ? col.tasks.length : 0), 0)}
                </div>
                <p className="text-xs text-gray-500">In progress</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/10 rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {columns.find((col) => col.id === "complete")?.tasks.length || 0}
                </div>
                <p className="text-xs text-gray-500">Tasks finished</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
