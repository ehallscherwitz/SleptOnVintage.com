// Initialize cart from localStorage or create a new one
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Function to add a product to the cart
function addToCart(productId) {
  const product = getProductById(productId);
  if (product) {
    cart.push(product);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
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

window.addToCart = addToCart;

// Call updateCartCounter on page load to display the correct quantity
updateCartCounter();


