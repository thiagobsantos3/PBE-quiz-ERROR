export const stripeProducts = [
  {
    id: 'prod_SkGQB88LYZDhx4',
    name: 'PBE Pro Play Yearly',
    description: 'Annual subscription to PBE Pro Play with advanced features and unlimited access.',
    priceId: 'price_1RoltBEGamTK7gLp3vFhnNpg',
    mode: 'subscription' as const,
    price: 150.00,
    currency: 'GBP',
    interval: 'year',
    features: [
      'Unlimited quiz sessions',
      'Advanced analytics',
      'Priority support',
      'All question tiers',
      'Team collaboration',
      'Study schedule management'
    ]
  },
  {
    id: 'prod_SkG8EHn9mio3Tg',
    name: 'PBE Pro Plan',
    description: 'Monthly subscription to PBE Pro with enhanced features and team management.',
    priceId: 'price_1RolccEGamTK7gLpzKYZ7aYj',
    mode: 'subscription' as const,
    price: 15.00,
    currency: 'GBP',
    interval: 'month',
    features: [
      'Enhanced quiz features',
      'Team management',
      'Progress tracking',
      'Pro question access',
      'Custom quiz builder',
      'Basic analytics'
    ]
  }
];

export type StripeProduct = typeof stripeProducts[number];