export type SignaturePayload = {
  user_id: string;
  account_id: string;
};

export type StripeMode = 'live' | 'test' | 'sandbox';
