

const jackets = [
  {
    name: "Dickies Eisenhower Workwear Jacket",
    price: "$35",
    size: "L",
    image: "photos/Jacket4.jpg",
    id: "0013",
    available: "false"
  },
  {
    name: "Platinum Fubu Fat Albert Denim Jacket",
    price: "$85",
    size: "2XL",
    image: "photos/Jacket2.jpg",
    id: "0014",
    available: "true"
  },
  {
    name: "Carhartt Hooded Camo Workwear Jacket",
    size: "2XL",
    price: "$120",
    image: "photos/Jacket1.jpeg",
    id: "0015",
    available: "false"
  },
  {
    name: "Gap Denim Jacket",
    price: "$25",
    size: "M",
    image: "photos/Jacket5.jpg",
    id: "0016",
    available: "true"
  },
  {
    name: "Trebark 80s Camo Chore Jacket",
    price: "$45",
    size: "XL",
    image: "photos/Jacket3.jpg",
    id: "0017",
    available: "false"
  }
]

const productsHTML = jackets.map(
  (product) => `
      <div class="product">
        <div class="thumbnail-row">
          <img class="thumbnail" src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info-row">
          <div class="product-title">${product.name}</div>
          <div class="product-size">(${product.size})</div>
          <div class="product-price">${product.price}</div>
        </div>
        <div class="product-button-row">
          ${
            product.available === "true"
              ? `<button class="add-to-cart-btn" id="${product.id}" ">Add to Cart</button>`
              : `<button class="sold-out-btn">Sold Out</button>`
          }
        </div>
      </div>
  `
);

const result = document.querySelector(".product-grid");
result.innerHTML = productsHTML.join("");
