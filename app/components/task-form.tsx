"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Loader2, Youtube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TaskFormProps {
  columnId: string
  onAddTask: (task: any) => void
  onCancel: () => void
}

export function TaskForm({ columnId, onAddTask, onCancel }: TaskFormProps) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignee: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
    type: "composition" as "composition" | "arrangement" | "recording" | "mixing" | "review",
    duration: "",
    instruments: [] as string[],
    youtubeUrl: "https://www.youtube.com/watch?v=nA8KmHC2Z-g", // Default video
    timestamp: "0", // Default timestamp
    screenshotUrl: "",
    boardId: columnId, // Keep track of board ID
  })

  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState(false)
  const { toast } = useToast()

  const generateThumbnail = async (base64Image: string, airtableRecordId: string) => {
    const response = await fetch("/api/uploadScreenshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image, airtableRecordId }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Thumbnail generation failed:", result.error || result);
      return null;
    }

    return result.imageUrl;
  };

  const handleInstrumentChange = (value: string) => {
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

      setNewTask({
        ...newTask,
        screenshotUrl: data.screenshot,
      })

      toast({
        title: "Screenshot Generated",
        description: "YouTube video screenshot has been generated",
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

  const handleSubmit = () => {
    if (!newTask.title) return

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
    }

    // Ensure task is saved with the board information
    onAddTask(task)
  }

  return (
    <DialogContent className="sm:max-w-[500px]">
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

        <div className="grid gap-2">
          <Label htmlFor="youtubeUrl">YouTube Video URL</Label>
          <div className="flex gap-2">
            <Input
              id="youtubeUrl"
              value={newTask.youtubeUrl}
              onChange={(e) => setNewTask({ ...newTask, youtubeUrl: e.target.value })}
              placeholder="e.g., https://www.youtube.com/watch?v=nA8KmHC2Z-g"
            />
          </div>
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
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={generateScreenshot} disabled={isGeneratingScreenshot} className="w-full">
              {isGeneratingScreenshot ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4" />
                  Generate Screenshot
                </>
              )}
            </Button>
          </div>
        </div>

        {newTask.screenshotUrl && (
          <div className="grid gap-2">
            <Label>Preview</Label>
            <div className="border rounded-md overflow-hidden">
              <img
                src={newTask.screenshotUrl || "/placeholder.svg"}
                alt="YouTube video screenshot"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={newTask.type} onValueChange={(value: any) => setNewTask({ ...newTask, type: value })}>
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
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!newTask.title}>
            Add Task
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}
