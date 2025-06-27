import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { ResultAsync } from "neverthrow";
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

export function fetchUsers(client: OdooJSONRpc) {
  return ResultAsync.fromPromise(_internalFetchUsers(client), (e) =>
    transformError(e, "No se pudo obtener los usuarios"),
  );
}

async function _internalFetchUsers(client: OdooJSONRpc) {
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
}
