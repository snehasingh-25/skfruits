export default function FloatingActionStack({ children }) {
  return (
    <div className="fab-stack" role="group" aria-label="Support actions">
      {children}
    </div>
  );
}
