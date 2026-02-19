import { useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../api";
import { useToast } from "../context/ToastContext";

export default function Footer() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Newsletter Subscriber",
          email: email,
          phone: null,
          message: `Newsletter subscription request from ${email}`,
        }),
      });

      if (res.ok) {
        toast.success("Thank you for subscribing! We'll keep you updated.");
        setEmail("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to subscribe. Please try again.");
      }
    } catch {
      toast.error("Error subscribing. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const linkMap = {
    "Home": "/",
    "About Us": "/gift-boxes",
    "Contact": "/blog",
    "Shop": "/categories",
    "New Arrivals": "/organic",
  };

    return (
    <footer className="mt-20 bg-design-secondary border-t border-design">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Brand Section - Left Side */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <img
              src="/logo.png"
              alt="SK Fruits — FreshFruit"
              className="h-12 w-auto"
            />
            <div className="flex flex-col">
              <h3 className="font-display text-sm font-extrabold tracking-wide mb-1 text-design-foreground">
                SK Fruits
              </h3>
              <p className="text-xs text-design-muted mb-1">FreshFruit</p>
              {/* Instagram Link */}
              <a
                href="https://www.instagram.com/giftchoicebhl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm transition-all duration-300 hover:translate-x-1 text-design-foreground hover:opacity-80"
              >
                @giftchoicebhl
              </a>
            </div>
          </div>
        </div>

        {/* 2-Column Grid - Works on Mobile Too */}
        <div className="grid grid-cols-2 gap-6 md:gap-12 mb-6">

          {/* Quick Links - Left Side */}
          <div>
            <h4 className="font-display font-bold mb-4 text-lg text-design-foreground">Quick Links</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(linkMap).map(([label, path]) => (
                <Link
                  key={label}
                  to={path}
                  className="block transition-all duration-300 hover:translate-x-1 text-design-foreground hover:opacity-80"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect With Us - Right Side */}
          <div>
            <h4 className="font-display font-bold mb-4 text-lg text-design-foreground">Connect With Us</h4>

            <div className="space-y-2 text-sm text-design-foreground">
              <p className="flex items-start gap-2">
                <span className="mt-0.5">📍</span>
                <span>Sewa Sadan Rd, near Sitaram Ji Ki Bawri, Bhopal Ganj, Bhilwara, Rajasthan 311001</span>
              </p>
              <p className="flex items-center gap-2">
                <span>📱</span>
                <a 
                  href="tel:+917976948872" 
                  className="hover:underline transition-all duration-300 text-design-foreground hover:opacity-80"
                >
                  79769 48872
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span>📧</span>
                <a 
                  href="mailto:yashj.6628@gmail.com" 
                  className="hover:underline transition-all duration-300 text-design-foreground hover:opacity-80"
                >
                  yashj.6628@gmail.com
                </a>
              </p>
            </div>

            {/* Social Icons */}
            
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-design pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-design-foreground">
            © {new Date().getFullYear()} SK Fruits (FreshFruit). All rights reserved.
          </p>

          <div className="flex items-center gap-2 text-sm text-design-foreground">
            <span>Powered by</span>
            <a
              href="https://www.instagram.com/qyverra.it?igsh=MTV5a2pzdGNxNjIzdg=="
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition-all duration-300 hover:underline hover:opacity-80"
            >
              Qyverra
            </a>
          </div>
        </div>

      </div>
      </footer>
    );
  }
  