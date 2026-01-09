import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { transformError } from "../result";

export type RemoteUser = {
  id: number | undefined;
  name: string;
  company: string;
  tz: string;
};

const odooModelUser = "res.users";
// { "id": 51, "full_name": "Technical Support / Administrator" } { "id": 50, "full_name": "Technical Support / User" },
const groupIds = [50, 51];

export async function fetchUsers(client: OdooJSONRpc) {
  try {
    const users = await client.searchRead(
      odooModelUser,
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
