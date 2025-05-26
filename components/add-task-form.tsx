"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AddTaskFormProps {
  onCreateTask: (task: any) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function AddTaskForm({ onCreateTask, onCancel, isSubmitting = false }: AddTaskFormProps) {
  const [task, setTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    type: "composition",
    columnId: "todo",
  })
  const { toast } = useToast()

  const handleSubmit = () => {
    if (!task.title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for the task",
        variant: "destructive",
      })
      return
    }

    onCreateTask(task)
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
            id="title"
            value={task.title}
            onChange={(e) => setTask({ ...task, title: e.target.value })}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Textarea
            id="description"
            value={task.description}
            onChange={(e) => setTask({ ...task, description: e.target.value })}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="priority" className="text-right">
            Priority
          </Label>
          <Select value={task.priority} onValueChange={(value) => setTask({ ...task, priority: value })}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            Type
          </Label>
          <Select value={task.type} onValueChange={(value) => setTask({ ...task, type: value })}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select type" />
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
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-full">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!task.title || isSubmitting} className="rounded-full" type="button">
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
