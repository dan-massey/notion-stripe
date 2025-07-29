import { DurableObject } from "cloudflare:workers";
import type {
  StripeMode,
  Env,
  SupportedEntities,
  SupportedEntity,
} from "@/types";

type SubscriptionStatus = {
  stripeSubscriptionStatus?: string | null;
  stripeCustomerId?: string | null; // Customer ID in _my_ Stripe account
  stripeSubscriptionId?: string | null; // Subscription ID in _my_ Stripe account
  trialEnd?: number | null;
  cancelAt?: number | null;
};

const ENTITIES: SupportedEntities = [
  "customer",
  "invoice",
  "charge",
  "subscription",
  "credit_note",
  "dispute",
  "invoiceitem",
  "line_item",
  "price",
  "product",
  "promotion_code",
  "payment_intent"
] as const;

type Database = {
  lastError?: string | null | undefined;
  pageId: string | undefined;
  title: string | undefined;
};

type Databases = {
  [K in SupportedEntity]: Database;
};

type NotionConnection = {
  parentPageId?: string | null; // Notion Page ID where databases are connected
  databases: Databases | null | undefined;
};

export type AccountStatus = {
  stripeAccountId: string; // Stripe account ID of the user
  stripeMode: StripeMode; // Mode of the Stripe account (test/live/sandbox)
  subscription?: SubscriptionStatus | null | undefined;
  notionConnection?: NotionConnection | null | undefined;
  tokenError?: string | null | undefined;
};

export class AccountDurableObject extends DurableObject<Env> {
  accountStatus: AccountStatus | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // `blockConcurrencyWhile()` ensures no requests are delivered until
    // initialization completes.
    ctx.blockConcurrencyWhile(async () => {
      // After initialization, future reads do not need to access storage.
      this.accountStatus = (await ctx.storage.get("accountStatus")) ?? null;
    });
  }

  private get databases(): Databases {
    if (!this.accountStatus) {
      throw new Error("Account status not initialized");
    }
    if (!this.accountStatus.notionConnection) {
      this.accountStatus.notionConnection = {
        databases: null,
      };
    }
    if (!this.accountStatus.notionConnection.databases) {
      this.accountStatus.notionConnection.databases = ENTITIES.reduce(
        (acc, entity) => {
          acc[entity] = { pageId: undefined, lastError: null, title: undefined };
          return acc;
        },
        {} as Databases
      );
    }
    return this.accountStatus.notionConnection.databases;
  }

  private get subscriptionStatus(): SubscriptionStatus {
    if (!this.accountStatus) {
      throw new Error("Account status not initialized");
    }

    if (!this.accountStatus.subscription) {
      this.accountStatus.subscription = {
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        trialEnd: null,
        cancelAt: null,
      };
    }

    return this.accountStatus.subscription;
  }

  getDbForEntity(entity: SupportedEntity) {
    return this.databases[entity];
  }

  async saveState() {
    await this.ctx.storage.put("accountStatus", this.accountStatus);
  }

  async setUp({
    stripeAccountId,
    stripeMode,
  }: {
    stripeAccountId: string;
    stripeMode: StripeMode;
  }) {
    if (this.accountStatus) {
      return;
    }
    this.accountStatus = {
      stripeAccountId: stripeAccountId,
      stripeMode: stripeMode,
    };

    await this.saveState();
  }

  async setSubscriptionStatus({
    stripeAccountId,
    stripeMode,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeSubscriptionStatus,
    trialEnd,
    cancelAt,
  }: {
    stripeAccountId: string;
    stripeMode: StripeMode;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripeSubscriptionStatus: string;
    trialEnd: number | null;
    cancelAt: number | null;
  }) {
    if (!this.accountStatus) {
      console.warn(
        "Membership status not initialized, creating with provided account info"
      );
      this.accountStatus = {
        stripeAccountId,
        stripeMode,
      };
    }

    this.subscriptionStatus.stripeCustomerId = stripeCustomerId;
    this.subscriptionStatus.stripeSubscriptionStatus = stripeSubscriptionStatus;
    this.subscriptionStatus.stripeSubscriptionId = stripeSubscriptionId;
    this.subscriptionStatus.cancelAt = cancelAt;
    this.subscriptionStatus.trialEnd = trialEnd;

    await this.saveState();

    return;
  }

  async deleteSubscription(stripeAccountId?: string, stripeMode?: StripeMode) {
    if (!this.accountStatus) {
      if (!stripeAccountId || !stripeMode) {
        throw new Error(
          "Membership status not found and account info not provided"
        );
      }
      console.warn(
        "Membership status not initialized, creating with provided account info"
      );
      this.accountStatus = {
        stripeAccountId,
        stripeMode,
      };
    }
    this.accountStatus.subscription = null;

    console.log("Deleting subscription in DO", this.accountStatus);
    await this.saveState();
  }

  async setNotionPages({
    stripeAccountId,
    stripeMode,
    parentPageId,
    databases,
  }: {
    stripeAccountId: string;
    stripeMode: StripeMode;
    parentPageId: string | null;
    databases: Databases | null;
  }) {
    if (!this.accountStatus) {
      console.warn(
        "Account status not initialized, creating with provided account info"
      );
      this.accountStatus = {
        stripeAccountId,
        stripeMode,
      };
    }
    if (!this.accountStatus.notionConnection) {
      this.accountStatus.notionConnection = {
        databases: this.databases,
        parentPageId: parentPageId,
      };
    } else {
      this.accountStatus.notionConnection.parentPageId = parentPageId;
    }

    this.accountStatus.notionConnection.databases = databases;

    await this.saveState();

    return this.accountStatus;
  }

  async clearNotionPages(): Promise<void> {
    if (
      !this.accountStatus?.stripeAccountId ||
      !this.accountStatus?.stripeMode
    ) {
      return;
    }
    this.accountStatus.notionConnection = null;
    await this.saveState();
  }

  async setEntityError(
    entity: SupportedEntity,
    value: string | null
  ): Promise<AccountStatus | null> {
    if (!this.accountStatus) {
      return null;
    }

    this.databases[entity].lastError = value;

    await this.saveState();
    return this.accountStatus;
  }

  async setTokenError(value: string | null): Promise<AccountStatus | null> {
    if (!this.accountStatus) {
      return null;
    }

    this.accountStatus.tokenError = value;
    await this.saveState();
    return this.accountStatus;
  }

  async getStatus(): Promise<AccountStatus | null> {
    return this.accountStatus;
  }
}
