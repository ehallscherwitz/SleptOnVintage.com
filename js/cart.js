// Initialize cart from localStorage or create a new one
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function addToCart(productId) {
  const product = getProductById(productId);
  if (product) {
    cart.push(product);
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log(cart);
  }
}

let cartCounter = 0;

// Function to update the cart counter display
function updateCartCounter() {
  if (cart.length){
    cartCounter = cart.length;
    document.querySelector('.cart-quantity').innerHTML = cartCounter;
  }
}

// Function to get product details by ID
function getProductById(productId) {
  const products = JSON.parse(localStorage.getItem('products')) || [];
  return products.find(product => product.id === productId);
}

// Reset Cart
function resetCart() {
  cart = [];
  localStorage.removeItem('cart');
  updateCartCounter();
}

// Call updateCartCounter on page load to display the correct quantity

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('add-to-cart-btn')) {
    addToCart(event.target.id);
  }
});


