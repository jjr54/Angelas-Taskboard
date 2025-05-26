"use client"

import { Droppable } from "@hello-pangea/dnd"
import type { Task } from "@/types"
import { TaskCard } from "@/app/components/task-card"
import { Draggable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"

interface ColumnProps {
  columnId: string
  tasks: Task[]
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}

export function Column({ columnId, tasks, onDelete, onEdit }: ColumnProps) {
  // Format column ID for display
  const formatColumnName = (id: string) => {
    if (id === "todo") return "To Do"
    if (id === "inprogress" || id === "inProgress") return "In Progress"
    return id.charAt(0).toUpperCase() + id.slice(1)
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 font-bold text-lg">{formatColumnName(columnId)}</div>
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "p-4 min-h-[200px] space-y-4 rounded-xl glass-card",
              snapshot.isDraggingOver && "bg-secondary/20",
            )}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <TaskCard
                    task={task}
                    provided={provided}
                    snapshot={snapshot}
                    onDelete={(taskId) => onDelete(taskId)}
                    onDuplicate={() => {}} // Placeholder for now
                    onEdit={() => onEdit(task)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
