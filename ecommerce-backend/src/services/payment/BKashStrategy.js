import PaymentStrategy from './PaymentStrategy.js';
import axios from 'axios';

class BKashStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.baseURL = process.env.BKASH_BASE_URL; 
  }


  async getGrantToken() {
    const response = await axios.post(
      `${this.baseURL}/tokenized/checkout/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      },
      {
        headers: {
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
        },
      }
    );
    return response.data.id_token;
  }

  async processPayment(orderDetails) {
    const { amount, orderId } = orderDetails;
    const token = await this.getGrantToken();

    const response = await axios.post(
      `${this.baseURL}/tokenized/checkout/create`,
      {
        mode: '0011',
        payerReference: '01700000000',
        callbackURL: `${process.env.BACKEND_URL}/api/payments/bkash/callback`,
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: `INV_${orderId}_${Date.now()}`,
      },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );

    return {
      provider: 'bkash',
      transactionId: response.data.paymentID,
      bkashURL: response.data.bkashURL,
      status: 'PENDING',
      rawResponse: response.data,
    };
  }

  async verifyPayment(payload) {
    // Execute Payment API Call
    const { paymentID } = payload;
    const token = await this.getGrantToken();

    const response = await axios.post(
      `${this.baseURL}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
        },
      }
    );

    if (response.data && response.data.statusCode === '0000') {
      return {
        transactionId: response.data.paymentID,
        status: 'SUCCESS',
        rawResponse: response.data,
      };
    }

    return {
      transactionId: paymentID,
      status: 'FAILED',
      rawResponse: response.data,
    };
  }
}

export default BKashStrategy;