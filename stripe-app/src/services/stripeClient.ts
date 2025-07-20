import { STRIPE_API_KEY, createHttpClient } from '@stripe/ui-extension-sdk/http_client';
import Stripe from 'stripe';

export const stripe: Stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: "2023-08-16",
  httpClient: createHttpClient() as Stripe.HttpClient,
});