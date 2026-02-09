export default function About() {
    return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-white via-white to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6" style={{ color: 'oklch(20% .02 340)' }}>
              Leading Gift Distribution Partner
            </h1>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
              With years of experience in gift distribution, we connect customers with premium branded products, 
              ensuring quality, authenticity, and competitive pricing for every special occasion.
            </p>
          </div>
        </div>
      </div>

      {/* Leadership Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Leadership</h2>
          <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
            Meet Our Director
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
          <p className="text-lg mb-6 leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
            Under visionary leadership, GiftChoice has grown from a small gift shop to one of the most trusted names 
            in gift distribution. Our director brings decades of experience in the gift business and maintains strong 
            relationships with manufacturers worldwide.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
              <div className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>20+</div>
              <div className="text-sm" style={{ color: 'oklch(60% .02 340)' }}>years in gift distribution</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
              <div className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>150+</div>
              <div className="text-sm" style={{ color: 'oklch(60% .02 340)' }}>Direct partnerships with factories</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
              <div className="text-3xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>100%</div>
              <div className="text-sm" style={{ color: 'oklch(60% .02 340)' }}>Committed to quality</div>
            </div>
          </div>

          <div className="text-center p-8 rounded-xl" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>FOUNDER & MANAGING DIRECTOR</h3>
            <p className="text-lg italic mb-4" style={{ color: 'oklch(60% .02 340)' }}>
              "Our mission is to bridge the gap between manufacturers and customers, providing authentic products 
              at unbeatable prices for every special moment."
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="bg-gradient-to-br from-pink-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-3xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Our Mission</h3>
              <p className="text-lg leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                To provide customers with direct access to premium branded products at competitive prices, 
                eliminating middlemen and ensuring maximum value. We strive to build long-term relationships 
                based on trust, quality, and competitive pricing for every special occasion.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-3xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Our Vision</h3>
              <p className="text-lg leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                To become the leading gift distribution platform, connecting thousands of customers with 
                authentic branded products. We envision a future where every customer, regardless of occasion, 
                has access to premium products at factory-direct prices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Our Achievements</h2>
          <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
            Numbers that reflect our commitment to excellence and customer satisfaction
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
            <div className="text-5xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>500+</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'oklch(20% .02 340)' }}>Brand Partners</div>
            <div className="text-xs" style={{ color: 'oklch(60% .02 340)' }}>Premium brands worldwide</div>
          </div>
          <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
            <div className="text-5xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>10K+</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'oklch(20% .02 340)' }}>Orders Fulfilled</div>
            <div className="text-xs" style={{ color: 'oklch(60% .02 340)' }}>Successful deliveries</div>
          </div>
          <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
            <div className="text-5xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>150+</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'oklch(20% .02 340)' }}>Factory Partners</div>
            <div className="text-xs" style={{ color: 'oklch(60% .02 340)' }}>Direct manufacturing sources</div>
          </div>
          <div className="text-center p-6 rounded-xl shadow-md" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
            <div className="text-5xl font-bold mb-2" style={{ color: 'oklch(20% .02 340)' }}>98%</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'oklch(20% .02 340)' }}>Client Satisfaction</div>
            <div className="text-xs" style={{ color: 'oklch(60% .02 340)' }}>Happy customers</div>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div className="bg-gradient-to-br from-pink-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Our Core Values</h2>
            <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
              The principles that guide our business and define our commitment to customers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>Quality Assurance</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                Every product undergoes strict quality checks before reaching our customers
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>Competitive Pricing</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                Direct factory partnerships ensure the best prices in the market
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                <svg className="w-8 h-8" style={{ color: 'oklch(40% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>Customer First</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                Dedicated support team to help you with all your gift requirements
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'oklch(92% .04 340)' }}>
                <svg className="w-8 h-8" style={{ color: 'oklch(40% .02 340)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: 'oklch(20% .02 340)' }}>Trusted Partner</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
                Years of experience in gift business with proven track record
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Why Choose GiftChoice</h2>
          <p className="text-lg" style={{ color: 'oklch(60% .02 340)' }}>
            We offer unique advantages that set us apart in the gift distribution industry
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Direct Factory Connections</h3>
            <p className="leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
              We work directly with manufacturers, eliminating middlemen and ensuring authentic products at the best prices.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Quality Guarantee</h3>
            <p className="leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
              Every product undergoes strict quality checks and comes with authenticity guarantee from our trusted partners.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'oklch(20% .02 340)' }}>Dedicated Support</h3>
            <p className="leading-relaxed" style={{ color: 'oklch(60% .02 340)' }}>
              Our experienced team provides personalized support to help you find the right products for every occasion.
            </p>
          </div>
        </div>
      </div>
      </div>
    );
  }
  