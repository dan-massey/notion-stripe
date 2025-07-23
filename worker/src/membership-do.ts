import { DurableObject } from "cloudflare:workers";
import type { StripeMode, Env } from "@/types";

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
};

export class MembershipDurableObject extends DurableObject<Env> {
  membershipStatus: MembershipStatus = null;

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
    await this.ctx.storage.put("membershipStatus", newMembershipStatus);
    this.membershipStatus = newMembershipStatus;
    console.log(this);
  }

  async setStatus({
    stripeSubscriptionStatus,
    trialEnd,
    cancelAt,
  }: {
    stripeSubscriptionStatus: string;
    trialEnd: number | null;
    cancelAt: number | null;
  }) {
    console.log(this.membershipStatus);
    if (!this.membershipStatus) {
      throw new Error("Membership status not found");
    }

    this.membershipStatus.stripeSubscriptionStatus = stripeSubscriptionStatus;
    this.membershipStatus.trialEnd = trialEnd;
    this.membershipStatus.cancelAt = cancelAt;
    console.log("Updating membership status in DO", this.membershipStatus);
    await this.ctx.storage.put("membershipStatus", this.membershipStatus);

    return;
  }

  async deleteSubscription() {
    if (!this.membershipStatus) {
      throw new Error("Membership status not found");
    }
    this.membershipStatus.stripeSubscriptionStatus = null;
    this.membershipStatus.stripeSubscriptionId = null;
    this.membershipStatus.trialEnd = null;
    this.membershipStatus.cancelAt = null;
    this.membershipStatus.trialEnd = null;

    console.log("Deleting subscription in DO", this.membershipStatus);
    await this.ctx.storage.put("membershipStatus", this.membershipStatus);
  }

  async setNotionPages({
    parentPageId,
    customerDatabaseId,
    invoiceDatabaseId,
    chargeDatabaseId,
    subscriptionDatabaseId,
  }: {
    parentPageId: string | null;
    customerDatabaseId: string | null;
    invoiceDatabaseId: string | null;
    chargeDatabaseId: string | null;
    subscriptionDatabaseId: string | null;
  }): Promise<void> {
    if (!this.membershipStatus) {
      throw new Error("Membership status not found");
    }
    this.membershipStatus.parentPageId = parentPageId;
    this.membershipStatus.customerDatabaseId = customerDatabaseId;
    this.membershipStatus.invoiceDatabaseId = invoiceDatabaseId;
    this.membershipStatus.chargeDatabaseId = chargeDatabaseId;
    this.membershipStatus.subscriptionDatabaseId = subscriptionDatabaseId;
    await this.ctx.storage.put("membershipStatus", this.membershipStatus);
  }

  async clearNotionPages(): Promise<void> {
    await this.setNotionPages({
      parentPageId: null,
      customerDatabaseId: null,
      invoiceDatabaseId: null,
      chargeDatabaseId: null,
      subscriptionDatabaseId: null,
    });
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
