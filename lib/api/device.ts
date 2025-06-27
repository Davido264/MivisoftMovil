import * as Device from "expo-device";

export type DeviceInfo = {
  device: string;
  os: string;
  totalMemory: number | null;
  extra: {
    jvmMaxMemory: number;
  };
};

export async function getDeviceInfo() {
  const totalMem = Device.totalMemory;
  const maxMem = await Device.getMaxMemoryAsync().catch(() => null);

  return {
    device: `${Device.deviceName} (${Device.modelName})`,
    os: `${Device.osName} ${Device.osVersion}`,
    totalMemory: totalMem != null ? totalMem / 1024 / 1024 / 1024 : null,
    extra: {
      jvmMaxMemory: maxMem != null ? maxMem / 1024 / 1024 / 1024 : null,
    },
  };
}
