const express = require('express');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ===== RAZORPAY =====
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ===== MONGOOSE CONNECT =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ===== SCHEMAS =====
const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  paymentId: String,
  razorpayOrderId: String,
  productType: String, // 'ebook' | 'paperback' | 'audiobook'
  productName: String,
  amount: Number,
  currency: { type: String, default: 'INR' },
  status: { type: String, default: 'pending' }, // pending | paid | failed
  customer: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
  },
  downloadSent: { type: Boolean, default: false },
  deliveryStatus: { type: String, default: 'not_applicable' },
  expectedDelivery: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const notifySchema = new mongoose.Schema({
  email: { type: String, unique: true },
  product: String,
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);
const Notify = mongoose.model('Notify', notifySchema);

// ===== HELPER =====
function generateOrderId(type) {
  const prefix = type === 'ebook' ? 'ASE' : type === 'paperback' ? 'ASP' : 'ASA';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// ===== ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AmbikaShelf Library API running' });
});

// Create Razorpay order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, productName, name, email, phone, address, productType } = req.body;

    if (!amount || !name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount), // in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { productName, customerName: name, customerEmail: email },
    });

    // Save pending order to DB
    const internalOrderId = generateOrderId(productType || 'ebook');
    const order = new Order({
      orderId: internalOrderId,
      razorpayOrderId: rzpOrder.id,
      productType: productType || 'ebook',
      productName,
      amount: amount / 100,
      status: 'pending',
      customer: {
        name, email, phone,
        address: address || {},
      },
    });
    await order.save();

    res.json({
      id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      internalOrderId,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment & update DB
app.post('/api/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = req.body;

    // Signature verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Update order in DB
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $set: {
          paymentId: razorpay_payment_id,
          status: 'paid',
          updatedAt: new Date(),
          ...(orderData?.productType === 'paperback' && {
            deliveryStatus: 'processing',
            expectedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
          }),
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({
      success: true,
      orderId: order.orderId,
      paymentId: razorpay_payment_id,
      productType: order.productType,
      expectedDelivery: order.expectedDelivery,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Audiobook notify me
app.post('/api/notify', async (req, res) => {
  try {
    const { email, product } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const notify = new Notify({ email, product: product || 'audiobook' });
    await notify.save();
    res.json({ success: true, message: 'You will be notified when the audiobook is ready!' });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: true, message: 'Already subscribed!' });
    }
    res.status(500).json({ error: 'Failed to save notification request' });
  }
});

// Get order status (for tracking)
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).select('-__v');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 AmbikaShelf Library server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});
