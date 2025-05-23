import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/components/lib/utils";

function Textarea({
  className,
  multiline = true,
  numberOfLines = 4,
  placeholderClassName,
  ...props
}: TextInputProps & {
  ref?: React.RefObject<TextInput>;
}) {
  const [focused, setFocused] = React.useState(false);

  const onFocus = React.useCallback(() => setFocused(true), [setFocused]);
  const onBlur = React.useCallback(() => setFocused(false), [setFocused]);

  return (
    <TextInput
      className={cn(
        "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground",
        props.editable === false && "opacity-50",
        focused && "border-primary",
        className,
      )}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      onFocus={onFocus}
      onBlur={onBlur}
      {...props}
    />
  );
}

export { Textarea };
