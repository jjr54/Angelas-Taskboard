"use client"

import { Button } from "@/components/ui/button"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Task } from "@/types"
import { Loader2 } from "lucide-react"
import { useState } from "react"

interface EditTaskFormProps {
  task: Task
  onCancel: () => void
  onSave: (task: Task) => void
}

export function EditTaskForm({ task, onCancel, onSave }: EditTaskFormProps) {
  const [editedTask, setEditedTask] = useState<Task>(task)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onSave(editedTask)
    setIsSubmitting(false)
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit task</DialogTitle>
        <DialogDescription>Make changes to your task here. Click save when you're done.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="text-right">
            Title
          </Label>
          <Input
            id="title"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Input
            id="description"
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            className="col-span-3"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="rounded-full">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!editedTask.title || isSubmitting}
          className="rounded-full"
          type="button"
        >
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
    </DialogContent>
  )
}
