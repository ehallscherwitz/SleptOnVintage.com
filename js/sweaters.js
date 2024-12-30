

const sweaters = [
  {
    name: "Mountain Tek 80s Acrylic Sweater",
    price: "$25",
    size: "L",
    image: "photos/Sweater2.jpg",
    id: "0007",
    available: "true"
  },
  {
    name: "Shenandoah 90s Cotton Sweater",
    price: "$25",
    size: "XL",
    image: "photos/Sweater5.jpg",
    id: "0008",
    available: "true"
  },
  {
    name: "Varsity Shop 80s Wool Nordic Sweater",
    size: "L",
    price: "$20",
    image: "photos/Sweater3.jpg",
    id: "0009",
    available: "true"
  },
  {
    name: "Colore Italia 90s Wool Sweater",
    price: "$30",
    size: "S",
    image: "photos/Sweater1.jpeg",
    id: "00010",
    available: "true"
  },
  {
    name: "Sostanza Fashion Police 80s Acrylic Sweater",
    price: "$25",
    size: "L",
    image: "photos/Sweater4.jpg",
    id: "00011",
    available: "true"
  },
  {
    name: "Scandia 90s Acrylic Sweater",
    price: "$25",
    size: "M",
    image: "photos/Sweater6.jpg",
    id: "00012",
    available: "true"
  }
]

const productsHTML = sweaters.map(
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
