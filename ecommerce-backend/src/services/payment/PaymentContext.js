import StripeStrategy from './StripeStrategy.js';
import BKashStrategy from './BKashStrategy.js';

class PaymentContext {
  constructor(provider) {
    this.strategy = this.selectStrategy(provider);
  }

  selectStrategy(provider) {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return new StripeStrategy();
      case 'bkash':
        return new BKashStrategy();
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  async executePayment(orderDetails) {
    return await this.strategy.processPayment(orderDetails);
  }

  async executeVerification(payload) {
    return await this.strategy.verifyPayment(payload);
  }
}

export default PaymentContext;