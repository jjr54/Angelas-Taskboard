import type { ReactNode } from "react"

interface DashboardHeaderProps {
  children: ReactNode
}

export function DashboardHeader({ children }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b">
      <h1 className="text-2xl font-bold">{children}</h1>
    </div>
  )
}
