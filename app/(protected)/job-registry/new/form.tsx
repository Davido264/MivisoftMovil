import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Send } from "@/components/lib/icons/Send";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAppForm } from "@/components/form";
import {
  getLocation,
  validateExternalInputs,
} from "@/components/form/external-inputs";
import CompanySelectionButton from "@/components/screen-specific/job-registry/company-selection-button";
import VehicleSelectionButton from "@/components/screen-specific/job-registry/vehicle-selection-button";
import { startJob } from "@/lib/api/job-registry";

const imageStoreKey = "job-registry-new-photos";
const companyVehicleStoreKey = "job-registry-new-company-vehicle";

export default function StartJobRegistry() {
  const { id: itineraryId, name: itineraryName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      title: itineraryName,
    });
  }, [itineraryName, navigation]);

  const form = useAppForm({
    defaultValues: {
      itineraryId: Number(itineraryId),
      comment: "",
      companyId: 0,
      vehicleId: 0,
      photos: [] as string[],
    },
    validators: {
      onSubmitAsync: async ({ value }) => {
        if (
          !value.companyId ||
          !value.vehicleId ||
          value.comment.length === 0 ||
          value.comment.length > 1000 ||
          !value.photos.length
        ) {
          return {
            fields: {
              companyId: !value.companyId && "Se debe seleccionar una companía",
              vehicleId: !value.vehicleId && "Se debe seleccionar una unidad",
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
      if ((await getLocation()) == null) {
        return;
      }

      const ok = await startJob(
        value.comment,
        value.itineraryId,
        value.companyId,
        value.vehicleId,
        value.photos,
      );

      if (ok) {
        router.dismissTo("/");
      }
    },
  });

  return (
    <KeyboardAwareScrollView
      bounces={true}
      className="flex-1 gap-2"
      contentContainerClassName="pb-safe-offset-10"
    >
      <View className="w-full items-center">
        <View className="w-full p-4 justify-between gap-4">
          <form.AppField
            name="companyId"
            listeners={{
              onChange: () => form.setFieldValue("vehicleId", 0),
            }}
          >
            {(field) => (
              <>
                <CompanySelectionButton
                  onChangeId={field.handleChange}
                  resetVehicle
                  storeKey={companyVehicleStoreKey}
                />
                <field.Error />
              </>
            )}
          </form.AppField>

          <form.AppField name="vehicleId">
            {(field) => (
              <>
                <VehicleSelectionButton
                  disable={form.getFieldValue("companyId") === 0}
                  onChangeId={field.handleChange}
                  storeKey={companyVehicleStoreKey}
                />
                <field.Error />
              </>
            )}
          </form.AppField>

          <form.AppField name="photos">
            {(field) => <field.ImagePicker storeKey={imageStoreKey} />}
          </form.AppField>
        </View>
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
