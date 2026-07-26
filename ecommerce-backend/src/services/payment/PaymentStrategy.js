// src/services/payment/PaymentStrategy.js

class PaymentStrategy {
  /**
   * @param {Object} orderDetails - { orderId, amount, currency }
   */
  async processPayment(orderDetails) {
    throw new Error("processPayment() method must be implemented");
  }

  /**
   * @param {Object} payload - Gateways response/payload
   */
  async verifyPayment(payload) {
    throw new Error("verifyPayment() method must be implemented");
  }
}

export default PaymentStrategy;