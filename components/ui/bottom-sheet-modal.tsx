import { useCallback, forwardRef, ElementRef, PropsWithChildren } from "react";
import {
  BottomSheetModal as BSM,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useColorScheme } from "@/components/lib/useColorScheme";
import { CSS_COLORS } from "../lib/constants";

const BottomSheetModal = forwardRef<
  ElementRef<typeof BSM>,
  PropsWithChildren & { snapPoints?: string[] | number[] }
>(({ children, ...props }, ref) => {
  const { isDarkColorScheme } = useColorScheme();
  const theme = isDarkColorScheme ? "dark" : "light";

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...p}
        opacity={0.7}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        enableTouchThrough={false}
      />
    ),
    [],
  );

  return (
    <BSM
      ref={ref}
      snapPoints={props.snapPoints || ["50%"]}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: CSS_COLORS[theme].foreground }}
      backgroundStyle={{ backgroundColor: CSS_COLORS[theme].card }}
      enableOverDrag={false}
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView className="bg-card pb-safe">{children}</BottomSheetView>
    </BSM>
  );
});

BottomSheetModal.displayName = "BottomSheetModal";
export default BottomSheetModal;
