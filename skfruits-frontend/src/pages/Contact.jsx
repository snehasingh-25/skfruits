import { useState } from "react";
import { API } from "../api";
import { useToast } from "../context/ToastContext";

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    company: "", 
    message: "" 
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
        }),
      });
      
      if (response.ok) {
        toast.success("Message sent");
        setForm({ name: "", email: "", phone: "", company: "", message: "" });
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } catch (error) {
      toast.error("Error sending message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-white via-white to-pink-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
              Contact Us
            </h1>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
              Ready to find the perfect gift? Get in touch with our team for product inquiries, 
              custom orders, or partnership opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-3xl font-bold mb-6" style={{ color: 'oklch(20% .02 340)' }}>
              Send us a Message
            </h2>
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                  Full Name *
                </label>
      <input
                  className="w-full border-2 rounded-lg p-4 focus:outline-none transition-all duration-300"
                  style={{
                    borderColor: 'oklch(92% .04 340)',
                    backgroundColor: 'white',
                    color: 'oklch(20% .02 340)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  placeholder="Enter your full name"
                  value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
                  required
      />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                  Email Address *
                </label>
      <input
                  type="email"
                  className="w-full border-2 rounded-lg p-4 focus:outline-none transition-all duration-300"
                  style={{
                    borderColor: 'oklch(92% .04 340)',
                    backgroundColor: 'white',
                    color: 'oklch(20% .02 340)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  placeholder="Enter your email address"
                  value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className="w-full border-2 rounded-lg p-4 focus:outline-none transition-all duration-300"
                  style={{
                    borderColor: 'oklch(92% .04 340)',
                    backgroundColor: 'white',
                    color: 'oklch(20% .02 340)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                  Company Name
                </label>
                <input
                  className="w-full border-2 rounded-lg p-4 focus:outline-none transition-all duration-300"
                  style={{
                    borderColor: 'oklch(92% .04 340)',
                    backgroundColor: 'white',
                    color: 'oklch(20% .02 340)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  placeholder="Enter your company name (optional)"
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'oklch(20% .02 340)' }}>
                  Message *
                </label>
      <textarea
                  className="w-full border-2 rounded-lg p-4 focus:outline-none transition-all duration-300 resize-none"
                  style={{
                    borderColor: 'oklch(92% .04 340)',
                    backgroundColor: 'white',
                    color: 'oklch(20% .02 340)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'oklch(88% .06 340)'}
                  onBlur={(e) => e.target.style.borderColor = 'oklch(92% .04 340)'}
                  placeholder="Enter your message"
                  rows="6"
                  maxLength={500}
                  value={form.message}
        onChange={e => setForm({ ...form, message: e.target.value })}
                  required
      />
                <p className="text-xs mt-1 text-right" style={{ color: 'oklch(60% .02 340)' }}>
                  {form.message.length}/500 characters
                </p>
              </div>

      <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'oklch(92% .04 340)',
                  color: 'oklch(20% .02 340)'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.target.style.backgroundColor = 'oklch(88% .06 340)';
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.target.style.backgroundColor = 'oklch(92% .04 340)';
                }}
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
                Our Address
              </h3>
              <p className="text-lg leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                Sewa Sadan Rd, near Sitaram Ji Ki Bawri,<br />
                Bhopal Ganj, Bhilwara,<br />
                Rajasthan 311001
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
                Phone Numbers
              </h3>
              <div className="space-y-2">
                <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
                  <span className="font-semibold" style={{ color: 'oklch(20% .02 340)' }}>Yash Jhanwar:</span> +91 79769 48872
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
                Email Address
              </h3>
              <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
                yashj.6628@gmail.com
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
                Business Hours
              </h3>
              <div className="space-y-1" style={{ color: 'oklch(60% .02 340)' }}>
                <p className="text-lg">Monday - Saturday: 9:00 AM - 7:00 PM</p>
                <p className="text-lg">Sunday: 10:00 AM - 5:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
            Find Us on Map
          </h2>
          <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
            Visit our office for direct consultations and to see our product samples
          </p>
        </div>
        <div className="bg-gray-200 rounded-xl overflow-hidden" style={{ height: '400px' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3609.1234567890!2d74.6375!3d25.3444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDIwJzM5LjgiTiA3NMKwMzgnMTUuMCJF!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="GiftChoice Location"
          ></iframe>
        </div>
      </div>

      {/* Quick Contact Options */}
      <div className="bg-gradient-to-br from-pink-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>
              Quick Contact Options
            </h2>
            <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
              Choose the most convenient way to reach us for immediate assistance
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="tel:+917976948872"
              className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 group"
            >
              <div className="text-5xl mb-4">📞</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>
                Call Us Now
              </h3>
              <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                Speak directly with our sales team for immediate assistance
              </p>
              <button
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                style={{ 
                  backgroundColor: 'oklch(92% .04 340)',
                  color: 'oklch(20% .02 340)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'oklch(88% .06 340)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'oklch(92% .04 340)'}
              >
                Call Now
              </button>
            </a>

            <a
              href="mailto:yashj.6628@gmail.com"
              className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 group"
            >
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>
                Email Us
              </h3>
              <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                Send detailed inquiries and get comprehensive responses
              </p>
              <button
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                style={{ 
                  backgroundColor: 'oklch(92% .04 340)',
                  color: 'oklch(20% .02 340)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'oklch(88% .06 340)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'oklch(92% .04 340)'}
              >
                Send Email
              </button>
            </a>

            <a
              href="https://maps.google.com/?q=Sewa+Sadan+Rd+near+Sitaram+Ji+Ki+Bawri+Bhopal+Ganj+Bhilwara+Rajasthan+311001"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-all duration-300 group"
            >
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>
                Visit Our Office
              </h3>
              <p className="text-sm mb-4" style={{ color: 'oklch(60% .02 340)' }}>
                Schedule a meeting to discuss orders and partnerships
              </p>
              <button
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                style={{ 
                  backgroundColor: 'oklch(92% .04 340)',
                  color: 'oklch(20% .02 340)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'oklch(88% .06 340)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'oklch(92% .04 340)'}
              >
                Get Directions
      </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
