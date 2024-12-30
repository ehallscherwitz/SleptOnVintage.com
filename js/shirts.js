

const shirts = [
  {
    name: "The Eagles Hell Freezes Over T Shirt",
    price: "$150",
    size: "XL",
    image: "photos/Shirt2.jpeg",
    id: "0001",
    available: "true"
  },
  {
    name: "Cowboys 1992 Super Bowl T Shirt",
    price: "$35",
    size: "L",
    image: "photos/Shirt3.jpeg",
    id: "0002",
    available: "true"
  },
  {
    name: "Southpole T Shirt",
    size: "L",
    price: "$25",
    image: "photos/Shirt4.jpeg",
    id: "0003",
    available: "false"
  },
  {
    name: "Van Halen Monsters Of Rock T Shirt",
    price: "$95",
    size: "XL",
    image: "photos/Shirt5.jpeg",
    id: "0004",
    available: "true"
  },
  {
    name: "Invader Zim T Shirt",
    price: "$35",
    size: "M",
    image: "photos/Shirt6.jpeg",
    id: "0005",
    available: "true"
  },
  {
    name: "Stone Cold Steve Austin T Shirt",
    price: "$50",
    size: "L",
    image: "photos/Shirt1.jpg",
    id: "0006",
    available: "true"
  }
]

const productsHTML = shirts.map(
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
