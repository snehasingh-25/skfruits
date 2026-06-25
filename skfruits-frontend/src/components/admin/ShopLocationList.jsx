export default function ShopLocationList({ locations, onEdit, onDelete }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card-white)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: "var(--muted)" }}>
            <tr>
              <th
                className="px-4 py-3 text-left font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Shop Name
              </th>
              <th
                className="px-4 py-3 text-left font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Location
              </th>
              <th
                className="px-4 py-3 text-left font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Service Radius
              </th>
              <th
                className="px-4 py-3 text-left font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Processing Time
              </th>
              <th
                className="px-4 py-3 text-left font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Status
              </th>
              <th
                className="px-4 py-3 text-left font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr
                key={location.id}
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <td className="px-4 py-3 font-medium">{location.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </td>
                <td className="px-4 py-3">{location.serviceRadiusKm || 10} km</td>
                <td className="px-4 py-3">{location.processingTimeMinutes || 10} min</td>
                <td className="px-4 py-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: location.isActive ? "var(--primary)" : "var(--secondary)",
                      color: location.isActive
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    }}
                  >
                    {location.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(location)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(location.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{
                        backgroundColor: "var(--destructive)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
