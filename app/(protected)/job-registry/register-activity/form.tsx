import { useAppForm } from "@/components/form";
import { useStore } from "zustand/react";
import ErrorScreen from "@/components/ui/error-screen";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { getActivityRegistry } from "@/lib/db/queries/activity-registries";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Send } from "@/components/lib/icons/Send";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLocation,
  validateExternalInputs,
} from "@/components/form/external-inputs";
import { useSharedTaskListStore } from "@/lib/store/tasks-list";
import { registerActivity } from "@/lib/api/activity-registry";
import assert from "@/lib/assert";
import { useSharedImageListStore } from "@/lib/store/image-list";
import { syncAll } from "@/lib/api/sync";

export default function RegisterActivityForm() {
  const {
    actid,
    actName,
    jobregid,
    actregid,
    taskStoreKey,
    imageStoreKey,
    completeAll,
  } = useLocalSearchParams<{
    actid: string;
    actName: string;
    jobregid: string;
    actregid: string;
    taskStoreKey?: string;
    imageStoreKey?: string;
    completeAll?: string;
  }>();

  assert.notNull(taskStoreKey);
  assert.notNull(imageStoreKey);

  const { data, error, updatedAt } = useLiveQuery(
    getActivityRegistry(Number(actregid)),
  );

  const currentAvtivity = data?.length > 0 ? data[0] : undefined;

  const imageStore = useSharedImageListStore(imageStoreKey);
  const photos = useStore(imageStore, (i) => i.photos);
  const taskStore = useSharedTaskListStore(taskStoreKey);
  const tasks = useStore(taskStore, (state) => state.tasks);

  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      jobRegistryId: Number(jobregid ?? 0),
      activityId: Number(actid ?? 0),
      comment: currentAvtivity?.observation ?? "",
      photos,
      tasks,
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        if (
          value.comment.length === 0 ||
          value.comment.length > 1000 ||
          !value.photos.length
        ) {
          return {
            fields: {
              comment:
                (value.comment.length === 0 || value.comment.length > 1000) &&
                "Debe existir un comentario de entre 1 y 1000 caracteres",
              photos:
                !value.photos.length &&
                "No se puede crear un registro sin fotos",
            },
          };
        }
        return await validateExternalInputs();
      },
    },
    onSubmit: async ({ value }) => {
      const coords = await getLocation();
      if (coords == null) {
        return;
      }

      const ok = await registerActivity(
        value.jobRegistryId,
        value.activityId,
        coords,
        value.comment,
        value.tasks,
        value.photos,
        completeAll === "true",
      );

      if (ok) {
        // El store de tareas usa una key constante y se cachea entre entradas;
        // si no se limpia, las tareas ya guardadas se re-envían en el siguiente
        // guardado y chocan con el upsert. Las ya completadas se vuelven a
        // mostrar desde la BD (getActivityTasks) al re-entrar.
        taskStore.setState({ tasks: [] });
        imageStore.setState({ photos: [] });
        queueMicrotask(() => syncAll());
        router.dismissTo("/");
      }
    },
  });

  if (!actid || !actName || !jobregid) {
    return <Redirect href="/job-registry/all" />;
  }

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  if (error) {
    return <ErrorScreen msg={error.message} />;
  }

  const taskCountLabel =
    tasks.length > 1 || tasks.length === 0 ? "tareas" : "tarea";

  return (
    <KeyboardAwareScrollView
      bounces={true}
      className="flex-1 gap-2"
      contentContainerClassName="pb-safe-offset-10"
    >
      <View className="w-full p-4">
        <Card>
          <CardHeader>
            <CardTitle>{actName}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text>
              Registrando {tasks.length} {taskCountLabel}
            </Text>
          </CardContent>
        </Card>
      </View>

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
          <View className="w-full flex-col gap-2">
            <form.SubmitButton
              className="flex-row gap-2 items-center justify-center"
              onSubmit={() =>
                router.replace({
                  pathname: "/job-registry/register-activity",
                  params: { jobregid },
                })
              }
            >
              <Send className="color-primary-foreground" size={16} />
              <Text>Enviar y Crear Nuevo</Text>
            </form.SubmitButton>

            <form.SubmitButton
              className="flex-row gap-2 items-center justify-center"
              variant="outline"
            >
              <Send className="color-foreground" size={16} />
              <Text>Enviar y Cerrar</Text>
            </form.SubmitButton>
          </View>
        </form.AppForm>
      </View>
    </KeyboardAwareScrollView>
  );
}
