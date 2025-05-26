import { FolderOpen } from "lucide-react"

interface EmptyProps {
  label: string
}

export function Empty({ label }: EmptyProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-20">
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-60 h-60 text-muted-foreground">
          <FolderOpen className="w-full h-full stroke-[0.5]" />
        </div>
        <p className="text-muted-foreground text-sm text-center">{label}</p>
      </div>
    </div>
  )
}
