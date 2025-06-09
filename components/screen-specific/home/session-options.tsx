import { useRef } from "react";
import { BottomSheetModal as BSM } from "@gorhom/bottom-sheet";
import BottomSheetModal from "@/components/ui/bottom-sheet-modal";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/components/lib/useColorScheme";
import { Button } from "@/components/ui/button";
import { CSS_COLORS } from "@/components/lib/constants";
import { CircleEllipsis } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useGlobalStore } from "@/lib/store/application-state";
import { syncAll } from "@/lib/api/sync";
import { logout } from "@/lib/api/user-session";

export default function Options() {
  const modalRef = useRef<BSM>(null);
  const { isDarkColorScheme } = useColorScheme();
  const theme = isDarkColorScheme ? "dark" : "light";
  const handlePress = () => modalRef.current?.present();
  const router = useRouter();
  const isSyncing = useGlobalStore((s) => s.isSyncing);

  const handleForceSync = async () => {
    modalRef.current?.dismiss();
    await syncAll(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        className="active:bg-accent/45 android:active:bg-transparent"
        size="icon"
        android_ripple={{
          color: CSS_COLORS[theme].ripple,
          foreground: true,
          borderless: true,
        }}
        onPress={handlePress}
      >
        <CircleEllipsis color={CSS_COLORS[theme].foreground} />
      </Button>
      <BottomSheetModal ref={modalRef} snapPoints={["40%"]}>
        <View className="h-full bg-transparent p-4 gap-3">
          <Button
            variant={"ghost"}
            className="w-full"
            disabled={isSyncing}
            onPress={handleForceSync}
          >
            <Text>Forzar Sincronización</Text>
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onPress={() => {
              modalRef.current?.dismiss();
              router.push("/pending");
            }}
          >
            <Text>Cambios pendientes</Text>
          </Button>
          <Button
            variant={"ghost"}
            className="w-full"
            onPress={() => {
              modalRef.current?.dismiss();
              router.push("/support");
            }}
          >
            <Text>Soporte</Text>
          </Button>
          <Button
            variant={"ghost"}
            className="w-full"
            onPress={async () => {
              modalRef.current?.dismiss();
              await logout();
              router.dismissTo("/");
            }}
          >
            <Text className="text-destructive">Cerrar Sesión</Text>
          </Button>
        </View>
      </BottomSheetModal>
    </>
  );
}
