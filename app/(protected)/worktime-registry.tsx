import { useAppForm } from "@/components/form";
import {
  getLocation,
  validateExternalInputs,
} from "@/components/form/external-inputs";
import { Send } from "@/components/lib/icons/Send";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { Text } from "@/components/ui/text";
import { registerWorktime } from "@/lib/api/worktime-registry";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import { useSession } from "@/lib/store/application-state";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const imageStoreKey = "worktime-photos";

export default function WorktimeForm() {
  const router = useRouter();

  const userId = useSession((s) => s.uid);
  const { data, updatedAt } = useLiveQuery(
    getCurrentWorktimeRegistryForUser(userId),
  );

  const form = useAppForm({
    defaultValues: {
      comment:
        (data?.length ?? 0) > 0 && data[0].endDate == null
          ? data[0].observation
          : "",
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
    onSubmit: async ({ value, meta }) => {
      const coords = await getLocation();
      if (coords == null) {
        return;
      }

      const ok = await registerWorktime(coords, value.comment, value.photos);
      if (ok) {
        router.dismissTo("/");
      }
    },
  });

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 justify-center items-center" />;
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
