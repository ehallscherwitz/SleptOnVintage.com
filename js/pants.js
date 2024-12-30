

const pants = [
  {
    name: "Levis Dry Goods 90s Pants",
    price: "$40",
    size: "34x34",
    image: "photos/Pants5.jpg",
    id: "0025",
    available: "true"
  },
  {
    name: "Marithe Francois Girbaud 90s Jeans",
    price: "$35",
    size: "34x32",
    image: "photos/Pants3.jpg",
    id: "0026",
    available: "true"
  },
  {
    name: "No Boundaries 00s Double Knee Pants",
    size: "34x31",
    price: "$30",
    image: "photos/Pants4.jpg",
    id: "0027",
    available: "false"
  },
  {
    name: "Carhartt Double Knee Pants",
    price: "$30",
    size: "XL",
    image: "photos/Pants6.jpg",
    id: "0028",
    available: "true"
  },
  {
    name: "Southpole 00s Red Tab Jeans",
    price: "$35",
    size: "36x32",
    image: "photos/Pants1.jpeg",
    id: "0029",
    available: "true"
  },
  {
    name: "Dickies Canvas Carpenter Pants",
    price: "$25",
    size: "34x32",
    image: "photos/Pants2.jpg",
    id: "0030",
    available: "false"
  }
]

const productsHTML = pants.map(
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
