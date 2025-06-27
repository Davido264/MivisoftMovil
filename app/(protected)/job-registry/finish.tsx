import { useAppForm } from "@/components/form";
import {
  getLocation,
  validateExternalInputs,
} from "@/components/form/external-inputs";
import { Send } from "@/components/lib/icons/Send";
import SignaturePad from "@/components/screen-specific/finish/signature-pad";
import { StartsRating } from "@/components/screen-specific/finish/starts-rating";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/ui/images";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { Text } from "@/components/ui/text";
import { finishJob } from "@/lib/api/job-registry";
import { syncAll } from "@/lib/api/sync";
import { getActivityRegistryCount } from "@/lib/db/queries/activity-registries";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import ViewShot, { captureRef } from "react-native-view-shot";

const imageStoreKey = "job-registry-finish-photos";
const signStoreKey = "job-registry-finish-signature";

export default function FinishJobRegistry() {
  const { jobregid } = useLocalSearchParams<{
    jobregid: string;
  }>();

  const ref = useRef<ViewShot>(null);
  const router = useRouter();
  const signRef = useRef<string>("");
  const [usePhoto, setUsePhoto] = useState(false);

  const form = useAppForm({
    defaultValues: {
      jobRegistryId: Number(jobregid ?? 0),
      score: 1,
      comment: "",
      photos: [] as string[],
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        if (
          !value.photos.length ||
          value.comment.length === 0 ||
          value.comment.length > 1000
        ) {
          return {
            fields: {
              photos:
                !value.photos.length &&
                "No se puede crear un registro sin fotos",
              comment:
                (value.comment.length === 0 || value.comment.length > 1000) &&
                "Debe existir un comentario de entre 1 y 1000 caracteres",
            },
          };
        }
        return await validateExternalInputs();
      },
    },
    onSubmit: async ({ value }) => {
      if ((await getLocation()) == null) {
        return;
      }

      const sign = usePhoto
        ? signRef.current
        : await captureRef(ref, {
            format: "png",
            quality: 0.8,
          });

      if (sign == null || sign.length === 0) {
        return;
      }

      const ok = await finishJob(
        value.jobRegistryId,
        value.comment,
        value.score,
        sign,
        value.photos,
      );

      if (ok) {
        queueMicrotask(() => syncAll())
        router.dismissTo("/");
      }
    },
  });

  const [loading, activityCount] = useActivityCount(Number(jobregid ?? 0));

  if (loading) {
    return <LoadingIndicator className="flex-1 justify-center items-center" />
  }

  if (activityCount === 0) {
    return (
      <Redirect href={{
        pathname: "/job-registry/register-activity",
        params: { jobregid },
      }} />
    )
  }

  if (!jobregid) {
    return <Redirect href="/job-registry/all" />;
  }

  return (
    <KeyboardAwareScrollView
      bounces={true}
      className="flex-1 gap-2"
      contentContainerClassName="pb-safe-offset-10"
    >
      <View className="w-full items-center">
        <form.AppField name="photos">
          {(field) => <field.ImagePicker storeKey={imageStoreKey} />}
        </form.AppField>
      </View>

      <View className="w-full p-4">
        <form.Field name="score">
          {(field) => (
            <StartsRating
              rating={field.state.value}
              onRatingChange={field.handleChange}
            />
          )}
        </form.Field>
      </View>

      <View className="py-4 px-6 w-full gap-4 items-center">
        <Button
          onPress={() => setUsePhoto(!usePhoto)}
          variant="outline"
          className="w-full"
        >
          <Text>Cambiar a {usePhoto ? "Dibujo" : "Fotos"}</Text>
        </Button>
        {usePhoto ? (
          <View className="w-full h-96 items-center justify-center">
            <ImagePicker
              fallback={<LoadingIndicator className={"h-96 w-96"} />}
              mediaTypes={["images"]}
              quality={0.8}
              allowsMultipleSelection={false}
              selectionLimit={1}
              allowsEditing
              single
              onValueChange={(vals) =>
                (signRef.current = vals.length > 0 ? vals[0] : "")
              }
              storeKey={signStoreKey}
            >
              <View className="flex-col w-full gap-2">
                <ImagePicker.PhotoPicker variant="secondary" />
                <ImagePicker.GalleryPicker variant="secondary" />
                <ImagePicker.ImageViewer />
              </View>
            </ImagePicker>
          </View>
        ) : (
          <SignaturePad ref={ref} />
        )}
      </View>

      <View className="px-4 w-full gap-4">
        <form.AppField name="comment">
          {(field) => <field.Comment />}
        </form.AppField>

        <form.AppForm>
          <form.SubmitButton className="flex-row gap-2 items-center justify-center">
            <Send className="color-primary-foreground" size={16} />
            <Text>Enviar</Text>
          </form.SubmitButton>
        </form.AppForm>
      </View>
    </KeyboardAwareScrollView>
  );
}

function useActivityCount(jobRegistryId: number) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityRegistryCount(jobRegistryId).then((c) => {
      setLoading(false)
      setCount(c)
    });
  }, [jobRegistryId]);

  return [loading, count] as [boolean, number];
}
