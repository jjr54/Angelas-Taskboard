"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface TaskFormProps {
  onCancel: () => void
  onSubmit: (title: string) => Promise<void>
  columnId: string
  onAddTask: (task: any) => Promise<void>
  tempScreenshotBase64: string | null
}

export function TaskForm({ onCancel, onSubmit, columnId, onAddTask, tempScreenshotBase64 }: TaskFormProps) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "",
    type: "",
    dueDate: "",
    duration: "",
    instruments: [],
    youtubeUrl: "",
    timestamp: "",
    assignee: "",
  })
  const { pending } = useFormStatus()
  const isSubmitting = pending
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!newTask.title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for the task",
        variant: "destructive",
      })
      return
    }

    // Create a task object with only essential fields
    const task = {
      title: newTask.title,
      description: newTask.description,
      status: columnId,
      priority: newTask.priority,
      type: newTask.type,
      completed: false,
    }

    // Only add optional fields if they have values
    if (newTask.dueDate) task.dueDate = newTask.dueDate
    if (newTask.duration) task.duration = newTask.duration
    if (newTask.instruments && newTask.instruments.length > 0) task.instruments = newTask.instruments
    if (newTask.youtubeUrl) task.youtubeUrl = newTask.youtubeUrl
    if (newTask.timestamp) task.timestamp = newTask.timestamp

    // Only add assignee if it has a value
    if (newTask.assignee) {
      task.assignee = {
        name: newTask.assignee,
      }
    } else {
      task.assignee = {
        name: "Unassigned",
      }
    }

    // Add screenshot if available
    if (tempScreenshotBase64) {
      task.tempScreenshotBase64 = tempScreenshotBase64
    }

    // Pass the task to the parent component
    await onAddTask(task)

    // Explicitly close the dialog
    onCancel()
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Add task</DialogTitle>
        <DialogDescription>Add a new task to your list. Click save when you're done.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="text-right">
            Title
          </Label>
          <Input
            type="text"
            id="title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="col-span-3"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-full">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!newTask.title || isSubmitting} className="rounded-full" type="button">
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
    </DialogContent>
  )
}
