import PaymentStrategy from './PaymentStrategy.js';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeStrategy extends PaymentStrategy {
  async processPayment(orderDetails) {
    const { amount, currency = 'usd', orderId } = orderDetails;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { orderId: orderId.toString() },
    });

    return {
      provider: 'stripe',
      transactionId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: 'PENDING',
      rawResponse: paymentIntent,
    };
  }

  async verifyPayment(event) {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      return {
        transactionId: paymentIntent.id,
        orderId: parseInt(paymentIntent.metadata.orderId),
        status: 'SUCCESS',
        rawResponse: paymentIntent,
      };
    }

    return {
      transactionId: event.data?.object?.id,
      status: 'FAILED',
      rawResponse: event,
    };
  }
}

export default StripeStrategy;