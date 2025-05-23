import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Play } from "@/components/lib/icons/Play";
import { formatDateTime } from "@/lib/date";

export default function DateBadge({ date }: { date: Date }) {
  return (
    <Badge variant="secondary" className="flex-row gap-2">
      <Play size={14} className="color-secondary-foreground" />
      <Text>{formatDateTime(date)}</Text>
    </Badge>
  );
}
