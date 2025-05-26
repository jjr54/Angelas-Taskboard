"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Loader2, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TaskFormProps {
  columnId: string
  onAddTask: (task: any) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function TaskForm({ columnId, onAddTask, onCancel, isSubmitting = false }: TaskFormProps) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
    type: "composition" as "composition" | "arrangement" | "recording" | "mixing" | "review",
    duration: "",
    instruments: [] as string[],
    youtubeUrl: "",
    timestamp: "0",
    screenshotUrl: "",
    boardId: columnId,
  })

  const [instrumentsInput, setInstrumentsInput] = useState("")
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false)
  const [tempScreenshotBase64, setTempScreenshotBase64] = useState("")
  const { toast } = useToast()

  // Load default YouTube URL from localStorage
  useEffect(() => {
    const savedYoutubeUrl = localStorage.getItem("globalYoutubeUrl")
    if (savedYoutubeUrl) {
      setNewTask((prev) => ({
        ...prev,
        youtubeUrl: savedYoutubeUrl,
      }))
    }
  }, [])

  const handleInstrumentChange = (value: string) => {
    setInstrumentsInput(value)
    const instruments = value
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i)
    setNewTask({ ...newTask, instruments })
  }

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : null
  }

  const generateScreenshot = async () => {
    try {
      setIsGeneratingScreenshot(true)

      const videoId = extractVideoId(newTask.youtubeUrl)
      if (!videoId) {
        toast({
          title: "Invalid YouTube URL",
          description: "Please enter a valid YouTube video URL",
          variant: "destructive",
        })
        return
      }

      const timestamp = Number.parseInt(newTask.timestamp) || 0

      // Generate screenshot
      const response = await fetch("/api/youtube-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, timestamp }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate screenshot")
      }

      const data = await response.json()

      // Store the base64 screenshot temporarily
      setTempScreenshotBase64(data.screenshot)
      setNewTask({
        ...newTask,
        screenshotUrl: data.screenshot,
      })

      toast({
        title: "Screenshot Generated",
        description: `Screenshot captured at ${timestamp} seconds`,
      })
    } catch (error) {
      console.error("Error generating screenshot:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate screenshot",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingScreenshot(false)
    }
  }

  const handleSubmit = async () => {
    if (!newTask.title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for the task",
        variant: "destructive",
      })
      return
    }

    const task = {
      ...newTask,
      status: columnId,
      completed: false,
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
      tempScreenshotBase64: tempScreenshotBase64,
    }

    // Pass the task to the parent component
    onAddTask(task)
  }

  return (
    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Task</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="e.g., Main Theme Composition"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Describe the musical task..."
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h3 className="font-medium text-sm">YouTube Reference</h3>

          <div className="grid gap-2">
            <Label htmlFor="youtubeUrl">YouTube Video URL</Label>
            <Input
              id="youtubeUrl"
              value={newTask.youtubeUrl}
              onChange={(e) => setNewTask({ ...newTask, youtubeUrl: e.target.value })}
              placeholder="e.g., https://www.youtube.com/watch?v=nA8KmHC2Z-g"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="timestamp">Timestamp (seconds)</Label>
              <Input
                id="timestamp"
                type="number"
                min="0"
                value={newTask.timestamp}
                onChange={(e) => setNewTask({ ...newTask, timestamp: e.target.value })}
                placeholder="e.g., 30"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={generateScreenshot}
                disabled={isGeneratingScreenshot || !newTask.youtubeUrl || isSubmitting}
                className="w-full"
              >
                {isGeneratingScreenshot ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Take Screenshot
                  </>
                )}
              </Button>
            </div>
          </div>

          {newTask.screenshotUrl && (
            <div className="grid gap-2">
              <Label>Screenshot Preview</Label>
              <div className="border rounded-md overflow-hidden bg-white">
                <img
                  src={newTask.screenshotUrl || "/placeholder.svg"}
                  alt="YouTube video screenshot"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This screenshot will be uploaded to Cloudinary when you create the task
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={newTask.type}
              onValueChange={(value: any) => setNewTask({ ...newTask, type: value })}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={newTask.duration}
              onChange={(e) => setNewTask({ ...newTask, duration: e.target.value })}
              placeholder="e.g., 3:30"
              disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="instruments">Instruments (comma-separated)</Label>
          <Input
            id="instruments"
            value={instrumentsInput}
            onChange={(e) => handleInstrumentChange(e.target.value)}
            placeholder="e.g., Piano, Strings, Orchestra"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">Separate multiple instruments with commas</p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!newTask.title || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Add Task"
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}
