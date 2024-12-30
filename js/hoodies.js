
const hoodies = [
  {
    name: "Top Heavy 00s Hoodie",
    price: "$80",
    size: "XL",
    image: "photos/Hoodie3.jpg",
    id: "0019",
    available: "true"
  },
  {
    name: "Nike 90s Bubble Logo Hoodie",
    price: "$70",
    size: "M",
    image: "photos/Hoodie1.jpeg",
    id: "0020",
    available: "true"
  },
  {
    name: "University of Florida Gators Hoodie",
    size: "M",
    price: "$20",
    image: "photos/Hoodie5.jpg",
    id: "0021",
    available: "false"
  },
  {
    name: "Purdue University Hoodie",
    price: "$30",
    size: "L",
    image: "photos/Hoodie2.jpg",
    id: "0022",
    available: "false"
  },
  {
    name: "Billabong 00s Embroidered Hoodie",
    price: "$35",
    size: "S",
    image: "photos/Hoodie4.jpg",
    id: "0023",
    available: "true"
  },
  {
    name: "American Eagle Hoodie",
    price: "$20",
    size: "M",
    image: "photos/Hoodie6.jpg",
    id: "0024",
    available: "true"
  }
]

const productsHTML = hoodies.map(
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
              ? `<button class="add-to-cart-btn" product="${product}" ">Add to Cart</button>`
              : `<button class="sold-out-btn">Sold Out</button>`
          }
        </div>
      </div>
  `
);

const result = document.querySelector(".product-grid");
result.innerHTML = productsHTML.join("");
