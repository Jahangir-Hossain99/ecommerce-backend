import prisma from '../config/prisma.js';

import PaymentContext from '../services/payment/PaymentContext.js';

// 1. Order Creation with Deterministic Totals
const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, provider } = req.body; // items = [{ productId, quantity }]

    let totalAmount = 0;
    const orderItemsData = [];

    // Deterministic Subtotal Calculation & Stock Availability Check
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for product: ${product ? product.name : item.productId}` 
        });
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        subtotal
      });
    }

    // Database Transaction for Atomic Creation
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PENDING',
          orderItems: { create: orderItemsData }
        },
        include: { orderItems: true }
      });

      // Strategy Pattern Initiate
      const paymentContext = new PaymentContext(provider);
      const paymentResult = await paymentContext.executePayment({
        orderId: newOrder.id,
        amount: totalAmount
      });

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          provider,
          transactionId: paymentResult.transactionId,
          status: 'PENDING',
          rawResponse: paymentResult.rawResponse
        }
      });

      return { newOrder, paymentResult };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Safe & Atomic Stock Reduction Helper Function
const handleSuccessfulPayment = async (transactionId, rawData) => {
  console.log(`🔄 Processing stock reduction for Transaction: ${transactionId}`);

  return await prisma.$transaction(async (tx) => {
    // Transactional Fetch of Payment Record
    const payment = await tx.payment.findUnique({ 
      where: { transactionId: String(transactionId) } 
    });

    if (!payment) {
      console.error(`❌ Payment record not found for Transaction ID: ${transactionId}`);
      return;
    }

    // If payment is already marked as SUCCESS, skip further processing
    if (payment.status === 'SUCCESS') {
      console.log(`⚠️ Payment ${transactionId} is already processed.`);
      return;
    }

    // Payment & Order Status Update
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', rawResponse: rawData }
    });

    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
      include: { orderItems: true }
    });

    // Stock Reduction for Each Product in the Order
    for (const item of order.orderItems) {
      const updatedProduct = await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
      console.log(`✅ Stock updated for Product ID ${item.productId}: New Stock = ${updatedProduct.stock}`);
    }
  });
};

// Stripe Webhook Handler (Fixed Event Parsing)
const stripeWebhook = async (req, res) => {
  try {
    const event = req.body; // Express.json() middleware used

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log('💳 Stripe Payment Intent Succeeded:', paymentIntent.id);

      await handleSuccessfulPayment(paymentIntent.id, paymentIntent);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe Webhook Error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// ৪. bKash Callback Handler (Fixed Callback Handling)
const bkashCallback = async (req, res) => {
  try {
    const { paymentID, status } = req.query;

    if (status === 'success' || status === 'Completed') {
      const PaymentContext = require('../services/payment/PaymentContext');
      const paymentContext = new PaymentContext('bkash');
      
      const verification = await paymentContext.executeVerification({ paymentID });

      if (verification.status === 'SUCCESS') {
        await handleSuccessfulPayment(verification.transactionId, verification.rawResponse);
        return res.status(200).json({ success: true, message: 'bKash payment successful and stock updated!' });
      }
    }

    res.status(400).json({ success: false, message: 'bKash payment verification failed' });
  } catch (error) {
    console.error('bKash Callback Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manual Payment Verification Endpoint for Testing
const manualVerifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;
    await handleSuccessfulPayment(transactionId, { manualTest: true });
    res.status(200).json({ success: true, message: 'Payment verified and stock reduced successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createOrder,
  stripeWebhook,
  bkashCallback,
  manualVerifyPayment
};