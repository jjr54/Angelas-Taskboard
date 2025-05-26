"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Loader2, Camera, X, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EditTaskFormProps {
  task: any
  onUpdateTask: (task: any) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function EditTaskForm({ task, onUpdateTask, onCancel, isSubmitting = false }: EditTaskFormProps) {
  const [editedTask, setEditedTask] = useState({
    id: task.id,
    title: task.title || "",
    description: task.description || "",
    assignee: task.assignee?.name || "",
    dueDate: task.dueDate || "",
    priority: task.priority || "medium",
    type: task.type || "composition",
    duration: task.duration || "",
    instruments: task.instruments || [],
    youtubeUrl: task.youtubeUrl || "",
    timestamp: task.timestamp || "0",
    screenshotUrl: task.screenshotUrl || "",
    status: task.status || "todo",
    completed: task.completed || false,
  })

  // Parse duration into minutes and seconds
  const parseDuration = (duration: string) => {
    if (!duration) return { minutes: "", seconds: "" }
    const parts = duration.split(":")
    return {
      minutes: parts[0] || "",
      seconds: parts[1] || "",
    }
  }

  const initialDuration = parseDuration(task.duration)
  const [durationMinutes, setDurationMinutes] = useState(initialDuration.minutes)
  const [durationSeconds, setDurationSeconds] = useState(initialDuration.seconds)
  const [instrumentsInput, setInstrumentsInput] = useState(task.instruments?.join(", ") || "")
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false)
  const [tempScreenshotBase64, setTempScreenshotBase64] = useState("")
  const { toast } = useToast()

  // Update duration when minutes or seconds change
  useEffect(() => {
    if (durationMinutes || durationSeconds) {
      const mins = Number.parseInt(durationMinutes) || 0
      const secs = Number.parseInt(durationSeconds) || 0
      const totalSeconds = mins * 60 + secs
      const formattedMins = Math.floor(totalSeconds / 60)
      const formattedSecs = totalSeconds % 60
      setEditedTask((prev) => ({
        ...prev,
        duration: `${formattedMins}:${formattedSecs.toString().padStart(2, "0")}`,
      }))
    } else {
      setEditedTask((prev) => ({ ...prev, duration: "" }))
    }
  }, [durationMinutes, durationSeconds])

  const handleInstrumentChange = (value: string) => {
    setInstrumentsInput(value)
    const instruments = value
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i)
    setEditedTask({ ...editedTask, instruments })
  }

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : null
  }

  const generateScreenshot = async () => {
    try {
      setIsGeneratingScreenshot(true)

      const videoId = extractVideoId(editedTask.youtubeUrl)
      if (!videoId) {
        toast({
          title: "Invalid YouTube URL",
          description: "Please enter a valid YouTube video URL",
          variant: "destructive",
        })
        return
      }

      const timestamp = Number.parseInt(editedTask.timestamp) || 0

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
      setEditedTask({
        ...editedTask,
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

  const clearScreenshot = () => {
    setTempScreenshotBase64("")
    setEditedTask({
      ...editedTask,
      screenshotUrl: "",
    })
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleDurationMinutesChange = (value: string) => {
    // Only allow numbers
    const numValue = value.replace(/\D/g, "")
    setDurationMinutes(numValue)
  }

  const handleDurationSecondsChange = (value: string) => {
    // Only allow numbers
    const numValue = value.replace(/\D/g, "")
    // Limit to 59 seconds
    if (Number.parseInt(numValue) > 59) {
      setDurationSeconds("59")
    } else {
      setDurationSeconds(numValue)
    }
  }

  const handleSubmit = async () => {
    if (!editedTask.title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for the task",
        variant: "destructive",
      })
      return
    }

    // Create a task object with all fields
    const updatedTask = {
      ...editedTask,
      assignee: editedTask.assignee
        ? {
            name: editedTask.assignee,
          }
        : task.assignee,
    }

    // Add screenshot if a new one was generated
    if (tempScreenshotBase64) {
      updatedTask.tempScreenshotBase64 = tempScreenshotBase64
    }

    // Pass the task to the parent component
    onUpdateTask(updatedTask)
  }

  return (
    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Task</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            placeholder="e.g., Main Theme Composition"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
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
              value={editedTask.youtubeUrl}
              onChange={(e) => setEditedTask({ ...editedTask, youtubeUrl: e.target.value })}
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
                value={editedTask.timestamp}
                onChange={(e) => setEditedTask({ ...editedTask, timestamp: e.target.value })}
                placeholder="e.g., 30"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={generateScreenshot}
                disabled={isGeneratingScreenshot || !editedTask.youtubeUrl || isSubmitting}
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

          {/* Screenshot Preview Section */}
          {(editedTask.screenshotUrl || tempScreenshotBase64) && (
            <div className="mt-4 border rounded-md overflow-hidden bg-white dark:bg-gray-800">
              <div className="relative">
                <img
                  src={tempScreenshotBase64 || editedTask.screenshotUrl || "/placeholder.svg"}
                  alt="YouTube video screenshot"
                  className="w-full h-auto object-cover"
                />

                {/* Timestamp Badge */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {formatTimestamp(Number.parseInt(editedTask.timestamp) || 0)}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    onClick={() => window.open(editedTask.youtubeUrl, "_blank")}
                    title="Open YouTube video"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 bg-black/50 hover:bg-red-600/70 text-white rounded-full"
                    onClick={clearScreenshot}
                    title="Remove screenshot"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Caption */}
              <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t">
                {tempScreenshotBase64
                  ? "New screenshot will be uploaded when you save"
                  : "Current screenshot from Cloudinary"}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={editedTask.type}
              onValueChange={(value: any) => setEditedTask({ ...editedTask, type: value })}
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
              value={editedTask.priority}
              onValueChange={(value: any) => setEditedTask({ ...editedTask, priority: value })}
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
              value={editedTask.assignee}
              onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
              placeholder="Team member name"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label>Duration</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="durationMinutes"
                type="text"
                value={durationMinutes}
                onChange={(e) => handleDurationMinutesChange(e.target.value)}
                placeholder="0"
                disabled={isSubmitting}
                className="w-16 text-center"
              />
              <span className="text-sm font-medium">:</span>
              <Input
                id="durationSeconds"
                type="text"
                value={durationSeconds}
                onChange={(e) => handleDurationSecondsChange(e.target.value)}
                placeholder="00"
                disabled={isSubmitting}
                className="w-16 text-center"
                maxLength={2}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">min:sec</span>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={editedTask.dueDate}
            onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
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
          <Button onClick={handleSubmit} disabled={!editedTask.title || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}
