// Test script for Square Order Creation API
// Run this after deploying to Vercel

const testOrderCreation = async () => {
  const testData = {
    cartItems: [
      {
        id: "test-cart-item-1",
        product_id: 1,
        product: {
          id: 1,
          name: "Vintage T-Shirt",
          price: 25.00,
          size: "M",
          image: "tshirt.jpg",
          category: "shirts"
        }
      },
      {
        id: "test-cart-item-2", 
        product_id: 2,
        product: {
          id: 2,
          name: "Classic Hoodie",
          price: 45.00,
          size: "L",
          image: "hoodie.jpg",
          category: "hoodies"
        }
      }
    ],
    customerInfo: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "555-1234"
    },
    shippingInfo: {
      address1: "123 Main Street",
      address2: "Apt 4B",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      notes: "Please leave at front door"
    }
  };

  try {
    console.log('Testing order creation API...');
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    // Replace with your actual Vercel URL
    const response = await fetch('https://your-app.vercel.app/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Order creation successful!');
      console.log('Order ID:', result.order.id);
      console.log('Total amount:', result.totals.total);
    } else {
      console.log('❌ Order creation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Uncomment to run the test
// testOrderCreation();

console.log('Test script ready. Update the Vercel URL and uncomment testOrderCreation() to run the test.');

