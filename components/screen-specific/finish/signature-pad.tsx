import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Canvas,
  Path,
  Skia,
  StrokeJoin,
  StrokeCap,
} from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import ViewShot from "react-native-view-shot";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Ref } from "react";

export default function SignaturePad({ ref }: { ref: Ref<ViewShot> }) {
  console.log("render draw");
  const paths = useSharedValue(Skia.Path.Make());
  const pathd = useDerivedValue(() => paths.value.toSVGString(), []);
  const didUpdate = useSharedValue(false);
  const lastPoint = useSharedValue<{ x: number; y: number } | null>(null);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onStart((g) => {
      "worklet";
      didUpdate.value = false;
      lastPoint.value = { x: g.x, y: g.y };
      paths.modify((value) => {
        value.moveTo(g.x, g.y);
        return value;
      });
    })
    .onUpdate((g) => {
      "worklet";
      didUpdate.value = true;
      if (lastPoint.value != null) {
        const midX = (lastPoint.value.x + g.x) / 2;
        const midY = (lastPoint.value.y + g.y) / 2;

        paths.modify((value) => {
          if (lastPoint.value != null) {
            value.quadTo(lastPoint.value.x, lastPoint.value.y, midX, midY);
          }
          return value;
        });

        lastPoint.value = { x: g.x, y: g.y };
      }
    })
    .onFinalize((g) => {
      "worklet";
      if (!didUpdate.value) {
        paths.modify((value) => {
          value.addCircle(g.x, g.y, 2);
          return value;
        });
      }
      lastPoint.value = null;
      didUpdate.value = false;
    });

  const handleClear = () => {
    paths.value = Skia.Path.Make();
  };

  return (
    <>
      <View className="w-full">
        <Text className="text-muted-foreground">Firma</Text>
        <Separator />
      </View>
      <GestureDetector gesture={panGesture}>
        <View className="w-full h-96 border-border border-2 rounded-lg overflow-hidden">
          <ViewShot ref={ref} style={{ flex: 1 }}>
            <Canvas style={{ height: "100%", width: "100%", backgroundColor: "#cad5e2" }}>
              <Path
                path={pathd}
                strokeWidth={4}
                style="stroke"
                color="#000000ff"
                stroke={{ join: StrokeJoin.Round, cap: StrokeCap.Round }}
              />
            </Canvas>
          </ViewShot>
        </View>
      </GestureDetector>
      <View className="w-full">
        <Button onPress={handleClear} variant="outline">
          <Text className="text-destructive">Borrar</Text>
        </Button>
      </View>
    </>
  );
}
