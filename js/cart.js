// Initialize cart from localStorage or create a new one
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Function to add a product to the cart
function addToCart(productId) {
  const product = getProductById(productId);
  
  if (product) {
    const isAlreadyInCart = cart.some(item => item.id === productId);

    if (isAlreadyInCart) {
      console.log(`Product with ID ${productId} is already in the cart.`);
      return;
    }

    // Add the product to the cart if it's not already there
    cart.push(product);
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log(cart);
    updateCartCounter();
  }
}

// Function to update the cart counter display
function updateCartCounter() {
  let cartCounter = cart.length;
  document.querySelector('.cart-counter').innerHTML = cartCounter;
}

// Function to get product details by ID
function getProductById(productId) {
  const products = JSON.parse(localStorage.getItem('products')) || [];
  return products.find(product => product.id === productId);
}

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('add-to-cart-btn')) {
    addToCart(event.target.id);
  }
});

function resetCart() {
  cart = [];
  localStorage.removeItem('cart');
  updateCartCounter();
}

resetCart();
