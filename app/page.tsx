"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Music, Clock, Calendar, RefreshCw, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AirtableConfig } from "./components/airtable-config"
import { ThemeToggle } from "./components/theme-toggle"
import { DebugButton } from "./components/debug-button"

interface Task {
  id: string
  title: string
  description: string
  assignee: {
    name: string
    avatar: string
    initials: string
  }
  dueDate: string
  priority: "low" | "medium" | "high"
  type: "composition" | "arrangement" | "recording" | "mixing" | "review"
  duration?: string
  instruments?: string[]
  status?: string
  completed: boolean
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

const typeColors = {
  composition: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  arrangement: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  recording: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  mixing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default function MusicCompositionBoard() {
  const [columns, setColumns] = useState<Column[]>(initialData)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
    type: "composition" as "composition" | "arrangement" | "recording" | "mixing" | "review",
    duration: "",
    instruments: [] as string[],
  })
  const [selectedColumn, setSelectedColumn] = useState("")
  const [airtableConfig, setAirtableConfig] = useState({
    tableName: "Tasks",
  })

  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [shouldFetchTasks, setShouldFetchTasks] = useState(false)

  // Load saved config on initial mount only
  useEffect(() => {
    const savedConfig = localStorage.getItem("airtableConfig")
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setAirtableConfig(config)
        setIsConfigured(true)
        setShouldFetchTasks(true)
      } catch (e) {
        console.error("Error parsing saved config:", e)
        setIsConfigOpen(true)
      }
    } else {
      // No saved config, show config dialog
      setIsConfigOpen(true)
    }
  }, [])

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

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API error response:", errorData)
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
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
    setIsConfigOpen(false)
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
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
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

  const toggleTaskComplete = async (taskId: string, columnId: string) => {
    const column = columns.find((col) => col.id === columnId)
    const task = column?.tasks.find((t) => t.id === taskId)

    if (!task) return

    const updatedTask = { ...task, completed: !task.completed }

    const newColumns = columns.map((col) => {
      if (col.id === columnId) {
        return {
          ...col,
          tasks: col.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
        }
      }
      return col
    })
    setColumns(newColumns)

    // Update task in Airtable
    try {
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
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

  const addTask = async () => {
    if (!newTask.title || !selectedColumn) return

    const task: Task = {
      id: Date.now().toString(), // Temporary ID
      title: newTask.title,
      description: newTask.description,
      assignee: {
        name: newTask.assignee || "Unassigned",
        avatar: "/placeholder.svg?height=32&width=32",
        initials: newTask.assignee
          ? newTask.assignee
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : "UN",
      },
      dueDate: newTask.dueDate,
      priority: newTask.priority,
      type: newTask.type,
      duration: newTask.duration,
      instruments: newTask.instruments,
      status: selectedColumn,
      completed: false,
    }

    // Optimistically update UI
    const newColumns = columns.map((col) => {
      if (col.id === selectedColumn) {
        return { ...col, tasks: [...col.tasks, task] }
      }
      return col
    })
    setColumns(newColumns)

    try {
      const response = await fetch(`/api/tasks?table=${encodeURIComponent(airtableConfig.tableName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
      }

      const createdTask = await response.json()

      // Update with real ID from Airtable
      const updatedColumns = columns.map((col) => {
        if (col.id === selectedColumn) {
          return {
            ...col,
            tasks: col.tasks.map((t) => (t.id === task.id ? { ...t, id: createdTask.id } : t)),
          }
        }
        return col
      })
      setColumns(updatedColumns)

      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task in Airtable",
        variant: "destructive",
      })
      // Revert changes on error
      setShouldFetchTasks(true)
    }

    setNewTask({
      title: "",
      description: "",
      assignee: "",
      dueDate: "",
      priority: "medium",
      type: "composition",
      duration: "",
      instruments: [],
    })
    setSelectedColumn("")
    setIsAddTaskOpen(false)
  }

  const handleInstrumentChange = (value: string) => {
    const instruments = value
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i)
    setNewTask({ ...newTask, instruments })
  }

  const handleRetry = useCallback(() => {
    setShouldFetchTasks(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Film Score Composition Board</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track and manage music composition tasks for your film project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DebugButton />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Airtable
            </Button>
          </div>
        </div>

        {/* Add the theme test component */}

        {/* Rest of the component remains the same... */}

        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Airtable Configuration</DialogTitle>
            </DialogHeader>
            <AirtableConfig onConfigSaved={handleConfigSaved} initialTableName={airtableConfig.tableName} />
          </DialogContent>
        </Dialog>

        {!isConfigured && !isConfigOpen && (
          <Alert className="mb-6">
            <AlertTitle>Airtable not configured</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>Please configure your Airtable connection to continue.</p>
              <Button variant="outline" size="sm" className="w-fit" onClick={() => setIsConfigOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Airtable
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error loading tasks</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="w-fit" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading tasks from Airtable...</p>
            </div>
          </div>
        )}

        {!isLoading && !error && isConfigured && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700"
                >
                  <div className="p-4 border-b dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-gray-900 dark:text-white">{column.title}</h2>
                      <Badge variant="secondary">{column.tasks.length}</Badge>
                    </div>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-4 min-h-[200px] space-y-3",
                          snapshot.isDraggingOver && "bg-slate-50 dark:bg-gray-700/50",
                        )}
                      >
                        {column.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "cursor-grab active:cursor-grabbing transition-shadow",
                                  snapshot.isDragging && "shadow-lg rotate-2",
                                  task.completed && "opacity-75",
                                )}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
                                    <input
                                      type="checkbox"
                                      checked={task.completed}
                                      onChange={() => toggleTaskComplete(task.id, column.id)}
                                      className="ml-2 rounded dark:bg-gray-700"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                    {task.description}
                                  </p>

                                  <div className="flex flex-wrap gap-1">
                                    <Badge
                                      className={
                                        typeColors[task.type] ||
                                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                      }
                                      variant="secondary"
                                    >
                                      <Music className="w-3 h-3 mr-1" />
                                      {task.type}
                                    </Badge>
                                    <Badge
                                      className={
                                        priorityColors[task.priority] ||
                                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                      }
                                      variant="secondary"
                                    >
                                      {task.priority}
                                    </Badge>
                                  </div>

                                  {task.duration && (
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {task.duration}
                                    </div>
                                  )}

                                  {task.instruments && task.instruments.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {task.instruments.map((instrument, i) => (
                                        <Badge key={`${instrument}-${i}`} variant="outline" className="text-xs">
                                          {instrument}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                                    </div>
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={task.assignee.avatar || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs">{task.assignee.initials}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 h-20"
                              onClick={() => setSelectedColumn(column.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Add New Task to {column.title}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="title">Task Title</Label>
                                <Input
                                  id="title"
                                  value={newTask.title}
                                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                  placeholder="e.g., Main Theme Composition"
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={newTask.description}
                                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                  placeholder="Describe the musical task..."
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="type">Type</Label>
                                  <Select
                                    value={newTask.type}
                                    onValueChange={(value: any) => setNewTask({ ...newTask, type: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="composition">Composition</SelectItem>
                                      <SelectItem value="arrangement">Arrangement</SelectItem>
                                      <SelectItem value="recording">Recording</SelectItem>
                                      <SelectItem value="mixing">Mixing</SelectItem>
                                      <SelectItem value="review">Review</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="priority">Priority</Label>
                                  <Select
                                    value={newTask.priority}
                                    onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="assignee">Assignee</Label>
                                  <Input
                                    id="assignee"
                                    value={newTask.assignee}
                                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                                    placeholder="Team member name"
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="duration">Duration</Label>
                                  <Input
                                    id="duration"
                                    value={newTask.duration}
                                    onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
                                    placeholder="e.g., 3:30"
                                  />
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                  id="dueDate"
                                  type="date"
                                  value={newTask.dueDate}
                                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor="instruments">Instruments (comma-separated)</Label>
                                <Input
                                  id="instruments"
                                  value={newTask.instruments.join(", ")}
                                  onChange={(e) => handleInstrumentChange(e.target.value)}
                                  placeholder="e.g., Piano, Strings, Orchestra"
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={addTask} disabled={!newTask.title}>
                                  Add Task
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {!isLoading && !error && isConfigured && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    ((columns.find((col) => col.id === "complete")?.tasks.length || 0) /
                      Math.max(
                        1,
                        columns.reduce((acc, col) => acc + col.tasks.length, 0),
                      )) *
                      100,
                  ) + "%"}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Overall completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {columns.reduce((acc, col) => acc + (col.id !== "complete" ? col.tasks.length : 0), 0)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {columns.find((col) => col.id === "complete")?.tasks.length || 0}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Tasks finished</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
