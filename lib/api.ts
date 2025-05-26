import type { Task } from "@/types"

// Get all tasks
export async function getTasks(boardId: string): Promise<Task[]> {
  try {
    const response = await fetch(`/api/tasks?table=${encodeURIComponent(boardId)}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.tasks || []
  } catch (error) {
    console.error("Error fetching tasks:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch tasks")
  }
}

// Create a new task
export async function createTask(task: Partial<Task>): Promise<Task> {
  try {
    const response = await fetch(`/api/tasks?table=${encodeURIComponent(task.columnId || "Tasks")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating task:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to create task")
  }
}

// Update an existing task
export async function updateTask(task: Task): Promise<Task> {
  try {
    const response = await fetch(`/api/tasks?table=${encodeURIComponent(task.columnId || "Tasks")}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error updating task:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to update task")
  }
}

// Delete a task
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const response = await fetch(`/api/tasks?id=${taskId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error deleting task:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to delete task")
  }
}

// Reorder tasks
export async function reorderTasks({
  id,
  columnId,
  position,
}: { id: string; columnId: string; position: number }): Promise<void> {
  try {
    const response = await fetch(`/api/tasks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, columnId, position }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error("Error reordering tasks:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to reorder tasks")
  }
}
