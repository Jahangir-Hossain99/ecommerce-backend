import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';


// Stripe Card Modal/Form Component
const StripeCheckoutForm = ({ clientSecret, onPaymentSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    // Stripe Payment Confirmation
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });

    if (result.error) {
      alert('Payment Failed: ' + result.error.message);
      setIsProcessing(false);
    } else if (result.paymentIntent.status === 'succeeded') {
      alert('Payment Successful!');
      onPaymentSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold mb-4 text-slate-800">Enter Card Details</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 border rounded-lg bg-gray-50">
            <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px' } } }} />
          </div>
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-medium disabled:bg-gray-400"
          >
            {isProcessing ? 'Processing Payment...' : 'Pay Now'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StripeCheckoutForm;