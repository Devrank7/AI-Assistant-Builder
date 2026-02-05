'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface HotelTemplateProps {
  scriptUrl: string;
}

export default function HotelTemplate({ scriptUrl }: HotelTemplateProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  useEffect(() => {
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [scriptUrl]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <span className="text-sm font-medium">Demo Mode</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">✦</span>
              <span className="text-2xl font-serif text-white tracking-widest">LUMIÈRE</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#rooms" className="text-white/80 hover:text-white transition-colors text-sm tracking-wider">ROOMS</a>
              <a href="#dining" className="text-white/80 hover:text-white transition-colors text-sm tracking-wider">DINING</a>
              <a href="#spa" className="text-white/80 hover:text-white transition-colors text-sm tracking-wider">SPA</a>
              <a href="#experiences" className="text-white/80 hover:text-white transition-colors text-sm tracking-wider">EXPERIENCES</a>
              <button className="bg-white/10 backdrop-blur-sm text-white px-6 py-2.5 rounded-full font-medium hover:bg-white hover:text-black transition-all text-sm tracking-wider">
                BOOK NOW
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80"
            alt="Luxury Hotel"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <p className="text-white/70 text-sm tracking-[0.3em] mb-6 uppercase">Welcome to Paradise</p>
          <h1 className="text-5xl lg:text-8xl font-serif text-white mb-6 leading-tight">
            Experience
            <br />
            <span className="italic">Timeless Luxury</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-12">
            Where every moment is crafted to perfection. Discover a sanctuary of elegance,
            comfort, and unparalleled hospitality.
          </p>
          <button className="bg-white text-black px-10 py-4 rounded-full font-medium hover:bg-opacity-90 transition-all text-sm tracking-wider">
            EXPLORE OUR ROOMS
          </button>
        </div>

        {/* Booking Widget */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-5xl mx-auto px-6 transform translate-y-1/2">
            <div className="bg-white rounded-2xl shadow-2xl p-6 grid md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Check In</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full mt-1 text-lg font-medium border-0 focus:ring-0 p-0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Check Out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full mt-1 text-lg font-medium border-0 focus:ring-0 p-0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Guests</label>
                <select className="w-full mt-1 text-lg font-medium border-0 focus:ring-0 p-0 bg-transparent">
                  <option>2 Adults</option>
                  <option>1 Adult</option>
                  <option>3 Adults</option>
                  <option>4 Adults</option>
                </select>
              </div>
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-xl hover:shadow-purple-500/30 transition-all">
                Check Availability
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 bg-[#faf9f6]">
        <div className="max-w-7xl mx-auto px-6 pt-16">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: '🛏️', title: '150 Luxury Suites', desc: 'Elegantly designed rooms with breathtaking views' },
              { icon: '🍽️', title: 'Fine Dining', desc: '3 Michelin-starred restaurants and rooftop bar' },
              { icon: '💆', title: 'World-Class Spa', desc: 'Rejuvenate with our signature treatments' },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <span className="text-5xl mb-4 block">{feature.icon}</span>
                <h3 className="text-2xl font-serif text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-purple-600 text-sm tracking-[0.3em] uppercase mb-4">Accommodations</p>
            <h2 className="text-4xl lg:text-5xl font-serif text-gray-900">
              Exquisite Rooms & Suites
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Deluxe Room', price: '$350', img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80', size: '45m²' },
              { name: 'Premium Suite', price: '$550', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80', size: '75m²' },
              { name: 'Royal Penthouse', price: '$1,200', img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80', size: '150m²' },
            ].map((room, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative h-80 rounded-2xl overflow-hidden mb-4">
                  <Image
                    src={room.img}
                    alt={room.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-full bg-white text-black py-3 rounded-lg font-medium">
                      View Details
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-serif text-gray-900">{room.name}</h3>
                    <p className="text-gray-500">{room.size}</p>
                  </div>
                  <p className="text-xl font-medium text-purple-600">{room.price}<span className="text-sm text-gray-400">/night</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experiences Section */}
      <section id="experiences" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-purple-400 text-sm tracking-[0.3em] uppercase mb-4">Unforgettable</p>
              <h2 className="text-4xl lg:text-5xl font-serif text-white mb-6">
                Curated Experiences
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                From private yacht excursions to exclusive wine tastings, our concierge team crafts
                bespoke experiences that create lasting memories.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Private Beach Access', desc: 'Exclusive beachfront cabanas' },
                  { title: 'Helicopter Tours', desc: 'Aerial views of the coastline' },
                  { title: 'Personal Butler', desc: '24/7 dedicated service' },
                  { title: 'Gourmet Experiences', desc: 'Chef\'s table dining' },
                ].map((exp, i) => (
                  <div key={i} className="flex items-start gap-4 group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{exp.title}</h3>
                      <p className="text-gray-500">{exp.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative h-[600px] rounded-3xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80"
                  alt="Hotel Experience"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
                <p className="text-4xl font-serif mb-1">4.9</p>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-yellow-300">★</span>
                  ))}
                </div>
                <p className="text-sm text-white/80">2,500+ Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#faf9f6]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-purple-600 text-sm tracking-[0.3em] uppercase mb-4">Testimonials</p>
          <h2 className="text-4xl lg:text-5xl font-serif text-gray-900 mb-12">
            What Our Guests Say
          </h2>
          <div className="relative">
            <svg className="w-16 h-16 text-purple-200 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <blockquote className="text-2xl lg:text-3xl font-serif text-gray-700 italic mb-8 leading-relaxed">
              &quot;An absolutely magical experience. The attention to detail, the impeccable service,
              and the stunning views made our anniversary unforgettable. We will definitely be returning.&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"
                  alt="Guest"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Elizabeth Carter</p>
                <p className="text-gray-500 text-sm">New York, USA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80"
            alt="Hotel Pool"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-purple-900/80" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-purple-300 text-sm tracking-[0.3em] uppercase mb-4">Special Offer</p>
          <h2 className="text-4xl lg:text-6xl font-serif text-white mb-6">
            Book Direct & Save 20%
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Plus complimentary breakfast and spa credit when you book directly with us.
          </p>
          <button className="bg-white text-purple-900 px-10 py-4 rounded-full font-medium hover:bg-opacity-90 transition-all text-sm tracking-wider">
            RESERVE YOUR STAY
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] text-white py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✦</span>
                <span className="text-xl font-serif tracking-widest">LUMIÈRE</span>
              </div>
              <p className="text-gray-500">Where luxury meets tranquility.</p>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm tracking-wider">EXPLORE</h4>
              <ul className="space-y-2 text-gray-500">
                <li><a href="#" className="hover:text-purple-400 transition-colors">Rooms & Suites</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Dining</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Spa & Wellness</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Events</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm tracking-wider">CONTACT</h4>
              <ul className="space-y-2 text-gray-500">
                <li>1 Paradise Bay Drive</li>
                <li>Maldives, 20026</li>
                <li>+960 123 4567</li>
                <li>reservations@lumiere.com</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm tracking-wider">NEWSLETTER</h4>
              <p className="text-gray-500 mb-4">Subscribe for exclusive offers</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="bg-white/10 border-0 rounded-l-lg px-4 py-2 text-white placeholder-gray-500 focus:ring-0 flex-1"
                />
                <button className="bg-purple-600 px-4 rounded-r-lg hover:bg-purple-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">&copy; 2024 Lumière Hotel & Resort. All rights reserved.</p>
            <div className="flex gap-4">
              {['instagram', 'facebook', 'twitter', 'pinterest'].map((social) => (
                <a key={social} href="#" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-purple-500 hover:text-purple-400 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
