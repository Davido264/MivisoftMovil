import { Button } from "@/components/ui/button";
import { ImagePicker as ImagePickerbase } from "@/components/ui/images";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  createFormHook,
  createFormHookContexts,
  useStore,
} from "@tanstack/react-form";
import { PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldComponents: {
    Comment,
    ImagePicker,
    Error,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});

function Comment() {
  const field = useFieldContext<string>();

  return (
    <>
      <Textarea
        placeholder="Comentario..."
        textAlignVertical="top"
        numberOfLines={10}
        defaultValue={field.state.value}
        onChangeText={field.handleChange}
        maxLength={1000}
      />
      <Error />
    </>
  );
}

function Error() {
  const field = useFieldContext();
  return !field.state.meta.isValid ? (
    <Text className="text-destructive text-sm text-ellipsis">
      {field.state.meta.errors.join(", ")}
    </Text>
  ) : (
    <></>
  );
}

function ImagePicker({ storeKey }: { storeKey: string }) {
  const field = useFieldContext();

  return (
    <ImagePickerbase
      fallback={<LoadingIndicator className={"h-60 w-60"} />}
      mediaTypes={["images"]}
      allowsMultipleSelection={true}
      onValueChange={field.handleChange}
      storeKey={storeKey}
    >
      <View className="flex-col w-full gap-2 p-4">
        <ImagePickerbase.PhotoPicker variant="secondary" />
        <ImagePickerbase.GalleryPicker variant="secondary" />
        <ImagePickerbase.ImageViewer />
        <Error />
      </View>
    </ImagePickerbase>
  );
}

function SubmitButton({
  children,
  className = "mt-8",
}: PropsWithChildren & { className?: string }) {
  const form = useFormContext();

  const [isSubmitting, isValid] = useStore(form.store, (state) => [
    state.isSubmitting,
    state.isValid,
  ]);

  return (
    <>
      {form.state.errors.length !== 0 ? (
        <Text className="text-destructive text-sm text-ellipsis">
          {form.state.errors.map((i) => i.form).join(", ")}
        </Text>
      ) : (
        <></>
      )}
      <Button
        disabled={!isValid || isSubmitting}
        className={className}
        onPress={() => form.handleSubmit()}
      >
        {isSubmitting ? (
          <ActivityIndicator
            className="color-primary-foreground"
            size="small"
          />
        ) : (
          children
        )}
      </Button>
    </>
  );
}
