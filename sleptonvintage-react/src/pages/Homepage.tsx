// Homepage component - converted from homepage.html
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

interface Category {
  name: string;
  image: string;
  path: string;
}

const Homepage: React.FC = () => {
  const categories: Category[] = [
    {
      name: "Shirts",
      image: "https://ogvzymvmzhhfccgpjjaf.supabase.co/storage/v1/object/public/product-images/Shirt1.jpg",
      path: "/shirts"
    },
    {
      name: "Sweaters", 
      image: "https://ogvzymvmzhhfccgpjjaf.supabase.co/storage/v1/object/public/product-images/Sweater1.jpeg",
      path: "/sweaters"
    },
    {
      name: "Hoodies",
      image: "https://ogvzymvmzhhfccgpjjaf.supabase.co/storage/v1/object/public/product-images/Hoodie1.jpeg", 
      path: "/hoodies"
    },
    {
      name: "Jackets",
      image: "https://ogvzymvmzhhfccgpjjaf.supabase.co/storage/v1/object/public/product-images/Jacket1.jpeg",
      path: "/jackets"
    },
    {
      name: "Pants",
      image: "https://ogvzymvmzhhfccgpjjaf.supabase.co/storage/v1/object/public/product-images/Pants1.jpeg",
      path: "/pants"
    },
    {
      name: "Shorts",
      image: "https://ogvzymvmzhhfccgpjjaf.supabase.co/storage/v1/object/public/product-images/Shorts1.jpg",
      path: "/shorts"
    }
  ];

  return (
    <div>
      <Header />
      <div className="subheader">FREE SHIPPING ON ALL ORDERS</div>
      <div className="category-grid">
        {categories.map((category) => (
          <Link key={category.name} to={category.path}>
            <button className="category">
              <div className="thumbnail-row">
                <img className="thumbnail" src={category.image} alt={category.name} />
              </div>
              <div className="category-info-row">
                <div className="category-title">
                  {category.name} <i className="fa-solid fa-arrow-right"></i>
                </div>
              </div>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Homepage;
