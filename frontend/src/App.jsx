import React, { useState, useEffect } from 'react';
import API from './api';
import { ShoppingCart, CreditCard, Trash2, UserCheck, LogIn, X } from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('stripe');

  useEffect(() => {
    fetchProducts();
    fetchRecommendations(selectedCategory);
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await API.get('/products');
      setProducts(data.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchRecommendations = async (catId) => {
    setSelectedCategory(catId);
    try {
      const { data } = await API.get(`/products/recommendations/${catId}`);
      setRecommendations(data.data?.products || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  };

  // Login/Register Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
    try {
      const { data } = await API.post(endpoint, authForm);
      if (isRegisterMode) {
        alert('Registration Successful! Please login.');
        setIsRegisterMode(false);
      } else {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setIsAuthModalOpen(false);
        setAuthForm({ name: '', email: '', password: '' });
      }
    } catch (err) {
      alert('Authentication Failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Cart Handlers
  const addToCart = (product) => {
    const currentCartItem = cart.find((item) => item.id === product.id);
    const cartQty = currentCartItem ? currentCartItem.quantity : 0;

    if (product.stock - cartQty <= 0) {
      alert('Out of stock!');
      return;
    }

    if (currentCartItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  // Calculate available dynamic stock
  const getAvailableStock = (product) => {
    const cartItem = cart.find((item) => item.id === product.id);
    return product.stock - (cartItem ? cartItem.quantity : 0);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Checkout Handler
  const handleCheckoutProcess = async () => {
    if (!token) {
      alert('Please login to place an order!');
      setIsAuthModalOpen(true);
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    setLoading(true);
    try {
      const orderItems = cart.map((item) => ({ productId: item.id, quantity: item.quantity }));
      const { data } = await API.post('/orders', {
        provider: selectedProvider,
        items: orderItems,
      });

      if (selectedProvider === 'bkash') {
        window.location.href = data.data.paymentResult.bkashURL;
      } else {
        alert(`Stripe Payment Intent Created!\nTransaction ID: ${data.data.paymentResult.transactionId}`);
        setCart([]);
        setIsPaymentModalOpen(false);
        fetchProducts(); // Refresh dynamic backend stock
      }
    } catch (err) {
      alert('Checkout Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-800">E-Commerce System</h1>
        <div>
          {token ? (
            <button
              onClick={() => { localStorage.clear(); setToken(''); }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
            >
              <LogIn size={16} /> Login / Register
            </button>
          )}
        </div>
      </header>

      {/* Main Grid: Products & Cart */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Recommendations & Products */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* DFS Recommendations Section */}
          <section className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-indigo-900">
                Category Recommendations (Category ID: {selectedCategory})
              </h2>
              <div className="space-x-2">
                <button
                  onClick={() => fetchRecommendations(1)}
                  className={`px-3 py-1 text-xs rounded font-medium ${
                    selectedCategory === 1 ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-900'
                  }`}
                >
                  Cat 1 (Electronics)
                </button>
                <button
                  onClick={() => fetchRecommendations(2)}
                  className={`px-3 py-1 text-xs rounded font-medium ${
                    selectedCategory === 2 ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-900'
                  }`}
                >
                  Cat 2 (Laptops)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendations.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                    <p className="text-indigo-600 font-semibold">${item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Product List */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-slate-800">All Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map((product) => {
                const availableStock = getAvailableStock(product);
                return (
                  <div key={product.id} className="bg-white border rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-slate-800">{product.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${
                          availableStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          Stock: {availableStock}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                      <p className="text-xl font-extrabold text-slate-900 mt-2">${product.price}</p>
                    </div>

                    <button
                      disabled={availableStock <= 0}
                      onClick={() => addToCart(product)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition"
                    >
                      <ShoppingCart size={16} /> Add to Cart
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Side: Shopping Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-xl p-5 shadow-sm sticky top-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShoppingCart /> Shopping Cart
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">Your cart is empty.</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        ${item.price} x {item.quantity} = <span className="font-bold text-slate-700">${item.price * item.quantity}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <div className="pt-2">
                  <div className="flex justify-between font-bold text-lg text-slate-800">
                    <span>Total:</span>
                    <span>${cartTotal}</span>
                  </div>

                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 shadow"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Auth Popup Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              {isRegisterMode ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {isRegisterMode && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded font-medium mt-2"
              >
                {isRegisterMode ? 'Register' : 'Login'}
              </button>
            </form>
            <div className="mt-4 text-center text-sm text-gray-600">
              {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-indigo-600 font-semibold underline ml-1"
              >
                {isRegisterMode ? 'Login' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-2 text-slate-800">Checkout Payment</h2>
            <p className="text-sm text-gray-500 mb-4">Select your preferred payment gateway:</p>

            <div className="space-y-3 mb-6">
              <label
                onClick={() => setSelectedProvider('stripe')}
                className={`flex items-center justify-between p-3.5 border rounded-lg cursor-pointer ${
                  selectedProvider === 'stripe' ? 'border-blue-600 bg-blue-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="text-blue-600" />
                  <span className="font-semibold text-slate-800">Stripe Card Payment</span>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedProvider === 'stripe'}
                  onChange={() => setSelectedProvider('stripe')}
                />
              </label>

              <label
                onClick={() => setSelectedProvider('bkash')}
                className={`flex items-center justify-between p-3.5 border rounded-lg cursor-pointer ${
                  selectedProvider === 'bkash' ? 'border-pink-600 bg-pink-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-pink-600" />
                  <span className="font-semibold text-slate-800">bKash Mobile Payment</span>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedProvider === 'bkash'}
                  onChange={() => setSelectedProvider('bkash')}
                />
              </label>
            </div>

            <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between text-sm font-semibold">
              <span>Amount to Pay:</span>
              <span className="text-slate-900">${cartTotal}</span>
            </div>

            <button
              disabled={loading}
              onClick={handleCheckoutProcess}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg font-medium transition"
            >
              {loading ? 'Processing...' : `Pay $${cartTotal} with ${selectedProvider.toUpperCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;