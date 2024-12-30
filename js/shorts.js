

const shorts = [
  {
    name: "Marithe Francois Girbaud Jorts",
    size: "34",
    price: "$30",
    image: "photos/Shorts3.jpg",
    id: "0033",
    available: "false"
  },
  {
    name: "Southpole Patchwork Jorts",
    price: "$25",
    size: "36",
    image: "photos/Shorts2.jpg",
    id: "0031",
    available: "true"
  },
  {
    name: "Wrangler Riggs Cargo Shorts ",
    price: "$15",
    size: "34",
    image: "photos/Shorts5.jpg",
    id: "0032",
    available: "true"
  },
  {
    name: "JLT Denim Houston Jorts",
    price: "$25",
    size: "40",
    image: "photos/Shorts1.jpg",
    id: "0034",
    available: "true"
  },
  {
    name: "Dtek Jeans Jorts",
    price: "$25",
    size: "42",
    image: "photos/Shorts6.jpg",
    id: "0036",
    available: "false"
  },
  {
    name: "Quicksilver Denim Embroidered Jorts",
    price: "$35",
    size: "32",
    image: "photos/Shorts4.jpg",
    id: "0035",
    available: "true"
  }
]

const productsHTML = shorts.map(
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
              : `<button class="sold-out-btn" >Sold Out</button>`
          }
        </div>
      </div>
  `
);

const result = document.querySelector(".product-grid");
result.innerHTML = productsHTML.join("");
