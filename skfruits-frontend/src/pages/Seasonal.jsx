import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API } from "../api";
import GiftBoxLoader from "../components/GiftBoxLoader";
import { useProductLoader } from "../hooks/useProductLoader";

export default function Seasonal() {
  const { slug } = useParams();
  const [seasonals, setSeasonals] = useState([]);
  const [selectedSeasonal, setSelectedSeasonal] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showLoader } = useProductLoader(loading);

  useEffect(() => {
    let isMounted = true;
    if (slug) {
      fetch(`${API}/seasonal/${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) setSelectedSeasonal(data);
        })
        .catch(() => {
          if (isMounted) setSelectedSeasonal(null);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      fetch(`${API}/seasonal`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) setSeasonals(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (isMounted) setSeasonals([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <GiftBoxLoader isLoading={loading} showLoader={showLoader} />
    );
  }

  // Single seasonal detail (when slug is present)
  if (slug && selectedSeasonal) {
    return (
      <div className="min-h-screen py-16 bg-page-products">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: "var(--background)" }}>
            {selectedSeasonal.imageUrl && (
              <div className="aspect-video w-full">
                <img src={selectedSeasonal.imageUrl} alt={selectedSeasonal.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4 text-design-foreground">
                {selectedSeasonal.name}
              </h1>
              {selectedSeasonal.description && (
                <p className="text-lg whitespace-pre-wrap" style={{ color: "var(--muted)" }}>
                  {selectedSeasonal.description}
                </p>
              )}
              <Link
                to="/seasonal"
                className="inline-block mt-6 px-4 py-2 rounded-lg font-semibold transition-all btn-primary-brand"
              >
                ← Back to Seasonal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slug && !selectedSeasonal) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="text-center">
          <p className="text-lg" style={{ color: "var(--muted)" }}>Seasonal item not found.</p>
          <Link to="/seasonal" className="mt-4 inline-block text-[var(--primary)] font-semibold hover:underline">Back to Seasonal</Link>
        </div>
      </div>
    );
  }

  // List all seasonals
  return (
    <div className="min-h-screen py-16 bg-page-products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-4 text-white drop-shadow-sm">Seasonal</h1>
          <p className="text-lg text-white/90">Fresh picks for the season</p>
        </div>

        {seasonals.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: "var(--background)" }}>
            <p className="text-lg" style={{ color: "var(--muted)" }}>No seasonal items at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasonals.map((item) => (
              <Link
                key={item.id}
                to={item.slug ? `/seasonal/${item.slug}` : "/seasonal"}
                className="rounded-xl overflow-hidden shadow-md transition-all hover:shadow-lg hover:scale-[1.02] flex flex-col"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div className="aspect-[4/3] bg-design-secondary flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src="/logo.png" alt="SK Fruits" className="w-16 h-16 object-contain opacity-50" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                    {item.name}
                  </h2>
                  {item.description && (
                    <p className="text-sm line-clamp-2 flex-1" style={{ color: "var(--muted)" }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
