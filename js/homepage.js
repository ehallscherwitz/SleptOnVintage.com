const categories = [
  {
    name: "Shirts",
    image: "photos/Shirt1.jpg"
  },
  {
    name: "Sweaters",
    image: "photos/Sweater1.jpeg"
  },
  {
    name: "Hoodies",
    image: "photos/Hoodie1.jpeg"
  },
  {
    name: "Jackets",
    image: "photos/Jacket1.jpeg"
  },
  {
    name: "Pants",
    image: "photos/Pants1.jpeg"
  },
  {
    name: "Shorts",
    image: "photos/Shorts1.jpg"
  }
]

const categoriesHTML = categories.map(
  (category) => `
    <a href="${category.name.toLowerCase()}.html">
      <button class="category">
        <div class="thumbnail-row">
          <img class="thumbnail" src="${category.image}" alt="${category.name}">
        </div>
        <div class="category-info-row">
          <div class="category-title">${category.name} <i class="fa-solid fa-arrow-right"></i></div>
        </div>
      </button>
    </a>
  `
);

const result = document.querySelector(".category-grid");
result.innerHTML = categoriesHTML.join("");