import { Input, PasswordInput } from "@/components/ui/input";
import { Image, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Text } from "@/components/ui/text";
import { useAppForm } from "@/components/form";
import { login } from "@/lib/api/user-session";

export default function Login() {
  const submit = async ({
    value,
  }: {
    value: { username: string; password: string };
  }) => {
    if (!value.username || !value.password) {
      return {
        fields: {
          username: "Usuario requerido",
          password: "Contraseña requerida",
        },
      };
    }

    const validCredentials = await login(value.username, value.password);
    return validCredentials
      ? null
      : {
          fields: {
            username: "Usuario o Contraseña incorrectos",
            password: "Usuario o Contraseña incorrectos",
          },
        };
  };

  const form = useAppForm({
    defaultValues: {
      username: "",
      password: "",
    },
    validators: {
      onMount: () => ({ fields: { username: "", password: "" } }),
      onChangeAsync: ({ value }) => ({
        fields: {
          username: !value.username && "Usuario requerido",
          password: !value.password && "Contraseña requerida",
        },
      }),
      onChangeAsyncDebounceMs: 100,
      onSubmitAsync: submit,
    },
  });

  return (
    <KeyboardAwareScrollView
      className="p-8"
      contentContainerClassName="flex-1 items-center justify-center pb-safe-offset-10"
    >
      <View className="h-30 w-30 mb-10">
        <Image
          source={require("@/assets/images/logo.png")}
          className="w-23 h-23"
        />
      </View>
      <View className="flex gap-8 w-full">
        <form.Field name="username">
          {(field) => {
            return (
              <View>
                <Input
                  textContentType="emailAddress"
                  onChangeText={field.handleChange}
                  placeholder="Usuario"
                />
                {!field.state.meta.isValid && (
                  <Text className="text-destructive text-sm">
                    {field.state.meta.errors.join(", ")}
                  </Text>
                )}
              </View>
            );
          }}
        </form.Field>
        <form.Field name="password">
          {(field) => {
            return (
              <View>
                <PasswordInput
                  onChangeText={field.handleChange}
                  placeholder="Contraseña"
                />
                {!field.state.meta.isValid && (
                  <Text className="text-destructive text-sm">
                    {field.state.meta.errors.join(", ")}
                  </Text>
                )}
              </View>
            );
          }}
        </form.Field>
        <form.AppForm>
          <form.SubmitButton>
            <Text className="font-bold">Iniciar Sesión</Text>
          </form.SubmitButton>
        </form.AppForm>
      </View>
    </KeyboardAwareScrollView>
  );
}
