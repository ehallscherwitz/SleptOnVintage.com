// Products data converted to TypeScript

interface Product {
  id: number;
  name: string;
  price: number;
  size: string;
  image: string;
  available: boolean;
  category: 'shirts' | 'sweaters' | 'hoodies' | 'jackets' | 'pants' | 'shorts';
}

export const products: Product[] = [
  {
    name: "The Eagles Hell Freezes Over T Shirt",
    price: 150,
    size: "XL",
    image: "/photos/Shirt2.jpeg",
    id: 1,
    available: true,
    category: "shirts"
  },
  {
    name: "Cowboys 1992 Super Bowl T Shirt",
    price: 35,
    size: "L",
    image: "/photos/Shirt3.jpeg",
    id: 2,
    available: true,
    category: "shirts"
  },
  {
    name: "Southpole T Shirt",
    size: "L",
    price: 25,
    image: "/photos/Shirt4.jpeg",
    id: 3,
    available: false,
    category: "shirts"
  },
  {
    name: "Van Halen Monsters Of Rock T Shirt",
    price: 95,
    size: "XL",
    image: "/photos/Shirt5.jpeg",
    id: 4,
    available: true,
    category: "shirts"
  },
  {
    name: "Invader Zim T Shirt",
    price: 35,
    size: "M",
    image: "/photos/Shirt6.jpeg",
    id: 5,
    available: true,
    category: "shirts"
  },
  {
    name: "Stone Cold Steve Austin T Shirt",
    price: 50,
    size: "L",
    image: "/photos/Shirt1.jpg",
    id: 6,
    available: true,
    category: "shirts"
  },
  {
    name: "Mountain Tek 80s Acrylic Sweater",
    price: 25,
    size: "L",
    image: "/photos/Sweater2.jpg",
    id: 7,
    available: true,
    category: "sweaters"
  },
  {
    name: "Shenandoah 90s Cotton Sweater",
    price: 25,
    size: "XL",
    image: "/photos/Sweater5.jpg",
    id: 8,
    available: true,
    category: "sweaters"
  },
  {
    name: "Varsity Shop 80s Wool Nordic Sweater",
    size: "L",
    price: 20,
    image: "/photos/Sweater3.jpg",
    id: 9,
    available: true,
    category: "sweaters"
  },
  {
    name: "Colore Italia 90s Wool Sweater",
    price: 30,
    size: "S",
    image: "/photos/Sweater1.jpeg",
    id: 10,
    available: true,
    category: "sweaters"
  },
  {
    name: "Sostanza Fashion Police 80s Acrylic Sweater",
    price: 25,
    size: "L",
    image: "/photos/Sweater4.jpg",
    id: 11,
    available: true,
    category: "sweaters"
  },
  {
    name: "Scandia 90s Acrylic Sweater",
    price: 25,
    size: "M",
    image: "/photos/Sweater6.jpg",
    id: 12,
    available: true,
    category: "sweaters"
  },
  {
    name: "Dickies Eisenhower Workwear Jacket",
    price: 35,
    size: "L",
    image: "/photos/Jacket4.jpg",
    id: 13,
    available: false,
    category: "jackets"
  },
  {
    name: "Platinum Fubu Fat Albert Denim Jacket",
    price: 85,
    size: "2XL",
    image: "/photos/Jacket2.jpg",
    id: 14,
    available: true,
    category: "jackets"
  },
  {
    name: "Carhartt Hooded Camo Workwear Jacket",
    size: "2XL",
    price: 120,
    image: "/photos/Jacket1.jpeg",
    id: 15,
    available: false,
    category: "jackets"
  },
  {
    name: "Gap Denim Jacket",
    price: 25,
    size: "M",
    image: "/photos/Jacket5.jpg",
    id: 16,
    available: true,
    category: "jackets"
  },
  {
    name: "Trebark 80s Camo Chore Jacket",
    price: 45,
    size: "XL",
    image: "/photos/Jacket3.jpg",
    id: 17,
    available: false,
    category: "jackets"
  },
  {
    name: "Top Heavy 00s Hoodie",
    price: 80,
    size: "XL",
    image: "/photos/Hoodie3.jpg",
    id: 18,
    available: true,
    category: "hoodies"
  },
  {
    name: "Nike 90s Bubble Logo Hoodie",
    price: 70,
    size: "M",
    image: "/photos/Hoodie1.jpeg",
    id: 19,
    available: true,
    category: "hoodies"
  },
  {
    name: "University of Florida Gators Hoodie",
    size: "M",
    price: 20,
    image: "/photos/Hoodie5.jpg",
    id: 20,
    available: false,
    category: "hoodies"
  },
  {
    name: "Purdue University Hoodie",
    price: 30,
    size: "L",
    image: "/photos/Hoodie2.jpg",
    id: 21,
    available: false,
    category: "hoodies"
  },
  {
    name: "Billabong 00s Embroidered Hoodie",
    price: 35,
    size: "S",
    image: "/photos/Hoodie4.jpg",
    id: 22,
    available: true,
    category: "hoodies"
  },
  {
    name: "American Eagle Hoodie",
    price: 20,
    size: "M",
    image: "/photos/Hoodie6.jpg",
    id: 23,
    available: true,
    category: "hoodies"
  },
  {
    name: "Levis Dry Goods 90s Pants",
    price: 40,
    size: "34x34",
    image: "/photos/Pants5.jpg",
    id: 24,
    available: true,
    category: "pants"
  },
  {
    name: "Marithe Francois Girbaud 90s Jeans",
    price: 35,
    size: "34x32",
    image: "/photos/Pants3.jpg",
    id: 25,
    available: true,
    category: "pants"
  },
  {
    name: "No Boundaries 00s Double Knee Pants",
    size: "34x31",
    price: 30,
    image: "/photos/Pants4.jpg",
    id: 26,
    available: false,
    category: "pants"
  },
  {
    name: "Carhartt Double Knee Pants",
    price: 30,
    size: "XL",
    image: "/photos/Pants6.jpg",
    id: 27,
    available: true,
    category: "pants"
  },
  {
    name: "Southpole 00s Red Tab Jeans",
    price: 35,
    size: "36x32",
    image: "/photos/Pants1.jpeg",
    id: 28,
    available: true,
    category: "pants"
  },
  {
    name: "Dickies Canvas Carpenter Pants",
    price: 25,
    size: "34x32",
    image: "/photos/Pants2.jpg",
    id: 29,
    available: false,
    category: "pants"
  },
  {
    name: "Southpole Patchwork Jorts",
    price: 25,
    size: "36",
    image: "/photos/Shorts2.jpg",
    id: 30,
    available: true,
    category: "shorts"
  },
  {
    name: "Wrangler Riggs Cargo Shorts ",
    price: 15,
    size: "34",
    image: "/photos/Shorts5.jpg",
    id: 31,
    available: true,
    category: "shorts"
  },
  {
    name: "Marithe Francois Girbaud Jorts",
    size: "34",
    price: 30,
    image: "/photos/Shorts3.jpg",
    id: 32,
    available: false,
    category: "shorts"
  },
  {
    name: "JLT Denim Houston Jorts",
    price: 25,
    size: "40",
    image: "/photos/Shorts1.jpg",
    id: 33,
    available: true,
    category: "shorts"
  },
  {
    name: "Quicksilver Denim Embroidered Jorts",
    price: 35,
    size: "32",
    image: "/photos/Shorts4.jpg",
    id: 34,
    available: true,
    category: "shorts"
  },
  {
    name: "Dtek Jeans Jorts",
    price: 25,
    size: "42",
    image: "/photos/Shorts6.jpg",
    id: 35,
    available: false,
    category: "shorts"
  }
];
