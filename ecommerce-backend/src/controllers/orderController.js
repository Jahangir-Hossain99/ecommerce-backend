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
        return res.status(400).json({ success: false, message: `Insufficient stock for product ID: ${item.productId}` });
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
    const order = await prisma.$transaction(async (tx) => {
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

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Payment Success Helper (Safe Stock Reduction Algorithm)
const handleSuccessfulPayment = async (transactionId, rawData) => {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { transactionId } });
    if (!payment || payment.status === 'SUCCESS') return;

    // Update Payment & Order
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', rawResponse: rawData }
    });

    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
      include: { orderItems: true }
    });

    // Safely reduce stock for each product
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }
  });
};

// 3. Stripe Webhook Handler
const stripeWebhook = async (req, res) => {
  try {
    const paymentContext = new PaymentContext('stripe');
    const verification = await paymentContext.executeVerification(req.body);

    if (verification.status === 'SUCCESS') {
      await handleSuccessfulPayment(verification.transactionId, verification.rawResponse);
    }
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// 4. bKash Callback Handler
const bkashCallback = async (req, res) => {
  try {
    const { paymentID, status } = req.query;
    if (status === 'success') {
      const paymentContext = new PaymentContext('bkash');
      const verification = await paymentContext.executeVerification({ paymentID });

      if (verification.status === 'SUCCESS') {
        await handleSuccessfulPayment(verification.transactionId, verification.rawResponse);
        return res.status(200).json({ success: true, message: 'bKash payment successful' });
      }
    }
    res.status(400).json({ success: false, message: 'bKash payment failed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { createOrder, stripeWebhook, bkashCallback };