import CheckDeviceAutoTime from "react-native-check-device-auto-time";
import { ApplicationError, transformError } from "@/lib/result";
import { Logger } from "@/lib/logger";
import {
  getLastKnownPositionAsync,
  Accuracy,
  getCurrentPositionAsync,
  hasServicesEnabledAsync,
  requestForegroundPermissionsAsync,
} from "expo-location";
import { Alert } from "react-native";

export type ValidationResult =
  | "CANNOT_VALIDATE"
  | "AUTOTIME_DISABLED"
  | "LOCATION_DISABLED"
  | "LOCATION_PERMISSION_DENIED"
  | "PROCEED";

const logger = Logger.getLogger("FORM::VALIDATION");

export async function validateExternalInputs() {
  try {
    const autoTimeEnabled = await CheckDeviceAutoTime.isAutomaticTimeEnabled();

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
  } catch (error) {
    logger.error(transformError(error, "Error al validar entradas externas"));
    return { form: "No se pudo validar el formulario" };
  }
}

export async function getLocation() {
  try {
    const [location, error] = await currentLocationWithFallback();

    logger.verbose("Ubicación actual", {
      location,
      error,
    });

    if (location == null) {
      logger.warn("No se pudo obtener la última ubicación");
      return null;
    }

    if (location.mocked) {
      logger.error(
        new ApplicationError("InvalidInputError", "Ubicación simulada", {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      );
      return null;
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    logger.error(transformError(error, "Error al obtener la última ubicación"));
    return null;
  }
}

async function currentLocationWithFallback() {
  try {
    return [
      await getCurrentPositionAsync({
        accuracy: Accuracy.High,
        timeInterval: 10000,
      }),
      null,
    ] as const;
  } catch (error) {
    return [
      await getLastKnownPositionAsync({
        requiredAccuracy: Accuracy.High,
        maxAge: 15 * 60 * 1000, // 15 mintues
      }),
      transformError(error, "Error al obtener la ubicación actual"),
    ] as const;
  }
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
