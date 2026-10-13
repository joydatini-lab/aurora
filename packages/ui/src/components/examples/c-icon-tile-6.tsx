import { IconTile } from "src/components/reui/icon-tile"
import { GlobeIcon, StarIcon, CircleCheckIcon } from "lucide-react"

export function Pattern() {
  return (
    <div className="flex items-center justify-center gap-4">
      <IconTile variant="outline" size="lg" radius="full" aria-hidden="true">
        <GlobeIcon
        />
      </IconTile>
      <IconTile variant="elevated" size="lg" radius="full" aria-hidden="true">
        <StarIcon
        />
      </IconTile>
      <IconTile variant="frame" size="lg" radius="full" aria-hidden="true">
        <CircleCheckIcon
        />
      </IconTile>
    </div>
  )
}