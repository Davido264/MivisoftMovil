import CheckDeviceAutoTime from "react-native-check-device-auto-time";
import { transformError, wrapMultiErrors } from "@/lib/result";
import { Logger } from "@/lib/logger";
import {
  getLastKnownPositionAsync,
  Accuracy,
  getCurrentPositionAsync,
  hasServicesEnabledAsync,
  requestForegroundPermissionsAsync,
  LocationObject,
} from "expo-location";
import { globalStore } from "@/lib/store/application-state";
import { Alert } from "react-native";
import assert from "@/lib/assert";
import { ResultAsync } from "neverthrow";

export type ValidationResult =
  | "CANNOT_VALIDATE"
  | "AUTOTIME_DISABLED"
  | "LOCATION_DISABLED"
  | "LOCATION_PERMISSION_DENIED"
  | "PROCEED";

const logger = Logger.getLogger("FORM::VALIDATION");

export async function validateExternalInputs() {
  const result = await ResultAsync.fromThrowable(
    async () => {
      const autoTimeEnabled =
        await CheckDeviceAutoTime.isAutomaticTimeEnabled();
      if (!autoTimeEnabled) {
        logger.warn("Tiempo automático desactivado");
        showError(
          "Se detectó que no tiene la fecha y hora configurada automáticamente. No se puede proceder",
        );
        return { form: "Fecha y hora automática deshabilitada" };
      }

      const locationEnabled =
        (await hasServicesEnabledAsync()) &&
        (await requestForegroundPermissionsAsync()).granted;

      if (!locationEnabled) {
        logger.warn("Ubicación desactivada o permisos denegados");
        showError(
          "No se tienen permisos para acceder a la ubicación, o la ubicación ha sido desactivada",
        );
        return { form: "Ubicación desactivada" };
      }

      return null;
    },
    (e) => transformError(e, "Error al validar entradas externas"),
  )();

  if (result.isErr()) {
    globalStore.setState({ lastError: result.error });
    return { form: "No se pudo validar el formulario" };
  }

  return result.value;
}

export async function getLocation() {
  let requestedLocation: LocationObject | null = null;
  const locationResult = await ResultAsync.fromPromise(
    getCurrentPositionAsync({
      accuracy: Accuracy.High,
      timeInterval: 10000,
    }),
    (e) => transformError(e, "Error al obtener la ubicación actual"),
  );

  if (locationResult.isErr()) {
    logger.warn(
      "Error al obtener la ubicación. Intentando obtener la última",
      locationResult.error,
    );

    const falllbackLocationResult = await ResultAsync.fromPromise(
      getLastKnownPositionAsync({
        requiredAccuracy: Accuracy.High,
        maxAge: 15 * 60 * 1000, // 15 mintues
      }),
      (e) => transformError(e, "Error obteniendo el fallback de la ubicación"),
    ).mapErr((e) =>
      wrapMultiErrors(
        [e, locationResult.error],
        "Error al obtener la ubicación y su fallback",
      ),
    );

    if (falllbackLocationResult.isErr()) {
      globalStore.setState({ lastError: falllbackLocationResult.error });
      return null;
    }

    if (falllbackLocationResult.value == null) {
      return null;
    }

    requestedLocation = falllbackLocationResult.value;
  } else {
    requestedLocation = locationResult.value;
  }

  assert.notNull(requestedLocation, "requestedLocation");

  if (requestedLocation.mocked) {
    globalStore.setState({
      lastError: { type: "InvalidInputError", message: "Ubicación simulada" },
    });
    return null;
  }

  return {
    latitude: requestedLocation.coords.latitude,
    longitude: requestedLocation.coords.longitude,
  };
}

function showError(msg: string) {
  Alert.alert("Advertencia", msg, [
    {
      text: "Aceptar",
      isPreferred: true,
      style: "destructive",
    },
  ]);
}
