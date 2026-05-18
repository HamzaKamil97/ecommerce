export const en = {
  // Onboarding
  'onboarding.title': 'Everything you need, in one place',
  'onboarding.subtitle': 'Food, flowers, vegetables, electronics, fashion — local shops and trusted brands, delivered to you.',
  'onboarding.cta': 'Start shopping',

  // Home / Shop tab
  'home.greeting.morning': 'Good morning',
  'home.greeting.afternoon': 'Good afternoon',
  'home.greeting.evening': 'Good evening',
  'home.heading': 'What are you craving?',
  'home.search.placeholder': 'Search products, shops, categories…',
  'home.empty.title': 'No products found',
  'home.empty.subtitle': 'Try a different search or category.',

  // Tabs
  'tab.shop': 'Shop',
  'tab.shops': 'Shops',
  'tab.cart': 'Cart',
  'tab.orders': 'Orders',
  'tab.profile': 'Profile',

  // Cart
  'cart.empty.title': 'Your cart is empty',
  'cart.empty.subtitle': 'Add a product from the Shop tab.',
  'cart.total': 'Total',
  'cart.checkout': 'Checkout',
  'cart.remove': 'Remove',
  'cart.add': 'Add to cart',
  'cart.added': 'Added to cart',

  // Product details
  'product.notFound': 'Product not found.',
  'product.specs': 'Details',

  // Auth
  'auth.welcomeBack': 'Welcome back',
  'auth.createAccount': 'Create account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.firstName': 'First name',
  'auth.lastName': 'Last name',
  'auth.login': 'Log in',
  'auth.register': 'Create account',
  'auth.haveAccount': 'Already have an account? Log in',
  'auth.needAccount': 'Need an account? Register',
  'auth.oauthComing': 'Google / Facebook login — coming soon',

  // Profile
  'profile.title': 'Profile',
  'profile.notLoggedIn': 'You are not logged in.',
  'profile.logout': 'Log out',

  // Orders
  'orders.empty.title': 'No orders yet',
  'orders.empty.subtitle': 'Your orders will appear here.',
  'orders.loginPrompt.title': 'Log in to see your orders',
  'orders.loginPrompt.subtitle': 'Go to Profile → Log in.',

  // Checkout
  'checkout.title': 'Checkout',
  'checkout.summary': 'Order summary',
  'checkout.placeOrder': 'Place order',
  'checkout.success.title': 'Order placed!',
  'checkout.success.subtitle': 'Thanks for your order. You can view it in the Orders tab.',
  'checkout.success.back': 'Back to shop',

  // Shops
  'shops.title': 'Shops',
  'shops.subtitle': 'Local merchants and trusted brands, all in one place.',
  'shops.empty.title': 'No shops yet',
  'shops.empty.subtitle': 'When tenants are onboarded, they will appear here.',
  'shops.allShops': 'All shops',
  'shop.productsFrom': 'Products from {name}',
  'shop.empty.title': 'No products yet',
  'shop.empty.subtitle': "This shop hasn't published any products yet.",

  // Misc
  'common.loading': 'Loading…',
  'common.refresh': 'Pull to refresh',
} as const;

export type EnDict = typeof en;
