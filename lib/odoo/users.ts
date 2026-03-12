import { transformError } from "../result";
import { Environment } from "./_env";
import { Env, RemoteUser } from "./env";

export { RemoteUser } from "./env";

const groupIds = [50, 51];

export async function fetchUsers(env: Environment<Env>) {
  try {
    const users = await env["res.users"].searchRead(
      [["groups_id", "in", groupIds]],
      ["id", "name", "company_id", "tz"],
    );
    return users.map(
      (u: any) =>
        ({
          id: u.id as number,
          name: u.name as string,
          company: u.company_id[1] as string,
          tz: u.tz as string,
        }) as RemoteUser,
    );
  } catch (error) {
    throw transformError(error, "Error al obtener usuarios");
  }
}
