//const cartProducts = products.filter(product => product.category === 'hoodies');

const cartProducts = cart.map(cartItem => {
  const product = products.find(product => product.id === cartItem.id);
  return { ...product, quantity: cartItem.quantity };
});

const productsHTML = cartProducts.map(
  (product) => `
      <div class="product">
          <div class="thumbnail-container">
            <img class="cart-thumbnail" src="${product.image}">
          </div>
          <div class="product-info">
            <div class="product-title">${product.name}</div>
            <div class="product-size">(${product.size})</div>
          </div>
          <div class="product-price">${product.price}</div>
          <div class="remove-button-container">
            <button class="remove-button" id="${product.id}">Remove</button>
          </div>
        </div>
  `
);

const result = document.querySelector(".product-grid");
result.innerHTML = productsHTML.join("");

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-button')) {
    removeFromCart(event.target.id);
    location.reload();
  }
});
