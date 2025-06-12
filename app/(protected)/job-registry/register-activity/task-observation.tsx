import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { View } from "react-native";
import { CheckCheck } from "@/components/lib/icons/CheckCheck";
import { Text } from "@/components/ui/text";
import { useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSharedTaskListStore } from "@/lib/store/tasks-list";
import { useStore } from "zustand";
import assert from "@/lib/assert";
import { useSharedImageListStore } from "@/lib/store/image-list";

export default function TaskObservation() {
  const { taskid, taskStoreKey, imageStoreKey } = useLocalSearchParams<{
    taskid: string;
    taskStoreKey?: string;
    imageStoreKey?: string;
  }>();

  assert.notNull(taskStoreKey);
  assert.notNull(imageStoreKey);
  assert.notNull(taskid);

  useSharedImageListStore(imageStoreKey);
  const taskStore = useSharedTaskListStore(taskStoreKey);
  const tasks = useStore(taskStore, (state) => state.tasks);
  const addTaskObservation = useStore(
    taskStore,
    (state) => state.addTaskObservation,
  );
  const router = useRouter();

  const [text, setText] = useState(
    tasks.find((t) => t.taskId === Number(taskid))?.observation ?? "",
  );

  if (!taskid) {
    return <Redirect href="/job-registry/all" />;
  }

  const handleSubmit = () => {
    addTaskObservation(Number(taskid), text);
    router.back();
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1"
      contentContainerClassName="h-full gap-4 p-4 pb-safe-offset-10"
    >
      <Textarea
        className="flex-1"
        defaultValue={text}
        maxLength={1000}
        onChangeText={setText}
      />
      <View className="w-full flex-row justify-end">
        <Button
          className="flex-row gap-3"
          variant="default"
          onPress={handleSubmit}
        >
          <CheckCheck className="color-primary-foreground" size={16} />
          <Text>Marcar como completada</Text>
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}
