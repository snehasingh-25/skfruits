import { useEffect, useState } from "react";
import { API } from "../api";
import GiftBoxLoader from "./GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Time-based loader for products (only shows if loading >= 1 second)
  const { showLoader: showProductLoader } = useProductLoader(loading);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <>
      {/* Gift Box Loading Animation - Only shows if product loading takes >= 1 second */}
      <GiftBoxLoader 
        isLoading={loading} 
        showLoader={showProductLoader}
      />
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {products.map(p => (
        <div key={p.id} className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="text-sm text-gray-600">{p.description}</p>

          {p.badge && (
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
              {p.badge}
            </span>
          )}

          <div className="mt-3 space-y-1">
            {p.sizes?.map(size => (
              <div key={size.id} className="flex justify-between text-sm">
                <span>{size.label}</span>
                <span className="font-medium">₹{size.price}</span>
              </div>
            ))}
          </div>

          <button
            className="mt-4 w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
            onClick={() => {
              const msg = `Product: ${p.name}`;
              window.open(
                `https://wa.me/917976948872?text=${encodeURIComponent(msg)}`
              );
            }}
          >
            Order on WhatsApp
          </button>
        </div>
      ))}
      </div>
    </>
  );
}
