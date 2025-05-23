import * as React from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { CSS_COLORS } from "@/components/lib/constants";
import { useColorScheme } from "@/components/lib/useColorScheme";
import { cn } from "@/components/lib/utils";
import { Eye, EyeOff } from "lucide-react-native";
import { Button } from "@/components/ui/button";

const Input = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  TextInputProps
>(({ className, placeholderClassName, ...props }, ref) => {
  const [focused, setFocused] = React.useState(false);

  const onFocus = React.useCallback(() => setFocused(true), [setFocused]);
  const onBlur = React.useCallback(() => setFocused(false), [setFocused]);

  return (
    <TextInput
      ref={ref}
      className={cn(
        "h-10 native:h-12 rounded-md border border-input bg-background px-3 text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground file:border-0 file:bg-transparent file:font-medium",
        props.editable === false && "opacity-50",
        focused && "border-primary",
        className,
      )}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      onFocus={onFocus}
      onBlur={onBlur}
      {...props}
    />
  );
});

Input.displayName = "Input";

const PasswordInput = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  TextInputProps
>(({ className, placeholderClassName, ...props }, ref) => {
  const { isDarkColorScheme } = useColorScheme();
  const [hidden, setHidden] = React.useState(true);
  const color = isDarkColorScheme
    ? CSS_COLORS.dark.mutedForeground
    : CSS_COLORS.light.mutedForeground;

  const [focused, setFocused] = React.useState(false);

  const onFocus = React.useCallback(() => setFocused(true), [setFocused]);
  const onBlur = React.useCallback(() => setFocused(false), [setFocused]);

  return (
    <View
      className={cn(
        "flex-row w-full border border-input rounded-md bg-background file:bg-transparent",
        focused && "border-primary",
        className,
      )}
    >
      <TextInput
        {...props}
        ref={ref}
        textContentType="password"
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry={hidden}
        className={cn(
          "flex-1 h-10 native:h-12 rounded-md px-3 text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground file:border-0 file:font-medium",
          props.editable === false && "opacity-50",
        )}
        placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <View className="w-12 h-12">
        <Button
          className="active:bg-accent/45 android:active:bg-transparent"
          variant="ghost"
          style={{ borderRadius: 9999 }}
          android_ripple={{
            color: isDarkColorScheme
              ? CSS_COLORS.dark.ripple
              : CSS_COLORS.light.ripple,
            foreground: true,
            borderless: true,
          }}
          onPress={() => setHidden(!hidden)}
        >
          <View
            className="w-full h-full items-center justify-center"
            role="button"
          >
            {hidden ? <Eye color={color} /> : <EyeOff color={color} />}
          </View>
        </Button>
      </View>
    </View>
  );
});

PasswordInput.displayName = "PasswordInput";

export { Input, PasswordInput };
