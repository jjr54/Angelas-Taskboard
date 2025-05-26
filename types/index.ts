export interface Task {
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
  columnId?: string
  completed: boolean
  youtubeUrl?: string
  timestamp?: string
  screenshotUrl?: string
}
