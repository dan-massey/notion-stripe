import { DurableObject } from "cloudflare:workers";
import type { StripeMode, Env } from "@/types";

export type MembershipStatus = null | {
  stripeSubscriptionStatus?: string; 
  stripeCustomerId?: string; // Customer ID in _my_ Stripe account
  stripeSubscriptionId?: string; // Subscription ID in _my_ Stripe account
  trialEnd?: number | null;
  cancelAt?: number | null;
  stripeAccountId: string; // Stripe account ID of the user
  stripeMode: StripeMode; // Mode of the Stripe account (test/live/sandbox)
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

  // Get or create membership status for a user
  async getOrCreateStatus(googleAccountId: string): Promise<MembershipStatus> {
    return this.membershipStatus;
  }

  async setUp(membershipStatus: MembershipStatus) {
    await this.ctx.storage.put("membershipStatus", membershipStatus);
    this.membershipStatus = membershipStatus;
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
