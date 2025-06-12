import assert from "@/lib/assert";
import {
  createContext,
  memo,
  PropsWithChildren,
  useContext,
  useEffect,
} from "react";
import {
  ImagePickerOptions,
  launchCameraAsync,
  launchImageLibraryAsync,
  useCameraPermissions,
} from "expo-image-picker";
import { Text } from "@/components/ui/text";
import { FlashList } from "@shopify/flash-list";
import { View, StyleSheet } from "react-native";
import { Cross } from "@/components/lib/icons/Cross";
import { CameraIcon } from "@/components/lib/icons/Camera";
import { Images } from "@/components/lib/icons/Images";
import { ArrowUpRight } from "@/components/lib/icons/ArrowUpRight";
import { ImagePlus } from "@/components/lib/icons/ImagePlus";
import { Button, ButtonProps } from "@/components/ui/button";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Galeria } from "@nandorojo/galeria";
import {
  useSharedImageListStore,
  ImageListStore,
} from "@/lib/store/image-list";
import { StoreApi, useStore } from "zustand";

type ImagePickerContextType = ImagePickerOptions & {
  granted: boolean;
  store: StoreApi<ImageListStore>;
  storeKey: string;
  single?: boolean;
};

const ImagePickerContext = createContext<ImagePickerContextType | null>(null);

type ImagePickerParams = ImagePickerOptions &
  PropsWithChildren & {
    fallback: React.ReactNode;
    storeKey: string;
    onValueChange?: (value: string[]) => void;
    single?: boolean;
  };
export function ImagePicker({
  children,
  fallback,
  storeKey,
  onValueChange,
  ...props
}: ImagePickerParams) {
  const [status] = useCameraPermissions({
    request: true,
  });

  const imageListStore = useSharedImageListStore(storeKey);

  useEffect(() => {
    return imageListStore.subscribe((state) => onValueChange?.(state.photos));
  }, [imageListStore, onValueChange]);

  return (
    <ImagePickerContext.Provider
      value={{
        ...props,
        granted: status?.granted ?? false,
        store: imageListStore,
        storeKey,
      }}
    >
      {children}
    </ImagePickerContext.Provider>
  );
}

ImagePicker.PhotoPicker = PhotoPicker;
ImagePicker.GalleryPicker = GalleryPicker;
ImagePicker.ImageViewer = ImageViewer;

const variantMapping: Record<keyof ButtonProps["variant"], string> = {
  default: "color-primary-foreground",
  destructive: "color-destructive-foreground",
  outline: "color-accent-foreground",
  secondary: "color-secondary-foreground",
  ghost: "color-foreground",
  link: "color-primary",
};

function PhotoPicker(props: ButtonProps) {
  const context = useContext(ImagePickerContext);
  assert.notNull(context);

  const addUris = useStore(context.store, (state) => state.addUris);
  const replaceUris = useStore(context.store, (state) => state.replaceUris);

  const pickImage = async () => {
    const result = await launchCameraAsync(context);
    if (result.canceled) {
      return;
    }

    if (context.single) {
      replaceUris(result.assets.length > 0 ? [result.assets[0].uri] : []);
    } else {
      addUris(result.assets.map((i) => i.uri));
    }
  };

  return (
    <Button
      {...props}
      onPress={pickImage}
      disabled={!context.granted}
      className="flex-row items-center justify-center gap-2"
    >
      <CameraIcon
        className={
          variantMapping[
            (props.variant ?? "default") as keyof ButtonProps["variant"]
          ]
        }
        size={16}
      />
      <Text>Abrir Cámara</Text>
    </Button>
  );
}

function GalleryPicker(props: ButtonProps) {
  const context = useContext(ImagePickerContext);
  assert.notNull(context);

  const addUris = useStore(context.store, (state) => state.addUris);
  const replaceUris = useStore(context.store, (state) => state.replaceUris);

  const pickImage = async () => {
    const result = await launchImageLibraryAsync(context);
    if (result.canceled) {
      return;
    }

    if (context.single) {
      replaceUris(result.assets.length > 0 ? [result.assets[0].uri] : []);
    } else {
      addUris(result.assets.map((i) => i.uri));
    }
  };

  return (
    <Button
      {...props}
      onPress={pickImage}
      disabled={!context.granted}
      className="flex-row items-center justify-center gap-2"
    >
      <Images
        className={
          variantMapping[
            (props.variant ?? "default") as keyof ButtonProps["variant"]
          ]
        }
        size={16}
      />
      <Text>Seleccionar de Galería</Text>
    </Button>
  );
}

function ImageViewer() {
  const context = useContext(ImagePickerContext);
  assert.notNull(context);

  const imageList = useStore(context.store, (state) => state.photos);

  return (
    <View className="w-full gap-3">
      <View className="w-full h-60 justify-center items-center">
        {imageList.length === 0 ? (
          <View className="items-center">
            <ImagePlus className="color-muted-foreground" size={36} />
            <Text className="text-muted-foreground">
              Sin imágenes agregadas
            </Text>
          </View>
        ) : (
          <Galeria urls={imageList}>
            <FlashList
              data={imageList}
              horizontal
              keyExtractor={(i) => i}
              renderItem={({ item, index }) => (
                <ImageElementWithRemove
                  uri={item}
                  index={index}
                  storeKey={context.storeKey}
                />
              )}
            />
          </Galeria>
        )}
      </View>
      <View className="w-full items-center">
        {imageList.length !== 0 && (
          <Link
            href={{
              pathname: "/gallery",
              params: { storeKey: context.storeKey },
            }}
            push
            asChild
          >
            <Button
              variant="outline"
              size="sm"
              className="px-5 flex-row items-center justify-center gap-2"
            >
              <Text className="text-lg text-muted-foreground">
                Ver todo ({imageList.length})
              </Text>
              <ArrowUpRight className="color-muted-foreground" size={20} />
            </Button>
          </Link>
        )}
      </View>
    </View>
  );
}

function ImageElementWithRemoveInternal({
  uri,
  index,
  storeKey,
}: {
  uri: string;
  index: number;
  storeKey: string;
}) {
  const photoStore = useSharedImageListStore(storeKey);
  const removeUri = useStore(photoStore, (state) => state.removeUri);

  return (
    <Galeria.Image index={index}>
      <View className="relative h-52 w-48 overflow-hidden rounded-md m-3">
        <Image
          style={StyleSheet.absoluteFillObject}
          source={{ uri }}
          contentFit="cover"
          transition={1000}
        />
        <Button
          className="absolute top-0 right-0"
          size="icon"
          variant="ghost"
          onPress={() => {
            removeUri(uri);
          }}
        >
          <Cross className="fill-destructive color-destructive-foreground" />
        </Button>
      </View>
    </Galeria.Image>
  );
}
function ImageElementInternal({ uri, index }: { uri: string; index: number }) {
  return (
    <Galeria.Image index={index}>
      <View className="relative h-52 w-48 overflow-hidden rounded-md m-3">
        <Image
          style={StyleSheet.absoluteFillObject}
          source={{ uri }}
          contentFit="cover"
          transition={1000}
        />
      </View>
    </Galeria.Image>
  );
}

export const ImageElementWithRemove = memo(ImageElementWithRemoveInternal);
export const ImageElement = memo(ImageElementInternal);
