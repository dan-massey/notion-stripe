import { Stripe } from "stripe";
import { NOTION_SECRET_NAME } from "@/utils/stripe";

export async function getNotionToken(
  stripe: Stripe,
  stripeAccountId: string
): Promise<string | null> {
  try {
    const notionSecret = await stripe.apps.secrets.find(
      {
        name: NOTION_SECRET_NAME,
        scope: {
          type: "account",
        },
        expand: ["payload"],
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
    return notionSecret.payload;
  } catch (e) {
    return null;
  }
}