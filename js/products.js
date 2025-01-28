//put all products in here and then parse them to each page

const products = [
  {
    name: "The Eagles Hell Freezes Over T Shirt",
    price: 150,
    size: "XL",
    image: "photos/Shirt2.jpeg",
    id: "0001",
    available: "true",
    category: "shirts"
  },
  {
    name: "Cowboys 1992 Super Bowl T Shirt",
    price: 35,
    size: "L",
    image: "photos/Shirt3.jpeg",
    id: "0002",
    available: "true",
    category: "shirts"
  },
  {
    name: "Southpole T Shirt",
    size: "L",
    price: 25,
    image: "photos/Shirt4.jpeg",
    id: "0003",
    available: "false",
    category: "shirts"
  },
  {
    name: "Van Halen Monsters Of Rock T Shirt",
    price: 95,
    size: "XL",
    image: "photos/Shirt5.jpeg",
    id: "0004",
    available: "true",
    category: "shirts"
  },
  {
    name: "Invader Zim T Shirt",
    price: 35,
    size: "M",
    image: "photos/Shirt6.jpeg",
    id: "0005",
    available: "true",
    category: "shirts"
  },
  {
    name: "Stone Cold Steve Austin T Shirt",
    price: 50,
    size: "L",
    image: "photos/Shirt1.jpg",
    id: "0006",
    available: "true",
    category: "shirts"
  },
  {
    name: "Mountain Tek 80s Acrylic Sweater",
    price: 25,
    size: "L",
    image: "photos/Sweater2.jpg",
    id: "0007",
    available: "true",
    category: "sweaters"
  },
  {
    name: "Shenandoah 90s Cotton Sweater",
    price: 25,
    size: "XL",
    image: "photos/Sweater5.jpg",
    id: "0008",
    available: "true",
    category: "sweaters"
  },
  {
    name: "Varsity Shop 80s Wool Nordic Sweater",
    size: "L",
    price: 20,
    image: "photos/Sweater3.jpg",
    id: "0009",
    available: "true",
    category: "sweaters"
  },
  {
    name: "Colore Italia 90s Wool Sweater",
    price: 30,
    size: "S",
    image: "photos/Sweater1.jpeg",
    id: "00010",
    available: "true",
    category: "sweaters"
  },
  {
    name: "Sostanza Fashion Police 80s Acrylic Sweater",
    price: 25,
    size: "L",
    image: "photos/Sweater4.jpg",
    id: "00011",
    available: "true",
    category: "sweaters"
  },
  {
    name: "Scandia 90s Acrylic Sweater",
    price: 25,
    size: "M",
    image: "photos/Sweater6.jpg",
    id: "00012",
    available: "true",
    category: "sweaters"
  },
  {
    name: "Dickies Eisenhower Workwear Jacket",
    price: 35,
    size: "L",
    image: "photos/Jacket4.jpg",
    id: "0013",
    available: "false",
    category: "jackets"
  },
  {
    name: "Platinum Fubu Fat Albert Denim Jacket",
    price: 85,
    size: "2XL",
    image: "photos/Jacket2.jpg",
    id: "0014",
    available: "true",
    category: "jackets"
  },
  {
    name: "Carhartt Hooded Camo Workwear Jacket",
    size: "2XL",
    price: 120,
    image: "photos/Jacket1.jpeg",
    id: "0015",
    available: "false",
    category: "jackets"
  },
  {
    name: "Gap Denim Jacket",
    price: 25,
    size: "M",
    image: "photos/Jacket5.jpg",
    id: "0016",
    available: "true",
    category: "jackets"
  },
  {
    name: "Trebark 80s Camo Chore Jacket",
    price: 45,
    size: "XL",
    image: "photos/Jacket3.jpg",
    id: "0017",
    available: "false",
    category: "jackets"
  },
  {
    name: "Top Heavy 00s Hoodie",
    price: 80,
    size: "XL",
    image: "photos/Hoodie3.jpg",
    id: "0019",
    available: "true",
    category: "hoodies"
  },
  {
    name: "Nike 90s Bubble Logo Hoodie",
    price: 70,
    size: "M",
    image: "photos/Hoodie1.jpeg",
    id: "0020",
    available: "true",
    category: "hoodies"
  },
  {
    name: "University of Florida Gators Hoodie",
    size: "M",
    price: 20,
    image: "photos/Hoodie5.jpg",
    id: "0021",
    available: "false",
    category: "hoodies"
  },
  {
    name: "Purdue University Hoodie",
    price: 30,
    size: "L",
    image: "photos/Hoodie2.jpg",
    id: "0022",
    available: "false",
    category: "hoodies"
  },
  {
    name: "Billabong 00s Embroidered Hoodie",
    price: 35,
    size: "S",
    image: "photos/Hoodie4.jpg",
    id: "0023",
    available: "true",
    category: "hoodies"
  },
  {
    name: "American Eagle Hoodie",
    price: 20,
    size: "M",
    image: "photos/Hoodie6.jpg",
    id: "0024",
    available: "true",
    category: "hoodies"
  },
  {
    name: "Levis Dry Goods 90s Pants",
    price: 40,
    size: "34x34",
    image: "photos/Pants5.jpg",
    id: "0025",
    available: "true",
    category: "pants"
  },
  {
    name: "Marithe Francois Girbaud 90s Jeans",
    price: 35,
    size: "34x32",
    image: "photos/Pants3.jpg",
    id: "0026",
    available: "true",
    category: "pants"
  },
  {
    name: "No Boundaries 00s Double Knee Pants",
    size: "34x31",
    price: 30,
    image: "photos/Pants4.jpg",
    id: "0027",
    available: "false",
    category: "pants"
  },
  {
    name: "Carhartt Double Knee Pants",
    price: 30,
    size: "XL",
    image: "photos/Pants6.jpg",
    id: "0028",
    available: "true",
    category: "pants"
  },
  {
    name: "Southpole 00s Red Tab Jeans",
    price: 35,
    size: "36x32",
    image: "photos/Pants1.jpeg",
    id: "0029",
    available: "true",
    category: "pants"
  },
  {
    name: "Dickies Canvas Carpenter Pants",
    price: 25,
    size: "34x32",
    image: "photos/Pants2.jpg",
    id: "0030",
    available: "false",
    category: "pants"
  },
  {
    name: "Marithe Francois Girbaud Jorts",
    size: "34",
    price: 30,
    image: "photos/Shorts3.jpg",
    id: "0033",
    available: "false",
    category: "shorts"
  },
  {
    name: "Southpole Patchwork Jorts",
    price: 25,
    size: "36",
    image: "photos/Shorts2.jpg",
    id: "0031",
    available: "true",
    category: "shorts"
  },
  {
    name: "Wrangler Riggs Cargo Shorts ",
    price: 15,
    size: "34",
    image: "photos/Shorts5.jpg",
    id: "0032",
    available: "true",
    category: "shorts"
  },
  {
    name: "JLT Denim Houston Jorts",
    price: 25,
    size: "40",
    image: "photos/Shorts1.jpg",
    id: "0034",
    available: "true",
    category: "shorts"
  },
  {
    name: "Dtek Jeans Jorts",
    price: 25,
    size: "42",
    image: "photos/Shorts6.jpg",
    id: "0036",
    available: "false",
    category: "shorts"
  },
  {
    name: "Quicksilver Denim Embroidered Jorts",
    price: 35,
    size: "32",
    image: "photos/Shorts4.jpg",
    id: "0035",
    available: "true",
    category: "shorts"
  }
]