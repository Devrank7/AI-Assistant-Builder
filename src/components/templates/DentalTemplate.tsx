'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface DentalTemplateProps {
  scriptUrl: string;
}

export default function DentalTemplate({ scriptUrl }: DentalTemplateProps) {
  useEffect(() => {
    if (scriptUrl) {
      const script = document.createElement('script');
      script.src = `${scriptUrl}?v=${Date.now()}`;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
        document.querySelectorAll('ai-chat-widget').forEach((el) => el.remove());
      };
    }
  }, [scriptUrl]);

  return (
    <div className="min-h-screen bg-white">
      {/* Demo Badge */}
      <div className="fixed top-4 left-4 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-white shadow-lg">
        <span className="text-sm font-medium">Demo Mode</span>
        <Link href="javascript:history.back()" className="text-white/80 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="fixed z-50 w-full bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">
                <span className="text-xl text-white">🦷</span>
              </div>
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
                SmileCare
              </span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#services" className="text-gray-600 transition-colors hover:text-cyan-600">
                Services
              </a>
              <a href="#about" className="text-gray-600 transition-colors hover:text-cyan-600">
                About
              </a>
              <a href="#team" className="text-gray-600 transition-colors hover:text-cyan-600">
                Our Team
              </a>
              <a href="#contact" className="text-gray-600 transition-colors hover:text-cyan-600">
                Contact
              </a>
              <button className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/30">
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50" />
        <div className="absolute top-20 right-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-cyan-200/30 to-blue-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-blue-200/30 to-cyan-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-medium text-cyan-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
              Award-Winning Dental Care
            </div>
            <h1 className="text-5xl leading-tight font-bold text-gray-900 lg:text-7xl">
              Your Perfect
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent"> Smile </span>
              Starts Here
            </h1>
            <p className="text-xl leading-relaxed text-gray-600">
              Experience world-class dental care with our team of expert dentists. We combine cutting-edge technology
              with compassionate care to give you the smile you deserve.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="transform rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/30">
                Schedule Visit
              </button>
              <button className="flex items-center gap-2 rounded-full border-2 border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:border-cyan-500">
                <svg className="h-6 w-6 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Video
              </button>
            </div>
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">15K+</p>
                <p className="text-gray-500">Happy Patients</p>
              </div>
              <div className="h-12 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">20+</p>
                <p className="text-gray-500">Years Experience</p>
              </div>
              <div className="h-12 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">50+</p>
                <p className="text-gray-500">Expert Dentists</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="relative h-[500px] w-full overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80"
                alt="Dental Care"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 flex animate-bounce items-center gap-3 rounded-2xl bg-white p-4 shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">100% Safe</p>
                <p className="text-sm text-gray-500">Sterilized Equipment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="font-semibold text-cyan-600">OUR SERVICES</span>
            <h2 className="mt-3 text-4xl font-bold text-gray-900 lg:text-5xl">Comprehensive Dental Care</h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-600">
              From routine cleanings to advanced procedures, we offer a full range of dental services
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '🦷',
                title: 'General Dentistry',
                desc: 'Comprehensive exams, cleanings, and preventive care for your whole family',
              },
              {
                icon: '✨',
                title: 'Cosmetic Dentistry',
                desc: 'Transform your smile with whitening, veneers, and smile makeovers',
              },
              {
                icon: '🔧',
                title: 'Restorative Care',
                desc: 'Crowns, bridges, implants, and dentures to restore your smile',
              },
              {
                icon: '👶',
                title: 'Pediatric Dentistry',
                desc: 'Gentle, friendly care designed specifically for children',
              },
              { icon: '😁', title: 'Orthodontics', desc: 'Invisalign and traditional braces for straighter teeth' },
              { icon: '🚨', title: 'Emergency Care', desc: '24/7 emergency dental services when you need them most' },
            ].map((service, i) => (
              <div
                key={i}
                className="group rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-3xl transition-transform group-hover:scale-110">
                  {service.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{service.title}</h3>
                <p className="text-gray-600">{service.desc}</p>
                <a
                  href="#"
                  className="mt-4 inline-flex items-center gap-2 font-medium text-cyan-600 transition-all group-hover:gap-3"
                >
                  Learn More
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="font-semibold text-cyan-600">OUR TEAM</span>
            <h2 className="mt-3 text-4xl font-bold text-gray-900 lg:text-5xl">Meet Our Expert Dentists</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: 'Dr. Sarah Johnson',
                role: 'Lead Dentist',
                img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
              },
              {
                name: 'Dr. Michael Chen',
                role: 'Orthodontist',
                img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
              },
              {
                name: 'Dr. Emily Davis',
                role: 'Pediatric Dentist',
                img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80',
              },
              {
                name: 'Dr. James Wilson',
                role: 'Oral Surgeon',
                img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
              },
            ].map((member, i) => (
              <div key={i} className="group">
                <div className="relative mb-4 overflow-hidden rounded-2xl">
                  <Image
                    src={member.img}
                    alt={member.name}
                    width={400}
                    height={400}
                    className="h-80 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-cyan-600/80 to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-3">
                      {['linkedin', 'twitter', 'email'].map((social) => (
                        <a
                          key={social}
                          href="#"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white hover:text-cyan-600"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                <p className="text-cyan-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white lg:text-5xl">Ready for a Brighter Smile?</h2>
          <p className="mb-8 text-xl text-white/80">
            Schedule your appointment today and take the first step towards the smile you have always wanted.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-cyan-600 transition-all hover:shadow-xl">
              Book Appointment
            </button>
            <button className="rounded-full border-2 border-white bg-transparent px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white hover:text-cyan-600">
              Call: (555) 123-4567
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">
                  <span className="text-xl text-white">🦷</span>
                </div>
                <span className="text-2xl font-bold">SmileCare</span>
              </div>
              <p className="text-gray-400">Your trusted partner in dental health since 2004.</p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="transition-colors hover:text-cyan-400">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-cyan-400">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-cyan-400">
                    Our Team
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-cyan-400">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>123 Dental Street</li>
                <li>New York, NY 10001</li>
                <li>(555) 123-4567</li>
                <li>info@smilecare.com</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Hours</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Mon-Fri: 8am - 6pm</li>
                <li>Saturday: 9am - 4pm</li>
                <li>Sunday: Closed</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SmileCare Dental. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
