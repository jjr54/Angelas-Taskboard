"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Music, Clock, Calendar, MoreVertical, Copy, Trash2, Youtube, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface TaskCardProps {
  task: any
  provided: any
  snapshot: any
  onDelete: (taskId: string) => void
  onDuplicate: (taskId: string) => void
  onEdit: (task: any) => void
}

const typeColors = {
  composition: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  arrangement: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  recording: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  mixing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
}

const priorityBorders = {
  low: "border-blue-500 dark:border-blue-400",
  medium: "border-yellow-500 dark:border-yellow-400",
  high: "border-red-500 dark:border-red-400",
}

// Function to format date to MM/dd/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return "No due date"

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Invalid date"

  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const year = date.getFullYear()

  return `${month}/${day}/${year}`
}

export function TaskCard({ task, provided, snapshot, onDelete, onDuplicate, onEdit }: TaskCardProps) {
  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow border-l-[10px]",
        priorityBorders[task.priority],
        snapshot.isDragging && "shadow-lg rotate-2",
        task.completed && "opacity-75",
      )}
    >
      {task.screenshotUrl && (
        <div className="relative w-full h-40 overflow-hidden rounded-t-lg">
          <img
            src={task.screenshotUrl || "/placeholder.svg"}
            alt="Video screenshot"
            className="w-full h-full object-cover"
          />
          {task.youtubeUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />}
          {task.youtubeUrl && (
            <a
              href={task.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors shadow-lg"
              title="Open YouTube video"
            >
              <Youtube className="h-5 w-5" />
            </a>
          )}
          {task.timestamp && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {Math.floor(Number.parseInt(task.timestamp) / 60)}:
              {(Number.parseInt(task.timestamp) % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Task menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(task.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600 dark:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{task.description}</p>

        <div className="flex flex-wrap gap-1">
          <Badge
            className={typeColors[task.type] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}
            variant="secondary"
          >
            <Music className="w-3 h-3 mr-1" />
            {task.type}
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
            {task.instruments.map((instrument: string, i: number) => (
              <Badge key={`${instrument}-${i}`} variant="outline" className="text-xs">
                {instrument}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3 mr-1" />
            {formatDate(task.dueDate)}
          </div>
          <Avatar className="w-6 h-6">
            <AvatarImage src={task.assignee.avatar || "/placeholder.svg"} />
            <AvatarFallback className="text-xs">{task.assignee.initials}</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  )
}
