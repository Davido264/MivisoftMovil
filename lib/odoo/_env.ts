import OdooJSONRpc, { OdooConnectionBase } from "@fernandoslim/odoo-jsonrpc";
import assert from "@/lib/assert";

interface OdooModel {
  id: number;
}

export interface OdooSearchReadOptions {
  offset?: number;
  limit?: number;
  order?: string;
  context?: any;
}

type OdooDomain<T> = (
  | "&"
  | "|"
  | [
      keyof T,
      (
        | "="
        | "!="
        | ">"
        | ">="
        | "<"
        | "<="
        | "like"
        | "ilike"
        | "in"
        | "not in"
        | "child_of"
        | "parent_left"
      ),
      any,
    ]
)[];

class OdooProxy<T, M> {
  constructor(
    private client: OdooJSONRpc,
    private model: M,
  ) {}

  create(values: Partial<Omit<T, "id">>): Promise<number> {
    return this.client.create(this.model as string, values);
  }

  read(id: number, fields: (keyof T)[]): Promise<Pick<T, keyof T>[]> {
    return this.client.read(this.model as string, id, fields as string[]);
  }

  update(id: number, values: Partial<Omit<T, "id">>): Promise<boolean> {
    return this.client.update(this.model as string, id, values);
  }

  delete(id: number): Promise<boolean> {
    return this.client.delete(this.model as string, id);
  }

  search(domain: OdooDomain<T>): Promise<number[]> {
    return this.client.search(this.model as string, domain);
  }

  searchRead(
    domain: OdooDomain<T>,
    fields: (keyof T)[],
    opts?: OdooSearchReadOptions,
  ): Promise<Pick<T, keyof T>[]> {
    return this.client.searchRead(
      this.model as string,
      domain,
      fields as string[],
      opts,
    );
  }

  updateFieldTranslations(
    id: number,
    field: string,
    translations: {
      [key: string]: string;
    },
  ): Promise<boolean> {
    return this.client.updateFieldTranslations(
      this.model as string,
      id,
      field,
      translations,
    );
  }

  getFields(): Promise<any> {
    return this.client.getFields(this.model as string);
  }

  action(action: string, ids: number[]): Promise<boolean> {
    return this.client.action(this.model as string, action, ids);
  }

  call_kw<TReturn>(
    method: string,
    args: any[],
    kwargs?: any,
  ): Promise<TReturn> {
    return this.client.call_kw(this.model as string, method, args, kwargs);
  }
}

type ConnectionParams = {
  baseUrl: string;
  db: string;
};

type Credentials =
  | { sessionId: string }
  | { apiKey: string }
  | {
      username: string;
      password: string;
    };

export type Environment<
  T extends Record<string, OdooModel>,
  K extends readonly (keyof T)[] = (keyof T)[],
> = {
  [P in K[number]]: OdooProxy<T[P], P>;
};

export type ConnectionResult<
  T extends Record<string, OdooModel>,
  K extends readonly (keyof T)[] = (keyof T)[],
> = {
  env: Environment<T, K>;
  usr: {
    id: number;
    active: boolean;
    company: { id: number; name: string };
    companyIds: number[];
    name: string;
    tz: string;
    partnerId: number;
  };
  sessionId: string;
};

export class Odoo<
  T extends Record<string, OdooModel>,
  K extends readonly (keyof T)[] = (keyof T)[],
> {
  private connection: OdooJSONRpc | undefined;
  constructor(
    private connectionParams: OdooConnectionBase,
    private models: K,
  ) {
    this.connection = undefined;
  }

  async connect(cred: Credentials): Promise<ConnectionResult<T, K>> {
    this.connection = new OdooJSONRpc({
      baseUrl: this.connectionParams.baseUrl,
      port: this.connectionParams.port,
      db: this.connectionParams.db,
      ...cred,
    });

    const { uid } = await this.connection.connect();

    const proxies = this.models.map((model) => [
      model,
      new OdooProxy<T[typeof model], typeof model>(this.connection!, model),
    ]);

    assert.notNull(this.connection.sessionId);

    const [user] = (await this.connection.read("res.users", uid, [
      "company_id",
      "company_ids",
      "tz",
      "name",
      "partner_id",
      "active",
    ])) as any[];

    return {
      env: Object.fromEntries(proxies),
      usr: {
        id: uid,
        active: user.active,
        company: { id: user.company_id[0], name: user.company_id[1] },
        companyIds: user.company_ids,
        name: user.name,
        tz: user.tz,
        partnerId: user.partner_id[0],
      },
      sessionId: this.connection.sessionId,
    };
  }

  async disconnect() {
    await this.connection?.disconnect();
    this.connection = undefined;
  }

  get isConnected() {
    return this.connection?.is_connected ?? false;
  }

  get url() {
    return this.connection?.url;
  }
}

// this combined with abortcontroller and OAuth and I make a new library for interacting w/odoo via js/ts
//
