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
      script.src = `${scriptUrl}?v=${Date.now()}`;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        document.querySelectorAll('[data-aw]').forEach((el) => el.remove());
        (window as unknown as Record<string, unknown>).__WIDGET_CSS__ = undefined;
        (window as unknown as Record<string, unknown>).__WIDGET_CONFIG__ = undefined;
      };
    }
  }, [scriptUrl]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2 text-white shadow-lg">
        <span className="text-sm font-medium">Demo Mode</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 right-0 left-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">✦</span>
              <span className="font-serif text-2xl tracking-widest text-white">LUMIÈRE</span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#rooms" className="text-sm tracking-wider text-white/80 transition-colors hover:text-white">
                ROOMS
              </a>
              <a href="#dining" className="text-sm tracking-wider text-white/80 transition-colors hover:text-white">
                DINING
              </a>
              <a href="#spa" className="text-sm tracking-wider text-white/80 transition-colors hover:text-white">
                SPA
              </a>
              <a
                href="#experiences"
                className="text-sm tracking-wider text-white/80 transition-colors hover:text-white"
              >
                EXPERIENCES
              </a>
              <button className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium tracking-wider text-white backdrop-blur-sm transition-all hover:bg-white hover:text-black">
                BOOK NOW
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center">
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

        <div className="relative mx-auto max-w-7xl px-6 py-32 text-center">
          <p className="mb-6 text-sm tracking-[0.3em] text-white/70 uppercase">Welcome to Paradise</p>
          <h1 className="mb-6 font-serif text-5xl leading-tight text-white lg:text-8xl">
            Experience
            <br />
            <span className="italic">Timeless Luxury</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl text-white/80">
            Where every moment is crafted to perfection. Discover a sanctuary of elegance, comfort, and unparalleled
            hospitality.
          </p>
          <button className="hover:bg-opacity-90 rounded-full bg-white px-10 py-4 text-sm font-medium tracking-wider text-black transition-all">
            EXPLORE OUR ROOMS
          </button>
        </div>

        {/* Booking Widget */}
        <div className="absolute right-0 bottom-0 left-0">
          <div className="mx-auto max-w-5xl translate-y-1/2 transform px-6">
            <div className="grid gap-4 rounded-2xl bg-white p-6 shadow-2xl md:grid-cols-4">
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">Check In</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1 w-full border-0 p-0 text-lg font-medium focus:ring-0"
                />
              </div>
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">Check Out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1 w-full border-0 p-0 text-lg font-medium focus:ring-0"
                />
              </div>
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">Guests</label>
                <select className="mt-1 w-full border-0 bg-transparent p-0 text-lg font-medium focus:ring-0">
                  <option>2 Adults</option>
                  <option>1 Adult</option>
                  <option>3 Adults</option>
                  <option>4 Adults</option>
                </select>
              </div>
              <button className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-medium text-white transition-all hover:shadow-xl hover:shadow-purple-500/30">
                Check Availability
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#faf9f6] py-32">
        <div className="mx-auto max-w-7xl px-6 pt-16">
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { icon: '🛏️', title: '150 Luxury Suites', desc: 'Elegantly designed rooms with breathtaking views' },
              { icon: '🍽️', title: 'Fine Dining', desc: '3 Michelin-starred restaurants and rooftop bar' },
              { icon: '💆', title: 'World-Class Spa', desc: 'Rejuvenate with our signature treatments' },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <span className="mb-4 block text-5xl">{feature.icon}</span>
                <h3 className="mb-2 font-serif text-2xl text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm tracking-[0.3em] text-purple-600 uppercase">Accommodations</p>
            <h2 className="font-serif text-4xl text-gray-900 lg:text-5xl">Exquisite Rooms & Suites</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                name: 'Deluxe Room',
                price: '$350',
                img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
                size: '45m²',
              },
              {
                name: 'Premium Suite',
                price: '$550',
                img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
                size: '75m²',
              },
              {
                name: 'Royal Penthouse',
                price: '$1,200',
                img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
                size: '150m²',
              },
            ].map((room, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative mb-4 h-80 overflow-hidden rounded-2xl">
                  <Image
                    src={room.img}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute right-4 bottom-4 left-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="w-full rounded-lg bg-white py-3 font-medium text-black">View Details</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl text-gray-900">{room.name}</h3>
                    <p className="text-gray-500">{room.size}</p>
                  </div>
                  <p className="text-xl font-medium text-purple-600">
                    {room.price}
                    <span className="text-sm text-gray-400">/night</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experiences Section */}
      <section id="experiences" className="bg-[#0a0a0a] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm tracking-[0.3em] text-purple-400 uppercase">Unforgettable</p>
              <h2 className="mb-6 font-serif text-4xl text-white lg:text-5xl">Curated Experiences</h2>
              <p className="mb-8 text-lg leading-relaxed text-gray-400">
                From private yacht excursions to exclusive wine tastings, our concierge team crafts bespoke experiences
                that create lasting memories.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Private Beach Access', desc: 'Exclusive beachfront cabanas' },
                  { title: 'Helicopter Tours', desc: 'Aerial views of the coastline' },
                  { title: 'Personal Butler', desc: '24/7 dedicated service' },
                  { title: 'Gourmet Experiences', desc: "Chef's table dining" },
                ].map((exp, i) => (
                  <div key={i} className="group flex cursor-pointer items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
                      <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{exp.title}</h3>
                      <p className="text-gray-500">{exp.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative h-[600px] overflow-hidden rounded-3xl">
                <Image
                  src="https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80"
                  alt="Hotel Experience"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                <p className="mb-1 font-serif text-4xl">4.9</p>
                <div className="mb-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-yellow-300">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-white/80">2,500+ Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#faf9f6] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-4 text-sm tracking-[0.3em] text-purple-600 uppercase">Testimonials</p>
          <h2 className="mb-12 font-serif text-4xl text-gray-900 lg:text-5xl">What Our Guests Say</h2>
          <div className="relative">
            <svg className="mx-auto mb-8 h-16 w-16 text-purple-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="mb-8 font-serif text-2xl leading-relaxed text-gray-700 italic lg:text-3xl">
              &quot;An absolutely magical experience. The attention to detail, the impeccable service, and the stunning
              views made our anniversary unforgettable. We will definitely be returning.&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full bg-gray-200">
                <Image
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"
                  alt="Guest"
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Elizabeth Carter</p>
                <p className="text-sm text-gray-500">New York, USA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80"
            alt="Hotel Pool"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-purple-900/80" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-4 text-sm tracking-[0.3em] text-purple-300 uppercase">Special Offer</p>
          <h2 className="mb-6 font-serif text-4xl text-white lg:text-6xl">Book Direct & Save 20%</h2>
          <p className="mb-8 text-xl text-white/80">
            Plus complimentary breakfast and spa credit when you book directly with us.
          </p>
          <button className="hover:bg-opacity-90 rounded-full bg-white px-10 py-4 text-sm font-medium tracking-wider text-purple-900 transition-all">
            RESERVE YOUR STAY
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0a] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">✦</span>
                <span className="font-serif text-xl tracking-widest">LUMIÈRE</span>
              </div>
              <p className="text-gray-500">Where luxury meets tranquility.</p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-medium tracking-wider">EXPLORE</h4>
              <ul className="space-y-2 text-gray-500">
                <li>
                  <a href="#" className="transition-colors hover:text-purple-400">
                    Rooms & Suites
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-purple-400">
                    Dining
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-purple-400">
                    Spa & Wellness
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-purple-400">
                    Events
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-medium tracking-wider">CONTACT</h4>
              <ul className="space-y-2 text-gray-500">
                <li>1 Paradise Bay Drive</li>
                <li>Maldives, 20026</li>
                <li>+960 123 4567</li>
                <li>reservations@lumiere.com</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-medium tracking-wider">NEWSLETTER</h4>
              <p className="mb-4 text-gray-500">Subscribe for exclusive offers</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 rounded-l-lg border-0 bg-white/10 px-4 py-2 text-white placeholder-gray-500 focus:ring-0"
                />
                <button className="rounded-r-lg bg-purple-600 px-4 transition-colors hover:bg-purple-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
            <p className="text-sm text-gray-500">&copy; 2024 Lumière Hotel & Resort. All rights reserved.</p>
            <div className="flex gap-4">
              {['instagram', 'facebook', 'twitter', 'pinterest'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition-colors hover:border-purple-500 hover:text-purple-400"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
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
