import Toast, {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from "react-native-toast-message";
import { useColorScheme } from "@/components/lib/useColorScheme";
import { CSS_COLORS } from "../lib/constants";

export function ToastProvider() {
  const { isDarkColorScheme } = useColorScheme();
  const theme = isDarkColorScheme ? "dark" : "light";

  const toastConfig: ToastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          backgroundColor: CSS_COLORS[theme].card,
          borderLeftColor: CSS_COLORS[theme].success,
        }}
        text1Style={{ color: CSS_COLORS[theme].cardForeground }}
        text2Style={{ color: CSS_COLORS[theme].cardForeground }}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={{
          backgroundColor: CSS_COLORS[theme].card,
          borderLeftColor: CSS_COLORS[theme].destructive,
        }}
        text1Style={{ color: CSS_COLORS[theme].cardForeground }}
        text2Style={{ color: CSS_COLORS[theme].cardForeground }}
      />
    ),
    warning: (props) => (
      <ErrorToast
        {...props}
        style={{
          backgroundColor: CSS_COLORS[theme].card,
          borderLeftColor: CSS_COLORS[theme].warning,
        }}
        text1Style={{ color: CSS_COLORS[theme].cardForeground }}
        text2Style={{ color: CSS_COLORS[theme].cardForeground }}
      />
    ),
    info: (props) => (
      <BaseToast
        {...props}
        style={{
          backgroundColor: CSS_COLORS[theme].card,
          borderLeftColor: CSS_COLORS[theme].primary,
        }}
        text1Style={{ color: CSS_COLORS[theme].cardForeground }}
        text2Style={{ color: CSS_COLORS[theme].cardForeground }}
      />
    ),
  };

  return <Toast config={toastConfig} position="top" />;
}
