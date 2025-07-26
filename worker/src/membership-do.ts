import { DurableObject } from "cloudflare:workers";
import type { StripeMode, Env } from "@/types";

type MembershipErrors = {
  tokenError: string | null;
  customerDatabaseError: string | null;
  invoiceDatabaseError: string | null;
  chargeDatabaseError: string | null;
  subscriptionDatabaseError: string | null;
};

export type MembershipStatus = null | {
  stripeSubscriptionStatus?: string | null;
  stripeCustomerId?: string | null; // Customer ID in _my_ Stripe account
  stripeSubscriptionId?: string | null; // Subscription ID in _my_ Stripe account
  trialEnd?: number | null;
  cancelAt?: number | null;
  stripeAccountId: string; // Stripe account ID of the user
  stripeMode: StripeMode; // Mode of the Stripe account (test/live/sandbox)
  parentPageId?: string | null; // Notion Page ID where databases are connected
  customerDatabaseId?: string | null; // Notion Database ID where customer info is stored
  invoiceDatabaseId?: string | null; // Notion Database ID where invoice info is stored
  chargeDatabaseId?: string | null; // Notion Database ID where charge info is stored
  subscriptionDatabaseId?: string | null; // Notion Database ID where subscription info is stored
  errors?: MembershipErrors | null;
};

export class MembershipDurableObject extends DurableObject<Env> {
  membershipStatus: MembershipStatus = null;

  private get errors(): MembershipErrors {
    if (!this.membershipStatus) {
      throw new Error("Membership status not initialized");
    }
    if (!this.membershipStatus.errors) {
      this.membershipStatus.errors = {
        tokenError: null,
        customerDatabaseError: null,
        invoiceDatabaseError: null,
        chargeDatabaseError: null,
        subscriptionDatabaseError: null,
      };
    }
    return this.membershipStatus.errors;
  }

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // `blockConcurrencyWhile()` ensures no requests are delivered until
    // initialization completes.
    ctx.blockConcurrencyWhile(async () => {
      // After initialization, future reads do not need to access storage.
      this.membershipStatus =
        (await ctx.storage.get("membershipStatus")) ?? null;
    });
  }

  async setUp(membershipStatus: NonNullable<MembershipStatus>) {
    // Start with existing status
    // Add updated fields
    const newMembershipStatus = {
      ...this.membershipStatus,
      ...membershipStatus,
    };
    await this.saveState();
    this.membershipStatus = newMembershipStatus;
    console.log(this);
  }

  async saveState() {
    await this.ctx.storage.put("membershipStatus", this.membershipStatus);
  }

  async setStatus({
    stripeAccountId,
    stripeMode,
    stripeSubscriptionStatus,
    trialEnd,
    cancelAt,
  }: {
    stripeAccountId: string;
    stripeMode: StripeMode;
    stripeSubscriptionStatus: string;
    trialEnd: number | null;
    cancelAt: number | null;
  }) {
    console.log(this.membershipStatus);
    if (!this.membershipStatus) {
      console.warn(
        "Membership status not initialized, creating with provided account info"
      );
      this.membershipStatus = {
        stripeAccountId,
        stripeMode,
      };
    }

    this.membershipStatus.stripeSubscriptionStatus = stripeSubscriptionStatus;
    this.membershipStatus.trialEnd = trialEnd;
    this.membershipStatus.cancelAt = cancelAt;
    console.log("Updating membership status in DO", this.membershipStatus);
    await this.saveState();

    return;
  }

  async deleteSubscription(stripeAccountId?: string, stripeMode?: StripeMode) {
    if (!this.membershipStatus) {
      if (!stripeAccountId || !stripeMode) {
        throw new Error(
          "Membership status not found and account info not provided"
        );
      }
      console.warn(
        "Membership status not initialized, creating with provided account info"
      );
      this.membershipStatus = {
        stripeAccountId,
        stripeMode,
      };
    }
    this.membershipStatus.stripeSubscriptionStatus = null;
    this.membershipStatus.stripeSubscriptionId = null;
    this.membershipStatus.trialEnd = null;
    this.membershipStatus.cancelAt = null;

    console.log("Deleting subscription in DO", this.membershipStatus);
    await this.saveState();
  }


  async setNotionPages({
    stripeAccountId,
    stripeMode,
    parentPageId,
    customerDatabaseId,
    invoiceDatabaseId,
    chargeDatabaseId,
    subscriptionDatabaseId,
  }: {
    stripeAccountId: string;
    stripeMode: StripeMode;
    parentPageId: string | null;
    customerDatabaseId: string | null;
    invoiceDatabaseId: string | null;
    chargeDatabaseId: string | null;
    subscriptionDatabaseId: string | null;
  }): Promise<void> {
    if (!this.membershipStatus) {
      console.warn(
        "Membership status not initialized, creating with provided account info"
      );
      this.membershipStatus = {
        stripeAccountId,
        stripeMode,
      };
    }
    this.membershipStatus.stripeAccountId = stripeAccountId;
    this.membershipStatus.stripeMode = stripeMode;
    this.membershipStatus.parentPageId = parentPageId;
    this.membershipStatus.customerDatabaseId = customerDatabaseId;
    this.membershipStatus.invoiceDatabaseId = invoiceDatabaseId;
    this.membershipStatus.chargeDatabaseId = chargeDatabaseId;
    this.membershipStatus.subscriptionDatabaseId = subscriptionDatabaseId;
    this.errors.chargeDatabaseError = null;
    this.errors.customerDatabaseError = null;
    this.errors.subscriptionDatabaseError = null;
    this.errors.invoiceDatabaseError = null;
    await this.saveState();
  }

  async clearNotionPages(): Promise<void> {
    if (
      !this.membershipStatus?.stripeAccountId ||
      !this.membershipStatus?.stripeMode
    ) {
      return;
    }
    await this.setNotionPages({
      stripeAccountId: this.membershipStatus?.stripeAccountId,
      stripeMode: this.membershipStatus?.stripeMode,
      parentPageId: null,
      customerDatabaseId: null,
      invoiceDatabaseId: null,
      chargeDatabaseId: null,
      subscriptionDatabaseId: null,
    });
  }

  async clearErrors(): Promise<MembershipStatus> {
    if (this.membershipStatus?.errors) {
      this.membershipStatus.errors = null;
      await this.saveState();
    }
    return this.membershipStatus;
  }

  async setError(
    key: keyof MembershipErrors,
    value: string | null
  ): Promise<MembershipStatus> {
    if (!this.membershipStatus) {
      return null;
    }

    this.errors[key] = value;
    await this.saveState();
    return this.membershipStatus;
  }

  async getStatus(): Promise<MembershipStatus> {
    if (!this.membershipStatus) {
      return null;
    }
    return this.membershipStatus;
  }

  async deleteMembership() {
    await this.ctx.storage.deleteAll();
  }
}
