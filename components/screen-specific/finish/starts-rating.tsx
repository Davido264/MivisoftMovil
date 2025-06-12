import { Button } from "@/components/ui/button";
import { Star } from "@/components/lib/icons/Star";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

export function StartsRating({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) {
  return (
    <Card className="p-4 gap-3">
      <Text className="text-muted-foreground">Calificación</Text>
      <Separator />
      <View className="w-full flex-row items-center justify-center gap-3">
        <ActionableStarIcon
          active={rating >= 1}
          onPress={() => onRatingChange(1)}
        />
        <ActionableStarIcon
          active={rating >= 2}
          onPress={() => onRatingChange(2)}
        />
        <ActionableStarIcon
          active={rating >= 3}
          onPress={() => onRatingChange(3)}
        />
        <ActionableStarIcon
          active={rating >= 4}
          onPress={() => onRatingChange(4)}
        />
        <ActionableStarIcon
          active={rating >= 5}
          onPress={() => onRatingChange(5)}
        />
      </View>
    </Card>
  );
}

function ActionableStarIcon({
  active,
  onPress,
}: {
  active?: boolean;
  onPress?: () => void;
}) {
  const className = active
    ? "color-warning fill-warning"
    : "color-muted-foreground";

  return (
    <Button variant="ghost" size="icon" onPress={onPress}>
      <Star className={className} size={36} />
    </Button>
  );
}
