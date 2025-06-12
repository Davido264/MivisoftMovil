import { useSharedImageListStore } from "@/lib/store/image-list";
import { Galeria } from "@nandorojo/galeria";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { useStore } from "zustand";
import { ImageElement, ImageElementWithRemove } from "@/components/ui/images";
import assert from "@/lib/assert";
import {
  getImagesForActivityRegistry,
  getImagesForJobRegistry,
  getImagesForWorktimeRegistry,
} from "@/lib/db/queries/photos";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import LoadingIndicator from "@/components/ui/loading-indicator";
import ErrorScreen from "@/components/ui/error-screen";
import { PhotoSelect } from "@/lib/db/schema/photos";

export default function Gallery() {
  const { storeKey, model, id } = useLocalSearchParams<{
    storeKey: string;
    model?: string;
    id?: string;
  }>();

  if (!storeKey) {
    assert.notNull(model);
    assert.notNull(id);

    assert(
      ["jobreg", "actreg", "worktime"].includes(model),
      `Invalid model: ${model}`,
    );
    return <ReadonlyGallery model={model} id={id} />;
  }

  assert.notNull(storeKey);
  return <BaseGallery storeKey={storeKey} />;
}

function ReadonlyGallery({ model, id }: { model: string; id: string }) {
  let query = undefined;

  switch (model) {
    case "jobreg":
      query = getImagesForJobRegistry(Number(id));
      break;
    case "actreg":
      query = getImagesForActivityRegistry(Number(id));
      break;
    case "worktime":
      query = getImagesForWorktimeRegistry(Number(id));
      break;
  }

  const { data, updatedAt, error } = useLiveQuery(query!);

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  if (error) {
    return <ErrorScreen msg={error.message} />;
  }

  const photos = data.map((i: PhotoSelect) => i.uri);

  return (
    <Galeria urls={photos}>
      <FlashList
        data={photos}
        masonry
        numColumns={2}
        keyExtractor={(i) => i}
        renderItem={({ item, index }) => (
          <ImageElement uri={item} index={index} />
        )}
      />
    </Galeria>
  );
}

function BaseGallery({ storeKey }: { storeKey: string }) {
  const photoStore = useSharedImageListStore(storeKey);
  const photos = useStore(photoStore, (state) => state.photos);

  return (
    <Galeria urls={photos}>
      <FlashList
        data={photos}
        masonry
        numColumns={2}
        keyExtractor={(i) => i}
        renderItem={({ item, index }) => (
          <ImageElementWithRemove
            uri={item}
            index={index}
            storeKey={storeKey}
          />
        )}
      />
    </Galeria>
  );
}
