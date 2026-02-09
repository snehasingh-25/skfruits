import { useEffect, useState } from "react";
import { API } from "../api";

export default function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      {categories.map(cat => (
        <div
          key={cat.id}
          className="bg-white p-4 rounded shadow text-center font-medium hover:bg-purple-50"
        >
          {cat.name}
        </div>
      ))}
    </div>
  );
}
